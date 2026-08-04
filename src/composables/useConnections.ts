import type { CircuitState, Element, Wire, Point, WireEndpoint } from '../types'

// Junction box constants (must match JunctionBox.vue)
const JUNCTION_BOX_SIZE = 150
const WIRE_TERMINAL_SPACING = 10
const WIRE_TERMINAL_INSET = 12

export function useConnections(circuitState: CircuitState) {
  const getTerminalPosition = (elementId: string, terminalId: string): Point | null => {
    const element = circuitState.elements.find(e => e.id === elementId)
    if (!element) return null

    const terminal = element.terminals.find(t => t.id === terminalId)
    if (!terminal) return null

    // Apply rotation to terminal position
    const rotation = element.rotation || 0
    const rad = (rotation * Math.PI) / 180

    // Get element center for rotation (approximate)
    const centerX = getElementWidth(element) / 2
    const centerY = getElementHeight(element) / 2

    // Rotate terminal position around element center
    const localX = terminal.localX - centerX
    const localY = terminal.localY - centerY

    const rotatedX = localX * Math.cos(rad) - localY * Math.sin(rad)
    const rotatedY = localX * Math.sin(rad) + localY * Math.cos(rad)

    return {
      x: element.x + centerX + rotatedX,
      y: element.y + centerY + rotatedY
    }
  }

  // Get position for a wire endpoint, handling wire-specific connections
  const getEndpointPosition = (endpoint: WireEndpoint): Point | null => {
    const element = circuitState.elements.find(e => e.id === endpoint.elementId)
    if (!element) return null

    const terminal = element.terminals.find(t => t.id === endpoint.terminalId)
    if (!terminal) return null

    // Check if this connects to a specific wire in a cable
    if (endpoint.connectedCableId !== undefined && endpoint.connectedWireIndex !== undefined) {
      const cable = circuitState.cables.find(c => c.id === endpoint.connectedCableId)
      if (cable) {
        // Calculate expanded wire terminal position
        const wireCount = cable.wires.length
        const wireIndex = endpoint.connectedWireIndex
        const totalSpread = (wireCount - 1) * WIRE_TERMINAL_SPACING
        const startOffset = -totalSpread / 2

        // Determine which edge the terminal is on
        const isTopEdge = terminal.localY === 0
        const isBottomEdge = terminal.localY === JUNCTION_BOX_SIZE
        const isLeftEdge = terminal.localX === 0
        const isRightEdge = terminal.localX === JUNCTION_BOX_SIZE

        let localX = terminal.localX
        let localY = terminal.localY

        if (isTopEdge) {
          localX += startOffset + wireIndex * WIRE_TERMINAL_SPACING
          localY = WIRE_TERMINAL_INSET
        } else if (isBottomEdge) {
          localX += startOffset + wireIndex * WIRE_TERMINAL_SPACING
          localY = JUNCTION_BOX_SIZE - WIRE_TERMINAL_INSET
        } else if (isLeftEdge) {
          localX = WIRE_TERMINAL_INSET
          localY += startOffset + wireIndex * WIRE_TERMINAL_SPACING
        } else if (isRightEdge) {
          localX = JUNCTION_BOX_SIZE - WIRE_TERMINAL_INSET
          localY += startOffset + wireIndex * WIRE_TERMINAL_SPACING
        }

        // Apply rotation
        const rotation = element.rotation || 0
        const rad = (rotation * Math.PI) / 180
        const centerX = JUNCTION_BOX_SIZE / 2
        const centerY = JUNCTION_BOX_SIZE / 2

        const relX = localX - centerX
        const relY = localY - centerY
        const rotatedX = relX * Math.cos(rad) - relY * Math.sin(rad)
        const rotatedY = relX * Math.sin(rad) + relY * Math.cos(rad)

        return {
          x: element.x + centerX + rotatedX,
          y: element.y + centerY + rotatedY
        }
      }
    }

    // Default: use regular terminal position
    return getTerminalPosition(endpoint.elementId, endpoint.terminalId)
  }

  const getElementWidth = (element: Element): number => {
    if (!element.terminals || element.terminals.length === 0) return 60
    const maxX = Math.max(...element.terminals.map(t => t.localX))
    return maxX + 10
  }

  const getElementHeight = (element: Element): number => {
    if (!element.terminals || element.terminals.length === 0) return 40
    const maxY = Math.max(...element.terminals.map(t => t.localY))
    return maxY + 10
  }

  const getWirePath = (wire: Wire): string | null => {
    if (!wire.from || !wire.to) return null

    // Use getEndpointPosition to handle wire-specific connections
    const fromPos = getEndpointPosition(wire.from)
    const toPos = getEndpointPosition(wire.to)

    if (!fromPos || !toPos) return null

    // If there are control points, create smooth bezier curve
    if (wire.controlPoints && wire.controlPoints.length > 0) {
      const points = [fromPos, ...wire.controlPoints, toPos]
      return createSmoothPath(points)
    }

    // Default: simple straight line
    return `M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`
  }

  const createSmoothPath = (points: Point[]): string => {
    if (points.length < 2) return ''

    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
    }

    let path = `M ${points[0].x} ${points[0].y}`

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(points.length - 1, i + 2)]

      // Catmull-Rom to Bezier conversion
      const tension = 0.3
      const cp1x = p1.x + (p2.x - p0.x) * tension
      const cp1y = p1.y + (p2.y - p0.y) * tension
      const cp2x = p2.x - (p3.x - p1.x) * tension
      const cp2y = p2.y - (p3.y - p1.y) * tension

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }

    return path
  }

  const getWireEndpoints = (wire: Wire): { from: Point | null; to: Point | null } | null => {
    if (!wire.from || !wire.to) return null

    // Use getEndpointPosition to handle wire-specific connections
    const fromPos = getEndpointPosition(wire.from)
    const toPos = getEndpointPosition(wire.to)

    return { from: fromPos, to: toPos }
  }

  return {
    getTerminalPosition,
    getEndpointPosition,
    getWirePath,
    getWireEndpoints
  }
}
