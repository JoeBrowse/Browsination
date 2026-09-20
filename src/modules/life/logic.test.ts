import { describe, expect, it } from 'vitest'
import type { PersonRow } from '@/core/repos/people'
import { adminNudges, birthdayNudges, keepInTouchNudges, nextBirthday, parsePounds, pounds, sparklinePath } from './logic'

const person = (over: Partial<PersonRow>): PersonRow => ({
  id: 'p',
  name: 'Sophie',
  relationship: '',
  birthday: null,
  notes: '',
  last_contacted_at: null,
  keep_in_touch_days: null,
  created_at: '',
  updated_at: '',
  ...over,
})

describe('nextBirthday', () => {
  it('finds this year or next and computes age when the year is known', () => {
    expect(nextBirthday('2000-05-14', '2026-09-20')).toEqual({ day: '2027-05-14', daysUntil: 236, age: 27 })
    expect(nextBirthday('--10-01', '2026-09-20')).toEqual({ day: '2026-10-01', daysUntil: 11, age: null })
    expect(nextBirthday('1996-09-20', '2026-09-20')?.daysUntil).toBe(0)
  })
  it('handles 29 February', () => {
    expect(nextBirthday('2000-02-29', '2026-01-01')?.day).toBe('2026-02-28')
    expect(nextBirthday('2000-02-29', '2028-01-01')?.day).toBe('2028-02-29')
  })
})

describe('nudges', () => {
  it('mentions birthdays only at lead days and on the day', () => {
    const people = [person({ id: 'a', name: 'A', birthday: '--09-27' }), person({ id: 'b', name: 'B', birthday: '--09-25' }), person({ id: 'c', name: 'C', birthday: '1990-09-20' })]
    const n = birthdayNudges(people, '2026-09-20', [21, 7])
    expect(n.map((x) => x.title)).toEqual(["A's birthday in 7 days", "C's birthday today"])
  })
  it('keep in touch triggers when never contacted or overdue', () => {
    const now = new Date('2026-09-20T12:00:00Z')
    const people = [
      person({ id: 'a', name: 'Mum', keep_in_touch_days: 14, last_contacted_at: '2026-09-01T00:00:00Z' }),
      person({ id: 'b', name: 'Dan', keep_in_touch_days: 30, last_contacted_at: '2026-09-15T00:00:00Z' }),
      person({ id: 'c', name: 'Al', keep_in_touch_days: 7 }),
      person({ id: 'd', name: 'None' }),
    ]
    expect(keepInTouchNudges(people, now).map((x) => x.title)).toEqual(['Contact Mum', 'Contact Al'])
  })
  it('admin items surface within the lead window, overdue first', () => {
    const items = [
      { id: '1', kind: 'renewal', name: 'MOT', due_date: '2026-09-30' },
      { id: '2', kind: 'health', name: 'Dentist', due_date: '2026-09-18' },
      { id: '3', kind: 'subscription', name: 'Spotify', due_date: '2026-12-01' },
    ]
    const n = adminNudges(items, '2026-09-20', 14)
    expect(n.map((x) => [x.title, x.priority])).toEqual([
      ['MOT in 10 days', 2],
      ['Dentist 2 days overdue', 0],
    ])
    expect(adminNudges(items, '2026-09-20', 0)).toEqual([])
  })
})

describe('money and sparkline', () => {
  it('formats and parses pounds as pence', () => {
    expect(pounds(4599)).toBe('£45.99')
    expect(pounds(6000)).toBe('£60')
    expect(parsePounds('£12.50')).toBe(1250)
    expect(parsePounds('')).toBeNull()
  })
  it('draws a path', () => {
    expect(sparklinePath([1, 2, 3], 100, 20, 0)).toBe('M0.0,20.0 L50.0,10.0 L100.0,0.0')
    expect(sparklinePath([])).toBe('')
  })
})
