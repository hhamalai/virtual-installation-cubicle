import type { Cable, DrawnCable, Element } from '../types'

export const CIRCUIT_FILE_FORMAT = 'virtual-installation-cubicle-circuit'
export const CIRCUIT_FILE_VERSION = 1

export interface CircuitFile {
  format: typeof CIRCUIT_FILE_FORMAT
  version: number
  name: string
  savedAt: string
  elements: Element[]
  cables: Cable[]
  drawnCables: DrawnCable[]
}

export const buildCircuitFile = (
  name: string,
  elements: Element[],
  cables: Cable[],
  drawnCables: DrawnCable[]
): CircuitFile => ({
  format: CIRCUIT_FILE_FORMAT,
  version: CIRCUIT_FILE_VERSION,
  name,
  savedAt: new Date().toISOString(),
  elements,
  cables,
  drawnCables
})

// Element and cable ids are `el-<n>`; the next id must clear every id already in
// the file so an imported circuit can't collide with itself.
export const nextIdFor = (elements: Element[], cables: Cable[]): number => {
  let max = 0
  for (const id of [...elements.map(e => e.id), ...cables.map(c => c.id)]) {
    const match = /^el-(\d+)$/.exec(id)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return max + 1
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const requireArray = (value: unknown, field: string): unknown[] => {
  if (!Array.isArray(value)) throw new Error(`Circuit file is missing its "${field}" list.`)
  return value
}

const validElement = (value: unknown): value is Element =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.type === 'string' &&
  typeof value.x === 'number' &&
  typeof value.y === 'number' &&
  Array.isArray(value.terminals)

const validCable = (value: unknown): value is Cable =>
  isRecord(value) && typeof value.id === 'string' && Array.isArray(value.wires)

/** Parse and validate an exported circuit. Throws with a user-facing message. */
export const parseCircuitFile = (text: string, fallbackName: string): CircuitFile => {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  if (!isRecord(parsed) || parsed.format !== CIRCUIT_FILE_FORMAT) {
    throw new Error('That file is not a Virtual Installation Cubicle circuit.')
  }

  const version = typeof parsed.version === 'number' ? parsed.version : 0
  if (version > CIRCUIT_FILE_VERSION) {
    throw new Error(`This circuit was saved by a newer version (file v${version}, supported v${CIRCUIT_FILE_VERSION}).`)
  }

  const elements = requireArray(parsed.elements, 'elements')
  const cables = requireArray(parsed.cables, 'cables')
  const drawnCables = Array.isArray(parsed.drawnCables) ? parsed.drawnCables : []

  if (!elements.every(validElement)) throw new Error('Circuit file contains a malformed element.')
  if (!cables.every(validCable)) throw new Error('Circuit file contains a malformed cable.')

  return {
    format: CIRCUIT_FILE_FORMAT,
    version,
    name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name : fallbackName,
    savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    elements: elements as Element[],
    cables: cables as Cable[],
    drawnCables: drawnCables as DrawnCable[]
  }
}
