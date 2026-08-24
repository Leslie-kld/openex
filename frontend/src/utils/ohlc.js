export function ticksToCandles(ticks, bucketSeconds = 10) {
  if (!ticks.length) return []
  const buckets = {}

  ticks.forEach(tick => {
    const ts = new Date(tick.timestamp).getTime()
    const bucket = Math.floor(ts / (bucketSeconds * 1000)) * bucketSeconds * 1000
    if (!buckets[bucket]) {
      buckets[bucket] = { time: new Date(bucket).toISOString().slice(11, 19), open: tick.price, high: tick.price, low: tick.price, close: tick.price }
    } else {
      const b = buckets[bucket]
      b.high = Math.max(b.high, tick.price)
      b.low = Math.min(b.low, tick.price)
      b.close = tick.price
    }
  })

  return Object.values(buckets).sort((a, b) => a.time.localeCompare(b.time))
}