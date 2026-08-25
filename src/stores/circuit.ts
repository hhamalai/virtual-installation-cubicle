import { reactive, watch } from 'vue'
import type { Cable, CircuitDoc, CircuitState, DrawnCable, Element, Point, Workspace } from '../types'
import { createElementByType } from './elements'
import { type CircuitFile, buildCircuitFile, nextIdFor } from '../circuit/serialize'

const WORKSPACE_KEY = 'electric-workspace'
// Single-circuit key used before tabs existed; migrated into the workspace on first load.
const LEGACY_STATE_KEY = 'electric-circuit-state'

const newDocId = (): string => `doc-${Math.random().toString(36).slice(2, 10)}`

const emptyDoc = (name: string): CircuitDoc => ({
  id: newDocId(),
  name,
  elements: [],
  cables: [],
  drawnCables: [],
  nextId: 1
})

// Type 5 switches used to have two isolated poles (IN1/OUT1, IN2/OUT2). They are
// now what the real part is: one incoming line feeding two switched outputs, so
// both old inputs collapse onto the single IN terminal and anything wired to
// either of them follows.
export const migrateSwitch5 = (elements: Element[], cables: Cable[]): void => {
  for (const element of elements) {
    if (element.type !== 'switch5') continue

    const legacyInputs = element.terminals.filter(t => t.name === 'IN1' || t.name === 'IN2')
    if (legacyInputs.length === 0) continue

    const legacyIds = new Set(legacyInputs.map(t => t.id))
    const inputId = `${element.id}-IN`

    element.terminals = [
      {
        id: inputId,
        name: 'IN',
        localX: 0,
        localY: 32,
        connected: legacyInputs.flatMap(t => t.connected),
        energized: false
      },
      ...element.terminals.filter(t => !legacyIds.has(t.id))
    ]

    for (const cable of cables) {
      for (const wire of cable.wires) {
        for (const endpoint of [wire.from, wire.to]) {
          if (endpoint?.elementId === element.id && legacyIds.has(endpoint.terminalId)) {
            endpoint.terminalId = inputId
          }
        }
      }
    }
  }
}

const docFromParsed = (raw: Partial<CircuitDoc>, fallbackName: string): CircuitDoc => {
  const doc: CircuitDoc = {
    id: typeof raw.id === 'string' ? raw.id : newDocId(),
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : fallbackName,
    elements: Array.isArray(raw.elements) ? raw.elements : [],
    cables: Array.isArray(raw.cables) ? raw.cables : [],
    drawnCables: Array.isArray(raw.drawnCables) ? raw.drawnCables : [],
    nextId: typeof raw.nextId === 'number' && raw.nextId > 0 ? raw.nextId : 1
  }
  migrateSwitch5(doc.elements, doc.cables)
  return doc
}

const loadLegacyDoc = (): CircuitDoc | null => {
  const saved = localStorage.getItem(LEGACY_STATE_KEY)
  if (!saved) return null
  const parsed = JSON.parse(saved) as Partial<CircuitDoc>
  return docFromParsed(parsed, 'Circuit 1')
}

const loadWorkspace = (): Workspace => {
  try {
    const saved = localStorage.getItem(WORKSPACE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<Workspace>
      const docs = Array.isArray(parsed.docs) ? parsed.docs.map((d, i) => docFromParsed(d, `Circuit ${i + 1}`)) : []
      if (docs.length > 0) {
        const activeId = docs.some(d => d.id === parsed.activeId) ? parsed.activeId! : docs[0].id
        return { activeId, docs }
      }
    }
  } catch (e) {
    console.warn('Failed to load workspace, starting a fresh one:', e)
  }

  try {
    const legacy = loadLegacyDoc()
    if (legacy) return { activeId: legacy.id, docs: [legacy] }
  } catch (e) {
    console.warn('Failed to migrate the previously saved circuit:', e)
  }

  const doc = emptyDoc('Circuit 1')
  return { activeId: doc.id, docs: [doc] }
}

const workspace = reactive<Workspace>(loadWorkspace())
const initialDoc = workspace.docs.find(d => d.id === workspace.activeId) || workspace.docs[0]

const state: CircuitState = reactive({
  elements: initialDoc.elements,
  cables: initialDoc.cables,
  drawnCables: initialDoc.drawnCables,
  selectedElement: null,
  wiringMode: null,
  cableDrawingMode: null,
  nextId: initialDoc.nextId
})

// `state` holds the active document's arrays by reference, but store actions may
// replace them wholesale (e.g. `state.cables = state.cables.filter(...)`), so the
// active document is refreshed from `state` before every save.
const syncActiveDoc = (): void => {
  const doc = workspace.docs.find(d => d.id === workspace.activeId)
  if (!doc) return
  doc.elements = state.elements
  doc.cables = state.cables
  doc.drawnCables = state.drawnCables
  doc.nextId = state.nextId
}

const saveState = () => {
  syncActiveDoc()
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify({ activeId: workspace.activeId, docs: workspace.docs }))
    localStorage.removeItem(LEGACY_STATE_KEY)
  } catch (e) {
    console.warn('Failed to save circuit state:', e)
  }
}

// Watch for changes and save
watch(
  () => [state.elements, state.cables, state.drawnCables, state.nextId, workspace],
  saveState,
  { deep: true }
)

// Cable type configurations
const CABLE_CONFIGS = {
  mmj3: {
    wireCount: 3,
    colors: ['#8B4513', '#1976d2', '#7cb342'], // Brown (L), Blue (N), Yellow-Green (PE)
    names: ['L', 'N', 'PE']
  },
  mmj5: {
    wireCount: 5,
    colors: ['#8B4513', '#212121', '#757575', '#1976d2', '#7cb342'], // Brown (L1), Black (L2), Gray (L3), Blue (N), Yellow-Green (PE)
    names: ['L1', 'L2', 'L3', 'N', 'PE']
  },
  omm: {
    wireCount: 7,
    colors: ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#009688', '#ff9800', '#795548'],
    names: ['1', '2', '3', '4', '5', '6', '7']
  }
} as const

// --- Multifunction timer runtime (real-time, not persisted) -----------------
// Module scope, not per-`useCircuitStore()` call: every component shares the same
// elements, so they must also share the timers driving them.
interface TimerRuntime {
  supply: boolean
  control: boolean
  // Multifunction: 'idle' | 'timing' | 'held' | 'pause' | 'on' | 'spent'
  // Star-delta:    'idle' | 'star' | 'transition' | 'delta'
  phase: string
  handle: ReturnType<typeof setTimeout> | null
  // Star-delta only: pending check that the supply has been gone long enough to release.
  releaseHandle: ReturnType<typeof setTimeout> | null
}
const timerRuntimes = new Map<string, TimerRuntime>()

// Star-delta starter constants.
const STAR_DELTA_RELEASE_MS = 200
const DEFAULT_STAR_SECONDS = 5
const DEFAULT_DELTA_DELAY_MS = 100

export function useCircuitStore() {
  const generateId = (): string => `el-${state.nextId++}`

  const addElement = (type: string, x: number, y: number): Element => {
    const element = createElementByType(type, generateId(), x, y)
    state.elements.push(element)
    simulateCircuit()
    return element
  }

  const removeElement = (id: string): void => {
    const index = state.elements.findIndex(el => el.id === id)
    if (index !== -1) {
      // Remove any cables connected to this element
      state.cables = state.cables.filter(cable => {
        return !cable.wires.some(wire =>
          wire.from?.elementId === id || wire.to?.elementId === id
        )
      })
      const rt = timerRuntimes.get(id)
      if (rt?.handle) clearTimeout(rt.handle)
      if (rt?.releaseHandle) clearTimeout(rt.releaseHandle)
      timerRuntimes.delete(id)
      state.elements.splice(index, 1)
      simulateCircuit()
    }
  }

  const updateElement = (id: string, updates: Partial<Element>): void => {
    const element = state.elements.find(el => el.id === id)
    if (element) {
      Object.assign(element, updates)
    }
  }

  const rotateElement = (id: string): void => {
    const element = state.elements.find(el => el.id === id)
    if (element) {
      element.rotation = ((element.rotation || 0) + 90) % 360
      simulateCircuit()
    }
  }

  const selectElement = (id: string): void => {
    state.selectedElement = id
  }

  const startWiring = (
    cableType: string,
    elementId: string,
    terminalId: string,
    fromConnectedCableId?: string,
    fromConnectedWireIndex?: number,
    wireColor?: string
  ): void => {
    state.wiringMode = {
      cableType,
      wireIndex: 0,
      fromElement: elementId,
      fromTerminal: terminalId,
      controlPoints: [],
      fromConnectedCableId,
      fromConnectedWireIndex,
      wireColor
    }
  }

  // Points closer together than this render as a degenerate bezier segment (a
  // visible loop in the wire), so a repeated point at the same spot is dropped.
  const MIN_CONTROL_POINT_GAP = 3

  const addControlPoint = (x: number, y: number): void => {
    if (!state.wiringMode) return
    const points = state.wiringMode.controlPoints
    const last = points[points.length - 1]
    if (last && Math.hypot(last.x - x, last.y - y) < MIN_CONTROL_POINT_GAP) return
    points.push({ x, y })
  }

  const cancelWiring = (): void => {
    state.wiringMode = null
  }

  const completeWire = (
    toElementId: string,
    toTerminalId: string,
    // Optional: connect to a specific wire in a multi-wire cable (for 'to' endpoint)
    toConnectedCableId?: string,
    toConnectedWireIndex?: number
  ): void => {
    if (!state.wiringMode) return

    const {
      cableType,
      fromElement,
      fromTerminal,
      controlPoints,
      fromConnectedCableId,
      fromConnectedWireIndex,
      wireColor
    } = state.wiringMode

    // Find or create cable
    let cable = state.cables.find(c =>
      c.type === cableType &&
      c.wires.some(w => !w.from || !w.to)
    )

    if (!cable) {
      cable = createCable(cableType, generateId())
      state.cables.push(cable)
    }

    // Find first incomplete wire in cable
    const wire = cable.wires.find(w => !w.from || !w.to)
    if (wire) {
      // Custom colors only apply to single-wire cables (multi-wire keep standard colors)
      if (wireColor && cable.wires.length === 1) {
        wire.color = wireColor
      }
      wire.from = {
        elementId: fromElement,
        terminalId: fromTerminal,
        connectedCableId: fromConnectedCableId,
        connectedWireIndex: fromConnectedWireIndex
      }
      wire.to = {
        elementId: toElementId,
        terminalId: toTerminalId,
        connectedCableId: toConnectedCableId,
        connectedWireIndex: toConnectedWireIndex
      }
      wire.controlPoints = [...controlPoints]

      // Mark terminals as connected
      const fromEl = state.elements.find(el => el.id === fromElement)
      const toEl = state.elements.find(el => el.id === toElementId)

      if (fromEl && toEl) {
        const fromTerm = fromEl.terminals.find(t => t.id === fromTerminal)
        const toTerm = toEl.terminals.find(t => t.id === toTerminalId)
        if (fromTerm) fromTerm.connected.push({ cableId: cable.id, wireColor: wire.color })
        if (toTerm) toTerm.connected.push({ cableId: cable.id, wireColor: wire.color })
      }
    }

    state.wiringMode = null
    simulateCircuit()
  }

  const removeCable = (id: string): void => {
    const cable = state.cables.find(c => c.id === id)
    if (cable) {
      // Remove connection references from terminals
      cable.wires.forEach(wire => {
        if (wire.from) {
          const from = wire.from
          const el = state.elements.find(e => e.id === from.elementId)
          if (el) {
            const term = el.terminals.find(t => t.id === from.terminalId)
            if (term) {
              term.connected = term.connected.filter(c => c.cableId !== id)
            }
          }
        }
        if (wire.to) {
          const to = wire.to
          const el = state.elements.find(e => e.id === to.elementId)
          if (el) {
            const term = el.terminals.find(t => t.id === to.terminalId)
            if (term) {
              term.connected = term.connected.filter(c => c.cableId !== id)
            }
          }
        }
      })
      state.cables = state.cables.filter(c => c.id !== id)
      simulateCircuit()
    }
  }

  const updateWirePoint = (cableId: string, wireIndex: number, pointIndex: number, newX: number, newY: number): void => {
    const cable = state.cables.find(c => c.id === cableId)
    if (cable && cable.wires[wireIndex]) {
      const wire = cable.wires[wireIndex]
      if (wire.controlPoints && wire.controlPoints[pointIndex]) {
        wire.controlPoints[pointIndex] = { x: newX, y: newY }
      }
    }
  }

  // Connect a specific wire in a cable to an element terminal
  const connectCableWire = (
    cableId: string,
    wireIndex: number,
    wireEnd: 'from' | 'to',
    elementId: string,
    terminalId: string
  ): void => {
    const cable = state.cables.find(c => c.id === cableId)
    if (!cable) return

    const wire = cable.wires[wireIndex]
    if (!wire) return

    // Set the wire endpoint
    const endpoint = { elementId, terminalId }
    if (wireEnd === 'from') {
      wire.from = endpoint
    } else {
      wire.to = endpoint
    }

    // Copy control points from first wire if this wire doesn't have them
    if (!wire.controlPoints || wire.controlPoints.length === 0) {
      const firstWire = cable.wires.find(w => w.controlPoints && w.controlPoints.length > 0)
      if (firstWire && firstWire.controlPoints) {
        wire.controlPoints = [...firstWire.controlPoints]
      }
    }

    // Update the terminal's connected array
    const el = state.elements.find(e => e.id === elementId)
    if (el) {
      const term = el.terminals.find(t => t.id === terminalId)
      if (term) {
        term.connected.push({ cableId: cable.id, wireColor: wire.color })
      }
    }

    simulateCircuit()
  }

  const toggleSwitch = (elementId: string, switchIndex: number | null = null): void => {
    const element = state.elements.find(el => el.id === elementId)
    if (!element) return

    switch (element.type) {
      case 'switch1':
        element.state.on = !element.state.on
        break
      case 'switch7':
        element.state.crossed = !element.state.crossed
        break
      case 'switch5':
        // Toggle specific switch based on index (0 or 1)
        if (switchIndex === 0) {
          element.state.on1 = !element.state.on1
        } else if (switchIndex === 1) {
          element.state.on2 = !element.state.on2
        }
        break
      case 'switch6':
        element.state.position = element.state.position === 0 ? 1 : 0
        break
      case 'switch8':
        // switchIndex carries the target position directly (1, 0, or 3)
        if (switchIndex === 1 || switchIndex === 0 || switchIndex === 3) {
          element.state.position = switchIndex
        }
        break
      case 'switch66':
        // Toggle specific switch based on index (0 or 1)
        if (switchIndex === 0) {
          element.state.position1 = element.state.position1 === 0 ? 1 : 0
        } else if (switchIndex === 1) {
          element.state.position2 = element.state.position2 === 0 ? 1 : 0
        }
        break
    }
    simulateCircuit()
  }

  const setButtonPressed = (elementId: string, color: 'green' | 'red', pressed: boolean): void => {
    const element = state.elements.find(el => el.id === elementId)
    if (!element || (element.type !== 'button' && element.type !== 'button-no')) return

    if (color === 'green') {
      element.state.greenPressed = pressed
    } else {
      element.state.redPressed = pressed
    }
    simulateCircuit()
  }

  const getTimerRuntime = (id: string): TimerRuntime => {
    let rt = timerRuntimes.get(id)
    if (!rt) {
      rt = { supply: false, control: false, phase: 'idle', handle: null, releaseHandle: null }
      timerRuntimes.set(id, rt)
    }
    return rt
  }

  const clearTimerHandle = (rt: TimerRuntime): void => {
    if (rt.handle !== null) {
      clearTimeout(rt.handle)
      rt.handle = null
    }
  }

  const clearReleaseHandle = (rt: TimerRuntime): void => {
    if (rt.releaseHandle !== null) {
      clearTimeout(rt.releaseHandle)
      rt.releaseHandle = null
    }
  }

  const scheduleTimer = (elementId: string, seconds: number): void => {
    const rt = getTimerRuntime(elementId)
    clearTimerHandle(rt)
    rt.handle = setTimeout(() => {
      rt.handle = null
      onTimerElapsed(elementId)
    }, Math.max(50, seconds * 1000))
  }

  // A scheduled delay finished: advance the timer's output/phase, then re-simulate.
  const onTimerElapsed = (elementId: string): void => {
    const el = state.elements.find(e => e.id === elementId)
    if (!el) return
    if (el.type === 'star-delta-timer') {
      onStarDeltaElapsed(el)
      simulateCircuit()
      return
    }
    if (el.type !== 'timer') return
    const rt = getTimerRuntime(elementId)
    const fn = el.state.timerFunction || 'E'
    const t = el.state.timerDuration || 1

    switch (fn) {
      case 'E':
        el.state.timerOutput = true
        break
      case 'Ec':
        if (rt.control) el.state.timerOutput = true
        break
      case 'R':
        el.state.timerOutput = false
        rt.phase = 'idle'
        break
      case 'Wu':
        el.state.timerOutput = false
        break
      case 'Ws':
      case 'Wa':
        el.state.timerOutput = false
        rt.phase = 'spent'
        break
      case 'Bp':
        if (rt.phase === 'pause') {
          el.state.timerOutput = true
          rt.phase = 'on'
        } else {
          el.state.timerOutput = false
          rt.phase = 'pause'
        }
        scheduleTimer(elementId, t)
        break
    }
    simulateCircuit()
  }

  // --- Star-delta starter ----------------------------------------------------
  // star (t) -> neutral (changeover delay) -> delta, held until the supply has
  // been gone for at least STAR_DELTA_RELEASE_MS.

  const onStarDeltaElapsed = (el: Element): void => {
    const rt = getTimerRuntime(el.id)
    if (rt.phase === 'star') {
      el.state.starDeltaPosition = 'neutral'
      rt.phase = 'transition'
      scheduleTimer(el.id, (el.state.deltaDelay ?? DEFAULT_DELTA_DELAY_MS) / 1000)
    } else if (rt.phase === 'transition') {
      el.state.starDeltaPosition = 'delta'
      rt.phase = 'delta'
    }
  }

  // The supply has gone; release only if it stays gone. A shorter dip leaves both
  // the relay position and the running star period untouched.
  const scheduleStarDeltaRelease = (elementId: string): void => {
    const rt = getTimerRuntime(elementId)
    clearReleaseHandle(rt)
    rt.releaseHandle = setTimeout(() => {
      rt.releaseHandle = null
      const el = state.elements.find(e => e.id === elementId)
      if (!el) return
      clearTimerHandle(rt)
      rt.phase = 'idle'
      el.state.starDeltaPosition = 'neutral'
      simulateCircuit()
    }, STAR_DELTA_RELEASE_MS)
  }

  const evaluateStarDelta = (el: Element, supply: boolean): boolean => {
    const rt = getTimerRuntime(el.id)
    const before = el.state.starDeltaPosition || 'neutral'

    el.state.timerSupplied = supply

    if (supply && !rt.supply) {
      clearReleaseHandle(rt)
      if (rt.phase === 'idle') {
        el.state.starDeltaPosition = 'star'
        rt.phase = 'star'
        scheduleTimer(el.id, el.state.starDuration ?? DEFAULT_STAR_SECONDS)
      }
    } else if (!supply && rt.supply) {
      scheduleStarDeltaRelease(el.id)
    }

    rt.supply = supply
    return (el.state.starDeltaPosition || 'neutral') !== before
  }

  // React to supply/control edges for one timer. Returns true if the output changed.
  const evaluateTimer = (el: Element, supply: boolean, control: boolean): boolean => {
    const rt = getTimerRuntime(el.id)
    const before = el.state.timerOutput || false
    const t = el.state.timerDuration || 1
    const fn = el.state.timerFunction || 'E'

    const supplyRising = supply && !rt.supply
    const controlRising = control && !rt.control
    const controlFalling = !control && rt.control

    el.state.timerSupplied = supply

    if (!supply) {
      clearTimerHandle(rt)
      rt.phase = 'idle'
      el.state.timerOutput = false
    } else {
      switch (fn) {
        case 'E':
          if (supplyRising) { el.state.timerOutput = false; scheduleTimer(el.id, t) }
          break
        case 'Ec':
          if (controlRising) { el.state.timerOutput = false; scheduleTimer(el.id, t) }
          else if (controlFalling) { clearTimerHandle(rt); el.state.timerOutput = false }
          break
        case 'R':
          if (supplyRising) { clearTimerHandle(rt); el.state.timerOutput = control; rt.phase = control ? 'held' : 'idle' }
          if (controlRising) { clearTimerHandle(rt); el.state.timerOutput = true; rt.phase = 'held' }
          else if (controlFalling) { el.state.timerOutput = true; rt.phase = 'timing'; scheduleTimer(el.id, t) }
          break
        case 'Wu':
          if (supplyRising) { el.state.timerOutput = true; scheduleTimer(el.id, t) }
          break
        case 'Ws':
          if (controlRising && rt.phase !== 'timing') { el.state.timerOutput = true; rt.phase = 'timing'; scheduleTimer(el.id, t) }
          else if (controlFalling && rt.phase === 'spent') { rt.phase = 'idle' }
          break
        case 'Wa':
          if (controlFalling && rt.phase !== 'timing') { el.state.timerOutput = true; rt.phase = 'timing'; scheduleTimer(el.id, t) }
          else if (controlRising && rt.phase === 'spent') { rt.phase = 'idle' }
          break
        case 'Bp':
          if (supplyRising) { el.state.timerOutput = false; rt.phase = 'pause'; scheduleTimer(el.id, t) }
          break
      }
    }

    rt.supply = supply
    rt.control = control
    return (el.state.timerOutput || false) !== before
  }

  const resetTimerRuntime = (id: string): void => {
    const rt = getTimerRuntime(id)
    clearTimerHandle(rt)
    clearReleaseHandle(rt)
    rt.phase = 'idle'
    rt.supply = false
    rt.control = false
  }

  const setStarDeltaConfig = (elementId: string, updates: { starDuration?: number; deltaDelay?: number }): void => {
    const el = state.elements.find(e => e.id === elementId)
    if (!el || el.type !== 'star-delta-timer') return
    if (updates.starDuration !== undefined) el.state.starDuration = updates.starDuration
    if (updates.deltaDelay !== undefined) el.state.deltaDelay = updates.deltaDelay
    // Like the multifunction timer, a settings change restarts from de-energised.
    resetTimerRuntime(elementId)
    el.state.starDeltaPosition = 'neutral'
    simulateCircuit()
  }

  const setTimerConfig = (elementId: string, updates: { timerFunction?: string; timerDuration?: number }): void => {
    const el = state.elements.find(e => e.id === elementId)
    if (!el || el.type !== 'timer') return
    if (updates.timerFunction !== undefined) el.state.timerFunction = updates.timerFunction
    if (updates.timerDuration !== undefined) el.state.timerDuration = updates.timerDuration
    // Per the datasheet, changes take effect from the de-energised state - restart cleanly.
    resetTimerRuntime(elementId)
    el.state.timerOutput = false
    simulateCircuit()
  }

  // Circuit simulation with wire-level tracking
  const simulateCircuit = (): void => {
    // Reset all energized states
    state.elements.forEach(el => {
      el.terminals.forEach(t => {
        t.energized = false
      })
      if (el.type === 'light' || el.type === 'light-grounded') {
        el.state.on = false
      }
      // NOTE: relay coil state is intentionally NOT reset here. Retaining the
      // previous coilEnergized value lets the fixed-point iteration below hold a
      // self-consistent latched state (seal-in / holding circuits). A coil with no
      // real supply path still drops out when the outer loop re-derives its state.
    })

    // Track wire energization: Map<"cableId-wireIndex", boolean>
    const wireEnergized = new Map<string, boolean>()
    const getWireKey = (cableId: string, wireIndex: number) => `${cableId}-${wireIndex}`

    // Helper to check if a wire is energized
    const isWireEnergized = (cableId: string, wireIndex: number) =>
      wireEnergized.get(getWireKey(cableId, wireIndex)) || false

    // Helper to set wire as energized
    const setWireEnergized = (cableId: string, wireIndex: number) => {
      wireEnergized.set(getWireKey(cableId, wireIndex), true)
    }

    // Find power inputs (including distribution boards) and mark L terminal as energized
    const powerInputs = state.elements.filter(el => el.type === 'power-input' || el.type === 'distribution-board')
    powerInputs.forEach(pi => {
      const lTerm = pi.terminals.find(t => t.name === 'L')
      if (lTerm) lTerm.energized = true
    })

    // Two-phase simulation:
    // Outer loop: detect relay coil state changes and restart if topology changes
    // Inner loop: propagate energy until stable for the current topology
    let outerIterations = 0
    const maxOuterIterations = 10

    while (outerIterations < maxOuterIterations) {
      outerIterations++

      // Inner loop: propagate energy until stable
      let changed = true
      let iterations = 0
      const maxIterations = 100

      while (changed && iterations < maxIterations) {
        changed = false
        iterations++

        // Phase 1: Propagate energy through wires (wire-level)
        state.cables.forEach((cable, _cableIdx) => {
          cable.wires.forEach((wire, wireIndex) => {
            if (!wire.from || !wire.to) return
            const from = wire.from
            const to = wire.to

            const fromEl = state.elements.find(e => e.id === from.elementId)
            const toEl = state.elements.find(e => e.id === to.elementId)
            if (!fromEl || !toEl) return

            const fromTerm = fromEl.terminals.find(t => t.id === from.terminalId)
            const toTerm = toEl.terminals.find(t => t.id === to.terminalId)
            if (!fromTerm || !toTerm) return

            const wireKey = getWireKey(cable.id, wireIndex)
            const currentlyEnergized = wireEnergized.get(wireKey) || false

            // Check if this wire should be energized from its 'from' endpoint
            let fromEnergized = false
            if (from.connectedCableId !== undefined && from.connectedWireIndex !== undefined) {
              // Connected to specific wire - only energized if that wire is energized
              fromEnergized = isWireEnergized(from.connectedCableId, from.connectedWireIndex)
            } else {
              // Connected to terminal directly - energized if terminal is energized
              fromEnergized = fromTerm.energized
            }

            // Check if this wire should be energized from its 'to' endpoint
            let toEnergized = false
            if (to.connectedCableId !== undefined && to.connectedWireIndex !== undefined) {
              // Connected to specific wire - only energized if that wire is energized
              toEnergized = isWireEnergized(to.connectedCableId, to.connectedWireIndex)
            } else {
              // Connected to terminal directly - energized if terminal is energized
              toEnergized = toTerm.energized
            }

            // Wire is energized if either endpoint provides energy
            if ((fromEnergized || toEnergized) && !currentlyEnergized) {
              setWireEnergized(cable.id, wireIndex)
              changed = true
            }

            // Propagate energy to terminals (only if not connected to specific wire)
            if (isWireEnergized(cable.id, wireIndex)) {
              if (!from.connectedCableId && !fromTerm.energized) {
                fromTerm.energized = true
                changed = true
              }
              if (!to.connectedCableId && !toTerm.energized) {
                toTerm.energized = true
                changed = true
              }
            }
          })
        })

        // Phase 2: Propagate energy between wires connected via connectedCableId/connectedWireIndex
        state.cables.forEach((cable) => {
          // For multi-wire cables, find wire 0's path (the first wire with endpoints)
          const pathWire = cable.wires.find(w => w.from && w.to)

          cable.wires.forEach((wire, wireIndex) => {
            // Use this wire's endpoints if available, otherwise use pathWire's endpoints
            const effectiveFrom = wire.from || pathWire?.from
            const effectiveTo = wire.to || pathWire?.to
            if (!effectiveFrom || !effectiveTo) return

            // If this wire is energized, propagate to connected wires (bidirectional)
            if (isWireEnergized(cable.id, wireIndex)) {
              // Check if this wire's endpoints connect to specific wires in other cables
              // If so, energize those wires (forward propagation)
              if (wire.from?.connectedCableId !== undefined && wire.from?.connectedWireIndex !== undefined) {
                if (!isWireEnergized(wire.from.connectedCableId, wire.from.connectedWireIndex)) {
                  setWireEnergized(wire.from.connectedCableId, wire.from.connectedWireIndex)
                  changed = true
                }
              }
              if (wire.to?.connectedCableId !== undefined && wire.to?.connectedWireIndex !== undefined) {
                if (!isWireEnergized(wire.to.connectedCableId, wire.to.connectedWireIndex)) {
                  setWireEnergized(wire.to.connectedCableId, wire.to.connectedWireIndex)
                  changed = true
                }
              }

              // Find other wires that connect TO this wire (reverse propagation)
              state.cables.forEach((otherCable) => {
                otherCable.wires.forEach((otherWire, otherWireIndex) => {
                  if (!otherWire.from || !otherWire.to) return
                  if (otherCable.id === cable.id && otherWireIndex === wireIndex) return

                  // Check if otherWire connects to this wire
                  const fromConnects = otherWire.from.connectedCableId === cable.id &&
                                       otherWire.from.connectedWireIndex === wireIndex
                  const toConnects = otherWire.to.connectedCableId === cable.id &&
                                     otherWire.to.connectedWireIndex === wireIndex

                  if ((fromConnects || toConnects) && !isWireEnergized(otherCable.id, otherWireIndex)) {
                    setWireEnergized(otherCable.id, otherWireIndex)
                    changed = true
                  }
                })
              })
            }
          })
        })

        // Propagate through switches based on their state
        state.elements.forEach(el => {
          const connections = getSwitchConnections(el)
          connections.forEach(([t1Name, t2Name]) => {
            const t1 = el.terminals.find(t => t.name === t1Name)
            const t2 = el.terminals.find(t => t.name === t2Name)
            if (t1 && t2) {
              if (t1.energized && !t2.energized) {
                t2.energized = true
                changed = true
              } else if (t2.energized && !t1.energized) {
                t1.energized = true
                changed = true
              }
            }
          })

          // Handle cable internal connections (by ID suffix)
          if (el.internalConnections) {
            el.internalConnections.forEach(([suffix1, suffix2]) => {
              const t1 = el.terminals.find(t => t.id.endsWith(`-${suffix1}`))
              const t2 = el.terminals.find(t => t.id.endsWith(`-${suffix2}`))
              if (t1 && t2) {
                if (t1.energized && !t2.energized) {
                  t2.energized = true
                  changed = true
                } else if (t2.energized && !t1.energized) {
                  t1.energized = true
                  changed = true
                }
              }
            })
          }
        })

        // Propagate energy through docked cable bundles
        // When a cable is docked at both ends, wire terminals are connected through the cable
        state.elements.forEach(el => {
          if (el.cableType && el.state.dockedA && el.state.dockedB && el.wireColors) {
            const jboxA = state.elements.find(e => e.id === el.state.dockedA!.elementId)
            const jboxB = state.elements.find(e => e.id === el.state.dockedB!.elementId)
            if (!jboxA || !jboxB) return

            const slotIdA = el.state.dockedA.slotId
            const slotIdB = el.state.dockedB.slotId

            // Connect corresponding wire terminals between the two junction boxes
            el.wireColors.forEach((_, wireIndex) => {
              const termA = jboxA.terminals.find(t => t.id === `${jboxA.id}-${slotIdA}-${wireIndex}`)
              const termB = jboxB.terminals.find(t => t.id === `${jboxB.id}-${slotIdB}-${wireIndex}`)

              if (termA && termB) {
                if (termA.energized && !termB.energized) {
                  termB.energized = true
                  changed = true
                } else if (termB.energized && !termA.energized) {
                  termA.energized = true
                  changed = true
                }
              }
            })
          }
        })
      }

      // Energy propagation has fully settled. Now check relay coil states.
      let coilStateChanged = false
      state.elements.forEach(el => {
        if (el.type.startsWith('relay-')) {
          const a1Term = el.terminals.find(t => t.name === 'A1')
          const nTerm = el.terminals.find(t => t.name === 'N')

          const a1Energized = a1Term?.energized || false
          const nEnergized = nTerm?.energized || false
          const a1ToNeutral = isConnectedToNeutral(el.id, a1Term?.id)
          const nToNeutral = isConnectedToNeutral(el.id, nTerm?.id)

          const coilEnergized = (a1Energized && nToNeutral) || (nEnergized && a1ToNeutral)

          if (el.state.coilEnergized !== coilEnergized) {
            el.state.coilEnergized = coilEnergized
            coilStateChanged = true
          }
        }

        // Step relay: every coil pulse flips the latched contact. Only the rising
        // edge counts, so holding the coil on leaves the contact where it is.
        if (el.type === 'step-relay') {
          const a1Term = el.terminals.find(t => t.name === 'A1')
          const nTerm = el.terminals.find(t => t.name === 'N')

          const coilEnergized =
            ((a1Term?.energized || false) && isConnectedToNeutral(el.id, nTerm?.id)) ||
            ((nTerm?.energized || false) && isConnectedToNeutral(el.id, a1Term?.id))

          if (el.state.coilEnergized !== coilEnergized) {
            if (coilEnergized) el.state.stepOutput = !el.state.stepOutput
            el.state.coilEnergized = coilEnergized
            coilStateChanged = true
          }
        }
      })

      // Evaluate multifunction timers: derive supply/control and react to edges.
      let timerStateChanged = false
      state.elements.forEach(el => {
        if (el.type === 'timer') {
          const a1 = el.terminals.find(t => t.name === 'A1')
          const a2 = el.terminals.find(t => t.name === 'A2')
          const b1 = el.terminals.find(t => t.name === 'B1')
          const supply =
            ((a1?.energized || false) && isConnectedToNeutral(el.id, a2?.id)) ||
            ((a2?.energized || false) && isConnectedToNeutral(el.id, a1?.id))
          const control = b1?.energized || false
          if (evaluateTimer(el, supply, control)) timerStateChanged = true
        }

        if (el.type === 'star-delta-timer') {
          const a1 = el.terminals.find(t => t.name === 'A1')
          const a2 = el.terminals.find(t => t.name === 'A2')
          const supply =
            ((a1?.energized || false) && isConnectedToNeutral(el.id, a2?.id)) ||
            ((a2?.energized || false) && isConnectedToNeutral(el.id, a1?.id))
          if (evaluateStarDelta(el, supply)) timerStateChanged = true
        }
      })

      // If nothing changed the contact topology, the simulation is fully stable.
      if (!coilStateChanged && !timerStateChanged) break

      // Coil states changed - topology changed. Reset all terminal energy and
      // wire latches, then re-propagate under the new contact states.
      wireEnergized.clear()
      state.elements.forEach(el => {
        el.terminals.forEach(t => { t.energized = false })
      })
      powerInputs.forEach(pi => {
        const lTerm = pi.terminals.find(t => t.name === 'L')
        if (lTerm) lTerm.energized = true
      })
    }

    // Check if lights are on (L energized and N connected to neutral)
    state.elements.forEach(el => {
      if (el.type === 'light' || el.type === 'light-grounded') {
        const lTerm = el.terminals.find(t => t.name === 'L')
        const nTerm = el.terminals.find(t => t.name === 'N')

        // Check if N is connected back to power input's N
        const nConnectedToNeutral = isConnectedToNeutral(el.id, nTerm?.id)

        if (lTerm?.energized && nConnectedToNeutral) {
          el.state.on = true
        }
      }
    })
  }

  const isConnectedToNeutral = (elementId: string, terminalId: string | undefined, visited: Set<string> = new Set(), connectedCableId?: string, connectedWireIndex?: number): boolean => {
    // Create a unique key that includes wire-specific connection info
    const key = connectedCableId !== undefined
      ? `${elementId}-${terminalId}-${connectedCableId}-${connectedWireIndex}`
      : `${elementId}-${terminalId}`

    if (visited.has(key)) return false
    visited.add(key)

    // Check if this terminal is a power input's N terminal (power-input or distribution-board)
    const element = state.elements.find(e => e.id === elementId)
    if (element?.type === 'power-input' || element?.type === 'distribution-board') {
      const term = element.terminals.find(t => t.id === terminalId)
      if (term?.name === 'N') {
        return true
      }
    }

    // If we're connected to a specific wire in a cable, we need to:
    // 1. Follow the cable to its other end (using pathWire)
    // 2. At the other end, find wires that connect to the same wire index
    if (connectedCableId !== undefined && connectedWireIndex !== undefined) {
      const cable = state.cables.find(c => c.id === connectedCableId)
      if (cable) {
        // For multi-wire cables, all wires share the same path defined by wire 0
        const pathWire = cable.wires.find(w => w.from && w.to)
        if (pathWire && pathWire.from && pathWire.to) {
          let otherEndElementId: string | undefined
          let otherEndTerminalId: string | undefined

          if (pathWire.from.elementId === elementId && pathWire.from.terminalId === terminalId) {
            otherEndElementId = pathWire.to.elementId
            otherEndTerminalId = pathWire.to.terminalId
          } else if (pathWire.to.elementId === elementId && pathWire.to.terminalId === terminalId) {
            otherEndElementId = pathWire.from.elementId
            otherEndTerminalId = pathWire.from.terminalId
          }

          if (otherEndElementId && otherEndTerminalId) {
            // Check if the other end is power input's N (power-input or distribution-board)
            const otherElement = state.elements.find(e => e.id === otherEndElementId)
            if (otherElement?.type === 'power-input' || otherElement?.type === 'distribution-board') {
              const term = otherElement.terminals.find(t => t.id === otherEndTerminalId)
              if (term?.name === 'N') {
                return true
              }
            }

            // Find wires at the other end that connect to the same wire index of this cable
            for (const otherCable of state.cables) {
              for (const wire of otherCable.wires) {
                if (!wire.from || !wire.to) continue

                // Check if this wire connects FROM the other terminal with matching connection info
                if (wire.from.elementId === otherEndElementId &&
                    wire.from.terminalId === otherEndTerminalId &&
                    wire.from.connectedCableId === connectedCableId &&
                    wire.from.connectedWireIndex === connectedWireIndex) {
                  // Follow to the other end of this wire (without connection info, since it's a single wire)
                  if (isConnectedToNeutral(wire.to.elementId, wire.to.terminalId, visited, wire.to.connectedCableId, wire.to.connectedWireIndex)) {
                    return true
                  }
                }

                // Check if this wire connects TO the other terminal with matching connection info
                if (wire.to.elementId === otherEndElementId &&
                    wire.to.terminalId === otherEndTerminalId &&
                    wire.to.connectedCableId === connectedCableId &&
                    wire.to.connectedWireIndex === connectedWireIndex) {
                  // Follow to the other end of this wire
                  if (isConnectedToNeutral(wire.from.elementId, wire.from.terminalId, visited, wire.from.connectedCableId, wire.from.connectedWireIndex)) {
                    return true
                  }
                }
              }
            }
          }
        }
      }
    }

    // Follow wires connected to this terminal (for terminals without specific wire connection)
    for (const cable of state.cables) {
      for (const wire of cable.wires) {
        if (!wire.from || !wire.to) continue

        // Check if this wire connects from our terminal
        if (wire.from.elementId === elementId && wire.from.terminalId === terminalId) {
          // If we have a specific wire connection requirement, check it matches
          if (connectedCableId === undefined ||
              (wire.from.connectedCableId === connectedCableId && wire.from.connectedWireIndex === connectedWireIndex)) {
            if (isConnectedToNeutral(wire.to.elementId, wire.to.terminalId, visited, wire.to.connectedCableId, wire.to.connectedWireIndex)) {
              return true
            }
          }
        }
        // Check if this wire connects to our terminal
        if (wire.to.elementId === elementId && wire.to.terminalId === terminalId) {
          // If we have a specific wire connection requirement, check it matches
          if (connectedCableId === undefined ||
              (wire.to.connectedCableId === connectedCableId && wire.to.connectedWireIndex === connectedWireIndex)) {
            if (isConnectedToNeutral(wire.from.elementId, wire.from.terminalId, visited, wire.from.connectedCableId, wire.from.connectedWireIndex)) {
              return true
            }
          }
        }
      }
    }

    // Follow through switch connections
    if (element) {
      const connections = getSwitchConnections(element)
      const term = element.terminals.find(t => t.id === terminalId)
      if (term) {
        for (const [t1Name, t2Name] of connections) {
          if (term.name === t1Name) {
            const t2 = element.terminals.find(t => t.name === t2Name)
            if (t2 && isConnectedToNeutral(elementId, t2.id, visited)) {
              return true
            }
          }
          if (term.name === t2Name) {
            const t1 = element.terminals.find(t => t.name === t1Name)
            if (t1 && isConnectedToNeutral(elementId, t1.id, visited)) {
              return true
            }
          }
        }
      }

      // Follow through cable internal connections
      if (element.internalConnections) {
        const term = element.terminals.find(t => t.id === terminalId)
        if (term) {
          for (const [suffix1, suffix2] of element.internalConnections) {
            if (term.id.endsWith(`-${suffix1}`)) {
              const t2 = element.terminals.find(t => t.id.endsWith(`-${suffix2}`))
              if (t2 && isConnectedToNeutral(elementId, t2.id, visited)) {
                return true
              }
            }
            if (term.id.endsWith(`-${suffix2}`)) {
              const t1 = element.terminals.find(t => t.id.endsWith(`-${suffix1}`))
              if (t1 && isConnectedToNeutral(elementId, t1.id, visited)) {
                return true
              }
            }
          }
        }
      }
    }

    return false
  }

  const getSwitchConnections = (element: Element): [string, string][] => {
    switch (element.type) {
      case 'switch1':
        return element.state.on ? [['IN', 'OUT']] : []
      case 'switch5': {
        const conn5: [string, string][] = []
        if (element.state.on1) conn5.push(['IN', 'OUT1'])
        if (element.state.on2) conn5.push(['IN', 'OUT2'])
        return conn5
      }
      case 'switch6':
        return element.state.position === 0 ? [['COM', 'L1']] : [['COM', 'L2']]
      case 'switch8': {
        if (element.state.position === 1) return [['COM', 'L1']]
        if (element.state.position === 3) return [['COM', 'L3']]
        return []
      }
      case 'switch66': {
        const conn: [string, string][] = []
        if (element.state.position1 === 0) conn.push(['COM1', 'L1A'])
        else conn.push(['COM1', 'L1B'])
        if (element.state.position2 === 0) conn.push(['COM2', 'L2A'])
        else conn.push(['COM2', 'L2B'])
        return conn
      }
      case 'switch7':
        return element.state.crossed
          ? [['IN1', 'OUT2'], ['IN2', 'OUT1']]
          : [['IN1', 'OUT1'], ['IN2', 'OUT2']]
      // Two-pole relays: pole 1 = terminals 1-2, pole 2 = terminals 3-4.
      // Each pole is NO (closes when coil energized) or NC (opens when energized).
      case 'relay-no-no':
      case 'relay-no-nc':
      case 'relay-nc-nc': {
        const [mode1, mode2] = element.type.split('-').slice(1)
        const energized = element.state.coilEnergized || false
        const conn: [string, string][] = []
        const poleClosed = (mode: string) => (mode === 'no' ? energized : !energized)
        if (poleClosed(mode1)) conn.push(['1', '2'])
        if (poleClosed(mode2)) conn.push(['3', '4'])
        return conn
      }
      case 'button': {
        // Green G1-G2: normally open, conducts only while held.
        // Red R1-R2: normally closed, conducts unless held.
        const conn: [string, string][] = []
        if (element.state.greenPressed) conn.push(['G1', 'G2'])
        if (!element.state.redPressed) conn.push(['R1', 'R2'])
        return conn
      }
      case 'button-no':
        // Single normally-open contact, closed only while held.
        return element.state.greenPressed ? [['G1', 'G2']] : []
      case 'step-relay':
        // Latched contact: the coil pulse flips it, it stays put in between.
        return element.state.stepOutput ? [['1', '2']] : []
      case 'timer':
        // Output changeover: R energized -> 15-18 (NO) closed; otherwise 15-16 (NC).
        return element.state.timerOutput ? [['15', '18']] : [['15', '16']]
      case 'star-delta-timer':
        // Changeover with a neutral centre: neither contact is made at rest.
        if (element.state.starDeltaPosition === 'star') return [['15', '16']]
        if (element.state.starDeltaPosition === 'delta') return [['15', '18']]
        return []
      default:
        return []
    }
  }

  const stopAllTimers = (): void => {
    timerRuntimes.forEach(rt => {
      if (rt.handle) clearTimeout(rt.handle)
      if (rt.releaseHandle) clearTimeout(rt.releaseHandle)
    })
    timerRuntimes.clear()
  }

  const clearAll = (): void => {
    stopAllTimers()
    state.elements = []
    state.cables = []
    state.drawnCables = []
    state.selectedElement = null
    state.wiringMode = null
    state.cableDrawingMode = null
    state.nextId = 1
    saveState()
  }

  // --- Circuit documents (tabs) ---------------------------------------------

  const loadDocIntoState = (doc: CircuitDoc): void => {
    stopAllTimers()
    state.elements = doc.elements
    state.cables = doc.cables
    state.drawnCables = doc.drawnCables
    state.nextId = doc.nextId
    state.selectedElement = null
    state.wiringMode = null
    state.cableDrawingMode = null
    simulateCircuit()
  }

  const openDoc = (id: string): void => {
    if (id === workspace.activeId) return
    const target = workspace.docs.find(d => d.id === id)
    if (!target) return
    syncActiveDoc()
    workspace.activeId = id
    loadDocIntoState(target)
  }

  const uniqueDocName = (preferred?: string): string => {
    const taken = new Set(workspace.docs.map(d => d.name))
    if (preferred && !taken.has(preferred)) return preferred
    const base = preferred || 'Circuit'
    let n = preferred ? 2 : workspace.docs.length + 1
    while (taken.has(`${base} ${n}`)) n++
    return `${base} ${n}`
  }

  // Create a document and make it active. `contents` seeds it (import / sample).
  const createDoc = (name?: string, contents?: Pick<CircuitDoc, 'elements' | 'cables' | 'drawnCables' | 'nextId'>): CircuitDoc => {
    syncActiveDoc()
    const doc = emptyDoc(uniqueDocName(name))
    if (contents) {
      doc.elements = contents.elements
      doc.cables = contents.cables
      doc.drawnCables = contents.drawnCables
      doc.nextId = contents.nextId
    }
    workspace.docs.push(doc)
    workspace.activeId = doc.id
    loadDocIntoState(doc)
    return doc
  }

  const closeDoc = (id: string): void => {
    const index = workspace.docs.findIndex(d => d.id === id)
    if (index === -1) return
    const wasActive = workspace.activeId === id
    if (!wasActive) syncActiveDoc()

    workspace.docs.splice(index, 1)
    if (workspace.docs.length === 0) workspace.docs.push(emptyDoc('Circuit 1'))

    if (wasActive) {
      const next = workspace.docs[Math.min(index, workspace.docs.length - 1)]
      workspace.activeId = next.id
      loadDocIntoState(next)
    }
  }

  const renameDoc = (id: string, name: string): void => {
    const doc = workspace.docs.find(d => d.id === id)
    if (doc && name.trim()) doc.name = name.trim()
  }

  const activeDocName = (): string =>
    workspace.docs.find(d => d.id === workspace.activeId)?.name || 'circuit'

  // --- Import / export -------------------------------------------------------

  const exportActiveDoc = (): CircuitFile => {
    syncActiveDoc()
    return buildCircuitFile(activeDocName(), state.elements, state.cables, state.drawnCables)
  }

  const importCircuitFile = (file: CircuitFile, name?: string): CircuitDoc => {
    migrateSwitch5(file.elements, file.cables)
    return createDoc(name || file.name, {
      elements: file.elements,
      cables: file.cables,
      drawnCables: file.drawnCables,
      nextId: nextIdFor(file.elements, file.cables)
    })
  }

  // Cable drawing functions
  const startCableDrawing = (cableType: 'mmj3' | 'mmj5' | 'omm', startPoint: Point): void => {
    state.cableDrawingMode = {
      cableType,
      path: [startPoint],
      startPoint
    }
  }

  const addCablePoint = (point: Point): void => {
    if (state.cableDrawingMode) {
      state.cableDrawingMode.path.push(point)
    }
  }

  const cancelCableDrawing = (): void => {
    state.cableDrawingMode = null
  }

  const completeCableDrawing = (endPoint: Point): DrawnCable => {
    if (!state.cableDrawingMode) {
      throw new Error('No cable drawing in progress')
    }

    const { cableType, path, startPoint } = state.cableDrawingMode
    const config = CABLE_CONFIGS[cableType]
    const cableId = generateId()

    // Create terminal clusters at both ends
    const startClusterId = generateId()
    const endClusterId = generateId()

    const startTerminals = config.colors.map((color, i) => ({
      id: `${startClusterId}-${i}`,
      name: config.names[i],
      localX: 0,
      localY: i * 14,
      connected: [] as { cableId: string; wireColor: string }[],
      energized: false,
      color
    }))

    const endTerminals = config.colors.map((color, i) => ({
      id: `${endClusterId}-${i}`,
      name: config.names[i],
      localX: 0,
      localY: i * 14,
      connected: [] as { cableId: string; wireColor: string }[],
      energized: false,
      color
    }))

    const drawnCable: DrawnCable = {
      id: cableId,
      type: cableType,
      path: [...path, endPoint],
      startCluster: {
        id: startClusterId,
        x: startPoint.x,
        y: startPoint.y,
        terminals: startTerminals
      },
      endCluster: {
        id: endClusterId,
        x: endPoint.x,
        y: endPoint.y,
        terminals: endTerminals
      }
    }

    state.drawnCables.push(drawnCable)
    state.cableDrawingMode = null
    simulateCircuit()

    return drawnCable
  }

  const removeDrawnCable = (id: string): void => {
    const index = state.drawnCables.findIndex(c => c.id === id)
    if (index !== -1) {
      state.drawnCables.splice(index, 1)
      simulateCircuit()
    }
  }

  const updateDrawnCableCluster = (cableId: string, clusterType: 'start' | 'end', x: number, y: number): void => {
    const cable = state.drawnCables.find(c => c.id === cableId)
    if (cable) {
      if (clusterType === 'start') {
        cable.startCluster.x = x
        cable.startCluster.y = y
        cable.path[0] = { x, y }
      } else {
        cable.endCluster.x = x
        cable.endCluster.y = y
        cable.path[cable.path.length - 1] = { x, y }
      }
    }
  }

  // Dock a cable bundle to a junction box slot
  const dockCable = (cableId: string, cableEnd: 'A' | 'B', junctionBoxId: string, slotId: string): void => {
    const cable = state.elements.find(el => el.id === cableId)
    const junctionBox = state.elements.find(el => el.id === junctionBoxId)

    if (!cable || !junctionBox) return
    if (!cable.cableType) return
    if (!junctionBox.state.slots) return

    const slot = junctionBox.state.slots.find(s => s.id === slotId)
    if (!slot) return

    // Check if slot is already occupied
    if (slot.dockedCable) return

    // Update cable's docked state
    if (cableEnd === 'A') {
      cable.state.dockedA = { elementId: junctionBoxId, slotId }
    } else {
      cable.state.dockedB = { elementId: junctionBoxId, slotId }
    }

    // Update slot's docked cable
    slot.dockedCable = { elementId: cableId, end: cableEnd }

    // Regenerate junction box terminals to include the docked cable's wires
    regenerateJunctionBoxTerminals(junctionBoxId)

    simulateCircuit()
  }

  // Undock a cable from a junction box slot
  const undockCable = (cableId: string, cableEnd: 'A' | 'B'): void => {
    const cable = state.elements.find(el => el.id === cableId)
    if (!cable) return

    const dockInfo = cableEnd === 'A' ? cable.state.dockedA : cable.state.dockedB
    if (!dockInfo) return

    const junctionBox = state.elements.find(el => el.id === dockInfo.elementId)
    if (!junctionBox || !junctionBox.state.slots) return

    const slot = junctionBox.state.slots.find(s => s.id === dockInfo.slotId)
    if (slot) {
      slot.dockedCable = undefined
    }

    // Clear cable's docked state
    if (cableEnd === 'A') {
      cable.state.dockedA = undefined
    } else {
      cable.state.dockedB = undefined
    }

    // Regenerate junction box terminals
    regenerateJunctionBoxTerminals(dockInfo.elementId)

    simulateCircuit()
  }

  // Regenerate terminals for a junction box based on docked cables
  const regenerateJunctionBoxTerminals = (junctionBoxId: string): void => {
    const junctionBox = state.elements.find(el => el.id === junctionBoxId)
    if (!junctionBox || !junctionBox.state.slots) return

    const terminals: Element['terminals'] = []
    const boxSize = 150
    const slotSpacing = boxSize / 4

    // Group slots by side
    const topSlots = junctionBox.state.slots.filter(s => s.side === 'top')
    const bottomSlots = junctionBox.state.slots.filter(s => s.side === 'bottom')
    const leftSlots = junctionBox.state.slots.filter(s => s.side === 'left')
    const rightSlots = junctionBox.state.slots.filter(s => s.side === 'right')

    // Helper to generate terminals for a slot
    const generateSlotTerminals = (
      slot: typeof junctionBox.state.slots[0],
      slotIndex: number,
      side: 'top' | 'bottom' | 'left' | 'right'
    ) => {
      const basePos = (slotIndex + 1) * slotSpacing

      if (slot.dockedCable) {
        // Slot has a cable - generate wire terminals
        const cable = state.elements.find(el => el.id === slot.dockedCable!.elementId)
        if (cable && cable.wireColors && cable.wireNames) {
          const wireCount = cable.wireColors.length
          const terminalSpread = 30 // How far terminals spread from center
          const spacing = terminalSpread * 2 / Math.max(wireCount - 1, 1)
          const startOffset = -terminalSpread + (wireCount === 1 ? terminalSpread : 0)

          cable.wireColors.forEach((color, wireIndex) => {
            let localX: number, localY: number

            switch (side) {
              case 'top':
                localX = basePos + startOffset + wireIndex * spacing
                localY = 0
                break
              case 'bottom':
                localX = basePos + startOffset + wireIndex * spacing
                localY = boxSize
                break
              case 'left':
                localX = 0
                localY = basePos + startOffset + wireIndex * spacing
                break
              case 'right':
                localX = boxSize
                localY = basePos + startOffset + wireIndex * spacing
                break
            }

            terminals.push({
              id: `${junctionBoxId}-${slot.id}-${wireIndex}`,
              name: cable.wireNames![wireIndex],
              localX,
              localY,
              connected: [],
              energized: false,
              color
            })
          })
        }
      } else {
        // Empty slot - just the dock point
        let localX: number, localY: number
        switch (side) {
          case 'top':
            localX = basePos
            localY = 0
            break
          case 'bottom':
            localX = basePos
            localY = boxSize
            break
          case 'left':
            localX = 0
            localY = basePos
            break
          case 'right':
            localX = boxSize
            localY = basePos
            break
        }

        terminals.push({
          id: `${junctionBoxId}-${slot.id}`,
          name: slot.id,
          localX,
          localY,
          connected: [],
          energized: false
        })
      }
    }

    // Generate terminals for each side
    topSlots.forEach((slot, i) => generateSlotTerminals(slot, i, 'top'))
    bottomSlots.forEach((slot, i) => generateSlotTerminals(slot, i, 'bottom'))
    leftSlots.forEach((slot, i) => generateSlotTerminals(slot, i, 'left'))
    rightSlots.forEach((slot, i) => generateSlotTerminals(slot, i, 'right'))

    junctionBox.terminals = terminals
  }

  // Run initial simulation if there's saved state
  if (state.elements.length > 0) {
    simulateCircuit()
  }

  return {
    state,
    workspace,
    openDoc,
    createDoc,
    closeDoc,
    renameDoc,
    activeDocName,
    exportActiveDoc,
    importCircuitFile,
    addElement,
    removeElement,
    updateElement,
    rotateElement,
    selectElement,
    setButtonPressed,
    setTimerConfig,
    setStarDeltaConfig,
    startWiring,
    addControlPoint,
    cancelWiring,
    completeWire,
    removeCable,
    toggleSwitch,
    simulateCircuit,
    clearAll,
    updateWirePoint,
    connectCableWire,
    startCableDrawing,
    addCablePoint,
    cancelCableDrawing,
    completeCableDrawing,
    removeDrawnCable,
    updateDrawnCableCluster,
    dockCable,
    undockCable
  }
}

function createCable(type: string, id: string): Cable {
  const wireColors: Record<string, { color: string }[]> = {
    'single': [{ color: '#333' }],
    'mmj3': [
      { color: '#d32f2f' },  // Red - L
      { color: '#1976d2' },  // Blue - N
      { color: '#7cb342' }   // Yellow-Green - PE (using green)
    ],
    'mmj5': [
      { color: '#d32f2f' },  // Red - L1
      { color: '#212121' },  // Black - L2
      { color: '#757575' },  // Gray - L3
      { color: '#1976d2' },  // Blue - N
      { color: '#7cb342' }   // Yellow-Green - PE
    ],
    'omm': [
      { color: '#e91e63' },  // 1
      { color: '#9c27b0' },  // 2
      { color: '#673ab7' },  // 3
      { color: '#3f51b5' },  // 4
      { color: '#009688' },  // 5
      { color: '#ff9800' },  // 6
      { color: '#795548' }   // 7
    ]
  }

  return {
    id,
    type,
    wires: (wireColors[type] || wireColors['single']).map((w) => ({
      color: w.color,
      from: null,
      to: null
    }))
  }
}
