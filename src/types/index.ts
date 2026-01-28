export interface Terminal {
  id: string
  name: string
  localX: number
  localY: number
  connected: ConnectionRef[]
  energized: boolean
  color?: string
}

export interface ConnectionRef {
  cableId: string
  wireColor: string
}

export interface ElementState {
  on?: boolean
  on1?: boolean
  on2?: boolean
  position?: number
  position1?: number
  position2?: number
  crossed?: boolean
}

export interface Element {
  id: string
  type: string
  x: number
  y: number
  rotation: number
  state: ElementState
  terminals: Terminal[]
  cableType?: string
  wireColors?: string[]
  wireNames?: string[]
  internalConnections?: [string, string][]
}

export interface WireEndpoint {
  elementId: string
  terminalId: string
}

export interface Wire {
  color: string
  from: WireEndpoint | null
  to: WireEndpoint | null
  controlPoints?: Point[]
}

export interface Cable {
  id: string
  type: string
  wires: Wire[]
}

export interface Point {
  x: number
  y: number
}

export interface WiringMode {
  cableType: string
  wireIndex: number
  fromElement: string
  fromTerminal: string
  controlPoints: Point[]
}

export interface CircuitState {
  elements: Element[]
  cables: Cable[]
  selectedElement: string | null
  wiringMode: WiringMode | null
  nextId: number
}
