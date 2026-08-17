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

// Output relay of the star-delta starter: it rests in the neutral centre and is
// only in star or delta while the corresponding contact is made.
export type StarDeltaPosition = 'neutral' | 'star' | 'delta'

export interface ElementState {
  on?: boolean
  on1?: boolean
  on2?: boolean
  position?: number
  position1?: number
  position2?: number
  crossed?: boolean
  coilEnergized?: boolean
  // For the step (impulse) relay: latched contact state, flipped by each coil pulse
  stepOutput?: boolean
  // For push buttons - which momentary buttons are held down
  greenPressed?: boolean
  redPressed?: boolean
  // For the multifunction timer
  timerFunction?: string   // 'E' | 'Ec' | 'R' | 'Wu' | 'Ws' | 'Wa' | 'Bp'
  timerDuration?: number   // seconds (0.1 - 60)
  timerOutput?: boolean    // output relay R state
  timerSupplied?: boolean  // supply present (green LED)
  // For the star-delta starter timer
  starDuration?: number    // star period, seconds (0.1 - 60)
  deltaDelay?: number      // star-to-delta changeover, milliseconds (50 - 150)
  starDeltaPosition?: StarDeltaPosition
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

// One circuit, shown as one tab in the app.
export interface CircuitDoc {
  id: string
  name: string
  elements: Element[]
  cables: Cable[]
  drawnCables: DrawnCable[]
  nextId: number
}

export interface Workspace {
  activeId: string
  docs: CircuitDoc[]
}

export interface CableDrawingMode {
  cableType: 'mmj3' | 'mmj5' | 'omm'
  path: Point[]
  startPoint: Point
}
