import type { CircuitState, Element, Wire, Point } from '../types'

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

    const fromPos = getTerminalPosition(wire.from.elementId, wire.from.terminalId)
    const toPos = getTerminalPosition(wire.to.elementId, wire.to.terminalId)

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

    const fromPos = getTerminalPosition(wire.from.elementId, wire.from.terminalId)
    const toPos = getTerminalPosition(wire.to.elementId, wire.to.terminalId)

    return { from: fromPos, to: toPos }
  }

  return {
    getTerminalPosition,
    getWirePath,
    getWireEndpoints
  }
}
