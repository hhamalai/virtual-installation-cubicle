import { ref, Ref } from 'vue'
import type { Element, Point } from '../types'

type GetSvgPointFn = (_clientX: number, _clientY: number) => Point
type OnUpdateFn = (_element: Element, _x: number, _y: number, _isDone: boolean) => void

export function useDrag(getSvgPoint: GetSvgPointFn, onUpdate: OnUpdateFn) {
  const isDragging: Ref<boolean> = ref(false)
  const dragOffset: Ref<Point> = ref({ x: 0, y: 0 })
  const dragTarget: Ref<Element | null> = ref(null)

  const startDrag = (event: MouseEvent | TouchEvent, target: Element): void => {
    isDragging.value = true
    dragTarget.value = target

    // Calculate offset in SVG coordinates
    const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX
    const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY
    const svgPoint = getSvgPoint(clientX, clientY)
    dragOffset.value = {
      x: svgPoint.x - target.x,
      y: svgPoint.y - target.y
    }

    const handleMove = (e: MouseEvent | TouchEvent): void => {
      if (!isDragging.value) return

      const moveClientX = 'clientX' in e ? e.clientX : e.touches?.[0]?.clientX
      const moveClientY = 'clientY' in e ? e.clientY : e.touches?.[0]?.clientY

      if (moveClientX !== undefined && moveClientY !== undefined) {
        const svgPoint = getSvgPoint(moveClientX, moveClientY)
        const newX = svgPoint.x - dragOffset.value.x
        const newY = svgPoint.y - dragOffset.value.y

        if (onUpdate && dragTarget.value) {
          onUpdate(dragTarget.value, newX, newY, false)
        }
      }
    }

    const handleEnd = (e: MouseEvent | TouchEvent): void => {
      if (!isDragging.value) return

      isDragging.value = false

      const endClientX = 'clientX' in e ? e.clientX : (e as TouchEvent).changedTouches?.[0]?.clientX
      const endClientY = 'clientY' in e ? e.clientY : (e as TouchEvent).changedTouches?.[0]?.clientY

      if (endClientX !== undefined && endClientY !== undefined && onUpdate && dragTarget.value) {
        const svgPoint = getSvgPoint(endClientX, endClientY)
        const newX = svgPoint.x - dragOffset.value.x
        const newY = svgPoint.y - dragOffset.value.y
        onUpdate(dragTarget.value, newX, newY, true)
      }

      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove as EventListener)
      document.removeEventListener('touchend', handleEnd as EventListener)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove as EventListener)
    document.addEventListener('touchend', handleEnd as EventListener)
  }

  return {
    isDragging,
    startDrag
  }
}
