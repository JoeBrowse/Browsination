import { addDays, daysBetween, type LocalDay } from '../time/localDay'

const weekdayOf = (day: LocalDay): number => new Date(`${day}T00:00:00Z`).getUTCDay()

/** Monday of the ISO week containing `day` (weeks run Monday to Sunday). */
export function weekStart(day: LocalDay): LocalDay {
  const w = weekdayOf(day)
  return addDays(day, w === 0 ? -6 : 1 - w)
}

/**
 * The week a review started on `day` is for. A review is done at the end of a week for the
 * week ahead, so from the review day (default Sunday) onwards it belongs to next week; earlier
 * days in the week review the current week (a late review is still that week's review).
 */
export function reviewWeekFor(day: LocalDay, reviewDay: number): LocalDay {
  const thisWeek = weekStart(day)
  const w = weekdayOf(day)
  const reviewIndex = reviewDay === 0 ? 6 : reviewDay - 1 // Monday = 0 ... Sunday = 6
  const dayIndex = w === 0 ? 6 : w - 1
  return dayIndex >= reviewIndex ? addDays(thisWeek, 7) : thisWeek
}

/** The next review moment on or after `now` as a local wall clock 'YYYY-MM-DDTHH:MM'. */
export function nextReviewAt(today: LocalDay, nowTime: string, reviewDay: number, time: string): string {
  const w = weekdayOf(today)
  let delta = (reviewDay - w + 7) % 7
  if (delta === 0 && nowTime > time) delta = 7
  return `${addDays(today, delta)}T${time}`
}

/** Due from the review day/time until the review for the coming week is completed. */
export function reviewDue(today: LocalDay, nowTime: string, reviewDay: number, time: string, completedWeeks: LocalDay[]): boolean {
  const target = reviewWeekFor(today, reviewDay)
  if (completedWeeks.includes(target)) return false
  const w = weekdayOf(today)
  const isReviewDay = w === reviewDay
  const past = daysBetween(weekStart(today), today) > (reviewDay === 0 ? 6 : reviewDay - 1)
  return past || (isReviewDay && nowTime >= time) || target === weekStart(today)
}

export const REVIEW_STEPS = ['Inbox', 'Waiting', 'Week ahead', 'Consistency', 'Priorities', 'Done'] as const
export type ReviewStep = (typeof REVIEW_STEPS)[number]
