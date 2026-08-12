<template>
  <g :transform="transform" class="switch1" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <!-- Invisible extended hover area to keep delete button accessible -->
    <rect x="-20" y="-15" width="95" height="70" fill="transparent" stroke="none"/>

    <!-- Selection highlight -->
    <rect v-if="selected" x="-8" y="-3" width="76" height="46" rx="5" fill="none" stroke="#1976d2" stroke-width="2" stroke-dasharray="4,2"/>

    <!-- Background -->
    <rect x="-5" y="0" width="70" height="40" rx="3" fill="#fafafa" stroke="#333" stroke-width="1"/>

    <!-- Switch mechanism -->
    <circle cx="10" cy="20" r="4" fill="#333"/>
    <circle cx="50" cy="20" r="4" fill="#333"/>

    <!-- Switch lever -->
    <line :x1="10" y1="20"
          :x2="element.state.on ? 50 : 35" :y2="element.state.on ? 20 : 8"
          stroke="#333" stroke-width="3" stroke-linecap="round"/>

    <!-- ON/OFF label (counter-rotated) -->
    <text x="30" y="35" text-anchor="middle" font-size="8" fill="#666"
          :transform="`rotate(${-rotation}, 30, 35)`">
      {{ element.state.on ? 'ON' : 'OFF' }}
    </text>

    <!-- Type label (counter-rotated) -->
    <text class="part-label" x="30" y="-3" text-anchor="middle" font-size="9" fill="#999"
          :transform="`rotate(${-rotation}, 30, -3)`">1</text>

    <!-- Click area for toggling -->
    <rect x="0" y="5" width="60" height="30" fill="transparent" class="toggle-area"
          @click.stop="$emit('toggle')"/>

    <!-- Terminals -->
    <g v-for="terminal in element.terminals" :key="terminal.id"
       :transform="`translate(${terminal.localX}, ${terminal.localY})`"
       class="terminal"
       @click.stop="$emit('terminal-click', element.id, terminal.id)">
      <circle class="terminal-hit" r="12" fill="transparent"/>
      <circle r="5" :fill="terminal.energized ? '#ff5722' : '#fff'" stroke="#333" stroke-width="1.5"/>
    </g>

    <!-- Delete button (shows on hover, rendered last for z-order, counter-rotated) -->
    <g v-if="hovering" class="delete-btn"
       :transform="`rotate(${-rotation}, 30, 20)`"
       @click.stop="$emit('delete')">
      <circle cx="-5" cy="0" r="8" fill="#f44336"/>
      <text x="-5" y="4" text-anchor="middle" font-size="12" fill="white" font-weight="bold">x</text>
    </g>
  </g>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Element } from '../../types'

const props = defineProps<{
  element: Element
  selected?: boolean
}>()

defineEmits<{
  'terminal-click': [elementId: string, terminalId: string]
  'toggle': []
  'delete': []
}>()

const hovering = ref(false)

const rotation = computed(() => props.element.rotation || 0)

const transform = computed(() => {
  const { x, y } = props.element
  const cx = 30
  const cy = 20
  return `translate(${x}, ${y}) rotate(${rotation.value}, ${cx}, ${cy})`
})
</script>

<style scoped>
.switch1 {
  cursor: move;
}
.terminal {
  cursor: pointer;
}
.terminal-hit {
  pointer-events: all;
}
.terminal:hover .terminal-hit {
  fill: rgba(25, 118, 210, 0.18);
}
.toggle-area {
  cursor: pointer;
}
.toggle-area:hover {
  fill: rgba(25, 118, 210, 0.1);
}
.delete-btn {
  cursor: pointer;
}
.delete-btn:hover circle {
  fill: #d32f2f;
}
</style>
