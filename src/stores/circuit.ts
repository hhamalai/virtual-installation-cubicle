import { reactive, watch } from 'vue'
import type { Element, Cable, CircuitState, DrawnCable, Point } from '../types'

const STORAGE_KEY = 'electric-circuit-state'

interface SavedState {
  elements: Element[]
  cables: Cable[]
  drawnCables: DrawnCable[]
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
        drawnCables: parsed.drawnCables || [],
        nextId: parsed.nextId || 1
      }
    }
  } catch (e) {
    console.warn('Failed to load circuit state:', e)
  }
  return { elements: [], cables: [], drawnCables: [], nextId: 1 }
}

const savedState = loadState()

const state: CircuitState = reactive({
  elements: savedState.elements,
  cables: savedState.cables,
  drawnCables: savedState.drawnCables,
  selectedElement: null,
  wiringMode: null,
  cableDrawingMode: null,
  nextId: savedState.nextId
})

// Save state to localStorage on changes
const saveState = () => {
  try {
    const toSave = {
      elements: state.elements,
      cables: state.cables,
      drawnCables: state.drawnCables,
      nextId: state.nextId
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (e) {
    console.warn('Failed to save circuit state:', e)
  }
}

// Watch for changes and save
watch(() => [state.elements, state.cables, state.drawnCables, state.nextId], saveState, { deep: true })

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

  const addControlPoint = (x: number, y: number): void => {
    if (state.wiringMode) {
      state.wiringMode.controlPoints.push({ x, y })
    }
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
      // Reset relay coil states
      if (el.type.startsWith('relay-')) {
        el.state.coilEnergized = false
      }
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
      })

      // If no coil states changed, the simulation is fully stable
      if (!coilStateChanged) break

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
      default:
        return []
    }
  }

  const clearAll = (): void => {
    state.elements = []
    state.cables = []
    state.drawnCables = []
    state.selectedElement = null
    state.wiringMode = null
    state.cableDrawingMode = null
    state.nextId = 1
    saveState()
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
    // Two-pole relays: 30px wide x 90px tall.
    // Contacts 1,3 on top; 2,4 on bottom; coil A1 (left) / N (right) in the middle.
    // Pole 1 = terminals 1-2, pole 2 = terminals 3-4.
    case 'relay-no-no':
    case 'relay-no-nc':
    case 'relay-nc-nc':
      return {
        ...base,
        state: { coilEnergized: false },
        terminals: [
          { id: `${id}-1`, name: '1', localX: 7, localY: 0, connected: [], energized: false },
          { id: `${id}-3`, name: '3', localX: 23, localY: 0, connected: [], energized: false },
          { id: `${id}-A1`, name: 'A1', localX: 0, localY: 45, connected: [], energized: false },
          { id: `${id}-N`, name: 'N', localX: 30, localY: 45, connected: [], energized: false },
          { id: `${id}-2`, name: '2', localX: 7, localY: 90, connected: [], energized: false },
          { id: `${id}-4`, name: '4', localX: 23, localY: 90, connected: [], energized: false }
        ]
      }
    case 'junction-box': {
      // Junction box with 3 slots per side (12 total - 4 sides)
      // Each slot can accept one cable bundle
      const boxSize = 150
      const slots = [
        // Top side
        { id: 'T1', side: 'top' as const, dockedCable: undefined },
        { id: 'T2', side: 'top' as const, dockedCable: undefined },
        { id: 'T3', side: 'top' as const, dockedCable: undefined },
        // Bottom side
        { id: 'B1', side: 'bottom' as const, dockedCable: undefined },
        { id: 'B2', side: 'bottom' as const, dockedCable: undefined },
        { id: 'B3', side: 'bottom' as const, dockedCable: undefined },
        // Left side
        { id: 'L1', side: 'left' as const, dockedCable: undefined },
        { id: 'L2', side: 'left' as const, dockedCable: undefined },
        { id: 'L3', side: 'left' as const, dockedCable: undefined },
        // Right side
        { id: 'R1', side: 'right' as const, dockedCable: undefined },
        { id: 'R2', side: 'right' as const, dockedCable: undefined },
        { id: 'R3', side: 'right' as const, dockedCable: undefined }
      ]
      // Initial terminals are just the 12 slot dock points
      const slotSpacing = boxSize / 4
      return {
        ...base,
        state: { slots },
        terminals: [
          // Top side terminals
          { id: `${id}-T1`, name: 'T1', localX: slotSpacing, localY: 0, connected: [], energized: false },
          { id: `${id}-T2`, name: 'T2', localX: slotSpacing * 2, localY: 0, connected: [], energized: false },
          { id: `${id}-T3`, name: 'T3', localX: slotSpacing * 3, localY: 0, connected: [], energized: false },
          // Bottom side terminals
          { id: `${id}-B1`, name: 'B1', localX: slotSpacing, localY: boxSize, connected: [], energized: false },
          { id: `${id}-B2`, name: 'B2', localX: slotSpacing * 2, localY: boxSize, connected: [], energized: false },
          { id: `${id}-B3`, name: 'B3', localX: slotSpacing * 3, localY: boxSize, connected: [], energized: false },
          // Left side terminals
          { id: `${id}-L1`, name: 'L1', localX: 0, localY: slotSpacing, connected: [], energized: false },
          { id: `${id}-L2`, name: 'L2', localX: 0, localY: slotSpacing * 2, connected: [], energized: false },
          { id: `${id}-L3`, name: 'L3', localX: 0, localY: slotSpacing * 3, connected: [], energized: false },
          // Right side terminals
          { id: `${id}-R1`, name: 'R1', localX: boxSize, localY: slotSpacing, connected: [], energized: false },
          { id: `${id}-R2`, name: 'R2', localX: boxSize, localY: slotSpacing * 2, connected: [], energized: false },
          { id: `${id}-R3`, name: 'R3', localX: boxSize, localY: slotSpacing * 3, connected: [], energized: false }
        ]
      }
    }
    case 'distribution-board': {
      // Distribution board: larger enclosure with integrated power source
      // 7 cable slots per side, 2 DIN rails, internal busbars with terminals
      const boardWidth = 400
      const boardHeight = 300
      const slotsPerSide = 7
      const busbarTerminals = 8 // Number of terminals per busbar
      const topBottomSpacing = boardWidth / (slotsPerSide + 1)
      const leftRightSpacing = boardHeight / (slotsPerSide + 1)
      const busbarSpacing = (boardWidth - 60) / (busbarTerminals + 1) // Spacing for busbar terminals

      // Busbar Y positions (must match the component) - only N and PE busbars
      const busbarNY = boardHeight - 29
      const busbarPEY = boardHeight - 17

      const dbSlots = [
        // Top side (7 slots)
        ...Array.from({ length: slotsPerSide }, (_, i) => ({
          id: `T${i + 1}`,
          side: 'top' as const,
          dockedCable: undefined
        })),
        // Bottom side (7 slots)
        ...Array.from({ length: slotsPerSide }, (_, i) => ({
          id: `B${i + 1}`,
          side: 'bottom' as const,
          dockedCable: undefined
        })),
        // Left side (7 slots)
        ...Array.from({ length: slotsPerSide }, (_, i) => ({
          id: `L${i + 1}`,
          side: 'left' as const,
          dockedCable: undefined
        })),
        // Right side (7 slots)
        ...Array.from({ length: slotsPerSide }, (_, i) => ({
          id: `R${i + 1}`,
          side: 'right' as const,
          dockedCable: undefined
        }))
      ]

      // Build terminals array: power terminals + busbar terminals + slot terminals
      const dbTerminals = [
        // Main power input terminals (inside the power section)
        { id: `${id}-L`, name: 'L', localX: 30, localY: 60, connected: [], energized: true, color: '#d32f2f' },
        { id: `${id}-N`, name: 'N', localX: 60, localY: 60, connected: [], energized: false, color: '#1976d2' },
        { id: `${id}-PE`, name: 'PE', localX: 90, localY: 60, connected: [], energized: false, color: '#7cb342' },
        // N busbar terminals (L has no busbar - connections go through circuit breakers)
        ...Array.from({ length: busbarTerminals }, (_, i) => ({
          id: `${id}-BN${i + 1}`,
          name: `BN${i + 1}`,
          localX: 30 + (i + 1) * busbarSpacing,
          localY: busbarNY,
          connected: [] as { cableId: string; wireColor: string }[],
          energized: false,
          color: '#1976d2'
        })),
        // PE busbar terminals
        ...Array.from({ length: busbarTerminals }, (_, i) => ({
          id: `${id}-BPE${i + 1}`,
          name: `BPE${i + 1}`,
          localX: 30 + (i + 1) * busbarSpacing,
          localY: busbarPEY,
          connected: [] as { cableId: string; wireColor: string }[],
          energized: false,
          color: '#7cb342'
        })),
        // Top side slot terminals
        ...Array.from({ length: slotsPerSide }, (_, i) => ({
          id: `${id}-T${i + 1}`,
          name: `T${i + 1}`,
          localX: (i + 1) * topBottomSpacing,
          localY: 0,
          connected: [] as { cableId: string; wireColor: string }[],
          energized: false
        })),
        // Bottom side slot terminals
        ...Array.from({ length: slotsPerSide }, (_, i) => ({
          id: `${id}-B${i + 1}`,
          name: `B${i + 1}`,
          localX: (i + 1) * topBottomSpacing,
          localY: boardHeight,
          connected: [] as { cableId: string; wireColor: string }[],
          energized: false
        })),
        // Left side slot terminals
        ...Array.from({ length: slotsPerSide }, (_, i) => ({
          id: `${id}-L${i + 1}`,
          name: `L${i + 1}`,
          localX: 0,
          localY: (i + 1) * leftRightSpacing,
          connected: [] as { cableId: string; wireColor: string }[],
          energized: false
        })),
        // Right side slot terminals
        ...Array.from({ length: slotsPerSide }, (_, i) => ({
          id: `${id}-R${i + 1}`,
          name: `R${i + 1}`,
          localX: boardWidth,
          localY: (i + 1) * leftRightSpacing,
          connected: [] as { cableId: string; wireColor: string }[],
          energized: false
        }))
      ]

      // Internal connections: N and PE busbar terminals connect to main N and PE
      const internalConns: [string, string][] = [
        // Connect all N busbar terminals to main N
        ...Array.from({ length: busbarTerminals }, (_, i) => ['N', `BN${i + 1}`] as [string, string]),
        // Connect all PE busbar terminals to main PE
        ...Array.from({ length: busbarTerminals }, (_, i) => ['PE', `BPE${i + 1}`] as [string, string])
      ]

      return {
        ...base,
        state: { slots: dbSlots, dinRails: [{ id: 'din1', y: 100 }, { id: 'din2', y: 160 }] },
        terminals: dbTerminals,
        internalConnections: internalConns
      }
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
