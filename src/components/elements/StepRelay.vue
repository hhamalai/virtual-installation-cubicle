<template>
  <g :transform="transform" class="relay step-relay" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <!-- Invisible extended hover area -->
    <rect x="-8" y="-10" width="46" height="110" fill="transparent" stroke="none"/>

    <!-- Selection highlight -->
    <rect v-if="selected" x="-3" y="-3" width="36" height="96" rx="2" fill="none" stroke="#1976d2" stroke-width="2" stroke-dasharray="4,2"/>

    <!-- DIN Rail Clip (visible when not mounted) -->
    <g v-if="!isMounted" class="din-clip">
      <rect x="8" y="85" width="14" height="5" rx="1" fill="#666" stroke="#444" stroke-width="0.5"/>
      <path d="M 10 87 L 13 89 L 17 89 L 20 87" fill="none" stroke="#444" stroke-width="0.5"/>
    </g>

    <!-- Main body -->
    <rect x="0" y="0" width="30" height="90" rx="1.5" fill="#f5f5f5" stroke="#333" stroke-width="1"/>

    <!-- Terminal wells -->
    <rect x="1" y="1" width="28" height="12" rx="1" fill="#e8e8e8" stroke="none"/>
    <rect x="1" y="77" width="28" height="12" rx="1" fill="#e8e8e8" stroke="none"/>

    <!-- Coil section -->
    <rect x="10" y="34" width="10" height="24" rx="1" fill="none" stroke="#333" stroke-width="1"/>
    <path d="M 12 40 Q 13 38, 14 40 Q 15 42, 16 40 Q 17 38, 18 40"
          fill="none" stroke="#333" stroke-width="0.8"/>
    <path d="M 12 47 Q 13 45, 14 47 Q 15 49, 16 47 Q 17 45, 18 47"
          fill="none" stroke="#333" stroke-width="0.8"/>
    <path d="M 12 54 Q 13 52, 14 54 Q 15 56, 16 54 Q 17 52, 18 54"
          fill="none" stroke="#333" stroke-width="0.8"/>
    <!-- Coil leads to A1 / N -->
    <line x1="2" y1="45" x2="10" y2="45" stroke="#333" stroke-width="0.8"/>
    <line x1="20" y1="45" x2="28" y2="45" stroke="#333" stroke-width="0.8"/>

    <!-- Latch indicator: lit while the contact is held closed -->
    <circle cx="15" cy="23" r="2.5"
            :fill="latched ? '#4caf50' : '#555'"
            :stroke="latched ? '#2e7d32' : '#333'" stroke-width="0.3"/>
    <circle v-if="latched" cx="15" cy="23" r="3.4" fill="rgba(76,175,80,0.3)" stroke="none"/>

    <!-- NO contact 1 -> 2, drawn either side of the coil -->
    <line x1="15" y1="13" x2="15" y2="28" stroke="#333" stroke-width="0.8"/>
    <line x1="15" y1="62" x2="15" y2="77" stroke="#333" stroke-width="0.8"/>
    <circle cx="15" cy="28" r="1.5" fill="#333"/>
    <circle cx="15" cy="62" r="1.5" fill="#333"/>
    <line x1="15" y1="62"
          :x2="latched ? 15 : 21" :y2="latched ? 28 : 33"
          :stroke="latched ? '#4caf50' : '#999'" stroke-width="1.6" stroke-linecap="round"/>

    <!-- Terminal labels -->
    <text x="15" y="10" text-anchor="middle" font-size="6" fill="#666" :transform="`rotate(${-rotation}, 15, 10)`">1</text>
    <text x="15" y="87" text-anchor="middle" font-size="6" fill="#666" :transform="`rotate(${-rotation}, 15, 87)`">2</text>
    <text x="5" y="42" text-anchor="middle" font-size="5" fill="#888" :transform="`rotate(${-rotation}, 5, 42)`">A1</text>
    <text x="25" y="42" text-anchor="middle" font-size="5" fill="#888" :transform="`rotate(${-rotation}, 25, 42)`">N</text>

    <!-- Type label -->
    <text x="15" y="72" text-anchor="middle" font-size="5" fill="#999" :transform="`rotate(${-rotation}, 15, 72)`">STEP</text>

    <!-- Delete button -->
    <g v-if="hovering" class="delete-btn" :transform="`rotate(${-rotation}, 15, 45)`" @click.stop="$emit('delete')">
      <circle cx="34" cy="-5" r="6" fill="#f44336"/>
      <text x="34" y="-2" text-anchor="middle" font-size="8" fill="white" font-weight="bold">x</text>
    </g>

    <!-- Terminals -->
    <g v-for="terminal in element.terminals" :key="terminal.id"
       :transform="`translate(${terminal.localX}, ${terminal.localY})`"
       class="terminal"
       @click.stop="$emit('terminal-click', element.id, terminal.id)">
      <circle class="terminal-hit" r="12" fill="transparent"/>
      <circle class="terminal-dot" r="4" :fill="terminal.energized ? '#ff5722' : '#fff'" stroke="#333" stroke-width="1"/>
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
const isMounted = computed(() => !!props.element.state.mountedOn)
const latched = computed(() => props.element.state.stepOutput || false)

const transform = computed(() => {
  const { x, y } = props.element
  return `translate(${x}, ${y}) rotate(${rotation.value}, 15, 45)`
})
</script>

<style scoped>
.relay {
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
