import { reactive, watch } from 'vue'
import type { Element, Cable, CircuitState } from '../types'

const STORAGE_KEY = 'electric-circuit-state'

interface SavedState {
  elements: Element[]
  cables: Cable[]
  nextId: number
}

// Load saved state from localStorage
const loadState = (): SavedState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as SavedState
      return {
        elements: parsed.elements || [],
        cables: parsed.cables || [],
        nextId: parsed.nextId || 1
      }
    }
  } catch (e) {
    console.warn('Failed to load circuit state:', e)
  }
  return { elements: [], cables: [], nextId: 1 }
}

const savedState = loadState()

const state: CircuitState = reactive({
  elements: savedState.elements,
  cables: savedState.cables,
  selectedElement: null,
  wiringMode: null,
  nextId: savedState.nextId
})

// Save state to localStorage on changes
const saveState = () => {
  try {
    const toSave = {
      elements: state.elements,
      cables: state.cables,
      nextId: state.nextId
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (e) {
    console.warn('Failed to save circuit state:', e)
  }
}

// Watch for changes and save
watch(() => [state.elements, state.cables, state.nextId], saveState, { deep: true })

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

  const startWiring = (cableType: string, elementId: string, terminalId: string): void => {
    state.wiringMode = {
      cableType,
      wireIndex: 0,
      fromElement: elementId,
      fromTerminal: terminalId,
      controlPoints: []
    }
  }

  const addControlPoint = (x: number, y: number): void => {
    if (state.wiringMode) {
      state.wiringMode.controlPoints.push({ x, y })
    }
  }

  const cancelWiring = (): void => {
    state.wiringMode = null
  }

  const completeWire = (toElementId: string, toTerminalId: string): void => {
    if (!state.wiringMode) return

    const { cableType, fromElement, fromTerminal, controlPoints } = state.wiringMode

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
      wire.from = { elementId: fromElement, terminalId: fromTerminal }
      wire.to = { elementId: toElementId, terminalId: toTerminalId }
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

  // Circuit simulation
  const simulateCircuit = (): void => {
    // Reset all energized states
    state.elements.forEach(el => {
      el.terminals.forEach(t => {
        t.energized = false
      })
      if (el.type === 'light' || el.type === 'light-grounded') {
        el.state.on = false
      }
    })

    // Find power inputs and mark L terminal as energized
    const powerInputs = state.elements.filter(el => el.type === 'power-input')
    powerInputs.forEach(pi => {
      const lTerm = pi.terminals.find(t => t.name === 'L')
      if (lTerm) lTerm.energized = true
    })

    // Propagate energy through the circuit
    let changed = true
    let iterations = 0
    const maxIterations = 100

    while (changed && iterations < maxIterations) {
      changed = false
      iterations++

      state.cables.forEach(cable => {
        cable.wires.forEach(wire => {
          if (!wire.from || !wire.to) return
          const from = wire.from
          const to = wire.to

          const fromEl = state.elements.find(e => e.id === from.elementId)
          const toEl = state.elements.find(e => e.id === to.elementId)
          if (!fromEl || !toEl) return

          const fromTerm = fromEl.terminals.find(t => t.id === from.terminalId)
          const toTerm = toEl.terminals.find(t => t.id === to.terminalId)
          if (!fromTerm || !toTerm) return

          // Propagate energy through wire
          if (fromTerm.energized && !toTerm.energized) {
            toTerm.energized = true
            changed = true
          } else if (toTerm.energized && !fromTerm.energized) {
            fromTerm.energized = true
            changed = true
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

  const isConnectedToNeutral = (elementId: string, terminalId: string | undefined, visited: Set<string> = new Set()): boolean => {
    const key = `${elementId}-${terminalId}`
    if (visited.has(key)) return false
    visited.add(key)

    // Check if this terminal is a power input's N terminal
    const element = state.elements.find(e => e.id === elementId)
    if (element?.type === 'power-input') {
      const term = element.terminals.find(t => t.id === terminalId)
      if (term?.name === 'N') return true
    }

    // Follow wires
    for (const cable of state.cables) {
      for (const wire of cable.wires) {
        if (!wire.from || !wire.to) continue

        if (wire.from.elementId === elementId && wire.from.terminalId === terminalId) {
          if (isConnectedToNeutral(wire.to.elementId, wire.to.terminalId, visited)) {
            return true
          }
        }
        if (wire.to.elementId === elementId && wire.to.terminalId === terminalId) {
          if (isConnectedToNeutral(wire.from.elementId, wire.from.terminalId, visited)) {
            return true
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
        if (element.state.on1) conn5.push(['IN1', 'OUT1'])
        if (element.state.on2) conn5.push(['IN2', 'OUT2'])
        return conn5
      }
      case 'switch6':
        return element.state.position === 0 ? [['COM', 'L1']] : [['COM', 'L2']]
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
      default:
        return []
    }
  }

  const clearAll = (): void => {
    state.elements = []
    state.cables = []
    state.selectedElement = null
    state.wiringMode = null
    state.nextId = 1
    saveState()
  }

  // Run initial simulation if there's saved state
  if (state.elements.length > 0) {
    simulateCircuit()
  }

  return {
    state,
    addElement,
    removeElement,
    updateElement,
    rotateElement,
    selectElement,
    startWiring,
    addControlPoint,
    cancelWiring,
    completeWire,
    removeCable,
    toggleSwitch,
    simulateCircuit,
    clearAll,
    updateWirePoint
  }
}

function createElementByType(type: string, id: string, x: number, y: number): Element {
  const base = { id, type, x, y, rotation: 0 }

  switch (type) {
    case 'power-input':
      return {
        ...base,
        state: {},
        terminals: [
          { id: `${id}-L`, name: 'L', localX: 0, localY: 0, connected: [], energized: true },
          { id: `${id}-N`, name: 'N', localX: 30, localY: 0, connected: [], energized: false },
          { id: `${id}-PE`, name: 'PE', localX: 60, localY: 0, connected: [], energized: false }
        ]
      }
    case 'light':
      return {
        ...base,
        state: { on: false },
        terminals: [
          { id: `${id}-L`, name: 'L', localX: 0, localY: 40, connected: [], energized: false },
          { id: `${id}-N`, name: 'N', localX: 40, localY: 40, connected: [], energized: false }
        ]
      }
    case 'light-grounded':
      return {
        ...base,
        state: { on: false },
        terminals: [
          { id: `${id}-L`, name: 'L', localX: 0, localY: 40, connected: [], energized: false },
          { id: `${id}-N`, name: 'N', localX: 30, localY: 40, connected: [], energized: false },
          { id: `${id}-PE`, name: 'PE', localX: 60, localY: 40, connected: [], energized: false }
        ]
      }
    case 'switch1':
      return {
        ...base,
        state: { on: false },
        terminals: [
          { id: `${id}-IN`, name: 'IN', localX: 0, localY: 20, connected: [], energized: false },
          { id: `${id}-OUT`, name: 'OUT', localX: 60, localY: 20, connected: [], energized: false }
        ]
      }
    case 'switch5':
      return {
        ...base,
        state: { on1: false, on2: false },
        terminals: [
          { id: `${id}-IN1`, name: 'IN1', localX: 0, localY: 10, connected: [], energized: false },
          { id: `${id}-OUT1`, name: 'OUT1', localX: 60, localY: 10, connected: [], energized: false },
          { id: `${id}-IN2`, name: 'IN2', localX: 0, localY: 55, connected: [], energized: false },
          { id: `${id}-OUT2`, name: 'OUT2', localX: 60, localY: 55, connected: [], energized: false }
        ]
      }
    case 'switch6':
      return {
        ...base,
        state: { position: 0 },
        terminals: [
          { id: `${id}-COM`, name: 'COM', localX: 0, localY: 20, connected: [], energized: false },
          { id: `${id}-L1`, name: 'L1', localX: 60, localY: 0, connected: [], energized: false },
          { id: `${id}-L2`, name: 'L2', localX: 60, localY: 40, connected: [], energized: false }
        ]
      }
    case 'switch66':
      return {
        ...base,
        state: { position1: 0, position2: 0 },
        terminals: [
          { id: `${id}-COM1`, name: 'COM1', localX: 0, localY: 10, connected: [], energized: false },
          { id: `${id}-L1A`, name: 'L1A', localX: 60, localY: 0, connected: [], energized: false },
          { id: `${id}-L1B`, name: 'L1B', localX: 60, localY: 20, connected: [], energized: false },
          { id: `${id}-COM2`, name: 'COM2', localX: 0, localY: 50, connected: [], energized: false },
          { id: `${id}-L2A`, name: 'L2A', localX: 60, localY: 40, connected: [], energized: false },
          { id: `${id}-L2B`, name: 'L2B', localX: 60, localY: 60, connected: [], energized: false }
        ]
      }
    case 'switch7':
      return {
        ...base,
        state: { crossed: false },
        terminals: [
          { id: `${id}-IN1`, name: 'IN1', localX: 0, localY: 10, connected: [], energized: false },
          { id: `${id}-IN2`, name: 'IN2', localX: 0, localY: 40, connected: [], energized: false },
          { id: `${id}-OUT1`, name: 'OUT1', localX: 60, localY: 10, connected: [], energized: false },
          { id: `${id}-OUT2`, name: 'OUT2', localX: 60, localY: 40, connected: [], energized: false }
        ]
      }
    case 'cable-mmj3':
      return {
        ...base,
        state: {},
        cableType: 'mmj3',
        wireColors: ['#d32f2f', '#1976d2', '#7cb342'],
        wireNames: ['L', 'N', 'PE'],
        internalConnections: [['A1', 'B1'], ['A2', 'B2'], ['A3', 'B3']],
        terminals: [
          // Left side (A)
          { id: `${id}-A1`, name: 'L', localX: 0, localY: 10, connected: [], energized: false, color: '#d32f2f' },
          { id: `${id}-A2`, name: 'N', localX: 0, localY: 30, connected: [], energized: false, color: '#1976d2' },
          { id: `${id}-A3`, name: 'PE', localX: 0, localY: 50, connected: [], energized: false, color: '#7cb342' },
          // Right side (B)
          { id: `${id}-B1`, name: 'L', localX: 150, localY: 10, connected: [], energized: false, color: '#d32f2f' },
          { id: `${id}-B2`, name: 'N', localX: 150, localY: 30, connected: [], energized: false, color: '#1976d2' },
          { id: `${id}-B3`, name: 'PE', localX: 150, localY: 50, connected: [], energized: false, color: '#7cb342' }
        ]
      }
    case 'cable-mmj5':
      return {
        ...base,
        state: {},
        cableType: 'mmj5',
        wireColors: ['#d32f2f', '#212121', '#757575', '#1976d2', '#7cb342'],
        wireNames: ['L1', 'L2', 'L3', 'N', 'PE'],
        internalConnections: [['A1', 'B1'], ['A2', 'B2'], ['A3', 'B3'], ['A4', 'B4'], ['A5', 'B5']],
        terminals: [
          // Left side (A)
          { id: `${id}-A1`, name: 'L1', localX: 0, localY: 10, connected: [], energized: false, color: '#d32f2f' },
          { id: `${id}-A2`, name: 'L2', localX: 0, localY: 26, connected: [], energized: false, color: '#212121' },
          { id: `${id}-A3`, name: 'L3', localX: 0, localY: 42, connected: [], energized: false, color: '#757575' },
          { id: `${id}-A4`, name: 'N', localX: 0, localY: 58, connected: [], energized: false, color: '#1976d2' },
          { id: `${id}-A5`, name: 'PE', localX: 0, localY: 74, connected: [], energized: false, color: '#7cb342' },
          // Right side (B)
          { id: `${id}-B1`, name: 'L1', localX: 150, localY: 10, connected: [], energized: false, color: '#d32f2f' },
          { id: `${id}-B2`, name: 'L2', localX: 150, localY: 26, connected: [], energized: false, color: '#212121' },
          { id: `${id}-B3`, name: 'L3', localX: 150, localY: 42, connected: [], energized: false, color: '#757575' },
          { id: `${id}-B4`, name: 'N', localX: 150, localY: 58, connected: [], energized: false, color: '#1976d2' },
          { id: `${id}-B5`, name: 'PE', localX: 150, localY: 74, connected: [], energized: false, color: '#7cb342' }
        ]
      }
    case 'cable-omm':
      return {
        ...base,
        state: {},
        cableType: 'omm',
        wireColors: ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#009688', '#ff9800', '#795548'],
        wireNames: ['1', '2', '3', '4', '5', '6', '7'],
        internalConnections: [['A1', 'B1'], ['A2', 'B2'], ['A3', 'B3'], ['A4', 'B4'], ['A5', 'B5'], ['A6', 'B6'], ['A7', 'B7']],
        terminals: [
          // Left side (A)
          { id: `${id}-A1`, name: '1', localX: 0, localY: 10, connected: [], energized: false, color: '#e91e63' },
          { id: `${id}-A2`, name: '2', localX: 0, localY: 24, connected: [], energized: false, color: '#9c27b0' },
          { id: `${id}-A3`, name: '3', localX: 0, localY: 38, connected: [], energized: false, color: '#673ab7' },
          { id: `${id}-A4`, name: '4', localX: 0, localY: 52, connected: [], energized: false, color: '#3f51b5' },
          { id: `${id}-A5`, name: '5', localX: 0, localY: 66, connected: [], energized: false, color: '#009688' },
          { id: `${id}-A6`, name: '6', localX: 0, localY: 80, connected: [], energized: false, color: '#ff9800' },
          { id: `${id}-A7`, name: '7', localX: 0, localY: 94, connected: [], energized: false, color: '#795548' },
          // Right side (B)
          { id: `${id}-B1`, name: '1', localX: 150, localY: 10, connected: [], energized: false, color: '#e91e63' },
          { id: `${id}-B2`, name: '2', localX: 150, localY: 24, connected: [], energized: false, color: '#9c27b0' },
          { id: `${id}-B3`, name: '3', localX: 150, localY: 38, connected: [], energized: false, color: '#673ab7' },
          { id: `${id}-B4`, name: '4', localX: 150, localY: 52, connected: [], energized: false, color: '#3f51b5' },
          { id: `${id}-B5`, name: '5', localX: 150, localY: 66, connected: [], energized: false, color: '#009688' },
          { id: `${id}-B6`, name: '6', localX: 150, localY: 80, connected: [], energized: false, color: '#ff9800' },
          { id: `${id}-B7`, name: '7', localX: 150, localY: 94, connected: [], energized: false, color: '#795548' }
        ]
      }
    default:
      return {
        ...base,
        state: {},
        terminals: []
      }
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
