<template>
  <g :transform="transform" class="switch7" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <!-- Invisible extended hover area to keep delete button accessible -->
    <rect x="-20" y="-20" width="100" height="90" fill="transparent" stroke="none"/>

    <!-- Selection highlight -->
    <rect v-if="selected" x="-8" y="-8" width="81" height="66" rx="5" fill="none" stroke="#1976d2" stroke-width="2" stroke-dasharray="4,2"/>

    <!-- Background -->
    <rect x="-5" y="-5" width="75" height="60" rx="3" fill="#fafafa" stroke="#333" stroke-width="1"/>

    <!-- Input terminals visual -->
    <circle cx="10" cy="10" r="3" fill="#333"/>
    <circle cx="10" cy="40" r="3" fill="#333"/>

    <!-- Output terminals visual -->
    <circle cx="55" cy="10" r="3" fill="#666"/>
    <circle cx="55" cy="40" r="3" fill="#666"/>

    <!-- Cross switch connections -->
    <template v-if="element.state.crossed">
      <!-- Crossed: IN1->OUT2, IN2->OUT1 -->
      <line x1="10" y1="10" x2="55" y2="40" stroke="#333" stroke-width="2.5"/>
      <line x1="10" y1="40" x2="55" y2="10" stroke="#333" stroke-width="2.5"/>
    </template>
    <template v-else>
      <!-- Straight: IN1->OUT1, IN2->OUT2 -->
      <line x1="10" y1="10" x2="55" y2="10" stroke="#333" stroke-width="2.5"/>
      <line x1="10" y1="40" x2="55" y2="40" stroke="#333" stroke-width="2.5"/>
    </template>

    <!-- State indicator (counter-rotated) -->
    <text x="32" y="58" text-anchor="middle" font-size="7" fill="#666"
          :transform="`rotate(${-rotation}, 32, 58)`">
      {{ element.state.crossed ? 'X' : '=' }}
    </text>

    <!-- Type label (counter-rotated) -->
    <text class="part-label" x="32" y="-8" text-anchor="middle" font-size="9" fill="#999"
          :transform="`rotate(${-rotation}, 32, -8)`">7</text>

    <!-- Click area for toggling -->
    <rect x="0" y="0" width="65" height="50" fill="transparent" class="toggle-area"
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
       :transform="`rotate(${-rotation}, 32, 25)`"
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
  'toggle': []
  'delete': []
}>()

const hovering = ref(false)

const rotation = computed(() => props.element.rotation || 0)

const transform = computed(() => {
  const { x, y } = props.element
  const cx = 32
  const cy = 25
  return `translate(${x}, ${y}) rotate(${rotation.value}, ${cx}, ${cy})`
})
</script>

<style scoped>
.switch7 {
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
