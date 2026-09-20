import { describe, expect, it } from 'vitest'
import { offsetAt, zonedToUtc } from '@/core/time/zoned'
import { expandEvents, parseIcs, unfold } from './ics'

const FEED = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;TZID=Europe/London:20260921T170000
DTEND;TZID=Europe/London:20260921T180000
RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261231T235959Z
EXDATE;TZID=Europe/London:20261005T170000
UID:weekly@google.com
SUMMARY:Lesson: Tom
LOCATION:Online
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Europe/London:20260928T183000
DTEND;TZID=Europe/London:20260928T193000
RECURRENCE-ID;TZID=Europe/London:20260928T170000
UID:weekly@google.com
SUMMARY:Lesson: Tom (moved)
END:VEVENT
BEGIN:VEVENT
DTSTART:20260925T140000Z
DTEND:20260925T150000Z
UID:once@google.com
SUMMARY:Club night\\, board 1
DESCRIPTION:Line one\\nLine two
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20261003
DTEND;VALUE=DATE:20261004
UID:allday@google.com
SUMMARY:Tournament
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Europe/London:20260923T100000
DTEND;TZID=Europe/London:20260923T110000
UID:cancelled@google.com
STATUS:CANCELLED
SUMMARY:Gone
END:VEVENT
END:VCALENDAR`

describe('zoned time', () => {
  it('knows the UK offsets', () => {
    expect(offsetAt(Date.UTC(2026, 6, 1), 'Europe/London')).toBe(60)
    expect(offsetAt(Date.UTC(2026, 0, 1), 'Europe/London')).toBe(0)
    expect(new Date(zonedToUtc(2026, 9, 21, 17, 0, 0, 'Europe/London')).toISOString()).toBe('2026-09-21T16:00:00.000Z')
    expect(new Date(zonedToUtc(2026, 11, 7, 17, 0, 0, 'Europe/London')).toISOString()).toBe('2026-11-07T17:00:00.000Z')
  })
})

describe('parseIcs', () => {
  it('unfolds continuation lines', () => {
    expect(unfold('SUMMARY:Hello\r\n  world\r\nUID:x')).toEqual(['SUMMARY:Hello world', 'UID:x'])
  })
  it('reads events, zones, escapes, all-day and overrides', () => {
    const ev = parseIcs(FEED)
    expect(ev).toHaveLength(5)
    const weekly = ev[0]!
    expect(weekly.rrule).toEqual({ freq: 'WEEKLY', interval: 1, byDay: [0] })
    expect(new Date(weekly.start.ms).toISOString()).toBe('2026-09-21T16:00:00.000Z')
    expect(weekly.exdates).toHaveLength(1)
    expect(ev[1]!.recurrenceId).toBe(weekly.start.ms + 7 * 86_400_000)
    expect(ev[2]!.summary).toBe('Club night, board 1')
    expect(ev[2]!.description).toBe('Line one\nLine two')
    expect(ev[3]!.start.allDay).toBe(true)
    expect(ev[4]!.cancelled).toBe(true)
  })
})

describe('expandEvents', () => {
  it('expands weekly lessons across the clock change, applies exdates and overrides, drops cancelled', () => {
    const occ = expandEvents(parseIcs(FEED), Date.UTC(2026, 8, 20), Date.UTC(2026, 10, 10))
    const lessons = occ.filter((o) => o.uid === 'weekly@google.com')
    expect(lessons.map((o) => o.start_ts)).toEqual([
      '2026-09-21T16:00:00.000Z',
      '2026-09-28T17:30:00.000Z', // moved override
      '2026-10-12T16:00:00.000Z', // 5 Oct excluded
      '2026-10-19T16:00:00.000Z',
      '2026-10-26T17:00:00.000Z', // GMT from 25 Oct: 17:00 local is 17:00Z
      '2026-11-02T17:00:00.000Z',
      '2026-11-09T17:00:00.000Z',
    ])
    expect(lessons[1]!.summary).toBe('Lesson: Tom (moved)')
    expect(occ.find((o) => o.uid === 'once@google.com')?.start_ts).toBe('2026-09-25T14:00:00.000Z')
    const allDay = occ.find((o) => o.uid === 'allday@google.com')!
    expect(allDay.all_day).toBe(true)
    expect(allDay.start_ts).toBe('2026-10-02T23:00:00.000Z')
    expect(occ.some((o) => o.uid === 'cancelled@google.com')).toBe(false)
  })
  it('honours COUNT and window bounds', () => {
    const feed = `BEGIN:VEVENT\nDTSTART:20260901T090000Z\nDTEND:20260901T093000Z\nRRULE:FREQ=DAILY;COUNT=3\nUID:c\nSUMMARY:x\nEND:VEVENT`
    expect(expandEvents(parseIcs(feed), Date.UTC(2026, 7, 1), Date.UTC(2026, 9, 1))).toHaveLength(3)
    expect(expandEvents(parseIcs(feed), Date.UTC(2026, 8, 3), Date.UTC(2026, 9, 1))).toHaveLength(1)
  })
})
