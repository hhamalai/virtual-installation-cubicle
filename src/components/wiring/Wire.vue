<template>
  <g class="wire" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <!-- Main wire path -->
    <path
      :d="path"
      :stroke="color"
      stroke-width="3"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- Hover/selection area (wider invisible path) -->
    <path
      :d="path"
      stroke="transparent"
      stroke-width="12"
      fill="none"
      class="wire-hitarea"
      @click="$emit('click')"
    />

    <!-- Control points (shown on hover) -->
    <g v-if="hovering && controlPoints && controlPoints.length > 0" class="control-points">
      <g
        v-for="(point, index) in controlPoints"
        :key="index"
        class="control-point"
        @mousedown.stop="startDragPoint($event, index)"
      >
        <circle
          :cx="point.x"
          :cy="point.y"
          r="6"
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

    <!-- Endpoint indicators on hover -->
    <g v-if="hovering && fromPos && toPos" class="endpoints">
      <circle :cx="fromPos.x" :cy="fromPos.y" r="4" fill="#4caf50" opacity="0.7"/>
      <circle :cx="toPos.x" :cy="toPos.y" r="4" fill="#f44336" opacity="0.7"/>
    </g>
  </g>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Point } from '../../types'

const props = withDefaults(defineProps<{
  path: string
  color?: string
  controlPoints?: Point[]
  wireIndex?: number
  fromPos?: Point | null
  toPos?: Point | null
}>(), {
  color: '#333',
  controlPoints: () => [],
  wireIndex: 0,
  fromPos: null,
  toPos: null
})

const emit = defineEmits<{
  'click': []
  'update-point': [data: {
    index: number
    clientX: number
    clientY: number
    deltaX: number
    deltaY: number
    startPoint: Point
  }]
}>()

const hovering = ref(false)

const startDragPoint = (event: MouseEvent, pointIndex: number): void => {
  const startX = event.clientX
  const startY = event.clientY
  const startPoint = { ...props.controlPoints[pointIndex] }

  const onMouseMove = (e: MouseEvent): void => {
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    // Emit the update with new position (parent will convert to SVG coords)
    emit('update-point', {
      index: pointIndex,
      clientX: e.clientX,
      clientY: e.clientY,
      deltaX: dx,
      deltaY: dy,
      startPoint
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
.wire {
  cursor: pointer;
}
.wire:hover path:first-child {
  stroke-width: 4;
  filter: drop-shadow(0 0 3px currentColor);
}
.control-point {
  cursor: move;
}
.control-point:hover circle:first-child {
  r: 8;
}
</style>
