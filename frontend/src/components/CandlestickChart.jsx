import { useRef, useState, useEffect } from 'react'

// Self-contained SVG candlestick renderer.
// We do NOT rely on recharts' internal scale objects (they vary by version
// and axis type — a 'category' axis often doesn't expose a d3 band scale
// with .bandwidth(), which silently breaks rendering). Instead we measure
// our own container and compute every pixel position directly from the data.

export default function CandlestickChart({ data = [] }) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ width: 600, height: 300 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setSize({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (!data.length) {
    return (
      <div
        ref={containerRef}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100%', color: '#3d4155', fontFamily: 'JetBrains Mono', fontSize: 12,
        }}
      >
        Not enough data for candles
      </div>
    )
  }

  const margin = { top: 8, right: 55, bottom: 24, left: 4 }
  const plotW = Math.max(size.width - margin.left - margin.right, 10)
  const plotH = Math.max(size.height - margin.top - margin.bottom, 10)

  const lows = data.map(d => d.low)
  const highs = data.map(d => d.high)
  const min = Math.min(...lows) * 0.999
  const max = Math.max(...highs) * 1.001 || min + 1
  const range = max - min || 1

  const n = data.length
  const slot = plotW / n
  const candleWidth = Math.max(Math.min(slot * 0.6, 18), 2)

  const yFor = (value) => margin.top + (1 - (value - min) / range) * plotH
  const xFor = (i) => margin.left + slot * i + slot / 2

  const tickCount = 5
  const yTicks = Array.from({ length: tickCount }, (_, i) => min + (range * i) / (tickCount - 1))
  const xLabelStep = Math.max(Math.floor(n / 6), 1)

  const [hover, setHover] = useState(null)

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg width={size.width} height={size.height} style={{ display: 'block' }}>
        {yTicks.map((t, i) => {
          const y = yFor(t)
          return (
            <g key={i}>
              <line x1={margin.left} x2={size.width - margin.right} y1={y} y2={y} stroke="#1e2030" strokeWidth={1} />
              <text x={size.width - margin.right + 6} y={y + 3} fontSize={10} fill="#6b7080" fontFamily="JetBrains Mono">
                {t.toFixed(0)}
              </text>
            </g>
          )
        })}

        {data.map((d, i) => {
          if (d.open == null || d.close == null || d.high == null || d.low == null) return null
          const isUp = d.close >= d.open
          const color = isUp ? '#00c853' : '#ff1744'
          const cx = xFor(i)
          const yH = yFor(d.high)
          const yL = yFor(d.low)
          const yO = yFor(d.open)
          const yC = yFor(d.close)
          const bodyTop = Math.min(yO, yC)
          const bodyH = Math.max(Math.abs(yO - yC), 1)

          return (
            <g key={i} onMouseEnter={() => setHover({ ...d, x: cx })} onMouseLeave={() => setHover(null)}>
              <rect x={cx - slot / 2} y={margin.top} width={slot} height={plotH} fill="transparent" />
              <line x1={cx} x2={cx} y1={yH} y2={yL} stroke={color} strokeWidth={1} />
              <rect x={cx - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyH} fill={color} />
            </g>
          )
        })}

        {data.map((d, i) => {
          if (i % xLabelStep !== 0) return null
          return (
            <text key={i} x={xFor(i)} y={size.height - 6} fontSize={9} fill="#6b7080" fontFamily="JetBrains Mono" textAnchor="middle">
              {d.time}
            </text>
          )
        })}
      </svg>

      {hover && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(Math.max(hover.x - 60, 0), size.width - 130),
            top: 6,
            background: '#161820',
            border: '1px solid #1e2030',
            padding: '8px 10px',
            fontFamily: 'JetBrains Mono',
            fontSize: 11,
            pointerEvents: 'none',
          }}
        >
          <div style={{ color: '#6b7080', marginBottom: 4 }}>{hover.time}</div>
          <div style={{ color: '#00c853' }}>O: {hover.open?.toFixed(2)}</div>
          <div style={{ color: '#e8eaf0' }}>H: {hover.high?.toFixed(2)}</div>
          <div style={{ color: '#e8eaf0' }}>L: {hover.low?.toFixed(2)}</div>
          <div style={{ color: hover.close >= hover.open ? '#00c853' : '#ff1744' }}>
            C: {hover.close?.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  )
}
