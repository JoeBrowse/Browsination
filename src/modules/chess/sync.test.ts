import { describe, expect, it } from 'vitest'
import { makeTestDb } from '@/test/db'
import { chessRepo } from './repo'
import { syncCalendars } from './sync'

const FEED = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;TZID=Europe/London:20260921T170000
DTEND;TZID=Europe/London:20260921T180000
RRULE:FREQ=WEEKLY;BYDAY=MO
UID:weekly@google.com
SUMMARY:Lesson: Tom
END:VEVENT
END:VCALENDAR`

describe('syncCalendars', () => {
  it('caches the window for enabled calendars and records errors per calendar', async () => {
    const db = await makeTestDb()
    const repo = chessRepo(db)
    const good = await repo.addCalendar('Lessons', 'https://good')
    const bad = await repo.addCalendar('Broken', 'https://bad')
    const off = await repo.addCalendar('Off', 'https://off')
    await repo.updateCalendar(off.id, { enabled: 0 })
    const now = new Date('2026-09-20T12:00:00Z')
    const fetchText = async (url: string) => {
      if (url === 'https://bad') throw new Error('HTTP 404')
      return FEED
    }
    const s = await syncCalendars(db, fetchText, now)
    expect(s.calendars).toBe(2)
    expect(s.errors).toEqual(['Broken: HTTP 404'])
    // 60-day window from 20 Sep: Mondays 21 Sep .. 16 Nov = 9 lessons
    expect(s.events).toBe(9)
    const cached = await repo.eventsBetween('2026-09-20T00:00:00.000Z', '2026-12-01T00:00:00.000Z')
    expect(cached).toHaveLength(9)
    expect(cached[0]!.summary).toBe('Lesson: Tom')
    const cals = await repo.calendars()
    expect(cals.find((c) => c.id === good.id)?.last_synced_at).toBe(now.toISOString())
    expect(cals.find((c) => c.id === bad.id)?.last_error).toBe('HTTP 404')

    // a second sync replaces rather than duplicates
    await syncCalendars(db, fetchText, now)
    expect(await repo.eventsBetween('2026-09-20T00:00:00.000Z', '2026-12-01T00:00:00.000Z')).toHaveLength(9)
  })
})
