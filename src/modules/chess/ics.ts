import { addDays, type LocalDay } from '@/core/time/localDay'
import { isValidTimeZone, zonedToUtc } from '@/core/time/zoned'
import { nextOccurrence, parseRule, type Rule } from '@/core/recurrence/rrule'

/** Minimal iCalendar (RFC 5545) reader for Google Calendar's secret-address feeds. */
export interface IcsTime {
  ms: number
  allDay: boolean
  /** Civil fields in the event's zone, needed to expand recurrences on the same wall time. */
  wall: { y: number; m: number; d: number; h: number; mi: number }
  tz: string
}

export interface IcsEvent {
  uid: string
  summary: string
  location: string
  description: string
  start: IcsTime
  end: IcsTime
  rrule: Rule | null
  until: number | null
  count: number | null
  exdates: number[]
  recurrenceId: number | null
  cancelled: boolean
}

export interface Occurrence {
  id: string
  uid: string
  summary: string
  location: string
  description: string
  start_ts: string
  end_ts: string
  all_day: boolean
}

const DEFAULT_TZ = 'Europe/London'

export function unfold(text: string): string[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  for (const l of lines) {
    if ((l.startsWith(' ') || l.startsWith('\t')) && out.length) out[out.length - 1] += l.slice(1)
    else out.push(l)
  }
  return out.filter(Boolean)
}

function unescape(s: string): string {
  return s.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')
}

function parseTime(value: string, params: Record<string, string>): IcsTime | null {
  const tzParam = params.TZID
  const tz = tzParam && isValidTimeZone(tzParam) ? tzParam : DEFAULT_TZ
  const date = /^(\d{4})(\d{2})(\d{2})$/.exec(value)
  if (date || params.VALUE === 'DATE') {
    const [y, m, d] = [Number(value.slice(0, 4)), Number(value.slice(4, 6)), Number(value.slice(6, 8))]
    return { ms: zonedToUtc(y, m, d, 0, 0, 0, tz), allDay: true, wall: { y, m, d, h: 0, mi: 0 }, tz }
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(value)
  if (!m) return null
  const [, y, mo, d, h, mi, s, z] = m
  const wall = { y: Number(y), m: Number(mo), d: Number(d), h: Number(h), mi: Number(mi) }
  if (z) {
    const ms = Date.UTC(wall.y, wall.m - 1, wall.d, wall.h, wall.mi, Number(s ?? 0))
    return { ms, allDay: false, wall, tz: 'UTC' }
  }
  return { ms: zonedToUtc(wall.y, wall.m, wall.d, wall.h, wall.mi, Number(s ?? 0), tz), allDay: false, wall, tz }
}

function parseUntil(v: string): number | null {
  const t = parseTime(v, {})
  return t ? t.ms : null
}

export function parseIcs(text: string): IcsEvent[] {
  const events: IcsEvent[] = []
  let cur: Record<string, { value: string; params: Record<string, string> }[]> | null = null
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') {
      cur = {}
      continue
    }
    if (line === 'END:VEVENT') {
      if (cur) {
        const ev = toEvent(cur)
        if (ev) events.push(ev)
      }
      cur = null
      continue
    }
    if (!cur) continue
    const idx = line.indexOf(':')
    if (idx < 0) continue
    const head = line.slice(0, idx)
    const value = line.slice(idx + 1)
    const [name, ...paramParts] = head.split(';')
    const params: Record<string, string> = {}
    for (const p of paramParts) {
      const [k, v] = p.split('=')
      if (k && v !== undefined) params[k.toUpperCase()] = v.replace(/^"|"$/g, '')
    }
    const key = (name ?? '').toUpperCase()
    ;(cur[key] ??= []).push({ value, params })
  }
  return events
}

function toEvent(p: Record<string, { value: string; params: Record<string, string> }[]>): IcsEvent | null {
  const first = (k: string) => p[k]?.[0]
  const uid = first('UID')?.value
  const ds = first('DTSTART')
  if (!uid || !ds) return null
  const start = parseTime(ds.value, ds.params)
  if (!start) return null
  const de = first('DTEND')
  let end = de ? parseTime(de.value, de.params) : null
  if (!end) {
    const dur = first('DURATION')?.value
    const ms = dur ? durationMs(dur) : start.allDay ? 86_400_000 : 0
    end = { ...start, ms: start.ms + ms }
  }
  const rr = first('RRULE')?.value ?? null
  const rule = rr ? parseRule(rr) : null
  const untilRaw = rr ? /UNTIL=([^;]+)/.exec(rr)?.[1] : undefined
  const countRaw = rr ? /COUNT=(\d+)/.exec(rr)?.[1] : undefined
  const exdates: number[] = []
  for (const ex of p.EXDATE ?? []) for (const v of ex.value.split(',')) {
    const t = parseTime(v, ex.params)
    if (t) exdates.push(t.ms)
  }
  const rid = first('RECURRENCE-ID')
  return {
    uid,
    summary: unescape(first('SUMMARY')?.value ?? '(no title)'),
    location: unescape(first('LOCATION')?.value ?? ''),
    description: unescape(first('DESCRIPTION')?.value ?? ''),
    start,
    end,
    rrule: rule,
    until: untilRaw ? parseUntil(untilRaw) : null,
    count: countRaw ? Number(countRaw) : null,
    exdates,
    recurrenceId: rid ? (parseTime(rid.value, rid.params)?.ms ?? null) : null,
    cancelled: (first('STATUS')?.value ?? '').toUpperCase() === 'CANCELLED',
  }
}

function durationMs(v: string): number {
  const m = /^(-)?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(v)
  if (!m) return 0
  const [, neg, w, d, h, mi, s] = m
  const ms = (Number(w ?? 0) * 7 + Number(d ?? 0)) * 86_400_000 + Number(h ?? 0) * 3_600_000 + Number(mi ?? 0) * 60_000 + Number(s ?? 0) * 1000
  return neg ? -ms : ms
}

const day = (t: IcsTime): LocalDay => `${t.wall.y}-${String(t.wall.m).padStart(2, '0')}-${String(t.wall.d).padStart(2, '0')}`

/** Concrete occurrences inside [from, to), honouring RRULE (subset), UNTIL, COUNT, EXDATE and overrides. */
export function expandEvents(events: IcsEvent[], fromMs: number, toMs: number): Occurrence[] {
  const overrides = new Map<string, IcsEvent>()
  for (const e of events) if (e.recurrenceId !== null) overrides.set(`${e.uid}@${e.recurrenceId}`, e)
  const out: Occurrence[] = []
  const push = (e: IcsEvent, startMs: number, endMs: number) => {
    if (endMs <= fromMs || startMs >= toMs || e.cancelled) return
    out.push({
      id: `${e.uid}@${startMs}`,
      uid: e.uid,
      summary: e.summary,
      location: e.location,
      description: e.description,
      start_ts: new Date(startMs).toISOString(),
      end_ts: new Date(endMs).toISOString(),
      all_day: e.start.allDay,
    })
  }
  for (const e of events) {
    if (e.recurrenceId !== null) continue
    const duration = e.end.ms - e.start.ms
    if (!e.rrule) {
      push(e, e.start.ms, e.end.ms)
      continue
    }
    let d = day(e.start)
    let n = 0
    for (let guard = 0; guard < 2000; guard++) {
      if (guard > 0) d = nextOccurrence(e.rrule, day(e.start), d)
      const [y, m, dd] = d.split('-').map(Number) as [number, number, number]
      const startMs = e.start.allDay ? zonedToUtc(y, m, dd, 0, 0, 0, e.start.tz) : e.start.tz === 'UTC' ? Date.UTC(y, m - 1, dd, e.start.wall.h, e.start.wall.mi) : zonedToUtc(y, m, dd, e.start.wall.h, e.start.wall.mi, 0, e.start.tz)
      n += 1
      if (e.count !== null && n > e.count) break
      if (e.until !== null && startMs > e.until) break
      if (startMs >= toMs) break
      if (e.exdates.includes(startMs)) continue
      const ov = overrides.get(`${e.uid}@${startMs}`)
      if (ov) push(ov, ov.start.ms, ov.end.ms)
      else push(e, startMs, startMs + duration)
    }
  }
  return out.sort((a, b) => (a.start_ts < b.start_ts ? -1 : 1))
}

export { addDays }
