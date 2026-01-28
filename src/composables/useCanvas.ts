import { ref, Ref } from 'vue'
import type { Point } from '../types'

interface ViewBox {
  x: number
  y: number
  width: number
  height: number
}

export function useCanvas() {
  const canvasRef: Ref<SVGSVGElement | null> = ref(null)
  const viewBox: Ref<ViewBox> = ref({ x: 0, y: 0, width: 1200, height: 800 })
  const zoom: Ref<number> = ref(1)

  const getCanvasPoint = (clientX: number, clientY: number): Point => {
    if (!canvasRef.value) return { x: clientX, y: clientY }

    const rect = canvasRef.value.getBoundingClientRect()
    const x = (clientX - rect.left) * (viewBox.value.width / rect.width) + viewBox.value.x
    const y = (clientY - rect.top) * (viewBox.value.height / rect.height) + viewBox.value.y

    return { x, y }
  }

  const screenToCanvas = (screenX: number, screenY: number): Point => {
    if (!canvasRef.value) return { x: screenX, y: screenY }

    const rect = canvasRef.value.getBoundingClientRect()
    return {
      x: screenX - rect.left,
      y: screenY - rect.top
    }
  }

  return {
    canvasRef,
    viewBox,
    zoom,
    getCanvasPoint,
    screenToCanvas
  }
}
