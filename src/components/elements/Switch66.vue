<template>
  <g :transform="transform" class="switch66" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <!-- Invisible extended hover area to keep delete button accessible -->
    <rect x="-20" y="-25" width="110" height="115" fill="transparent" stroke="none"/>

    <!-- Selection highlight -->
    <rect v-if="selected" x="-8" y="-13" width="91" height="91" rx="5" fill="none" stroke="#1976d2" stroke-width="2" stroke-dasharray="4,2"/>

    <!-- Background -->
    <rect x="-5" y="-10" width="85" height="85" rx="3" fill="#fafafa" stroke="#333" stroke-width="1"/>

    <!-- Type label (counter-rotated) -->
    <text x="37" y="-13" text-anchor="middle" font-size="9" fill="#999"
          :transform="`rotate(${-rotation}, 37, -13)`">6+6</text>

    <!-- First switch (top) -->
    <g class="switch-unit">
      <circle cx="15" cy="15" r="4" fill="#333"/>
      <circle cx="55" cy="5" r="3" fill="#666"/>
      <circle cx="55" cy="25" r="3" fill="#666"/>
      <line x1="15" y1="15"
            :x2="55" :y2="element.state.position1 === 0 ? 5 : 25"
            stroke="#333" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Toggle area for switch 1 -->
      <rect x="0" y="-5" width="70" height="35" fill="transparent" class="toggle-area"
            @click.stop="$emit('toggle', 0)"/>
    </g>

    <!-- Divider line -->
    <line x1="0" y1="37" x2="70" y2="37" stroke="#ccc" stroke-width="1" stroke-dasharray="3,2"/>

    <!-- Second switch (bottom) -->
    <g class="switch-unit">
      <circle cx="15" cy="55" r="4" fill="#333"/>
      <circle cx="55" cy="45" r="3" fill="#666"/>
      <circle cx="55" cy="65" r="3" fill="#666"/>
      <line x1="15" y1="55"
            :x2="55" :y2="element.state.position2 === 0 ? 45 : 65"
            stroke="#333" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Toggle area for switch 2 -->
      <rect x="0" y="40" width="70" height="35" fill="transparent" class="toggle-area"
            @click.stop="$emit('toggle', 1)"/>
    </g>

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
       :transform="`rotate(${-rotation}, 37, 35)`"
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
  'toggle': [switchIndex: number]
  'delete': []
}>()

const hovering = ref(false)

const rotation = computed(() => props.element.rotation || 0)

const transform = computed(() => {
  const { x, y } = props.element
  const cx = 37
  const cy = 35
  return `translate(${x}, ${y}) rotate(${rotation.value}, ${cx}, ${cy})`
})
</script>

<style scoped>
.switch66 {
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
