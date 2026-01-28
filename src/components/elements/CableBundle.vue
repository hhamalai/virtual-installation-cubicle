<template>
  <g :transform="transform" class="cable-bundle" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <!-- Selection highlight -->
    <rect v-if="selected" x="12" y="-3" width="126" :height="cableHeight + 6" rx="7" fill="none" stroke="#1976d2" stroke-width="2" stroke-dasharray="4,2"/>

    <!-- Cable body -->
    <rect
      x="15"
      y="0"
      width="120"
      :height="cableHeight"
      rx="5"
      fill="#e0e0e0"
      stroke="#999"
      stroke-width="1"
    />

    <!-- Cable label (counter-rotated) -->
    <text
      x="75"
      :y="cableHeight / 2 + 4"
      text-anchor="middle"
      font-size="11"
      font-weight="500"
      fill="#666"
      :transform="`rotate(${-rotation}, 75, ${cableHeight / 2 + 4})`"
    >
      {{ cableLabel }}
    </text>

    <!-- Internal wires visualization -->
    <g v-for="(wire, index) in wires" :key="index">
      <line
        x1="20"
        :y1="wire.y"
        x2="130"
        :y2="wire.y"
        :stroke="wire.color"
        stroke-width="2"
        stroke-dasharray="4,2"
      />
    </g>

    <!-- Terminals -->
    <g
      v-for="terminal in element.terminals"
      :key="terminal.id"
      :transform="`translate(${terminal.localX}, ${terminal.localY})`"
      class="terminal"
      @click.stop="$emit('terminal-click', element.id, terminal.id)"
    >
      <circle
        r="6"
        :fill="terminal.energized ? '#ff5722' : (terminal.color || '#fff')"
        stroke="#333"
        stroke-width="1.5"
      />
      <text
        :x="terminal.localX === 0 ? -12 : 12"
        y="4"
        :text-anchor="terminal.localX === 0 ? 'end' : 'start'"
        font-size="9"
        fill="#333"
        :transform="`rotate(${-rotation}, ${terminal.localX === 0 ? -12 : 12}, 4)`"
      >
        {{ terminal.name }}
      </text>
    </g>

    <!-- Delete button (shows on hover, rendered last for z-order, counter-rotated) -->
    <g v-if="hovering" class="delete-btn"
       :transform="`rotate(${-rotation}, 75, ${cableHeight / 2})`"
       @click.stop="$emit('delete')">
      <circle cx="15" cy="0" r="8" fill="#f44336"/>
      <text x="15" y="4" text-anchor="middle" font-size="12" fill="white" font-weight="bold">x</text>
    </g>
  </g>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Element } from '../../types'

interface WireDisplay {
  color: string
  y: number
}

const props = defineProps<{
  element: Element
  selected?: boolean
}>()

defineEmits<{
  'terminal-click': [elementId: string, terminalId: string]
  'delete': []
}>()

const hovering = ref(false)

const rotation = computed(() => props.element.rotation || 0)

const transform = computed(() => {
  const { x, y } = props.element
  const cx = 75
  const cy = cableHeight.value / 2
  return `translate(${x}, ${y}) rotate(${rotation.value}, ${cx}, ${cy})`
})

const cableLabel = computed((): string => {
  switch (props.element.type) {
    case 'cable-mmj3': return 'MMJ 3×1.5'
    case 'cable-mmj5': return 'MMJ 5×1.5'
    case 'cable-omm': return 'MMO 7'
    default: return 'Cable'
  }
})

const cableHeight = computed((): number => {
  // Use the actual terminal positions to determine cable height
  const leftTerminals = props.element.terminals.filter(t => t.localX === 0)
  if (leftTerminals.length > 0) {
    const maxY = Math.max(...leftTerminals.map(t => t.localY))
    return maxY + 10
  }
  const terminalCount = props.element.terminals.length / 2
  return Math.max(terminalCount * 16 + 10, 60)
})

const wires = computed((): WireDisplay[] => {
  const colors = props.element.wireColors || []
  // Get the left-side (A) terminals and use their positions for wire y-coordinates
  const leftTerminals = props.element.terminals.filter(t => t.localX === 0)
  return colors.map((color, i) => ({
    color,
    y: leftTerminals[i]?.localY ?? (10 + i * 14)
  }))
})
</script>

<style scoped>
.cable-bundle {
  cursor: move;
}

.terminal {
  cursor: pointer;
}

.terminal:hover circle {
  stroke: #1976d2;
  stroke-width: 2.5;
}
.delete-btn {
  cursor: pointer;
}
.delete-btn:hover circle {
  fill: #d32f2f;
}
</style>
