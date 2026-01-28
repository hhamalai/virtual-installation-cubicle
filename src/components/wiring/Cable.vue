<template>
  <g class="cable">
    <Wire
      v-for="(wire, index) in completedWires"
      :key="index"
      :path="getWirePath(wire) || ''"
      :color="wire.color"
      :control-points="wire.controlPoints || []"
      :wire-index="index"
      :from-pos="getWireEndpoints?.(wire)?.from ?? null"
      :to-pos="getWireEndpoints?.(wire)?.to ?? null"
      @click="$emit('remove')"
      @update-point="(data) => $emit('update-wire-point', { wire, ...data })"
    />
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Wire from './Wire.vue'
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

defineEmits<{
  'remove': []
  'update-wire-point': [data: { wire: WireType; index: number; clientX: number; clientY: number }]
}>()

const completedWires = computed(() => props.cable.wires.filter(w => w.from && w.to))
</script>

<style scoped>
.cable {
  cursor: pointer;
}
</style>
