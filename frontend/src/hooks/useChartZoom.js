import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Scroll-to-zoom for a chart. Scrolling up zooms in (shows fewer, more recent
 * points), scrolling down zooms out (shows more history). Attaches a native
 * non-passive wheel listener so we can preventDefault() and stop the browser's
 * own page-zoom/scroll from firing while the cursor is over the chart.
 */
export default function useChartZoom(fullData, { min = 20, max = 500, step = 15 } = {}) {
  const [visibleCount, setVisibleCount] = useState(Math.min(120, fullData.length || 120))
  const containerRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e) => {
      e.preventDefault()
      setVisibleCount((prev) => {
        const delta = e.deltaY > 0 ? step : -step
        const next = prev + delta
        return Math.max(min, Math.min(max, next))
      })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [min, max, step])

  const visibleData = fullData.slice(-visibleCount)

  return { containerRef, visibleData, visibleCount, setVisibleCount }
}
