import type { Cable, Element, ElementState, Point } from '../types'
import { createElementByType } from '../stores/elements'

const LINE = '#8B4513'
const NEUTRAL = '#1976d2'
const TRAVELLER_A = '#212121'
const TRAVELLER_B = '#757575'
const CONTROL = '#ff9800'

interface SamplePlacement {
  ref: string
  type: string
  x: number
  y: number
  state?: ElementState
}

interface SampleLink {
  from: [string, string]
  to: [string, string]
  color: string
  via?: Point[]
}

export interface SampleCircuit {
  id: string
  name: string
  /** Guide page this circuit belongs to. */
  guide: string
  elements: SamplePlacement[]
  links: SampleLink[]
}

export const SAMPLES: SampleCircuit[] = [
  {
    id: 'two-way-switch',
    name: 'Two-way switching',
    guide: '/guides/two-way-switch-wiring.html',
    elements: [
      { ref: 'supply', type: 'power-input', x: 80, y: 320 },
      { ref: 's1', type: 'switch6', x: 240, y: 300 },
      { ref: 's2', type: 'switch6', x: 480, y: 300 },
      { ref: 'lamp', type: 'light', x: 700, y: 300 }
    ],
    links: [
      { from: ['supply', 'L'], to: ['s1', 'COM'], color: LINE },
      { from: ['s1', 'L1'], to: ['s2', 'L1'], color: TRAVELLER_A, via: [{ x: 360, y: 230 }, { x: 480, y: 230 }] },
      { from: ['s1', 'L2'], to: ['s2', 'L2'], color: TRAVELLER_B, via: [{ x: 360, y: 420 }, { x: 480, y: 420 }] },
      { from: ['s2', 'COM'], to: ['lamp', 'L'], color: LINE, via: [{ x: 430, y: 460 }, { x: 650, y: 460 }] },
      { from: ['lamp', 'N'], to: ['supply', 'N'], color: NEUTRAL, via: [{ x: 780, y: 560 }, { x: 110, y: 560 }] }
    ]
  },
  {
    id: 'cross-switch',
    name: 'Cross (intermediate) switching',
    guide: '/guides/intermediate-cross-switch-wiring.html',
    elements: [
      { ref: 'supply', type: 'power-input', x: 80, y: 320 },
      { ref: 's1', type: 'switch6', x: 240, y: 300 },
      { ref: 'cross', type: 'switch7', x: 400, y: 300 },
      { ref: 's2', type: 'switch6', x: 600, y: 300 },
      { ref: 'lamp', type: 'light', x: 800, y: 300 }
    ],
    links: [
      { from: ['supply', 'L'], to: ['s1', 'COM'], color: LINE },
      { from: ['s1', 'L1'], to: ['cross', 'IN1'], color: TRAVELLER_A },
      { from: ['s1', 'L2'], to: ['cross', 'IN2'], color: TRAVELLER_B },
      { from: ['cross', 'OUT1'], to: ['s2', 'L1'], color: TRAVELLER_A, via: [{ x: 520, y: 230 }, { x: 620, y: 230 }] },
      { from: ['cross', 'OUT2'], to: ['s2', 'L2'], color: TRAVELLER_B, via: [{ x: 520, y: 430 }, { x: 620, y: 430 }] },
      { from: ['s2', 'COM'], to: ['lamp', 'L'], color: LINE, via: [{ x: 550, y: 480 }, { x: 750, y: 480 }] },
      { from: ['lamp', 'N'], to: ['supply', 'N'], color: NEUTRAL, via: [{ x: 880, y: 580 }, { x: 110, y: 580 }] }
    ]
  },
  {
    id: 'relay-no-nc',
    name: 'Relay NO / NC contacts',
    guide: '/guides/relay-no-nc-contacts.html',
    elements: [
      { ref: 'supply', type: 'power-input', x: 80, y: 120 },
      { ref: 'sw', type: 'switch1', x: 240, y: 100 },
      { ref: 'k1', type: 'relay-no-nc', x: 450, y: 200 },
      { ref: 'lampNo', type: 'light', x: 640, y: 340 },
      { ref: 'lampNc', type: 'light', x: 640, y: 460 }
    ],
    links: [
      { from: ['supply', 'L'], to: ['sw', 'IN'], color: LINE },
      { from: ['sw', 'OUT'], to: ['k1', 'A1'], color: CONTROL, via: [{ x: 380, y: 245 }] },
      { from: ['k1', 'N'], to: ['supply', 'N'], color: NEUTRAL, via: [{ x: 540, y: 60 }, { x: 110, y: 60 }] },
      { from: ['supply', 'L'], to: ['k1', '1'], color: LINE, via: [{ x: 200, y: 190 }, { x: 390, y: 175 }] },
      { from: ['supply', 'L'], to: ['k1', '3'], color: LINE, via: [{ x: 220, y: 230 }, { x: 400, y: 150 }] },
      { from: ['k1', '2'], to: ['lampNo', 'L'], color: LINE, via: [{ x: 500, y: 380 }] },
      { from: ['k1', '4'], to: ['lampNc', 'L'], color: LINE, via: [{ x: 520, y: 500 }] },
      { from: ['lampNo', 'N'], to: ['supply', 'N'], color: NEUTRAL, via: [{ x: 780, y: 620 }, { x: 110, y: 620 }] },
      { from: ['lampNc', 'N'], to: ['supply', 'N'], color: NEUTRAL, via: [{ x: 760, y: 660 }, { x: 130, y: 660 }] }
    ]
  },
  {
    id: 'timer-on-delay',
    name: 'Timer: on-delay with control',
    guide: '/guides/multifunction-timer.html',
    elements: [
      { ref: 'supply', type: 'power-input', x: 80, y: 120 },
      { ref: 'btn', type: 'button', x: 260, y: 200 },
      { ref: 't1', type: 'timer', x: 460, y: 200, state: { timerFunction: 'Ec', timerDuration: 3 } },
      { ref: 'lamp', type: 'light', x: 680, y: 380 }
    ],
    links: [
      { from: ['supply', 'L'], to: ['t1', 'A1'], color: LINE, via: [{ x: 300, y: 150 }, { x: 430, y: 155 }] },
      { from: ['t1', 'A2'], to: ['supply', 'N'], color: NEUTRAL, via: [{ x: 430, y: 360 }, { x: 110, y: 360 }] },
      { from: ['supply', 'L'], to: ['btn', 'G1'], color: LINE, via: [{ x: 180, y: 200 }] },
      { from: ['btn', 'G2'], to: ['t1', 'B1'], color: CONTROL, via: [{ x: 300, y: 370 }, { x: 600, y: 370 }, { x: 600, y: 140 }] },
      { from: ['supply', 'L'], to: ['t1', '15'], color: LINE, via: [{ x: 300, y: 80 }, { x: 540, y: 110 }] },
      { from: ['t1', '18'], to: ['lamp', 'L'], color: LINE, via: [{ x: 560, y: 420 }] },
      { from: ['lamp', 'N'], to: ['supply', 'N'], color: NEUTRAL, via: [{ x: 800, y: 560 }, { x: 110, y: 560 }] }
    ]
  }
]

export const findSample = (id: string): SampleCircuit | undefined => SAMPLES.find(s => s.id === id)

export interface BuiltCircuit {
  elements: Element[]
  cables: Cable[]
  drawnCables: never[]
  nextId: number
}

/** Expand a sample into elements and single-wire cables ready for the store. */
export const buildSample = (sample: SampleCircuit): BuiltCircuit => {
  const elements: Element[] = []
  const idByRef = new Map<string, string>()
  let nextId = 1

  for (const placement of sample.elements) {
    const id = `el-${nextId++}`
    idByRef.set(placement.ref, id)
    const element = createElementByType(placement.type, id, placement.x, placement.y)
    if (placement.state) Object.assign(element.state, placement.state)
    elements.push(element)
  }

  const resolve = (ref: string, terminalName: string) => {
    const elementId = idByRef.get(ref)
    const element = elements.find(e => e.id === elementId)
    if (!element) throw new Error(`Sample "${sample.id}" references unknown element "${ref}"`)
    const terminal = element.terminals.find(t => t.name === terminalName)
    if (!terminal) throw new Error(`Sample "${sample.id}": ${placementType(element)} has no terminal "${terminalName}"`)
    return { element, terminal }
  }

  const cables: Cable[] = sample.links.map(link => {
    const from = resolve(link.from[0], link.from[1])
    const to = resolve(link.to[0], link.to[1])
    const cableId = `el-${nextId++}`

    from.terminal.connected.push({ cableId, wireColor: link.color })
    to.terminal.connected.push({ cableId, wireColor: link.color })

    return {
      id: cableId,
      type: 'single',
      wires: [{
        color: link.color,
        from: { elementId: from.element.id, terminalId: from.terminal.id },
        to: { elementId: to.element.id, terminalId: to.terminal.id },
        controlPoints: link.via ? link.via.map(p => ({ ...p })) : []
      }]
    }
  })

  return { elements, cables, drawnCables: [], nextId }
}

const placementType = (element: Element): string => `${element.type} (${element.id})`
