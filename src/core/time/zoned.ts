/** Wall-clock time in a named IANA zone -> UTC instant, and the zone's offset at an instant. Uses Intl only. */

const fmtCache = new Map<string, Intl.DateTimeFormat>()
function fmt(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    fmtCache.set(tz, f)
  }
  return f
}

/** Wall-clock fields of an instant in a zone. */
export function wallClockIn(ms: number, tz: string): { y: number; m: number; d: number; h: number; mi: number; s: number } {
  const parts = Object.fromEntries(fmt(tz).formatToParts(new Date(ms)).map((p) => [p.type, p.value])) as Record<string, string>
  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day), h: Number(parts.hour) % 24, mi: Number(parts.minute), s: Number(parts.second) }
}

/** Offset (minutes east of UTC) of a zone at an instant. */
export function offsetAt(ms: number, tz: string): number {
  const w = wallClockIn(ms, tz)
  const asUtc = Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s)
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60_000)
}

/** UTC instant for a wall-clock time in a zone. Ambiguous times resolve to the earlier offset; gaps roll forward. */
export function zonedToUtc(y: number, m: number, d: number, h: number, mi: number, s: number, tz: string): number {
  const guess = Date.UTC(y, m - 1, d, h, mi, s)
  let ms = guess - offsetAt(guess, tz) * 60_000
  ms = guess - offsetAt(ms, tz) * 60_000
  return ms
}

export function isValidTimeZone(tz: string): boolean {
  try {
    fmt(tz)
    return true
  } catch {
    return false
  }
}
