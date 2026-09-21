import type { SqlDriver } from '../db/driver'
import { logEntriesRepo, type LogEntry } from '../repos/logEntries'
import { weekStart } from '../review/logic'
import { taskQueries } from '../tasks/queries'
import { addDays, localDayOf, type LocalDay } from '../time/localDay'
import { groupMean, groupSum, mean, pairMaps, pearson, type Correlation, type Pair } from './stats'

/** Log types the insights read. Modules own the writes; this is the read side of the shared spine. */
export const T = { drink: 'drink', sleep: 'sleep', mood: 'mood', meditation: 'meditation', practice: 'practice', attempt: 'routine_attempt', result: 'match_result', workout: 'workout', focus: 'focus', morningAfter: 'morning_after' } as const

export interface PeriodSummary {
  tasksDone: number
  units: number
  drinkFreeDays: number
  meditationMin: number
  practiceMin: number
  focusMin: number
  workouts: number
  moodAvg: number | null
  sleepAvg: number | null
}

export interface CorrelationCard {
  key: string
  title: string
  x: string
  y: string
  result: Correlation
  pairs: Pair[]
}

export interface Insights {
  week: { now: PeriodSummary; before: PeriodSummary }
  month: { now: PeriodSummary; before: PeriodSummary }
  correlations: CorrelationCard[]
  days: number
}

const num = (e: LogEntry, key?: string): number | null => {
  const v = key ? e.payload[key] : e.value
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export async function loadInsights(db: SqlDriver, dayStartHour: number, today: LocalDay, days = 90): Promise<Insights> {
  const logs = logEntriesRepo(db)
  const from = addDays(today, -days)
  const entries = await logs.listBetween(`${from}T00:00:00.000Z`, `${addDays(today, 2)}T00:00:00.000Z`)
  const dayOf = (e: LogEntry) => localDayOf(e.ts, e.tz_offset_min, dayStartHour)
  const byType = new Map<string, LogEntry[]>()
  for (const e of entries) byType.set(e.type, [...(byType.get(e.type) ?? []), e])
  const of = (t: string) => byType.get(t) ?? []
  const rows = (t: string, value: (e: LogEntry) => number | null) => of(t).flatMap((e) => { const v = value(e); return v === null ? [] : [{ key: dayOf(e), value: v }] })

  const unitsByDay = groupSum(rows(T.drink, (e) => num(e, 'units')))
  const qualityByDay = groupMean(rows(T.sleep, (e) => num(e, 'quality')))
  const hoursByDay = groupMean(rows(T.sleep, (e) => num(e)))
  const moodByDay = groupMean(rows(T.mood, (e) => num(e)))
  const resultByDay = (module: string) => groupMean(of(T.result).filter((e) => e.module === module).flatMap((e) => { const v = num(e); return v === null ? [] : [{ key: dayOf(e), value: v }] }))
  const workoutDays = new Set(of(T.workout).map(dayOf))
  const workoutsByWeek = groupSum([...workoutDays].map((d) => ({ key: weekStart(d), value: 1 })))
  const moodByWeek = groupMean(rows(T.mood, (e) => num(e)).map((r) => ({ key: weekStart(r.key), value: r.value })))

  // practice frequency vs routine score: per routine and week, attempts that week against the mean score
  // normalised by the routine's own mean, so different routines can share one chart.
  const attempts = of(T.attempt).filter((e) => e.entity_id && num(e) !== null)
  const routineMean = groupMean(attempts.map((e) => ({ key: e.entity_id!, value: num(e)! })))
  const perRoutineWeek = new Map<string, { n: number; sum: number }>()
  for (const e of attempts) {
    const k = `${e.entity_id}|${weekStart(dayOf(e))}`
    const g = perRoutineWeek.get(k) ?? { n: 0, sum: 0 }
    g.n += 1
    g.sum += num(e)! / (routineMean.get(e.entity_id!) || 1)
    perRoutineWeek.set(k, g)
  }
  const practicePairs: Pair[] = [...perRoutineWeek.values()].map((g) => ({ x: g.n, y: g.sum / g.n }))

  const card = (key: string, title: string, x: string, y: string, pairs: Pair[]): CorrelationCard => ({ key, title, x, y, pairs, result: pearson(pairs) })
  const correlations: CorrelationCard[] = [
    card('drinks-sleep', 'Drinks and sleep quality', 'units the day before', 'sleep quality 1-5', pairMaps(unitsByDay, qualityByDay, (d) => addDays(d, 1))),
    card('sleep-mood', 'Sleep and mood', 'hours slept', 'mood 1-5', pairMaps(hoursByDay, moodByDay)),
    card('mood-chess', 'Mood and chess results', 'mood 1-5', 'result (1 win, ½ draw, 0 loss)', pairMaps(moodByDay, resultByDay('chess'))),
    card('mood-snooker', 'Mood and snooker results', 'mood 1-5', 'result', pairMaps(moodByDay, resultByDay('snooker'))),
    card('practice-scores', 'Practice frequency and routine scores', 'attempts in a week', 'score against the routine average', practicePairs),
    card('gym-mood', 'Gym consistency and mood', 'workout days in a week', 'average mood that week', pairMaps(workoutsByWeek, moodByWeek)),
  ]

  const tasks = taskQueries(db)
  const summary = async (fromDay: LocalDay, toDay: LocalDay): Promise<PeriodSummary> => {
    const inRange = (d: LocalDay) => d >= fromDay && d <= toDay
    const pick = (t: string) => of(t).filter((e) => inRange(dayOf(e)))
    const sumOf = (t: string, key?: string) => pick(t).reduce((n, e) => n + (num(e, key) ?? 0), 0)
    const drinkDays = new Set(pick(T.drink).map(dayOf))
    const span = Math.max(1, Math.round((Date.parse(toDay) - Date.parse(fromDay)) / 86_400_000) + 1)
    const done = await tasks.doneBetween(`${fromDay}T00:00:00.000Z`, `${addDays(toDay, 1)}T00:00:00.000Z`)
    return {
      tasksDone: done.length,
      units: sumOf(T.drink, 'units'),
      drinkFreeDays: span - drinkDays.size,
      meditationMin: sumOf(T.meditation),
      practiceMin: sumOf(T.practice),
      focusMin: sumOf(T.focus),
      workouts: new Set(pick(T.workout).map(dayOf)).size,
      moodAvg: mean(pick(T.mood).flatMap((e) => (num(e) === null ? [] : [num(e)!]))),
      sleepAvg: mean(pick(T.sleep).flatMap((e) => (num(e) === null ? [] : [num(e)!]))),
    }
  }
  return {
    week: { now: await summary(addDays(today, -6), today), before: await summary(addDays(today, -13), addDays(today, -7)) },
    month: { now: await summary(addDays(today, -29), today), before: await summary(addDays(today, -59), addDays(today, -30)) },
    correlations,
    days,
  }
}
