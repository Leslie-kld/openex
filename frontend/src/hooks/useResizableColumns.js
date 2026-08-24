import { useState, useCallback, useRef } from 'react'

export default function useResizableColumns(initial = [240, 180]) {
  const [widths, setWidths] = useState(initial)
  const dragging = useRef(null)

  const startDrag = useCallback((index) => (e) => {
    e.preventDefault()
    dragging.current = { index, startX: e.clientX, startWidths: [...widths] }

    const onMove = (moveEvent) => {
      if (!dragging.current) return
      const delta = moveEvent.clientX - dragging.current.startX
      setWidths((prev) => {
        const next = [...prev]
        const newWidth = dragging.current.startWidths[dragging.current.index] + (dragging.current.index === 0 ? delta : -delta)
        next[dragging.current.index] = Math.max(160, Math.min(500, newWidth))
        return next
      })
    }

    const onUp = () => {
      dragging.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [widths])

  return { widths, startDrag }
}