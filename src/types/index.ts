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

export interface JunctionBoxPort {
  id: string
  type: 'mmj3' | 'mmj5' | 'omm'
  side: 'left' | 'right'
}

export interface JunctionBoxSlot {
  id: string
  side: 'left' | 'right' | 'top' | 'bottom'
  dockedCable?: {
    elementId: string
    end: 'A' | 'B'
  }
}

export interface CableDockInfo {
  elementId: string  // junction box element id
  slotId: string     // slot id on junction box
}

export interface DinRail {
  id: string
  y: number
}

export interface DinMountInfo {
  boardId: string    // Distribution board element ID
  railId: string     // DIN rail ID
  position: number   // X position on the rail
}

export interface ElementState {
  on?: boolean
  on1?: boolean
  on2?: boolean
  position?: number
  position1?: number
  position2?: number
  crossed?: boolean
  coilEnergized?: boolean
  // For push buttons - which momentary buttons are held down
  greenPressed?: boolean
  redPressed?: boolean
  ports?: JunctionBoxPort[]
  slots?: JunctionBoxSlot[]
  // For cable bundles - which junction box slots they're docked to
  dockedA?: CableDockInfo
  dockedB?: CableDockInfo
  // For distribution boards - DIN rails
  dinRails?: DinRail[]
  // For relays - DIN rail mounting info
  mountedOn?: DinMountInfo
}

// Drawn cable with terminal clusters at each end
export interface DrawnCable {
  id: string
  type: 'mmj3' | 'mmj5' | 'omm'
  path: Point[]
  startCluster: TerminalCluster
  endCluster: TerminalCluster
}

export interface TerminalCluster {
  id: string
  x: number
  y: number
  terminals: Terminal[]
  // If attached to a junction box
  attachedTo?: {
    elementId: string
    portId: string
  }
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
  // Optional: if connecting to a specific wire in a multi-wire cable at this terminal
  connectedCableId?: string
  connectedWireIndex?: number
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
  // Optional: if starting from a specific wire in a multi-wire cable
  fromConnectedCableId?: string
  fromConnectedWireIndex?: number
  // Optional: custom color for single-wire cables
  wireColor?: string
}

export interface CircuitState {
  elements: Element[]
  cables: Cable[]
  drawnCables: DrawnCable[]
  selectedElement: string | null
  wiringMode: WiringMode | null
  cableDrawingMode: CableDrawingMode | null
  nextId: number
}

export interface CableDrawingMode {
  cableType: 'mmj3' | 'mmj5' | 'omm'
  path: Point[]
  startPoint: Point
}
