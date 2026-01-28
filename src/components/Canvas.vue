<template>
  <div ref="containerRef" class="canvas-container">
    <div class="zoom-controls">
      <button @click="zoomIn">+</button>
      <span>{{ Math.round(zoom * 100) }}%</span>
      <button @click="zoomOut">−</button>
      <button @click="resetView">Reset</button>
    </div>
    <svg
      ref="svgRef"
      class="canvas"
      :viewBox="`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`"
      @dragover.prevent
      @drop="onDrop"
      @click="onCanvasClick"
      @mousemove="onMouseMove"
      @wheel.prevent="onWheel"
      @mousedown="onMouseDown"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- Grid pattern -->
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" stroke-width="0.5"/>
        </pattern>
        <pattern id="grid-large" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#ccc" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#grid)"/>
      <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#grid-large)"/>

      <!-- Cables/Wires -->
      <Cable
        v-for="cable in cables"
        :key="cable.id"
        :cable="cable"
        :get-wire-path="getWirePath"
        :get-wire-endpoints="getWireEndpoints"
        @remove="removeCable(cable.id)"
        @update-wire-point="onUpdateWirePoint"
      />

      <!-- Pending wire (while connecting) -->
      <g v-if="pendingWire">
        <path
          v-if="pendingWirePath"
          :d="pendingWirePath"
          :stroke="pendingWire.color"
          stroke-width="3"
          fill="none"
        />
        <!-- Control points -->
        <circle
          v-for="(point, i) in pendingWire.controlPoints"
          :key="i"
          :cx="point.x"
          :cy="point.y"
          r="4"
          fill="#ff9800"
          stroke="#fff"
          stroke-width="1"
        />
      </g>

      <!-- Elements -->
      <g v-for="element in elements" :key="element.id">
        <component
          :is="getComponentType(element.type)"
          :element="element"
          :selected="selectedElementId === element.id || selectedElementIds.has(element.id)"
          @mousedown="onElementMouseDown($event, element)"
          @terminal-click="onTerminalClick"
          @toggle="(switchIndex: number | undefined) => handleToggle(element.id, switchIndex)"
          @delete="removeElement(element.id)"
        />
      </g>

      <!-- Selection rectangle -->
      <rect
        v-if="isSelecting"
        :x="Math.min(selectionStart.x, selectionEnd.x)"
        :y="Math.min(selectionStart.y, selectionEnd.y)"
        :width="Math.abs(selectionEnd.x - selectionStart.x)"
        :height="Math.abs(selectionEnd.y - selectionStart.y)"
        fill="rgba(25, 118, 210, 0.1)"
        stroke="#1976d2"
        stroke-width="1"
        stroke-dasharray="5,3"
      />

      <!-- Instructions overlay -->
      <g v-if="wiringMode" class="instructions">
        <rect :x="viewBox.x + 10" :y="viewBox.y + 10" width="280" height="30" rx="4" fill="rgba(255,152,0,0.9)"/>
        <text :x="viewBox.x + 150" :y="viewBox.y + 30" text-anchor="middle" fill="white" font-size="12">
          Click to add points, click terminal to finish
        </text>
      </g>
    </svg>
    <div class="canvas-help">
      Scroll to zoom • Middle-click to pan • R to rotate • Del to delete • Drag to select multiple
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, type Component } from 'vue'
import { useCircuitStore } from '../stores/circuit'
import { useConnections } from '../composables/useConnections'
import { useDrag } from '../composables/useDrag'
import type { Element, Point } from '../types'

import PowerInput from './elements/PowerInput.vue'
import Light from './elements/Light.vue'
import Switch1 from './elements/Switch1.vue'
import Switch5 from './elements/Switch5.vue'
import Switch6 from './elements/Switch6.vue'
import Switch66 from './elements/Switch66.vue'
import Switch7 from './elements/Switch7.vue'
import CableBundle from './elements/CableBundle.vue'
import Cable from './wiring/Cable.vue'

const props = defineProps<{
  selectedCable: string | null
  selectedComponent: string | null
}>()

const emit = defineEmits<{
  'wire-complete': []
  'component-placed': []
}>()

interface PendingWire {
  elementId: string
  terminalId: string
  color: string
  controlPoints: Point[]
}

interface ViewBox {
  x: number
  y: number
  width: number
  height: number
}

const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const pendingWire = ref<PendingWire | null>(null)
const mousePos = ref<Point>({ x: 0, y: 0 })
const isPanning = ref(false)
const panStart = ref<Point>({ x: 0, y: 0 })
const selectedElementId = ref<string | null>(null)
const selectedElementIds = ref<Set<string>>(new Set())

// Rectangular selection state
const isSelecting = ref(false)
const selectionStart = ref<Point>({ x: 0, y: 0 })
const selectionEnd = ref<Point>({ x: 0, y: 0 })

// Group drag state
const isGroupDragging = ref(false)
const groupDragStart = ref<Point>({ x: 0, y: 0 })
const groupDragElementStarts = ref<Map<string, Point>>(new Map())

// Store wire control point initial positions during group drag
// Key format: "cableId-wireIndex-pointIndex"
const groupDragControlPoints = ref<Map<string, Point>>(new Map())

// View state
const zoom = ref(1)
const viewBox = ref<ViewBox>({ x: 0, y: 0, width: 1200, height: 800 })

const {
  state,
  addElement,
  removeElement,
  updateElement,
  toggleSwitch,
  rotateElement,
  startWiring,
  addControlPoint,
  cancelWiring,
  completeWire,
  removeCable,
  updateWirePoint
} = useCircuitStore()

const elements = computed(() => state.elements)
const cables = computed(() => state.cables)
const wiringMode = computed(() => state.wiringMode)

const { getWirePath, getTerminalPosition, getWireEndpoints } = useConnections(state)

// Clear pending wire when wiring mode is canceled externally
watch(wiringMode, (newValue) => {
  if (!newValue) {
    pendingWire.value = null
  }
})

const componentMap: Record<string, Component> = {
  'power-input': PowerInput,
  'light': Light,
  'light-grounded': Light,
  'switch1': Switch1,
  'switch5': Switch5,
  'switch6': Switch6,
  'switch66': Switch66,
  'switch7': Switch7,
  'cable-mmj3': CableBundle,
  'cable-mmj5': CableBundle,
  'cable-omm': CableBundle
}

const getComponentType = (type: string): Component => componentMap[type] || PowerInput

// Convert screen coordinates to SVG coordinates using native SVG transformation
const getSvgPoint = (clientX: number, clientY: number): Point => {
  if (!svgRef.value) return { x: 0, y: 0 }

  const svg = svgRef.value
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY

  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }

  const svgPt = pt.matrixTransform(ctm.inverse())
  return { x: svgPt.x, y: svgPt.y }
}

const onMouseMove = (event: MouseEvent): void => {
  const pos = getSvgPoint(event.clientX, event.clientY)
  mousePos.value = pos

  if (isPanning.value && containerRef.value) {
    const dx = (event.clientX - panStart.value.x) * (viewBox.value.width / containerRef.value.offsetWidth)
    const dy = (event.clientY - panStart.value.y) * (viewBox.value.height / containerRef.value.offsetHeight)
    viewBox.value.x -= dx
    viewBox.value.y -= dy
    panStart.value = { x: event.clientX, y: event.clientY }
  }

  // Update selection rectangle
  if (isSelecting.value) {
    selectionEnd.value = pos
  }

  // Group dragging
  if (isGroupDragging.value) {
    const dx = pos.x - groupDragStart.value.x
    const dy = pos.y - groupDragStart.value.y

    // Move elements
    for (const [id, startPos] of groupDragElementStarts.value) {
      updateElement(id, { x: startPos.x + dx, y: startPos.y + dy })
    }

    // Move wire control points
    for (const [key, startPos] of groupDragControlPoints.value) {
      const parts = key.split('|')
      const cableId = parts[0]
      const wireIndex = parseInt(parts[1], 10)
      const pointIndex = parseInt(parts[2], 10)
      updateWirePoint(cableId, wireIndex, pointIndex, startPos.x + dx, startPos.y + dy)
    }
  }
}

const onMouseDown = (event: MouseEvent): void => {
  // Middle mouse button for panning
  if (event.button === 1) {
    event.preventDefault()
    isPanning.value = true
    panStart.value = { x: event.clientX, y: event.clientY }
    return
  }

  // Left mouse button on empty canvas - start selection rectangle
  if (event.button === 0 && !wiringMode.value) {
    const target = event.target as HTMLElement
    const clickedOnElement = target.closest('.switch1, .switch5, .switch6, .switch66, .switch7, .power-input, .light, .cable-bundle')

    if (!clickedOnElement && !target.closest('.terminal')) {
      const pos = getSvgPoint(event.clientX, event.clientY)
      isSelecting.value = true
      selectionStart.value = { ...pos }
      selectionEnd.value = { ...pos }
    }
  }
}

const onMouseUp = (): void => {
  isPanning.value = false

  // End selection rectangle and select elements within
  if (isSelecting.value) {
    const minX = Math.min(selectionStart.value.x, selectionEnd.value.x)
    const maxX = Math.max(selectionStart.value.x, selectionEnd.value.x)
    const minY = Math.min(selectionStart.value.y, selectionEnd.value.y)
    const maxY = Math.max(selectionStart.value.y, selectionEnd.value.y)

    // Only select if the rectangle has some size
    if (maxX - minX > 5 || maxY - minY > 5) {
      const newSelection = new Set<string>()

      for (const el of elements.value) {
        // Check if element is within selection rectangle
        if (el.x >= minX && el.x <= maxX && el.y >= minY && el.y <= maxY) {
          newSelection.add(el.id)
        }
      }

      selectedElementIds.value = newSelection
      selectedElementId.value = null
    }

    isSelecting.value = false
  }

  // End group dragging
  if (isGroupDragging.value) {
    isGroupDragging.value = false
    groupDragElementStarts.value.clear()
    groupDragControlPoints.value.clear()
  }
}

// Touch event state
const touchStartPos = ref<Point | null>(null)
const isTouchDragging = ref(false)

// Pinch-to-zoom and two-finger pan state
const pinchStartDistance = ref<number | null>(null)
const pinchStartMidpoint = ref<Point | null>(null)
const pinchStartViewBox = ref<ViewBox | null>(null)

const onTouchStart = (event: TouchEvent): void => {
  if (event.touches.length === 1) {
    const touch = event.touches[0]
    touchStartPos.value = { x: touch.clientX, y: touch.clientY }
    isTouchDragging.value = false
  }

  // Initialize pinch-to-zoom and two-finger pan
  if (event.touches.length === 2) {
    event.preventDefault()
    const touch1 = event.touches[0]
    const touch2 = event.touches[1]

    // Calculate initial distance between fingers
    const dx = touch2.clientX - touch1.clientX
    const dy = touch2.clientY - touch1.clientY
    pinchStartDistance.value = Math.sqrt(dx * dx + dy * dy)

    // Calculate midpoint (in client coordinates)
    pinchStartMidpoint.value = {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    }

    // Store initial viewBox
    pinchStartViewBox.value = { ...viewBox.value }
  }
}

const onTouchMove = (event: TouchEvent): void => {
  if (event.touches.length === 1 && touchStartPos.value) {
    const touch = event.touches[0]
    const dx = Math.abs(touch.clientX - touchStartPos.value.x)
    const dy = Math.abs(touch.clientY - touchStartPos.value.y)
    // If moved more than 10px, it's a drag not a tap
    if (dx > 10 || dy > 10) {
      isTouchDragging.value = true
    }

    // Update mouse position for wire drawing
    const pos = getSvgPoint(touch.clientX, touch.clientY)
    mousePos.value = pos
  }

  // Pinch-to-zoom and two-finger pan
  if (event.touches.length === 2 && pinchStartDistance.value && pinchStartMidpoint.value && pinchStartViewBox.value) {
    event.preventDefault()

    const touch1 = event.touches[0]
    const touch2 = event.touches[1]
    const container = containerRef.value
    if (!container) return

    const containerWidth = container.offsetWidth
    const containerHeight = container.offsetHeight

    // Calculate current distance between fingers
    const dx = touch2.clientX - touch1.clientX
    const dy = touch2.clientY - touch1.clientY
    const currentDistance = Math.sqrt(dx * dx + dy * dy)

    // Calculate current midpoint (in client/screen coordinates, relative to container)
    const rect = container.getBoundingClientRect()
    const currentMidpoint = {
      x: ((touch1.clientX + touch2.clientX) / 2) - rect.left,
      y: ((touch1.clientY + touch2.clientY) / 2) - rect.top
    }
    const startMidpoint = {
      x: pinchStartMidpoint.value.x - rect.left,
      y: pinchStartMidpoint.value.y - rect.top
    }

    // Calculate scale factor (larger distance = zoom in = smaller viewBox dimensions)
    const scale = pinchStartDistance.value / currentDistance

    // Calculate new viewBox dimensions
    const newWidth = pinchStartViewBox.value.width * scale
    const newHeight = pinchStartViewBox.value.height * scale

    // Limit zoom
    if (newWidth < 200 || newWidth > 5000) return

    // Calculate the SVG point that was under the initial midpoint
    const anchorSvgX = pinchStartViewBox.value.x + (startMidpoint.x / containerWidth) * pinchStartViewBox.value.width
    const anchorSvgY = pinchStartViewBox.value.y + (startMidpoint.y / containerHeight) * pinchStartViewBox.value.height

    // Position viewBox so that anchor point is under the current midpoint
    viewBox.value.x = anchorSvgX - (currentMidpoint.x / containerWidth) * newWidth
    viewBox.value.y = anchorSvgY - (currentMidpoint.y / containerHeight) * newHeight
    viewBox.value.width = newWidth
    viewBox.value.height = newHeight
    zoom.value = 1200 / newWidth
  }
}

const onTouchEnd = (event: TouchEvent): void => {
  // Only handle as tap if it wasn't a drag and not pinching
  if (!isTouchDragging.value && touchStartPos.value && event.changedTouches.length === 1 && !pinchStartDistance.value) {
    const touch = event.changedTouches[0]
    const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement

    // Check if tapped on an element
    const clickedOnElement = target?.closest('.switch1, .switch5, .switch6, .switch66, .switch7, .power-input, .light, .cable-bundle')

    // Handle tap-to-place component (for touch devices)
    if (props.selectedComponent && !clickedOnElement && !target?.closest('.terminal')) {
      const pos = getSvgPoint(touch.clientX, touch.clientY)
      addElement(props.selectedComponent, pos.x - 30, pos.y - 20)
      emit('component-placed')
    }
  }

  touchStartPos.value = null
  isTouchDragging.value = false

  // Reset pinch state when touches end
  if (event.touches.length < 2) {
    pinchStartDistance.value = null
    pinchStartMidpoint.value = null
    pinchStartViewBox.value = null
  }
}

const onWheel = (event: WheelEvent): void => {
  const scaleFactor = event.deltaY > 0 ? 1.1 : 0.9
  const mousePoint = getSvgPoint(event.clientX, event.clientY)

  const newWidth = viewBox.value.width * scaleFactor
  const newHeight = viewBox.value.height * scaleFactor

  // Limit zoom
  if (newWidth < 200 || newWidth > 5000) return

  // Zoom towards mouse position
  const dx = (mousePoint.x - viewBox.value.x) * (1 - scaleFactor)
  const dy = (mousePoint.y - viewBox.value.y) * (1 - scaleFactor)

  viewBox.value.x += dx
  viewBox.value.y += dy
  viewBox.value.width = newWidth
  viewBox.value.height = newHeight
  zoom.value = 1200 / newWidth
}

const zoomIn = (): void => {
  const center = {
    x: viewBox.value.x + viewBox.value.width / 2,
    y: viewBox.value.y + viewBox.value.height / 2
  }
  viewBox.value.width *= 0.8
  viewBox.value.height *= 0.8
  viewBox.value.x = center.x - viewBox.value.width / 2
  viewBox.value.y = center.y - viewBox.value.height / 2
  zoom.value = 1200 / viewBox.value.width
}

const zoomOut = (): void => {
  const center = {
    x: viewBox.value.x + viewBox.value.width / 2,
    y: viewBox.value.y + viewBox.value.height / 2
  }
  viewBox.value.width *= 1.25
  viewBox.value.height *= 1.25
  viewBox.value.x = center.x - viewBox.value.width / 2
  viewBox.value.y = center.y - viewBox.value.height / 2
  zoom.value = 1200 / viewBox.value.width
}

const resetView = (): void => {
  viewBox.value = { x: 0, y: 0, width: 1200, height: 800 }
  zoom.value = 1
}

const onDrop = (event: DragEvent): void => {
  const elementType = event.dataTransfer?.getData('elementType')
  if (!elementType) return

  const pos = getSvgPoint(event.clientX, event.clientY)
  addElement(elementType, pos.x - 30, pos.y - 20)
}

const pendingWirePath = computed(() => {
  if (!pendingWire.value) return ''

  const fromPos = getTerminalPosition(
    pendingWire.value.elementId,
    pendingWire.value.terminalId
  )
  if (!fromPos) return ''

  const points = [fromPos, ...pendingWire.value.controlPoints, mousePos.value]

  if (points.length < 2) return ''

  // Create smooth bezier curve through points
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }

  let path = `M ${points[0].x} ${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    // Catmull-Rom to Bezier conversion
    const tension = 0.3
    const cp1x = p1.x + (p2.x - p0.x) * tension
    const cp1y = p1.y + (p2.y - p0.y) * tension
    const cp2x = p2.x - (p3.x - p1.x) * tension
    const cp2y = p2.y - (p3.y - p1.y) * tension

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }

  return path
})

// Drag handling for elements
const { startDrag } = useDrag(getSvgPoint, (element: Element, newX: number, newY: number, _isDone: boolean) => {
  updateElement(element.id, { x: newX, y: newY })
})

const onElementMouseDown = (event: MouseEvent, element: Element): void => {
  // Don't start drag if we clicked on a terminal or toggle area or delete button
  const target = event.target as HTMLElement
  if (target.closest('.terminal') || target.closest('.toggle-area') || target.closest('.delete-btn')) {
    return
  }

  // If this element is part of a group selection, start group drag
  if (selectedElementIds.value.has(element.id) && selectedElementIds.value.size > 1) {
    const pos = getSvgPoint(event.clientX, event.clientY)
    isGroupDragging.value = true
    groupDragStart.value = pos

    // Store starting positions of all selected elements
    groupDragElementStarts.value.clear()
    for (const id of selectedElementIds.value) {
      const el = elements.value.find(e => e.id === id)
      if (el) {
        groupDragElementStarts.value.set(id, { x: el.x, y: el.y })
      }
    }

    // Store control points for wires connected to selected elements
    groupDragControlPoints.value.clear()
    for (const cable of cables.value) {
      cable.wires.forEach((wire, wireIndex) => {
        if (!wire.from || !wire.to) return

        // Check if both endpoints are connected to selected elements
        const fromSelected = selectedElementIds.value.has(wire.from.elementId)
        const toSelected = selectedElementIds.value.has(wire.to.elementId)

        // Only move control points if both ends are in the selection
        if (fromSelected && toSelected && wire.controlPoints) {
          wire.controlPoints.forEach((point, pointIndex) => {
            // Use | as separator since cable IDs contain dashes
            const key = `${cable.id}|${wireIndex}|${pointIndex}`
            groupDragControlPoints.value.set(key, { x: point.x, y: point.y })
          })
        }
      })
    }
    return
  }

  // Single element selection and drag
  selectedElementId.value = element.id
  selectedElementIds.value.clear()
  startDrag(event, element)
}

const onTerminalClick = (elementId: string, terminalId: string): void => {
  // Use selected cable or default to 'single' wire
  const cableType = props.selectedCable || 'single'

  const cableColors: Record<string, string> = {
    'single': '#333',
    'mmj3': '#d32f2f',
    'mmj5': '#d32f2f',
    'omm': '#e91e63'
  }

  if (!wiringMode.value) {
    startWiring(cableType, elementId, terminalId)

    // Get terminal position for initial mouse position
    const termPos = getTerminalPosition(elementId, terminalId)

    pendingWire.value = {
      elementId,
      terminalId,
      color: cableColors[cableType] || '#333',
      controlPoints: []
    }

    // Initialize mouse position to terminal position
    if (termPos) {
      mousePos.value = { ...termPos }
    }
  } else {
    completeWire(elementId, terminalId)
    pendingWire.value = null
    emit('wire-complete')
  }
}

const handleToggle = (elementId: string, switchIndex?: number): void => {
  toggleSwitch(elementId, switchIndex)
}

interface WirePointUpdate {
  wire: { controlPoints?: Point[] }
  index: number
  clientX: number
  clientY: number
}

const onUpdateWirePoint = ({ wire, index, clientX, clientY }: WirePointUpdate): void => {
  // Find the cable that contains this wire
  const cable = cables.value.find(c => c.wires.includes(wire as any))
  if (!cable) return

  const wireIndex = cable.wires.indexOf(wire as any)
  const svgPoint = getSvgPoint(clientX, clientY)

  updateWirePoint(cable.id, wireIndex, index, svgPoint.x, svgPoint.y)
}

const onCanvasClick = (event: MouseEvent): void => {
  const target = event.target as HTMLElement

  // Check if clicked on an element (not empty canvas)
  const clickedOnElement = target.closest('.switch1, .switch5, .switch6, .switch66, .switch7, .power-input, .light, .cable-bundle')

  // Handle tap-to-place component (for touch devices)
  if (props.selectedComponent && !clickedOnElement && !target.closest('.terminal')) {
    const pos = getSvgPoint(event.clientX, event.clientY)
    addElement(props.selectedComponent, pos.x - 30, pos.y - 20)
    emit('component-placed')
    return
  }

  if (wiringMode.value) {
    if (target.closest('.terminal')) {
      return
    }

    const pos = getSvgPoint(event.clientX, event.clientY)
    addControlPoint(pos.x, pos.y)

    if (pendingWire.value) {
      pendingWire.value.controlPoints.push({ x: pos.x, y: pos.y })
    }
  } else if (!clickedOnElement) {
    // Deselect only when clicking empty canvas (but not after selection rectangle)
    if (!isSelecting.value) {
      selectedElementId.value = null
      selectedElementIds.value.clear()
    }
  }
}

const onKeyDown = (event: KeyboardEvent): void => {
  if (event.key === 'r' || event.key === 'R') {
    // Rotate single selected element
    if (selectedElementId.value) {
      rotateElement(selectedElementId.value)
    }
    // Rotate all multi-selected elements
    for (const id of selectedElementIds.value) {
      rotateElement(id)
    }
  }
  if (event.key === 'Escape') {
    if (wiringMode.value) {
      cancelWiring()
      pendingWire.value = null
      emit('wire-complete')
    }
    selectedElementId.value = null
    selectedElementIds.value.clear()
    isSelecting.value = false
  }
  // Delete selected elements
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (selectedElementId.value) {
      removeElement(selectedElementId.value)
      selectedElementId.value = null
    }
    for (const id of selectedElementIds.value) {
      removeElement(id)
    }
    selectedElementIds.value.clear()
  }
}

onMounted(() => {
  document.addEventListener('mouseup', onMouseUp)
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<style scoped>
.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.canvas {
  width: 100%;
  height: 100%;
  background: #fafafa;
  cursor: crosshair;
}

.canvas-container:active .canvas {
  cursor: grabbing;
}

.zoom-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 5px;
  align-items: center;
  background: white;
  padding: 5px 10px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 10;
}

.zoom-controls button {
  width: 28px;
  height: 28px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-controls button:hover {
  background: #f0f0f0;
}

.zoom-controls span {
  font-size: 12px;
  min-width: 45px;
  text-align: center;
}

.canvas-help {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: #888;
  background: rgba(255,255,255,0.9);
  padding: 4px 12px;
  border-radius: 4px;
}

.instructions text {
  font-weight: 500;
}
</style>
