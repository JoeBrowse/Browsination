import { describe, expect, it } from 'vitest'
import { nextReviewAt, reviewDue, reviewWeekFor, weekStart } from './logic'

describe('weekly review timing', () => {
  it('weeks start on Monday', () => {
    expect(weekStart('2026-09-21')).toBe('2026-09-21') // Monday
    expect(weekStart('2026-09-27')).toBe('2026-09-21') // Sunday
    expect(weekStart('2026-09-24')).toBe('2026-09-21')
  })
  it('a Sunday review is for the coming week; earlier in the week it is for the current one', () => {
    expect(reviewWeekFor('2026-09-27', 0)).toBe('2026-09-28')
    expect(reviewWeekFor('2026-09-23', 0)).toBe('2026-09-21')
    expect(reviewWeekFor('2026-09-26', 5)).toBe('2026-09-28') // Friday review day, on Friday
    expect(reviewWeekFor('2026-09-24', 5)).toBe('2026-09-21')
  })
  it('next review moment', () => {
    expect(nextReviewAt('2026-09-23', '10:00', 0, '18:00')).toBe('2026-09-27T18:00')
    expect(nextReviewAt('2026-09-27', '10:00', 0, '18:00')).toBe('2026-09-27T18:00')
    expect(nextReviewAt('2026-09-27', '19:00', 0, '18:00')).toBe('2026-10-04T18:00')
  })
  it('due from the review moment until that week is completed', () => {
    expect(reviewDue('2026-09-27', '17:00', 0, '18:00', [])).toBe(false)
    expect(reviewDue('2026-09-27', '18:30', 0, '18:00', [])).toBe(true)
    expect(reviewDue('2026-09-27', '18:30', 0, '18:00', ['2026-09-28'])).toBe(false)
    // Wednesday with no review for the current week: still due (a late review is fine)
    expect(reviewDue('2026-09-23', '10:00', 0, '18:00', [])).toBe(true)
    expect(reviewDue('2026-09-23', '10:00', 0, '18:00', ['2026-09-21'])).toBe(false)
  })
})
