<template>
  <g :transform="transform" class="light" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <!-- Invisible extended hover area to keep delete button accessible -->
    <rect x="-20" y="-20" width="80" height="80" fill="transparent" stroke="none"/>

    <!-- Selection highlight -->
    <circle v-if="selected" cx="20" cy="15" r="24" fill="none" stroke="#1976d2" stroke-width="2" stroke-dasharray="4,2"/>

    <!-- Light fixture circle -->
    <circle cx="20" cy="15" r="18"
            :fill="element.state.on ? '#ffeb3b' : '#fff'"
            :stroke="element.state.on ? '#ffc107' : '#333'"
            stroke-width="2"/>

    <!-- X mark inside (light symbol) -->
    <line x1="8" y1="3" x2="32" y2="27" stroke="#333" stroke-width="1.5"/>
    <line x1="32" y1="3" x2="8" y2="27" stroke="#333" stroke-width="1.5"/>

    <!-- Glow effect when on -->
    <circle v-if="element.state.on" cx="20" cy="15" r="22"
            fill="none" stroke="#ffeb3b" stroke-width="3" opacity="0.5"/>

    <!-- Terminals -->
    <g v-for="terminal in element.terminals" :key="terminal.id"
       :transform="`translate(${terminal.localX}, ${terminal.localY})`"
       class="terminal"
       @click.stop="$emit('terminal-click', element.id, terminal.id)">
      <circle class="terminal-hit" r="12" fill="transparent"/>
      <circle r="5" :fill="terminal.energized ? '#ff5722' : '#fff'" stroke="#333" stroke-width="1.5"/>
      <text y="12" text-anchor="middle" font-size="8" fill="#666"
            :transform="`rotate(${-rotation}, 0, 12)`">{{ terminal.name }}</text>
    </g>

    <!-- Delete button (shows on hover, rendered last for z-order, counter-rotated) -->
    <g v-if="hovering" class="delete-btn"
       :transform="`rotate(${-rotation}, 20, 25)`"
       @click.stop="$emit('delete')">
      <circle cx="-5" cy="-5" r="8" fill="#f44336"/>
      <text x="-5" y="-1" text-anchor="middle" font-size="12" fill="white" font-weight="bold">x</text>
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
  'delete': []
}>()

const hovering = ref(false)

const rotation = computed(() => props.element.rotation || 0)

const transform = computed(() => {
  const { x, y } = props.element
  const cx = 20
  const cy = 25
  return `translate(${x}, ${y}) rotate(${rotation.value}, ${cx}, ${cy})`
})
</script>

<style scoped>
.light {
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
.delete-btn {
  cursor: pointer;
}
.delete-btn:hover circle {
  fill: #d32f2f;
}
</style>
