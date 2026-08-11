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

    <!-- Status LEDs -->
    <circle cx="13" cy="24" r="2.5" :fill="supplied ? '#4caf50' : '#555'" :stroke="supplied ? '#2e7d32' : '#333'" stroke-width="0.3" pointer-events="none"/>
    <circle v-if="supplied" cx="13" cy="24" r="3.4" fill="rgba(76,175,80,0.3)" stroke="none" pointer-events="none"/>
    <circle cx="31" cy="24" r="2.5" :fill="output ? '#ffca28' : '#555'" :stroke="output ? '#f9a825' : '#333'" stroke-width="0.3" pointer-events="none"/>
    <circle v-if="output" cx="31" cy="24" r="3.4" fill="rgba(255,202,40,0.35)" stroke="none" pointer-events="none"/>
    <text x="13" y="32" text-anchor="middle" font-size="3.6" fill="#888" pointer-events="none" :transform="`rotate(${-rotation}, 13, 32)`">U/t</text>
    <text x="31" y="32" text-anchor="middle" font-size="3.6" fill="#888" pointer-events="none" :transform="`rotate(${-rotation}, 31, 32)`">R</text>

    <!-- Function code and time -->
    <text x="22" y="52" text-anchor="middle" font-size="12" font-weight="bold" fill="#1a2733" pointer-events="none" :transform="`rotate(${-rotation}, 22, 52)`">{{ fnCode }}</text>
    <text x="22" y="64" text-anchor="middle" font-size="7" fill="#555" pointer-events="none" :transform="`rotate(${-rotation}, 22, 64)`">{{ durationLabel }}</text>
    <text x="22" y="72" text-anchor="middle" font-size="3.6" fill="#aaa" pointer-events="none" :transform="`rotate(${-rotation}, 22, 72)`">tap to set</text>

    <!-- Terminal labels -->
    <text x="9" y="10" text-anchor="middle" font-size="4.5" fill="#666" pointer-events="none" :transform="`rotate(${-rotation}, 9, 10)`">A1</text>
    <text x="22" y="10" text-anchor="middle" font-size="4.5" fill="#666" pointer-events="none" :transform="`rotate(${-rotation}, 22, 10)`">B1</text>
    <text x="35" y="10" text-anchor="middle" font-size="4.5" fill="#666" pointer-events="none" :transform="`rotate(${-rotation}, 35, 10)`">15</text>
    <text x="9" y="87" text-anchor="middle" font-size="4.5" fill="#666" pointer-events="none" :transform="`rotate(${-rotation}, 9, 87)`">A2</text>
    <text x="22" y="87" text-anchor="middle" font-size="4.5" fill="#666" pointer-events="none" :transform="`rotate(${-rotation}, 22, 87)`">16</text>
    <text x="35" y="87" text-anchor="middle" font-size="4.5" fill="#666" pointer-events="none" :transform="`rotate(${-rotation}, 35, 87)`">18</text>

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
const output = computed(() => props.element.state.timerOutput || false)
const fnCode = computed(() => props.element.state.timerFunction || 'E')

const durationLabel = computed(() => {
  const d = props.element.state.timerDuration ?? 1
  return d < 10 ? `${d.toFixed(1)}s` : `${Math.round(d)}s`
})

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
