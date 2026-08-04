<template>
  <g :transform="transform" class="cable-bundle" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <!-- Invisible extended hover area to keep delete button accessible -->
    <rect x="-10" y="0" width="185" height="55" fill="transparent" stroke="none"/>

    <!-- Selection highlight -->
    <rect v-if="selected" x="-8" y="15" width="166" height="30" rx="7" fill="none" stroke="#1976d2" stroke-width="2" stroke-dasharray="4,2"/>

    <!-- Cable as single thick line -->
    <line
      x1="0"
      :y1="cableY"
      x2="150"
      :y2="cableY"
      :stroke="cableColor"
      stroke-width="8"
      stroke-linecap="round"
    />

    <!-- Inner stripe for MMJ (yellow-green PE indicator) -->
    <line v-if="element.cableType === 'mmj3' || element.cableType === 'mmj5'"
      x1="0"
      :y1="cableY"
      x2="150"
      :y2="cableY"
      stroke="#7cb342"
      stroke-width="2"
      stroke-dasharray="8,4"
    />

    <!-- Cable label (counter-rotated) -->
    <text
      x="75"
      :y="cableY - 15"
      text-anchor="middle"
      font-size="10"
      fill="#666"
      :transform="`rotate(${-rotation}, 75, ${cableY - 15})`"
    >
      {{ cableLabel }}
    </text>

    <!-- Dock point A (left end) -->
    <g class="dock-point"
       :transform="`translate(0, ${cableY})`"
       @click.stop="onDockClick('A')">
      <circle r="12" fill="transparent" stroke="none"/>
      <circle r="8"
              :fill="isDocked('A') ? '#4caf50' : '#fff'"
              :stroke="isDocked('A') ? '#388e3c' : '#333'"
              stroke-width="2"/>
      <text y="4" text-anchor="middle" font-size="9" :fill="isDocked('A') ? '#fff' : '#333'" font-weight="bold">A</text>
    </g>

    <!-- Dock point B (right end) -->
    <g class="dock-point"
       :transform="`translate(150, ${cableY})`"
       @click.stop="onDockClick('B')">
      <circle r="12" fill="transparent" stroke="none"/>
      <circle r="8"
              :fill="isDocked('B') ? '#4caf50' : '#fff'"
              :stroke="isDocked('B') ? '#388e3c' : '#333'"
              stroke-width="2"/>
      <text y="4" text-anchor="middle" font-size="9" :fill="isDocked('B') ? '#fff' : '#333'" font-weight="bold">B</text>
    </g>

    <!-- Delete button (shows on hover) -->
    <g v-if="hovering" class="delete-btn"
       :transform="`rotate(${-rotation}, 75, ${cableY})`"
       @click.stop="$emit('delete')">
      <circle cx="160" :cy="cableY - 15" r="8" fill="#f44336"/>
      <text x="160" :y="cableY - 11" text-anchor="middle" font-size="12" fill="white" font-weight="bold">x</text>
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
  'dock-click': [elementId: string, end: 'A' | 'B']
  'delete': []
}>()

const hovering = ref(false)

const rotation = computed(() => props.element.rotation || 0)

const cableY = 30

const transform = computed(() => {
  const { x, y } = props.element
  const cx = 75
  const cy = cableY
  return `translate(${x}, ${y}) rotate(${rotation.value}, ${cx}, ${cy})`
})

const cableLabel = computed((): string => {
  switch (props.element.cableType) {
    case 'mmj3': return 'MMJ 3x1.5'
    case 'mmj5': return 'MMJ 5x1.5'
    case 'omm': return 'OMM 7'
    default: return 'Cable'
  }
})

const cableColor = computed((): string => {
  switch (props.element.cableType) {
    case 'mmj3':
    case 'mmj5':
      return '#757575'  // Gray for MMJ
    case 'omm':
      return '#424242'  // Dark gray for OMM
    default:
      return '#666'
  }
})

const isDocked = (end: 'A' | 'B'): boolean => {
  if (end === 'A') {
    return !!props.element.state.dockedA
  }
  return !!props.element.state.dockedB
}

const onDockClick = (end: 'A' | 'B'): void => {
  emit('dock-click', props.element.id, end)
}
</script>

<style scoped>
.cable-bundle {
  cursor: move;
}

.dock-point {
  cursor: pointer;
}

.dock-point:hover circle:last-of-type {
  stroke: #1976d2;
  stroke-width: 2.5;
}

.delete-btn {
  cursor: pointer;
}
.delete-btn:hover circle {
  fill: #d32f2f;
}
</style>
