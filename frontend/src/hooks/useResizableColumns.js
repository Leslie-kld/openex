import { useState, useCallback, useRef } from 'react'

export default function useResizableColumns(initial = [240, 180]) {
  const [widths, setWidths] = useState(initial)
  const dragging = useRef(null)

  const startDrag = useCallback((index) => (e) => {
    e.preventDefault()
    dragging.current = { index, startX: e.clientX, startWidths: [...widths] }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (moveEvent) => {
      if (!dragging.current) return
      const delta = moveEvent.clientX - dragging.current.startX
      setWidths((prev) => {
        const next = [...prev]
        const raw = dragging.current.startWidths[dragging.current.index] +
          (dragging.current.index === 0 ? delta : -delta)
        next[dragging.current.index] = Math.max(160, Math.min(560, raw))
        return next
      })
    }

    const onUp = () => {
      dragging.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [widths])

  return { widths, startDrag }
}
