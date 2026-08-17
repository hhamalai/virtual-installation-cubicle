<template>
  <g :transform="transform" class="timer" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <!-- Invisible extended hover area -->
    <rect x="-8" y="-10" width="60" height="110" fill="transparent" stroke="none"/>

    <!-- Selection highlight -->
    <rect v-if="selected" x="-3" y="-3" width="50" height="96" rx="2" fill="none" stroke="#1976d2" stroke-width="2" stroke-dasharray="4,2"/>

    <!-- DIN Rail Clip -->
    <g v-if="!isMounted" class="din-clip">
      <rect x="15" y="85" width="14" height="5" rx="1" fill="#666" stroke="#444" stroke-width="0.5"/>
      <path d="M 17 87 L 20 89 L 24 89 L 27 87" fill="none" stroke="#444" stroke-width="0.5"/>
    </g>

    <!-- Body -->
    <rect x="0" y="0" width="44" height="90" rx="1.5" fill="#f5f5f5" stroke="#333" stroke-width="1"/>

    <!-- Terminal wells -->
    <rect x="1" y="1" width="42" height="12" rx="1" fill="#e8e8e8" stroke="none"/>
    <rect x="1" y="77" width="42" height="12" rx="1" fill="#e8e8e8" stroke="none"/>

    <!-- Config face (tap to open settings) -->
    <rect class="timer-config" x="3" y="15" width="38" height="60" rx="2" fill="#fff" stroke="#cfd8e3" stroke-width="0.6"
          @click.stop="$emit('configure', element.id)"/>

    <!-- Status LEDs: supply, star, delta -->
    <circle cx="10" cy="24" r="2.5" :fill="supplied ? '#4caf50' : '#555'" :stroke="supplied ? '#2e7d32' : '#333'" stroke-width="0.3" pointer-events="none"/>
    <circle v-if="supplied" cx="10" cy="24" r="3.4" fill="rgba(76,175,80,0.3)" stroke="none" pointer-events="none"/>
    <circle cx="22" cy="24" r="2.5" :fill="inStar ? '#ffca28' : '#555'" :stroke="inStar ? '#f9a825' : '#333'" stroke-width="0.3" pointer-events="none"/>
    <circle v-if="inStar" cx="22" cy="24" r="3.4" fill="rgba(255,202,40,0.35)" stroke="none" pointer-events="none"/>
    <circle cx="34" cy="24" r="2.5" :fill="inDelta ? '#29b6f6' : '#555'" :stroke="inDelta ? '#0288d1' : '#333'" stroke-width="0.3" pointer-events="none"/>
    <circle v-if="inDelta" cx="34" cy="24" r="3.4" fill="rgba(41,182,246,0.35)" stroke="none" pointer-events="none"/>
    <text x="10" y="33.5" text-anchor="middle" font-size="5" fill="#888" pointer-events="none" :transform="`rotate(${-rotation}, 10, 33.5)`">U</text>
    <text x="22" y="33.5" text-anchor="middle" font-size="5" fill="#888" pointer-events="none" :transform="`rotate(${-rotation}, 22, 33.5)`">Y</text>
    <text x="34" y="33.5" text-anchor="middle" font-size="5" fill="#888" pointer-events="none" :transform="`rotate(${-rotation}, 34, 33.5)`">&#916;</text>

    <!-- Current position and the two set times -->
    <text x="22" y="48" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a2733" pointer-events="none" :transform="`rotate(${-rotation}, 22, 48)`">{{ positionSymbol }}</text>
    <text x="22" y="58" text-anchor="middle" font-size="7.5" fill="#555" pointer-events="none" :transform="`rotate(${-rotation}, 22, 58)`">{{ starLabel }}</text>
    <text x="22" y="67" text-anchor="middle" font-size="7.5" fill="#555" pointer-events="none" :transform="`rotate(${-rotation}, 22, 67)`">{{ deltaLabel }}</text>
    <text x="22" y="73.5" text-anchor="middle" font-size="4.5" fill="#aaa" pointer-events="none" :transform="`rotate(${-rotation}, 22, 73.5)`">tap to set</text>

    <!-- Terminal labels -->
    <text x="9" y="10" text-anchor="middle" font-size="6" fill="#666" pointer-events="none" :transform="`rotate(${-rotation}, 9, 10)`">A1</text>
    <text x="35" y="10" text-anchor="middle" font-size="6" fill="#666" pointer-events="none" :transform="`rotate(${-rotation}, 35, 10)`">15</text>
    <text x="9" y="87" text-anchor="middle" font-size="6" fill="#666" pointer-events="none" :transform="`rotate(${-rotation}, 9, 87)`">A2</text>
    <text x="22" y="87" text-anchor="middle" font-size="6" fill="#666" pointer-events="none" :transform="`rotate(${-rotation}, 22, 87)`">16</text>
    <text x="35" y="87" text-anchor="middle" font-size="6" fill="#666" pointer-events="none" :transform="`rotate(${-rotation}, 35, 87)`">18</text>

    <!-- Delete button -->
    <g v-if="hovering" class="delete-btn" :transform="`rotate(${-rotation}, 22, 45)`" @click.stop="$emit('delete')">
      <circle cx="48" cy="-5" r="6" fill="#f44336"/>
      <text x="48" y="-2" text-anchor="middle" font-size="8" fill="white" font-weight="bold">x</text>
    </g>

    <!-- Terminals -->
    <g v-for="terminal in element.terminals" :key="terminal.id"
       :transform="`translate(${terminal.localX}, ${terminal.localY})`"
       class="terminal"
       @click.stop="$emit('terminal-click', element.id, terminal.id)">
      <circle class="terminal-hit" r="12" fill="transparent"/>
      <circle class="terminal-dot" r="4" :fill="terminal.energized ? '#ff5722' : '#fff'" :stroke="terminal.color || '#333'" stroke-width="1.2"/>
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
  'configure': [elementId: string]
  'delete': []
}>()

const hovering = ref(false)
const rotation = computed(() => props.element.rotation || 0)
const isMounted = computed(() => !!props.element.state.mountedOn)
const supplied = computed(() => props.element.state.timerSupplied || false)
const position = computed(() => props.element.state.starDeltaPosition || 'neutral')
const inStar = computed(() => position.value === 'star')
const inDelta = computed(() => position.value === 'delta')

const positionSymbol = computed(() => {
  if (inStar.value) return 'Y'
  if (inDelta.value) return 'Δ'
  return '–'
})

const starLabel = computed(() => {
  const t = props.element.state.starDuration ?? 5
  return t < 10 ? `Y ${t.toFixed(1)}s` : `Y ${Math.round(t)}s`
})

const deltaLabel = computed(() => `Δ ${Math.round(props.element.state.deltaDelay ?? 100)}ms`)

const transform = computed(() => {
  const { x, y } = props.element
  return `translate(${x}, ${y}) rotate(${rotation.value}, 22, 45)`
})
</script>

<style scoped>
.timer {
  cursor: move;
}
.timer-config {
  cursor: pointer;
}
.timer-config:hover {
  fill: #f0f6fd;
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
