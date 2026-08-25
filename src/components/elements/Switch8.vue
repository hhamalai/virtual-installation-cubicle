<template>
  <g :transform="transform" class="switch8" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <!-- Invisible extended hover area to keep delete button accessible -->
    <rect x="-20" y="-25" width="105" height="90" fill="transparent" stroke="none"/>

    <!-- Selection highlight -->
    <rect v-if="selected" x="-8" y="-13" width="86" height="66" rx="5" fill="none" stroke="#1976d2" stroke-width="2" stroke-dasharray="4,2"/>

    <!-- Background -->
    <rect x="-5" y="-10" width="80" height="60" rx="3" fill="#fafafa" stroke="#333" stroke-width="1"/>

    <!-- Switch mechanism -->
    <circle cx="15" cy="20" r="4" fill="#333"/>
    <circle cx="55" cy="5" r="3" fill="#666"/>
    <circle cx="55" cy="35" r="3" fill="#666"/>

    <!-- Switch lever - connects COM to L1, L3, or neither (off) -->
    <line x1="15" y1="20"
          :x2="leverEnd.x" :y2="leverEnd.y"
          stroke="#333" stroke-width="3" stroke-linecap="round"/>

    <!-- Position labels (counter-rotated) -->
    <text x="68" y="8" font-size="8" fill="#666"
          :transform="`rotate(${-rotation}, 68, 8)`">1</text>
    <text x="68" y="38" font-size="8" fill="#666"
          :transform="`rotate(${-rotation}, 68, 38)`">3</text>
    <text x="15" y="42" text-anchor="middle" font-size="8" fill="#666"
          :transform="`rotate(${-rotation}, 15, 42)`">0</text>

    <!-- Type label (counter-rotated) -->
    <text class="part-label" x="35" y="-15" text-anchor="middle" font-size="9" fill="#999"
          :transform="`rotate(${-rotation}, 35, -15)`">8</text>

    <!-- Click areas for each of the 3 positions -->
    <rect x="0" y="-5" width="70" height="18" fill="transparent" class="toggle-area"
          @click.stop="$emit('toggle', 1)"/>
    <rect x="0" y="13" width="70" height="14" fill="transparent" class="toggle-area"
          @click.stop="$emit('toggle', 0)"/>
    <rect x="0" y="27" width="70" height="18" fill="transparent" class="toggle-area"
          @click.stop="$emit('toggle', 3)"/>

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
  'toggle': [position: number]
  'delete': []
}>()

const hovering = ref(false)

const rotation = computed(() => props.element.rotation || 0)

const leverEnd = computed(() => {
  const position = props.element.state.position ?? 0
  if (position === 1) return { x: 55, y: 5 }
  if (position === 3) return { x: 55, y: 35 }
  return { x: 40, y: 20 }
})

const transform = computed(() => {
  const { x, y } = props.element
  const cx = 35
  const cy = 20
  return `translate(${x}, ${y}) rotate(${rotation.value}, ${cx}, ${cy})`
})
</script>

<style scoped>
.switch8 {
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
