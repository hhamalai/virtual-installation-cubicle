<template>
  <g class="cable" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <!-- Render cable as a single thick line -->
    <template v-if="firstWire && wirePath">
      <!-- Cable outer casing (thicker, gray) -->
      <path
        :d="wirePath"
        :stroke="cableOuterColor"
        :stroke-width="cableStrokeWidth + 3"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        pointer-events="none"
      />
      <!-- Cable inner (colored based on type) -->
      <path
        :d="wirePath"
        :stroke="cableInnerColor"
        :stroke-width="cableStrokeWidth"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        pointer-events="none"
      />
      <!-- PE stripe for MMJ cables -->
      <path v-if="cable.type === 'mmj3' || cable.type === 'mmj5'"
        :d="wirePath"
        stroke="#7cb342"
        stroke-width="2"
        stroke-dasharray="6,4"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        pointer-events="none"
      />

      <!-- Hover/selection area (wider invisible path) -->
      <path
        :d="wirePath"
        stroke="transparent"
        :stroke-width="cableStrokeWidth + 16"
        fill="none"
        class="cable-hitarea"
        @click="$emit('remove')"
      />

      <!-- Control points (shown on hover) -->
      <g v-if="hovering && firstWire.controlPoints && firstWire.controlPoints.length > 0" class="control-points">
        <g
          v-for="(point, index) in firstWire.controlPoints"
          :key="index"
          class="control-point"
          @mousedown.stop="startDragPoint($event, index)"
        >
          <circle
            :cx="point.x"
            :cy="point.y"
            r="7"
            fill="#fff"
            stroke="#1976d2"
            stroke-width="2"
          />
          <circle
            :cx="point.x"
            :cy="point.y"
            r="3"
            fill="#1976d2"
          />
        </g>
      </g>

      <!-- Endpoint indicators on hover (only for single wire cables) -->
      <g v-if="hovering && endpoints && !isMultiWireCable" class="endpoints" pointer-events="none">
        <circle v-if="endpoints.from" :cx="endpoints.from.x" :cy="endpoints.from.y" r="5" fill="#4caf50" opacity="0.8"/>
        <circle v-if="endpoints.to" :cx="endpoints.to.x" :cy="endpoints.to.y" r="5" fill="#f44336" opacity="0.8"/>
      </g>

    </template>
  </g>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Cable as CableType, Wire as WireType, Point } from '../../types'

interface WireEndpoints {
  from: Point | null
  to: Point | null
}

const props = defineProps<{
  cable: CableType
  getWirePath: (_wire: WireType) => string | null
  getWireEndpoints?: (_wire: WireType) => WireEndpoints | null
}>()

const emit = defineEmits<{
  'remove': []
  'update-wire-point': [data: { wire: WireType; index: number; clientX: number; clientY: number }]
}>()

const hovering = ref(false)

// Get the first completed wire (all wires in a cable share the same path)
const firstWire = computed(() => {
  const completed = props.cable.wires.filter(w => w.from && w.to)
  return completed.length > 0 ? completed[0] : null
})

const wirePath = computed(() => {
  if (!firstWire.value) return null
  return props.getWirePath(firstWire.value)
})

const endpoints = computed(() => {
  if (!firstWire.value || !props.getWireEndpoints) return null
  return props.getWireEndpoints(firstWire.value)
})

// Cable stroke width based on number of wires
const cableStrokeWidth = computed((): number => {
  const wireCount = props.cable.wires.length
  switch (wireCount) {
    case 1: return 2   // Single wire
    case 3: return 4   // MMJ3
    case 5: return 6   // MMJ5
    case 7: return 8   // OMM
    default: return 2 + wireCount
  }
})

// Cable outer color (casing)
const cableOuterColor = computed((): string => {
  switch (props.cable.type) {
    case 'mmj3':
    case 'mmj5':
      return '#9e9e9e'  // Gray casing for MMJ
    case 'omm':
      return '#616161'  // Darker gray for OMM
    default:
      return '#757575'
  }
})

// Cable inner color
const cableInnerColor = computed((): string => {
  switch (props.cable.type) {
    case 'mmj3':
    case 'mmj5':
      return '#bdbdbd'  // Light gray core for MMJ
    case 'omm':
      return '#9e9e9e'  // Gray core for OMM
    default:
      return firstWire.value?.color || '#333'  // Use wire color for single
  }
})

// Check if this is a multi-wire cable
const isMultiWireCable = computed((): boolean => {
  return props.cable.wires.length > 1
})

const startDragPoint = (_event: MouseEvent, pointIndex: number): void => {
  if (!firstWire.value) return

  const onMouseMove = (e: MouseEvent): void => {
    emit('update-wire-point', {
      wire: firstWire.value!,
      index: pointIndex,
      clientX: e.clientX,
      clientY: e.clientY
    })
  }

  const onMouseUp = (): void => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}
</script>

<style scoped>
.cable {
  cursor: pointer;
}
.cable:hover path:nth-child(2) {
  filter: brightness(1.1);
}
.control-point {
  cursor: move;
}
.control-point:hover circle:first-child {
  r: 9;
}
.wire-terminal {
  cursor: pointer;
}
.wire-terminal:hover circle:last-of-type {
  stroke: #1976d2;
  stroke-width: 2.5;
  r: 6;
}
.terminal-cluster {
  pointer-events: all;
}
</style>
