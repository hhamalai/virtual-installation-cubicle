<template>
  <g :transform="transform" class="switch6" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <!-- Selection highlight -->
    <rect v-if="selected" x="-8" y="-13" width="86" height="66" rx="5" fill="none" stroke="#1976d2" stroke-width="2" stroke-dasharray="4,2"/>

    <!-- Background -->
    <rect x="-5" y="-10" width="80" height="60" rx="3" fill="#fafafa" stroke="#333" stroke-width="1"/>

    <!-- Switch mechanism -->
    <circle cx="15" cy="20" r="4" fill="#333"/>
    <circle cx="55" cy="5" r="3" fill="#666"/>
    <circle cx="55" cy="35" r="3" fill="#666"/>

    <!-- Switch lever - connects COM to L1 or L2 -->
    <line x1="15" y1="20"
          :x2="55" :y2="element.state.position === 0 ? 5 : 35"
          stroke="#333" stroke-width="3" stroke-linecap="round"/>

    <!-- Position labels (counter-rotated) -->
    <text x="68" y="8" font-size="8" fill="#666"
          :transform="`rotate(${-rotation}, 68, 8)`">L1</text>
    <text x="68" y="38" font-size="8" fill="#666"
          :transform="`rotate(${-rotation}, 68, 38)`">L2</text>

    <!-- Type label (counter-rotated) -->
    <text x="35" y="-15" text-anchor="middle" font-size="9" fill="#999"
          :transform="`rotate(${-rotation}, 35, -15)`">6</text>

    <!-- Click area for toggling -->
    <rect x="0" y="-5" width="70" height="50" fill="transparent" class="toggle-area"
          @click.stop="$emit('toggle')"/>

    <!-- Terminals -->
    <g v-for="terminal in element.terminals" :key="terminal.id"
       :transform="`translate(${terminal.localX}, ${terminal.localY})`"
       class="terminal"
       @click.stop="$emit('terminal-click', element.id, terminal.id)">
      <circle r="5" :fill="terminal.energized ? '#ff5722' : '#fff'" stroke="#333" stroke-width="1.5"/>
    </g>

    <!-- Delete button (shows on hover, rendered last for z-order, counter-rotated) -->
    <g v-if="hovering" class="delete-btn"
       :transform="`rotate(${-rotation}, 35, 20)`"
       @click.stop="$emit('delete')">
      <circle cx="-5" cy="-10" r="8" fill="#f44336"/>
      <text x="-5" y="-6" text-anchor="middle" font-size="12" fill="white" font-weight="bold">x</text>
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
  const cx = 35
  const cy = 20
  return `translate(${x}, ${y}) rotate(${rotation.value}, ${cx}, ${cy})`
})
</script>

<style scoped>
.switch6 {
  cursor: move;
}
.terminal {
  cursor: pointer;
}
.terminal:hover circle {
  stroke: #1976d2;
  stroke-width: 2.5;
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
