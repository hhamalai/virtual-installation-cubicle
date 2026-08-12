<template>
  <g :transform="transform" class="distribution-board" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <!-- Invisible extended hover area to keep delete button accessible -->
    <rect :x="-15" :y="-25" :width="boxWidth + 40" :height="boxHeight + 45" fill="transparent" stroke="none"/>

    <!-- Selection highlight -->
    <rect v-if="selected" :x="-10" :y="-10" :width="boxWidth + 20" :height="boxHeight + 20" rx="5" fill="none" stroke="#1976d2" stroke-width="2" stroke-dasharray="4,2"/>

    <!-- Background -->
    <rect x="0" y="0" :width="boxWidth" :height="boxHeight" rx="4" fill="#e8e8e8" stroke="#333" stroke-width="2"/>

    <!-- Label -->
    <text class="part-label" :x="boxWidth / 2" y="-12" text-anchor="middle" font-size="12" fill="#666"
          :transform="`rotate(${-rotation}, ${boxWidth / 2}, -12)`">Distribution Board</text>

    <!-- Main Power Input Section (top-left corner) -->
    <g class="power-input-section">
      <rect x="10" y="10" width="100" height="50" rx="3" fill="#f5f5f5" stroke="#666" stroke-width="1"/>
      <text x="60" y="25" text-anchor="middle" font-size="9" fill="#666"
            :transform="`rotate(${-rotation}, 60, 25)`">Main Power</text>
      <!-- Power terminal labels -->
      <text x="30" y="52" text-anchor="middle" font-size="8" fill="#d32f2f"
            :transform="`rotate(${-rotation}, 30, 52)`">L</text>
      <text x="60" y="52" text-anchor="middle" font-size="8" fill="#1976d2"
            :transform="`rotate(${-rotation}, 60, 52)`">N</text>
      <text x="90" y="52" text-anchor="middle" font-size="8" fill="#7cb342"
            :transform="`rotate(${-rotation}, 90, 52)`">PE</text>
    </g>

    <!-- DIN Rails -->
    <g class="din-rails">
      <!-- Top DIN rail -->
      <rect :x="30" :y="dinRail1Y" :width="boxWidth - 60" height="12" rx="1" fill="#b0b0b0" stroke="#888" stroke-width="1"/>
      <line :x1="30" :y1="dinRail1Y + 3" :x2="boxWidth - 30" :y2="dinRail1Y + 3" stroke="#999" stroke-width="0.5"/>
      <line :x1="30" :y1="dinRail1Y + 9" :x2="boxWidth - 30" :y2="dinRail1Y + 9" stroke="#999" stroke-width="0.5"/>
      <text :x="boxWidth - 25" :y="dinRail1Y + 9" font-size="8" fill="#666" text-anchor="end"
            :transform="`rotate(${-rotation}, ${boxWidth - 25}, ${dinRail1Y + 9})`">DIN 1</text>

      <!-- Bottom DIN rail -->
      <rect :x="30" :y="dinRail2Y" :width="boxWidth - 60" height="12" rx="1" fill="#b0b0b0" stroke="#888" stroke-width="1"/>
      <line :x1="30" :y1="dinRail2Y + 3" :x2="boxWidth - 30" :y2="dinRail2Y + 3" stroke="#999" stroke-width="0.5"/>
      <line :x1="30" :y1="dinRail2Y + 9" :x2="boxWidth - 30" :y2="dinRail2Y + 9" stroke="#999" stroke-width="0.5"/>
      <text :x="boxWidth - 25" :y="dinRail2Y + 9" font-size="8" fill="#666" text-anchor="end"
            :transform="`rotate(${-rotation}, ${boxWidth - 25}, ${dinRail2Y + 9})`">DIN 2</text>
    </g>

    <!-- Busbar area (bottom section) - N and PE only -->
    <g class="busbars">
      <!-- N Busbar -->
      <rect x="30" :y="busbarNY - 4" :width="boxWidth - 60" height="8" rx="1" fill="#1976d2" stroke="#0d47a1" stroke-width="0.5"/>
      <text x="25" :y="busbarNY + 2" font-size="7" fill="#1976d2" text-anchor="end"
            :transform="`rotate(${-rotation}, 25, ${busbarNY + 2})`">N</text>
      <!-- PE Busbar -->
      <rect x="30" :y="busbarPEY - 4" :width="boxWidth - 60" height="8" rx="1" fill="#7cb342" stroke="#558b2f" stroke-width="0.5"/>
      <text x="25" :y="busbarPEY + 2" font-size="7" fill="#7cb342" text-anchor="end"
            :transform="`rotate(${-rotation}, 25, ${busbarPEY + 2})`">PE</text>
    </g>

    <!-- Slot labels for each side when not occupied -->
    <!-- Top side -->
    <g v-for="(slot, index) in topSlots" :key="slot.id">
      <text v-if="!slot.dockedCable"
            :x="getSlotPosition('top', index)"
            y="75"
            text-anchor="middle" font-size="8" fill="#999"
            :transform="`rotate(${-rotation}, ${getSlotPosition('top', index)}, 75)`">
        {{ slot.id }}
      </text>
      <text v-if="slot.dockedCable"
            :x="getSlotPosition('top', index)"
            y="75"
            text-anchor="middle" font-size="7" fill="#666"
            :transform="`rotate(${-rotation}, ${getSlotPosition('top', index)}, 75)`">
        {{ getCableLabel(slot.dockedCable.elementId) }}
      </text>
    </g>

    <!-- Bottom side -->
    <g v-for="(slot, index) in bottomSlots" :key="slot.id">
      <text v-if="!slot.dockedCable"
            :x="getSlotPosition('bottom', index)"
            :y="boxHeight - 50"
            text-anchor="middle" font-size="8" fill="#999"
            :transform="`rotate(${-rotation}, ${getSlotPosition('bottom', index)}, ${boxHeight - 50})`">
        {{ slot.id }}
      </text>
      <text v-if="slot.dockedCable"
            :x="getSlotPosition('bottom', index)"
            :y="boxHeight - 50"
            text-anchor="middle" font-size="7" fill="#666"
            :transform="`rotate(${-rotation}, ${getSlotPosition('bottom', index)}, ${boxHeight - 50})`">
        {{ getCableLabel(slot.dockedCable.elementId) }}
      </text>
    </g>

    <!-- Left side -->
    <g v-for="(slot, index) in leftSlots" :key="slot.id">
      <text v-if="!slot.dockedCable"
            x="12"
            :y="getSlotPosition('left', index) + 4"
            text-anchor="start" font-size="8" fill="#999"
            :transform="`rotate(${-rotation}, 12, ${getSlotPosition('left', index) + 4})`">
        {{ slot.id }}
      </text>
      <text v-if="slot.dockedCable"
            x="12"
            :y="getSlotPosition('left', index) + 4"
            text-anchor="start" font-size="7" fill="#666"
            :transform="`rotate(${-rotation}, 12, ${getSlotPosition('left', index) + 4})`">
        {{ getCableLabel(slot.dockedCable.elementId) }}
      </text>
    </g>

    <!-- Right side -->
    <g v-for="(slot, index) in rightSlots" :key="slot.id">
      <text v-if="!slot.dockedCable"
            :x="boxWidth - 12"
            :y="getSlotPosition('right', index) + 4"
            text-anchor="end" font-size="8" fill="#999"
            :transform="`rotate(${-rotation}, ${boxWidth - 12}, ${getSlotPosition('right', index) + 4})`">
        {{ slot.id }}
      </text>
      <text v-if="slot.dockedCable"
            :x="boxWidth - 12"
            :y="getSlotPosition('right', index) + 4"
            text-anchor="end" font-size="7" fill="#666"
            :transform="`rotate(${-rotation}, ${boxWidth - 12}, ${getSlotPosition('right', index) + 4})`">
        {{ getCableLabel(slot.dockedCable.elementId) }}
      </text>
    </g>

    <!-- Delete button (shows on hover) -->
    <g v-if="hovering" class="delete-btn"
       :transform="`rotate(${-rotation}, ${boxWidth / 2}, ${boxHeight / 2})`"
       @click.stop="$emit('delete')">
      <circle :cx="boxWidth + 8" cy="-8" r="8" fill="#f44336"/>
      <text :x="boxWidth + 8" y="-4" text-anchor="middle" font-size="12" fill="white" font-weight="bold">x</text>
    </g>

    <!-- Terminals (rendered last for z-order) -->
    <template v-for="terminal in element.terminals" :key="terminal.id">
      <!-- Check if this terminal has a multi-wire cable connected -->
      <template v-if="getConnectedMultiWireCable(terminal.id)">
        <!-- Render expanded wire terminals -->
        <g v-for="(wireInfo, loopIdx) in getExpandedWireTerminals(terminal)"
           :key="`${terminal.id}-wire-${loopIdx}`"
           :transform="`translate(${wireInfo.x}, ${wireInfo.y})`"
           class="wire-terminal"
           @click.stop="handleWireTerminalClick(wireInfo, terminal.id)">
          <circle r="8" fill="transparent" stroke="none"/>
          <circle class="wire-terminal-dot" r="4" :fill="wireInfo.color" stroke="#fff" stroke-width="1"/>
          <!-- Position labels inside the box based on edge -->
          <text v-if="hovering && wireInfo.edge === 'top'" :y="12" text-anchor="middle" font-size="7" fill="#666"
                :transform="`rotate(${-rotation}, 0, 12)`">{{ wireInfo.name }}</text>
          <text class="part-label" v-if="hovering && wireInfo.edge === 'bottom'" :y="-8" text-anchor="middle" font-size="7" fill="#666"
                :transform="`rotate(${-rotation}, 0, -8)`">{{ wireInfo.name }}</text>
          <text v-if="hovering && wireInfo.edge === 'left'" :x="12" :y="3" text-anchor="start" font-size="7" fill="#666"
                :transform="`rotate(${-rotation}, 12, 3)`">{{ wireInfo.name }}</text>
          <text v-if="hovering && wireInfo.edge === 'right'" :x="-12" :y="3" text-anchor="end" font-size="7" fill="#666"
                :transform="`rotate(${-rotation}, -12, 3)`">{{ wireInfo.name }}</text>
        </g>
      </template>
      <!-- Regular terminal (no multi-wire cable connected) -->
      <g v-else
         :transform="`translate(${terminal.localX}, ${terminal.localY})`"
         class="terminal"
         @click.stop="$emit('terminal-click', element.id, terminal.id)">
        <circle r="10" fill="transparent" stroke="none"/>
        <circle class="terminal-dot" r="5"
                :fill="terminal.energized ? '#ff5722' : (terminal.color || '#fff')"
                :stroke="terminal.energized ? '#ff5722' : '#333'"
                stroke-width="1.5"/>
      </g>
    </template>
  </g>
</template>

<script setup lang="ts">
import { computed, ref, inject } from 'vue'
import type { Element, JunctionBoxSlot, Cable, Terminal, CircuitState } from '../../types'

interface WireTerminalInfo {
  x: number
  y: number
  color: string
  name: string
  cableId: string
  wireIndex: number
  end: 'from' | 'to'
  edge: 'top' | 'bottom' | 'left' | 'right'
}

const props = defineProps<{
  element: Element
  selected?: boolean
}>()

const emit = defineEmits<{
  'terminal-click': [elementId: string, terminalId: string]
  'wire-terminal-click': [data: { cableId: string; wireIndex: number; end: 'from' | 'to'; elementId: string; terminalId: string; localX: number; localY: number }]
  'delete': []
}>()

// Handler for wire terminal clicks - ensures correct values are captured
const handleWireTerminalClick = (wireInfo: WireTerminalInfo, terminalId: string) => {
  emit('wire-terminal-click', {
    cableId: wireInfo.cableId,
    wireIndex: wireInfo.wireIndex,
    end: wireInfo.end,
    elementId: props.element.id,
    terminalId: terminalId,
    localX: wireInfo.x,
    localY: wireInfo.y
  })
}

const hovering = ref(false)

// Inject the circuit state to look up cable info (reactive state from Canvas)
const circuitState = inject<CircuitState>('circuitState')

const rotation = computed(() => props.element.rotation || 0)

const slots = computed<JunctionBoxSlot[]>(() => props.element.state.slots || [])

const topSlots = computed(() => slots.value.filter(s => s.side === 'top'))
const bottomSlots = computed(() => slots.value.filter(s => s.side === 'bottom'))
const leftSlots = computed(() => slots.value.filter(s => s.side === 'left'))
const rightSlots = computed(() => slots.value.filter(s => s.side === 'right'))

// Distribution board dimensions
const boxWidth = 400
const boxHeight = 300
const slotsPerSide = 7

// Calculate slot spacing for each side
const topBottomSpacing = boxWidth / (slotsPerSide + 1)
const leftRightSpacing = boxHeight / (slotsPerSide + 1)

// DIN rail positions
const dinRail1Y = 100
const dinRail2Y = 160

// Busbar Y positions (must match circuit.ts) - only N and PE busbars
const busbarNY = boxHeight - 29
const busbarPEY = boxHeight - 17

const getSlotPosition = (side: 'top' | 'bottom' | 'left' | 'right', index: number): number => {
  if (side === 'top' || side === 'bottom') {
    return (index + 1) * topBottomSpacing
  } else {
    return (index + 1) * leftRightSpacing
  }
}

const getCableLabel = (cableElementId: string): string => {
  if (!circuitState) return ''
  const cable = circuitState.elements.find(el => el.id === cableElementId)
  if (!cable) return ''
  switch (cable.cableType) {
    case 'mmj3': return 'MMJ3'
    case 'mmj5': return 'MMJ5'
    case 'omm': return 'OMM'
    default: return cable.cableType || ''
  }
}

// Wire names for each cable type
const wireNamesMap: Record<string, string[]> = {
  'single': ['1'],
  'mmj3': ['L', 'N', 'PE'],
  'mmj5': ['L1', 'L2', 'L3', 'N', 'PE'],
  'omm': ['1', '2', '3', '4', '5', '6', '7']
}

// Check if a multi-wire cable is connected to this terminal
const getConnectedMultiWireCable = (terminalId: string): { cable: Cable; end: 'from' | 'to' } | null => {
  if (!circuitState?.cables) return null

  for (const cable of circuitState.cables) {
    if (cable.wires.length <= 1) continue // Skip single-wire cables

    // Check if the first wire (which defines the path) is connected to this terminal
    const firstWire = cable.wires.find(w => w.from && w.to)
    if (!firstWire) continue

    if (firstWire.from?.elementId === props.element.id && firstWire.from?.terminalId === terminalId) {
      return { cable, end: 'from' }
    }
    if (firstWire.to?.elementId === props.element.id && firstWire.to?.terminalId === terminalId) {
      return { cable, end: 'to' }
    }
  }

  return null
}

// Get expanded wire terminal positions for a terminal with a connected multi-wire cable
const getExpandedWireTerminals = (terminal: Terminal): WireTerminalInfo[] => {
  const cableInfo = getConnectedMultiWireCable(terminal.id)
  if (!cableInfo) return []

  const { cable, end } = cableInfo
  const wireNames = wireNamesMap[cable.type] || cable.wires.map((_, i) => String(i + 1))
  const wireCount = cable.wires.length

  // Calculate positions for wire terminals - spread them INSIDE the board, close to edges
  const spacing = 10 // Tighter packing
  const totalSpread = (wireCount - 1) * spacing
  const startOffset = -totalSpread / 2
  const insetDistance = 15 // Close to the edge but inside

  // Determine which edge the terminal is on
  const isTopEdge = terminal.localY === 0
  const isBottomEdge = terminal.localY === boxHeight
  const isLeftEdge = terminal.localX === 0
  const isRightEdge = terminal.localX === boxWidth

  // Determine edge for label positioning
  const edge: 'top' | 'bottom' | 'left' | 'right' = isTopEdge ? 'top' : isBottomEdge ? 'bottom' : isLeftEdge ? 'left' : 'right'

  return cable.wires.map((wire, index) => {
    let x = terminal.localX
    let y = terminal.localY

    if (isTopEdge) {
      // Top edge: spread horizontally, move down into the box
      x += startOffset + index * spacing
      y = insetDistance
    } else if (isBottomEdge) {
      // Bottom edge: spread horizontally, move up into the box
      x += startOffset + index * spacing
      y = boxHeight - insetDistance
    } else if (isLeftEdge) {
      // Left edge: spread vertically, move right into the box
      x = insetDistance
      y += startOffset + index * spacing
    } else if (isRightEdge) {
      // Right edge: spread vertically, move left into the box
      x = boxWidth - insetDistance
      y += startOffset + index * spacing
    }

    return {
      x,
      y,
      color: wire.color,
      name: wireNames[index] || String(index + 1),
      cableId: cable.id,
      wireIndex: index,
      end,
      edge
    }
  })
}

const transform = computed(() => {
  const { x, y } = props.element
  const cx = boxWidth / 2
  const cy = boxHeight / 2
  return `translate(${x}, ${y}) rotate(${rotation.value}, ${cx}, ${cy})`
})
</script>

<style scoped>
.distribution-board {
  cursor: move;
}
.terminal {
  cursor: pointer;
}
.terminal:hover .terminal-dot {
  stroke: #1976d2;
  stroke-width: 2.5;
}
.wire-terminal {
  cursor: pointer;
}
.wire-terminal:hover .wire-terminal-dot {
  stroke: #1976d2;
  stroke-width: 2;
  r: 5;
}
.delete-btn {
  cursor: pointer;
}
.delete-btn:hover circle {
  fill: #d32f2f;
}
</style>
