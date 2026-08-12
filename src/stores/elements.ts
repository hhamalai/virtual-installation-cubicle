import type { Element } from '../types'

// Element geometry and terminal layout. Shared by the circuit store and the
// bundled sample circuits so both build identical elements.
export function createElementByType(type: string, id: string, x: number, y: number): Element {
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
    // Momentary push-button module (Hager SVN391 style): 30px wide x 90px tall.
    // Green pair G1-G2 is a normally-open contact (closes only while held);
    // red pair R1-R2 is a normally-closed contact (opens only while held).
    case 'button':
      return {
        ...base,
        state: { greenPressed: false, redPressed: false },
        terminals: [
          { id: `${id}-G1`, name: 'G1', localX: 7, localY: 0, connected: [], energized: false, color: '#2e7d32' },
          { id: `${id}-R1`, name: 'R1', localX: 23, localY: 0, connected: [], energized: false, color: '#c62828' },
          { id: `${id}-G2`, name: 'G2', localX: 7, localY: 90, connected: [], energized: false, color: '#2e7d32' },
          { id: `${id}-R2`, name: 'R2', localX: 23, localY: 90, connected: [], energized: false, color: '#c62828' }
        ]
      }
    // Multifunction time relay (Hager EZM100 style): 44px wide x 90px tall.
    // Top: A1 (supply L), B1 (control), 15 (output COM).
    // Bottom: A2 (supply N), 16 (output NC), 18 (output NO).
    case 'timer':
      return {
        ...base,
        state: { timerFunction: 'E', timerDuration: 1, timerOutput: false, timerSupplied: false },
        terminals: [
          { id: `${id}-A1`, name: 'A1', localX: 9, localY: 0, connected: [], energized: false, color: '#8B4513' },
          { id: `${id}-B1`, name: 'B1', localX: 22, localY: 0, connected: [], energized: false, color: '#ff9800' },
          { id: `${id}-15`, name: '15', localX: 35, localY: 0, connected: [], energized: false },
          { id: `${id}-A2`, name: 'A2', localX: 9, localY: 90, connected: [], energized: false, color: '#1976d2' },
          { id: `${id}-16`, name: '16', localX: 22, localY: 90, connected: [], energized: false },
          { id: `${id}-18`, name: '18', localX: 35, localY: 90, connected: [], energized: false }
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
