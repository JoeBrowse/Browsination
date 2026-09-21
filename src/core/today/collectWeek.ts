import type { ModuleDef, WeekContext, WeekItem } from '../modules/types'

/** Runs every module's `week` hook for the range, tolerating failures, sorted by date then module order. */
export async function collectWeek(ctx: WeekContext, modules: ModuleDef[]): Promise<(WeekItem & { module: string })[]> {
  const jobs = modules.filter((m) => m.week).map((m) => ({ m, run: () => m.week!(ctx) }))
  const settled = await Promise.allSettled(jobs.map((j) => j.run()))
  const out: (WeekItem & { module: string })[] = []
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') out.push(...r.value.map((w) => ({ ...w, module: jobs[i]!.m.id })))
  })
  const order = new Map(modules.map((m) => [m.id, m.order] as const))
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (order.get(a.module as never) ?? 0) - (order.get(b.module as never) ?? 0)))
}
