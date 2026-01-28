<template>
  <g :transform="transform" class="power-input" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <!-- Selection highlight -->
    <rect v-if="selected" x="-8" y="-18" width="86" height="46" rx="5" fill="none" stroke="#1976d2" stroke-width="2" stroke-dasharray="4,2"/>

    <!-- Background box -->
    <rect x="-5" y="-15" width="80" height="40" rx="3" fill="#f5f5f5" stroke="#333" stroke-width="1.5"/>

    <!-- Label (counter-rotated) -->
    <text x="35" y="-3" text-anchor="middle" font-size="10" fill="#666"
          :transform="`rotate(${-rotation}, 35, -3)`">POWER</text>

    <!-- Terminals -->
    <g v-for="terminal in element.terminals" :key="terminal.id"
       :transform="`translate(${terminal.localX}, ${terminal.localY})`"
       class="terminal"
       @click.stop="$emit('terminal-click', element.id, terminal.id)">
      <circle r="6" :fill="terminal.energized ? '#ff5722' : '#fff'" stroke="#333" stroke-width="2"/>
      <text y="18" text-anchor="middle" font-size="9" fill="#333"
            :transform="`rotate(${-rotation}, 0, 18)`">{{ terminal.name }}</text>
    </g>

    <!-- Delete button (shows on hover, rendered last for z-order, counter-rotated) -->
    <g v-if="hovering" class="delete-btn"
       :transform="`rotate(${-rotation}, 35, 5)`"
       @click.stop="$emit('delete')">
      <circle cx="-5" cy="-15" r="8" fill="#f44336"/>
      <text x="-5" y="-11" text-anchor="middle" font-size="12" fill="white" font-weight="bold">x</text>
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
  const cx = 35
  const cy = 5
  return `translate(${x}, ${y}) rotate(${rotation.value}, ${cx}, ${cy})`
})
</script>

<style scoped>
.power-input {
  cursor: move;
}
.terminal {
  cursor: pointer;
}
.terminal:hover circle {
  stroke: #1976d2;
  stroke-width: 3;
}
.delete-btn {
  cursor: pointer;
}
.delete-btn:hover circle {
  fill: #d32f2f;
}
</style>
