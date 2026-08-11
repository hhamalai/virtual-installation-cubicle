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

      <!-- Elements (rendered first, so wires appear on top) -->
      <g v-for="element in elements" :key="element.id">
        <component
          :is="getComponentType(element.type)"
          :element="element"
          :selected="selectedElementId === element.id || selectedElementIds.has(element.id)"
          @mousedown="onElementMouseDown($event, element)"
          @touchstart="onElementTouchStart($event, element)"
          @terminal-click="onTerminalClick"
          @wire-terminal-click="onWireTerminalClick"
          @toggle="(switchIndex: number | undefined) => handleToggle(element.id, switchIndex)"
          @button-press="(id: string, color: 'green' | 'red') => setButtonPressed(id, color, true)"
          @button-release="(id: string, color: 'green' | 'red') => setButtonPressed(id, color, false)"
          @delete="removeElement(element.id)"
        />
      </g>

      <!-- Cables/Wires (on top of elements) -->
      <Cable
        v-for="cable in cables"
        :key="cable.id"
        :cable="cable"
        :selected="selectedCableId === cable.id"
        :get-wire-path="getWirePath"
        :get-wire-endpoints="getWireEndpoints"
        @remove="removeCable(cable.id)"
        @select="onCableSelect(cable.id)"
        @update-wire-point="onUpdateWirePoint"
      />

      <!-- Energized terminal indicators (drawn above wires so they stay visible) -->
      <g class="energized-overlay" pointer-events="none">
        <circle
          v-for="dot in energizedDots"
          :key="dot.id"
          :cx="dot.x"
          :cy="dot.y"
          r="3.5"
          fill="#ff5722"
          stroke="#fff"
          stroke-width="1.5"
        />
      </g>

      <!-- Delete button for a touch-selected cable -->
      <g v-if="cableDeletePos" class="cable-delete-btn"
         @click.stop="removeSelectedCable"
         @touchend.stop.prevent="removeSelectedCable">
        <circle :cx="cableDeletePos.x" :cy="cableDeletePos.y" r="13" fill="#f44336" stroke="#fff" stroke-width="2"/>
        <path :d="`M ${cableDeletePos.x - 4} ${cableDeletePos.y - 4} L ${cableDeletePos.x + 4} ${cableDeletePos.y + 4} M ${cableDeletePos.x + 4} ${cableDeletePos.y - 4} L ${cableDeletePos.x - 4} ${cableDeletePos.y + 4}`"
              stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      </g>

      <!-- Pending wire (while connecting) - never intercepts terminal hovers -->
      <g v-if="pendingWire" pointer-events="none">
        <path
          v-if="pendingWirePath"
          :d="pendingWirePath"
          :stroke="pendingWire.color"
          stroke-width="2"
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

      <!-- Pending cable wire connection (from wire terminal cluster) -->
      <g v-if="pendingCableWire" pointer-events="none">
        <line
          :x1="pendingCableWire.startPos.x"
          :y1="pendingCableWire.startPos.y"
          :x2="mousePos.x"
          :y2="mousePos.y"
          :stroke="pendingCableWire.color"
          stroke-width="3"
          stroke-dasharray="8,4"
        />
        <circle
          :cx="pendingCableWire.startPos.x"
          :cy="pendingCableWire.startPos.y"
          r="6"
          :fill="pendingCableWire.color"
          stroke="#fff"
          stroke-width="2"
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
      <g v-if="pendingCableWire" class="instructions">
        <rect :x="viewBox.x + 10" :y="viewBox.y + 10" width="280" height="30" rx="4" fill="rgba(76,175,80,0.9)"/>
        <text :x="viewBox.x + 150" :y="viewBox.y + 30" text-anchor="middle" fill="white" font-size="12">
          Click a terminal to connect wire, Esc to cancel
        </text>
      </g>
    </svg>
    <button v-if="isTouchInput && (wiringMode || pendingCableWire)" class="cancel-wire-fab" @click="cancelActiveWiring">
      Cancel wire
    </button>

    <!-- Touch-only action bar for the selected element (no hover/keyboard on mobile) -->
    <div v-if="isTouchInput && selectedElementId && !wiringMode" class="element-actions">
      <button @click="rotateSelected">⟳ Rotate</button>
      <button @click="deleteSelected">🗑 Delete</button>
    </div>
    <div class="canvas-help">
      Scroll to zoom • Middle-click to pan • R to rotate • Del to delete • Drag to select multiple
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, provide, type Component } from 'vue'
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
import Cable from './wiring/Cable.vue'
import Relay from './elements/Relay.vue'
import PushButton from './elements/PushButton.vue'
import JunctionBox from './elements/JunctionBox.vue'
import DistributionBoard from './elements/DistributionBoard.vue'

const props = defineProps<{
  selectedCable: string | null
  selectedComponent: string | null
  selectedWireColor?: string
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
  // Optional: if starting from a specific wire in a multi-wire cable
  connectedCableId?: string
  connectedWireIndex?: number
  // Optional: local coordinates for expanded wire terminals
  localX?: number
  localY?: number
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

// True when the last input came from touch. Lets touch use its own tap logic
// (in onTouchEnd) while the mouse handlers stay exactly as they were on desktop.
const isTouchInput = ref(false)
// Cable selected for deletion on touch (tap-to-select instead of tap-to-remove).
const selectedCableId = ref<string | null>(null)

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

// Pending cable wire connection - when user clicks a wire terminal in a cluster
interface PendingCableWire {
  cableId: string
  wireIndex: number
  end: 'from' | 'to'
  color: string
  startPos: Point
}
const pendingCableWire = ref<PendingCableWire | null>(null)

const {
  state,
  addElement,
  removeElement,
  updateElement,
  toggleSwitch,
  setButtonPressed,
  rotateElement,
  startWiring,
  addControlPoint,
  cancelWiring,
  completeWire,
  removeCable,
  updateWirePoint,
  connectCableWire
} = useCircuitStore()

// Provide circuit state to child components (for JunctionBox to look up cable info and cables)
// Provide the entire reactive state object so changes are properly tracked
provide('circuitState', state)
// Let child components (e.g. Cable) know whether the current input is touch.
provide('isTouchInput', isTouchInput)

const elements = computed(() => state.elements)
const cables = computed(() => state.cables)
const wiringMode = computed(() => state.wiringMode)

// While a wire is being drawn, existing cables must be click-through so a click
// meant to add a control point can't accidentally remove a wire it lands on.
const wiringActive = computed(() => !!wiringMode.value || !!pendingCableWire.value)
provide('wiringActive', wiringActive)

const { getWirePath, getTerminalPosition, getEndpointPosition, getWireEndpoints } = useConnections(state)

// Energized terminal positions, rendered as an overlay above wires so the
// energized indicator isn't hidden by a wire ending on the terminal.
const energizedDots = computed(() => {
  const dots: { id: string; x: number; y: number }[] = []
  for (const el of state.elements) {
    for (const t of el.terminals) {
      if (!t.energized) continue
      const pos = getTerminalPosition(el.id, t.id)
      if (pos) dots.push({ id: `${el.id}-${t.id}`, x: pos.x, y: pos.y })
    }
  }
  return dots
})

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
  'relay-no-no': Relay,
  'relay-no-nc': Relay,
  'relay-nc-nc': Relay,
  'button': PushButton,
  'junction-box': JunctionBox,
  'distribution-board': DistributionBoard
}

const getComponentType = (type: string): Component => componentMap[type] || PowerInput

// Touch-target radius (~22 CSS px) expressed in SVG units, so it stays constant on
// screen regardless of zoom. Used to snap taps to nearby terminals.
const touchSnapRadius = (): number => {
  const cw = containerRef.value?.offsetWidth || 1
  return 22 * (viewBox.value.width / cw)
}

const nearestTerminal = (sp: Point, radius: number): { elementId: string; terminalId: string } | null => {
  let best: { elementId: string; terminalId: string } | null = null
  let bestDist = radius
  for (const el of state.elements) {
    for (const t of el.terminals) {
      const pos = getTerminalPosition(el.id, t.id)
      if (!pos) continue
      const d = Math.hypot(pos.x - sp.x, pos.y - sp.y)
      if (d <= bestDist) {
        bestDist = d
        best = { elementId: el.id, terminalId: t.id }
      }
    }
  }
  return best
}

// Midpoint of the selected cable, where the touch delete button is drawn.
const cableDeletePos = computed<Point | null>(() => {
  if (!selectedCableId.value) return null
  const cable = state.cables.find(c => c.id === selectedCableId.value)
  if (!cable) return null
  const wire = cable.wires.find(w => w.from && w.to)
  if (!wire) return null
  const ends = getWireEndpoints(wire)
  if (!ends?.from || !ends?.to) return null
  return { x: (ends.from.x + ends.to.x) / 2, y: (ends.from.y + ends.to.y) / 2 }
})

const onCableSelect = (cableId: string): void => {
  selectedCableId.value = cableId
  selectedElementId.value = null
  selectedElementIds.value.clear()
}

const removeSelectedCable = (): void => {
  if (selectedCableId.value) {
    removeCable(selectedCableId.value)
    selectedCableId.value = null
  }
}

const rotateSelected = (): void => {
  if (selectedElementId.value) rotateElement(selectedElementId.value)
}

const deleteSelected = (): void => {
  if (selectedElementId.value) {
    removeElement(selectedElementId.value)
    selectedElementId.value = null
  }
}

const cancelActiveWiring = (): void => {
  if (pendingCableWire.value) {
    pendingCableWire.value = null
  }
  if (wiringMode.value) {
    cancelWiring()
    pendingWire.value = null
    emit('wire-complete')
  }
}

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
  isTouchInput.value = false

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
    const clickedOnElement = target.closest('.switch1, .switch5, .switch6, .switch66, .switch7, .power-input, .light, .relay, .push-button, .junction-box, .distribution-board')

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
  isTouchInput.value = true

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
  const wasPinch = pinchStartDistance.value !== null
  const moved = isTouchDragging.value

  if (!wasPinch && touchStartPos.value && event.changedTouches.length === 1) {
    const touch = event.changedTouches[0]
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null
    // Terminals, toggles, push buttons, delete and cable-delete taps are handled by
    // their own click/touch handlers - don't double-handle them here.
    const onInteractive = targetEl?.closest('.terminal, .toggle-area, .press-btn, .delete-btn, .cable-delete-btn')

    if (!onInteractive) {
      const pos = getSvgPoint(touch.clientX, touch.clientY)

      if (props.selectedComponent) {
        addElement(props.selectedComponent, pos.x - 30, pos.y - 20)
        emit('component-placed')
      } else if (wiringMode.value) {
        // Snap to a nearby terminal to finish the wire; only add a control point
        // when the tap is genuinely far from any terminal.
        const near = nearestTerminal(pos, touchSnapRadius())
        if (near) {
          onTerminalClick(near.elementId, near.terminalId)
        } else if (!moved) {
          addControlPoint(pos.x, pos.y)
          if (pendingWire.value) pendingWire.value.controlPoints.push({ x: pos.x, y: pos.y })
        }
      } else if (!moved) {
        const near = nearestTerminal(pos, touchSnapRadius())
        if (near) {
          onTerminalClick(near.elementId, near.terminalId)
        } else if (!targetEl?.closest('.cable-hitarea')) {
          // Empty space - deselect. Cable taps are selected by the cable itself.
          selectedElementId.value = null
          selectedElementIds.value.clear()
          selectedCableId.value = null
        }
      }
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

  let fromPos: Point | null = null

  // If we have local coordinates, calculate position directly from them
  if (pendingWire.value.localX !== undefined && pendingWire.value.localY !== undefined) {
    const element = elements.value.find(e => e.id === pendingWire.value!.elementId)
    if (element) {
      const rotation = element.rotation || 0
      const rad = (rotation * Math.PI) / 180
      const centerX = 75 // JUNCTION_BOX_SIZE / 2
      const centerY = 75
      const relX = pendingWire.value.localX - centerX
      const relY = pendingWire.value.localY - centerY
      const rotatedX = relX * Math.cos(rad) - relY * Math.sin(rad)
      const rotatedY = relX * Math.sin(rad) + relY * Math.cos(rad)
      fromPos = {
        x: element.x + centerX + rotatedX,
        y: element.y + centerY + rotatedY
      }
    }
  } else {
    // Fall back to getEndpointPosition for wire-specific connections
    fromPos = getEndpointPosition({
      elementId: pendingWire.value.elementId,
      terminalId: pendingWire.value.terminalId,
      connectedCableId: pendingWire.value.connectedCableId,
      connectedWireIndex: pendingWire.value.connectedWireIndex
    })
  }
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

// DIN rail snapping configuration (modular relay: 18x90)
const RELAY_WIDTH = 30
const RELAY_HEIGHT = 90
const DIN_RAIL_SNAP_DISTANCE = 30 // How close to snap to DIN rail
const DIN_RAIL_HEIGHT = 12

// Check if element mounts on a DIN rail (relays and push-button modules)
const isDinMountable = (type: string): boolean => {
  return type.startsWith('relay-') || type === 'button'
}

// Find the closest DIN rail in any distribution board to a given position
const findClosestDinRail = (x: number, y: number, elementWidth: number): { boardId: string; railId: string; railY: number; boardX: number; boardY: number } | null => {
  let closest: { boardId: string; railId: string; railY: number; boardX: number; boardY: number; distance: number } | null = null

  for (const el of elements.value) {
    if (el.type !== 'distribution-board' || !el.state.dinRails) continue

    const boardX = el.x
    const boardY = el.y
    const boardWidth = 400

    // Check if x is within the board (with some margin for the relay width)
    const relayRight = x + elementWidth
    const boardRight = boardX + boardWidth - 20 // Leave margin on right

    // Check each DIN rail
    for (const rail of el.state.dinRails) {
      const railWorldY = boardY + rail.y
      const railLeft = boardX + 10
      const railRight = boardRight

      // Check if relay's center is above the rail and within horizontal bounds
      const relayBottomY = y + RELAY_HEIGHT
      const distanceToRail = Math.abs(relayBottomY - railWorldY - DIN_RAIL_HEIGHT)

      // Check horizontal overlap
      if (x >= railLeft - 20 && relayRight <= railRight + 20) {
        if (!closest || distanceToRail < closest.distance) {
          closest = {
            boardId: el.id,
            railId: rail.id,
            railY: railWorldY,
            boardX: boardX,
            boardY: boardY,
            distance: distanceToRail
          }
        }
      }
    }
  }

  if (closest && closest.distance < DIN_RAIL_SNAP_DISTANCE) {
    return {
      boardId: closest.boardId,
      railId: closest.railId,
      railY: closest.railY,
      boardX: closest.boardX,
      boardY: closest.boardY
    }
  }

  return null
}

// Drag handling for elements
const { startDrag } = useDrag(getSvgPoint, (element: Element, newX: number, newY: number, _isDone: boolean) => {
  // DIN rail snapping for relays
  if (isDinMountable(element.type)) {
    const closestRail = findClosestDinRail(newX, newY, RELAY_WIDTH)

    if (closestRail) {
      // Snap to DIN rail - position relay so its bottom sits on the rail
      const snappedY = closestRail.railY - RELAY_HEIGHT + DIN_RAIL_HEIGHT + 5

      // Constrain X within the distribution board bounds
      const minX = closestRail.boardX + 15
      const maxX = closestRail.boardX + 400 - RELAY_WIDTH - 15
      const snappedX = Math.max(minX, Math.min(maxX, newX))

      updateElement(element.id, {
        x: snappedX,
        y: snappedY,
        state: {
          ...element.state,
          mountedOn: {
            boardId: closestRail.boardId,
            railId: closestRail.railId,
            position: snappedX - closestRail.boardX
          }
        }
      })
      return
    } else if (element.state.mountedOn) {
      // Was mounted but now not near any rail - unmount
      updateElement(element.id, {
        x: newX,
        y: newY,
        state: {
          ...element.state,
          mountedOn: undefined
        }
      })
      return
    }
  }

  updateElement(element.id, { x: newX, y: newY })
})

const onElementMouseDown = (event: MouseEvent, element: Element): void => {
  // Don't start drag if we clicked on a terminal or toggle area or delete button
  const target = event.target as HTMLElement
  if (target.closest('.terminal') || target.closest('.toggle-area') || target.closest('.press-btn') || target.closest('.delete-btn')) {
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

// Touch equivalent of onElementMouseDown: drag an element with one finger.
const onElementTouchStart = (event: TouchEvent, element: Element): void => {
  if (event.touches.length !== 1) return
  const target = event.target as HTMLElement
  // Let terminals / toggles / buttons / delete handle their own taps.
  if (target.closest('.terminal') || target.closest('.toggle-area') || target.closest('.press-btn') || target.closest('.delete-btn')) {
    return
  }
  if (wiringMode.value) return

  // Suppress synthesized mouse events (so drag-end can't remove a cable) and keep
  // the canvas pan/place logic from also firing for this gesture.
  event.preventDefault()
  event.stopPropagation()
  isTouchInput.value = true
  selectedElementId.value = element.id
  selectedElementIds.value.clear()
  selectedCableId.value = null
  startDrag(event, element)
}

const onTerminalClick = (elementId: string, terminalId: string): void => {
  // Handle pending cable wire connection first
  if (pendingCableWire.value) {
    connectCableWire(
      pendingCableWire.value.cableId,
      pendingCableWire.value.wireIndex,
      pendingCableWire.value.end,
      elementId,
      terminalId
    )
    pendingCableWire.value = null
    return
  }

  // Use selected cable or default to 'single' wire
  const cableType = props.selectedCable || 'single'

  const cableColors: Record<string, string> = {
    'single': '#333',
    'mmj3': '#d32f2f',
    'mmj5': '#d32f2f',
    'omm': '#e91e63'
  }

  // Single wires use the picked color; multi-wire cables keep their fixed colors
  const isSingle = cableType === 'single'
  const wireColor = isSingle
    ? (props.selectedWireColor || '#333')
    : (cableColors[cableType] || '#333')

  if (!wiringMode.value) {
    startWiring(cableType, elementId, terminalId, undefined, undefined, isSingle ? wireColor : undefined)

    // Get terminal position for initial mouse position
    const termPos = getTerminalPosition(elementId, terminalId)

    pendingWire.value = {
      elementId,
      terminalId,
      color: wireColor,
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

// Handle click on a wire terminal in a cable cluster
const onWireTerminalClick = (data: { cableId: string; wireIndex: number; end: 'from' | 'to'; elementId: string; terminalId: string; localX: number; localY: number }): void => {
  // If there's a pending single wire, complete it connecting to the specific wire in the cable
  if (wiringMode.value) {
    completeWire(data.elementId, data.terminalId, data.cableId, data.wireIndex)
    pendingWire.value = null
    emit('wire-complete')
    return
  }

  // If there's a pending cable wire, connect it to this terminal
  if (pendingCableWire.value) {
    connectCableWire(
      pendingCableWire.value.cableId,
      pendingCableWire.value.wireIndex,
      pendingCableWire.value.end,
      data.elementId,
      data.terminalId
    )
    pendingCableWire.value = null
    return
  }

  const cable = cables.value.find(c => c.id === data.cableId)
  if (!cable) return

  // Check if the cable is connected to this junction box (first wire defines the cable path)
  const firstWire = cable.wires.find(w => w.from && w.to)
  const cableConnectedHere = firstWire && (
    (firstWire.from?.elementId === data.elementId && firstWire.from?.terminalId === data.terminalId) ||
    (firstWire.to?.elementId === data.elementId && firstWire.to?.terminalId === data.terminalId)
  )

  if (cableConnectedHere) {
    // Extended terminal - start a new single wire connecting to this specific wire in the cable
    const cableType = props.selectedCable || 'single'
    const cableColors: Record<string, string> = {
      'single': '#333',
      'mmj3': '#d32f2f',
      'mmj5': '#d32f2f',
      'omm': '#e91e63'
    }

    const isSingle = cableType === 'single'
    const wireColor = isSingle
      ? (props.selectedWireColor || '#333')
      : (cableColors[cableType] || '#333')

    // Pass the cable/wire info so the new wire connects to this specific wire
    startWiring(cableType, data.elementId, data.terminalId, data.cableId, data.wireIndex, isSingle ? wireColor : undefined)

    // Use the local coordinates passed from the JunctionBox
    pendingWire.value = {
      elementId: data.elementId,
      terminalId: data.terminalId,
      color: wireColor,
      controlPoints: [],
      connectedCableId: data.cableId,
      connectedWireIndex: data.wireIndex,
      localX: data.localX,
      localY: data.localY
    }

    // Calculate world position from local coordinates
    const element = elements.value.find(e => e.id === data.elementId)
    if (element) {
      const rotation = element.rotation || 0
      const rad = (rotation * Math.PI) / 180
      const centerX = 75 // JUNCTION_BOX_SIZE / 2
      const centerY = 75
      const relX = data.localX - centerX
      const relY = data.localY - centerY
      const rotatedX = relX * Math.cos(rad) - relY * Math.sin(rad)
      const rotatedY = relX * Math.sin(rad) + relY * Math.cos(rad)
      mousePos.value = {
        x: element.x + centerX + rotatedX,
        y: element.y + centerY + rotatedY
      }
    }
    return
  }

  // Cable is not connected to this junction box terminal yet - shouldn't happen for extended terminals
  // but handle it gracefully by doing nothing
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
  // Touch taps are fully handled in onTouchEnd; ignore the synthesized click.
  if (isTouchInput.value) return

  const target = event.target as HTMLElement

  // Check if clicked on an element (not empty canvas)
  const clickedOnElement = target.closest('.switch1, .switch5, .switch6, .switch66, .switch7, .power-input, .light, .relay, .push-button, .junction-box, .distribution-board')

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
      selectedCableId.value = null
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
    if (pendingCableWire.value) {
      pendingCableWire.value = null
      return
    }
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

/* The help text is desktop-oriented (scroll/middle-click); hide it on touch-sized screens. */
@media (max-width: 700px) {
  .canvas-help {
    display: none;
  }
}

.instructions text {
  font-weight: 500;
}

.cable-delete-btn {
  cursor: pointer;
}

.cancel-wire-fab {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  background: #f44336;
  color: white;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  z-index: 20;
}

.cancel-wire-fab:hover {
  background: #d32f2f;
}

.element-actions {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 20;
}

.element-actions button {
  padding: 10px 16px;
  border: none;
  border-radius: 20px;
  background: #1976d2;
  color: white;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  cursor: pointer;
}

.element-actions button:last-child {
  background: #f44336;
}
</style>
