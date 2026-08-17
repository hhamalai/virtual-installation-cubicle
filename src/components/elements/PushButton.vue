<template>
  <g :transform="transform" class="push-button" @mouseenter="hovering = true" @mouseleave="hovering = false">
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

    <!-- Face plate -->
    <rect x="1" y="14" width="28" height="62" rx="1" fill="#fafafa" stroke="#ddd" stroke-width="0.5"/>

    <!-- Green NO contact (terminals G1-G2) -->
    <line :x1="greenX" y1="13" :x2="greenX" y2="33" stroke="#333" stroke-width="0.8"/>
    <line :x1="greenX" y1="57" :x2="greenX" y2="77" stroke="#333" stroke-width="0.8"/>
    <circle :cx="greenX" cy="33" r="1.4" fill="#333"/>
    <circle :cx="greenX" cy="57" r="1.4" fill="#333"/>
    <line :x1="greenX" y1="57" :x2="greenPressed ? greenX : greenX + 4" :y2="greenPressed ? 33 : 37"
          :stroke="greenPressed ? '#2e7d32' : '#bbb'" stroke-width="1.6" stroke-linecap="round"/>

    <!-- Red NC contact (right column, terminals R1-R2) -->
    <template v-if="hasRed">
      <line x1="23" y1="13" x2="23" y2="33" stroke="#333" stroke-width="0.8"/>
      <line x1="23" y1="57" x2="23" y2="77" stroke="#333" stroke-width="0.8"/>
      <circle cx="23" cy="33" r="1.4" fill="#333"/>
      <circle cx="23" cy="57" r="1.4" fill="#333"/>
      <line x1="23" y1="57" :x2="redPressed ? 19 : 23" :y2="redPressed ? 37 : 33"
            :stroke="redPressed ? '#bbb' : '#c62828'" stroke-width="1.6" stroke-linecap="round"/>
    </template>

    <!-- Green push button (momentary NO) -->
    <g class="press-btn" @mousedown.stop.prevent="startPress('green')" @touchstart.stop.prevent="startPress('green')">
      <circle :cx="greenX" cy="45" r="7" fill="#1b5e20"/>
      <circle :cx="greenX" :cy="greenPressed ? 45.5 : 45" :r="greenPressed ? 4.5 : 5.5"
              :fill="greenPressed ? '#43a047' : '#66bb6a'" stroke="#1b5e20" stroke-width="0.5"/>
    </g>

    <!-- Red push button (momentary NC) -->
    <g v-if="hasRed" class="press-btn" @mousedown.stop.prevent="startPress('red')" @touchstart.stop.prevent="startPress('red')">
      <circle cx="23" cy="45" r="7" fill="#b71c1c"/>
      <circle cx="23" :cy="redPressed ? 45.5 : 45" :r="redPressed ? 4.5 : 5.5"
              :fill="redPressed ? '#e53935' : '#ef5350'" stroke="#b71c1c" stroke-width="0.5"/>
    </g>

    <!-- Labels -->
    <text :x="greenX" y="10" text-anchor="middle" font-size="4.5" fill="#2e7d32" :transform="`rotate(${-rotation}, ${greenX}, 10)`">NO</text>
    <text v-if="hasRed" x="23" y="10" text-anchor="middle" font-size="4.5" fill="#c62828" :transform="`rotate(${-rotation}, 23, 10)`">NC</text>

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

const emit = defineEmits<{
  'terminal-click': [elementId: string, terminalId: string]
  'button-press': [elementId: string, color: 'green' | 'red']
  'button-release': [elementId: string, color: 'green' | 'red']
  'delete': []
}>()

const hovering = ref(false)
const rotation = computed(() => props.element.rotation || 0)
const isMounted = computed(() => !!props.element.state.mountedOn)
// The single-button variant has only the green NO contact, centred on the module.
const hasRed = computed(() => props.element.type !== 'button-no')
const greenX = computed(() => (hasRed.value ? 7 : 15))
const greenPressed = computed(() => props.element.state.greenPressed || false)
const redPressed = computed(() => props.element.state.redPressed || false)

const transform = computed(() => {
  const { x, y } = props.element
  return `translate(${x}, ${y}) rotate(${rotation.value}, 15, 45)`
})

// Momentary: held while the pointer is down, released on pointer up anywhere.
const startPress = (color: 'green' | 'red'): void => {
  emit('button-press', props.element.id, color)
  const release = (): void => {
    emit('button-release', props.element.id, color)
    document.removeEventListener('mouseup', release)
    document.removeEventListener('touchend', release)
    document.removeEventListener('touchcancel', release)
  }
  document.addEventListener('mouseup', release)
  document.addEventListener('touchend', release)
  document.addEventListener('touchcancel', release)
}
</script>

<style scoped>
.push-button {
  cursor: move;
}
.press-btn {
  cursor: pointer;
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
