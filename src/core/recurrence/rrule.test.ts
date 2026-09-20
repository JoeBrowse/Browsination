import { describe, expect, it } from 'vitest'
import { describeRule, formatRule, nextOccurrence, parseRule, weekday } from './rrule'

describe('parse / format', () => {
  it('round-trips the subset', () => {
    for (const s of ['FREQ=DAILY', 'FREQ=DAILY;INTERVAL=3', 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE', 'FREQ=MONTHLY', 'FREQ=YEARLY']) {
      expect(formatRule(parseRule(s)!)).toBe(s)
    }
    expect(parseRule('')).toBeNull()
    expect(parseRule('FREQ=HOURLY')).toBeNull()
    expect(parseRule('FREQ=DAILY;INTERVAL=0')?.interval).toBe(1)
  })
  it('describes rules in plain words', () => {
    expect(describeRule({ freq: 'DAILY', interval: 1 })).toBe('Daily')
    expect(describeRule({ freq: 'DAILY', interval: 3 })).toBe('Every 3 days')
    expect(describeRule({ freq: 'WEEKLY', interval: 2, byDay: [0, 2] })).toBe('Every 2 weeks on Mon, Wed')
    expect(describeRule({ freq: 'YEARLY', interval: 1 })).toBe('Yearly')
  })
})

describe('nextOccurrence', () => {
  it('daily and every N days, skipping missed occurrences', () => {
    const daily = { freq: 'DAILY' as const, interval: 1 }
    expect(nextOccurrence(daily, '2026-09-01', '2026-09-01')).toBe('2026-09-02')
    const every3 = { freq: 'DAILY' as const, interval: 3 }
    expect(nextOccurrence(every3, '2026-09-01', '2026-09-01')).toBe('2026-09-04')
    expect(nextOccurrence(every3, '2026-09-01', '2026-09-03')).toBe('2026-09-04')
    expect(nextOccurrence(every3, '2026-09-01', '2026-09-20')).toBe('2026-09-22')
    // anchor in the future is itself the next occurrence
    expect(nextOccurrence(every3, '2026-10-01', '2026-09-20')).toBe('2026-10-01')
  })
  it('weekly without days keeps the weekday of the anchor', () => {
    expect(nextOccurrence({ freq: 'WEEKLY', interval: 1 }, '2026-09-07', '2026-09-20')).toBe('2026-09-21')
    expect(nextOccurrence({ freq: 'WEEKLY', interval: 2 }, '2026-09-07', '2026-09-21')).toBe('2026-10-05')
  })
  it('weekly on specific days honours the interval from the anchor week', () => {
    const rule = { freq: 'WEEKLY' as const, interval: 2, byDay: [0, 3] } // Mon, Thu
    expect(weekday('2026-09-07')).toBe(0)
    expect(nextOccurrence(rule, '2026-09-07', '2026-09-07')).toBe('2026-09-10')
    expect(nextOccurrence(rule, '2026-09-07', '2026-09-10')).toBe('2026-09-21')
    expect(nextOccurrence(rule, '2026-09-07', '2026-09-15')).toBe('2026-09-21')
  })
  it('monthly clamps to the end of shorter months and recovers', () => {
    const rule = { freq: 'MONTHLY' as const, interval: 1 }
    expect(nextOccurrence(rule, '2026-01-31', '2026-01-31')).toBe('2026-02-28')
    expect(nextOccurrence(rule, '2026-01-31', '2026-02-28')).toBe('2026-03-31')
    expect(nextOccurrence({ freq: 'MONTHLY', interval: 6 }, '2026-09-25', '2026-09-25')).toBe('2027-03-25')
  })
  it('yearly handles 29 February', () => {
    const rule = { freq: 'YEARLY' as const, interval: 1 }
    expect(nextOccurrence(rule, '2028-02-29', '2028-02-29')).toBe('2029-02-28')
    expect(nextOccurrence(rule, '2028-02-29', '2031-03-01')).toBe('2032-02-29')
  })
})
