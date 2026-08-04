<template>
  <g :transform="transform" class="relay" @mouseenter="hovering = true" @mouseleave="hovering = false">
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

    <!-- Top terminal wells -->
    <rect x="1" y="1" width="28" height="12" rx="1" fill="#e8e8e8" stroke="none"/>
    <!-- Bottom terminal wells -->
    <rect x="1" y="77" width="28" height="12" rx="1" fill="#e8e8e8" stroke="none"/>

    <!-- Coil section -->
    <rect x="10" y="30" width="10" height="30" rx="1" fill="none" stroke="#333" stroke-width="1"/>
    <path d="M 12 37 Q 13 35, 14 37 Q 15 39, 16 37 Q 17 35, 18 37"
          fill="none" stroke="#333" stroke-width="0.8"/>
    <path d="M 12 44 Q 13 42, 14 44 Q 15 46, 16 44 Q 17 42, 18 44"
          fill="none" stroke="#333" stroke-width="0.8"/>
    <path d="M 12 51 Q 13 49, 14 51 Q 15 53, 16 51 Q 17 49, 18 51"
          fill="none" stroke="#333" stroke-width="0.8"/>
    <!-- Coil leads to A1 / N -->
    <line x1="2" y1="45" x2="10" y2="45" stroke="#333" stroke-width="0.8"/>
    <line x1="20" y1="45" x2="28" y2="45" stroke="#333" stroke-width="0.8"/>

    <!-- LED indicator -->
    <circle cx="15" cy="24" r="2"
            :fill="isCoilEnergized ? '#4caf50' : '#555'"
            :stroke="isCoilEnergized ? '#2e7d32' : '#333'" stroke-width="0.3"/>
    <circle v-if="isCoilEnergized" cx="15" cy="24" r="3" fill="rgba(76,175,80,0.3)" stroke="none"/>

    <!-- Pole 1 contact (terminals 1 -> 2, left column) -->
    <line x1="7" y1="13" x2="7" y2="34" stroke="#333" stroke-width="0.8"/>
    <line x1="7" y1="56" x2="7" y2="77" stroke="#333" stroke-width="0.8"/>
    <circle cx="7" cy="34" r="1.5" fill="#333"/>
    <circle cx="7" cy="56" r="1.5" fill="#333"/>
    <line x1="7" y1="56"
          :x2="pole1Closed ? 7 : 12" :y2="pole1Closed ? 34 : 38"
          :stroke="pole1Closed ? '#4caf50' : '#999'" stroke-width="1.6" stroke-linecap="round"/>

    <!-- Pole 2 contact (terminals 3 -> 4, right column) -->
    <line x1="23" y1="13" x2="23" y2="34" stroke="#333" stroke-width="0.8"/>
    <line x1="23" y1="56" x2="23" y2="77" stroke="#333" stroke-width="0.8"/>
    <circle cx="23" cy="34" r="1.5" fill="#333"/>
    <circle cx="23" cy="56" r="1.5" fill="#333"/>
    <line x1="23" y1="56"
          :x2="pole2Closed ? 23 : 18" :y2="pole2Closed ? 34 : 38"
          :stroke="pole2Closed ? '#4caf50' : '#999'" stroke-width="1.6" stroke-linecap="round"/>

    <!-- Terminal number labels -->
    <text x="7" y="10" text-anchor="middle" font-size="5" fill="#666" :transform="`rotate(${-rotation}, 7, 10)`">1</text>
    <text x="23" y="10" text-anchor="middle" font-size="5" fill="#666" :transform="`rotate(${-rotation}, 23, 10)`">3</text>
    <text x="7" y="87" text-anchor="middle" font-size="5" fill="#666" :transform="`rotate(${-rotation}, 7, 87)`">2</text>
    <text x="23" y="87" text-anchor="middle" font-size="5" fill="#666" :transform="`rotate(${-rotation}, 23, 87)`">4</text>
    <text x="5" y="43" text-anchor="middle" font-size="4" fill="#888" :transform="`rotate(${-rotation}, 5, 43)`">A1</text>
    <text x="25" y="43" text-anchor="middle" font-size="4" fill="#888" :transform="`rotate(${-rotation}, 25, 43)`">N</text>

    <!-- Type label -->
    <text x="15" y="70" text-anchor="middle" font-size="4" fill="#999" :transform="`rotate(${-rotation}, 15, 70)`">{{ typeLabel }}</text>

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
const isCoilEnergized = computed(() => props.element.state.coilEnergized || false)

const transform = computed(() => {
  const { x, y } = props.element
  return `translate(${x}, ${y}) rotate(${rotation.value}, 15, 45)`
})

// Pole modes derived from type: relay-<pole1>-<pole2>, e.g. relay-no-nc
const poleModes = computed<[string, string]>(() => {
  const parts = props.element.type.split('-')
  return [parts[1] || 'no', parts[2] || 'no']
})

const isPoleClosed = (mode: string): boolean =>
  mode === 'no' ? isCoilEnergized.value : !isCoilEnergized.value

const pole1Closed = computed(() => isPoleClosed(poleModes.value[0]))
const pole2Closed = computed(() => isPoleClosed(poleModes.value[1]))

const typeLabel = computed(() =>
  poleModes.value.map(m => m.toUpperCase()).join('/')
)
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
