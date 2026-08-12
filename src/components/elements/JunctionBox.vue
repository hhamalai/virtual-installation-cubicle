<template>
  <g :transform="transform" class="junction-box" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <!-- Invisible extended hover area to keep delete button accessible -->
    <rect :x="-15" :y="-25" :width="boxSize + 40" :height="boxSize + 45" fill="transparent" stroke="none"/>

    <!-- Selection highlight -->
    <rect v-if="selected" :x="-10" :y="-10" :width="boxSize + 20" :height="boxSize + 20" rx="5" fill="none" stroke="#1976d2" stroke-width="2" stroke-dasharray="4,2"/>

    <!-- Background -->
    <rect x="0" y="0" :width="boxSize" :height="boxSize" rx="4" fill="#f5f5f5" stroke="#333" stroke-width="1.5"/>

    <!-- AP9 label -->
    <text class="part-label" :x="boxSize / 2" y="-12" text-anchor="middle" font-size="11" fill="#666"
          :transform="`rotate(${-rotation}, ${boxSize / 2}, -12)`">AP9</text>

    <!-- Slot dividers - horizontal -->
    <line :x1="0" :y1="boxSize / 2" :x2="boxSize" :y2="boxSize / 2" stroke="#ddd" stroke-width="1"/>

    <!-- Slot dividers - vertical -->
    <line :x1="boxSize / 2" :y1="0" :x2="boxSize / 2" :y2="boxSize" stroke="#ddd" stroke-width="1"/>

    <!-- Slot labels for each side when not occupied -->
    <!-- Top side -->
    <g v-for="(slot, index) in topSlots" :key="slot.id">
      <text v-if="!slot.dockedCable"
            :x="(index + 1) * slotSpacing"
            y="20"
            text-anchor="middle" font-size="8" fill="#999"
            :transform="`rotate(${-rotation}, ${(index + 1) * slotSpacing}, 20)`">
        {{ slot.id }}
      </text>
      <text v-if="slot.dockedCable"
            :x="(index + 1) * slotSpacing"
            y="20"
            text-anchor="middle" font-size="7" fill="#666"
            :transform="`rotate(${-rotation}, ${(index + 1) * slotSpacing}, 20)`">
        {{ getCableLabel(slot.dockedCable.elementId) }}
      </text>
    </g>

    <!-- Bottom side -->
    <g v-for="(slot, index) in bottomSlots" :key="slot.id">
      <text v-if="!slot.dockedCable"
            :x="(index + 1) * slotSpacing"
            :y="boxSize - 10"
            text-anchor="middle" font-size="8" fill="#999"
            :transform="`rotate(${-rotation}, ${(index + 1) * slotSpacing}, ${boxSize - 10})`">
        {{ slot.id }}
      </text>
      <text v-if="slot.dockedCable"
            :x="(index + 1) * slotSpacing"
            :y="boxSize - 10"
            text-anchor="middle" font-size="7" fill="#666"
            :transform="`rotate(${-rotation}, ${(index + 1) * slotSpacing}, ${boxSize - 10})`">
        {{ getCableLabel(slot.dockedCable.elementId) }}
      </text>
    </g>

    <!-- Left side -->
    <g v-for="(slot, index) in leftSlots" :key="slot.id">
      <text v-if="!slot.dockedCable"
            x="15"
            :y="(index + 1) * slotSpacing + 4"
            text-anchor="start" font-size="8" fill="#999"
            :transform="`rotate(${-rotation}, 15, ${(index + 1) * slotSpacing + 4})`">
        {{ slot.id }}
      </text>
      <text v-if="slot.dockedCable"
            x="15"
            :y="(index + 1) * slotSpacing + 4"
            text-anchor="start" font-size="7" fill="#666"
            :transform="`rotate(${-rotation}, 15, ${(index + 1) * slotSpacing + 4})`">
        {{ getCableLabel(slot.dockedCable.elementId) }}
      </text>
    </g>

    <!-- Right side -->
    <g v-for="(slot, index) in rightSlots" :key="slot.id">
      <text v-if="!slot.dockedCable"
            :x="boxSize - 15"
            :y="(index + 1) * slotSpacing + 4"
            text-anchor="end" font-size="8" fill="#999"
            :transform="`rotate(${-rotation}, ${boxSize - 15}, ${(index + 1) * slotSpacing + 4})`">
        {{ slot.id }}
      </text>
      <text v-if="slot.dockedCable"
            :x="boxSize - 15"
            :y="(index + 1) * slotSpacing + 4"
            text-anchor="end" font-size="7" fill="#666"
            :transform="`rotate(${-rotation}, ${boxSize - 15}, ${(index + 1) * slotSpacing + 4})`">
        {{ getCableLabel(slot.dockedCable.elementId) }}
      </text>
    </g>

    <!-- Delete button (shows on hover) -->
    <g v-if="hovering" class="delete-btn"
       :transform="`rotate(${-rotation}, ${boxSize / 2}, ${boxSize / 2})`"
       @click.stop="$emit('delete')">
      <circle :cx="boxSize + 8" cy="-8" r="8" fill="#f44336"/>
      <text :x="boxSize + 8" y="-4" text-anchor="middle" font-size="12" fill="white" font-weight="bold">x</text>
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
        <circle class="terminal-dot" r="5" :fill="terminal.energized ? '#ff5722' : (terminal.color || '#fff')" :stroke="terminal.energized ? '#ff5722' : '#333'" stroke-width="1.5"/>
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

const boxSize = 150
const slotSpacing = boxSize / 4

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

  // Calculate positions for wire terminals - spread them INSIDE the junction box, close to edges
  const spacing = 10 // Tighter packing
  const totalSpread = (wireCount - 1) * spacing
  const startOffset = -totalSpread / 2
  const insetDistance = 12 // Close to the edge but inside

  // Determine which edge the terminal is on
  const isTopEdge = terminal.localY === 0
  const isBottomEdge = terminal.localY === boxSize
  const isLeftEdge = terminal.localX === 0
  const isRightEdge = terminal.localX === boxSize

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
      y = boxSize - insetDistance
    } else if (isLeftEdge) {
      // Left edge: spread vertically, move right into the box
      x = insetDistance
      y += startOffset + index * spacing
    } else if (isRightEdge) {
      // Right edge: spread vertically, move left into the box
      x = boxSize - insetDistance
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
  const cx = boxSize / 2
  const cy = boxSize / 2
  return `translate(${x}, ${y}) rotate(${rotation.value}, ${cx}, ${cy})`
})
</script>

<style scoped>
.junction-box {
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
