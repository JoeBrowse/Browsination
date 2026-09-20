import type { ModuleDef, TodayCard, TodayContext } from '../modules/types'

export interface TodayResult {
  shown: TodayCard[]
  /** Cards hidden by the cap, per module. */
  collapsed: Record<string, number>
  /** Modules whose contributor threw. */
  failed: string[]
}

/**
 * Runs every module's Today contributors, tolerating failures, dedupes by key,
 * sorts by priority then module order, and caps the visible list.
 */
export async function collectToday(ctx: TodayContext, modules: ModuleDef[], cap: number, extra: TodayCard[] = []): Promise<TodayResult> {
  const order = new Map(modules.map((m) => [m.id, m.order] as const))
  const jobs = modules.flatMap((m) => (m.today ?? []).map((c) => ({ id: m.id, run: () => c(ctx) })))
  const settled = await Promise.allSettled(jobs.map((j) => j.run()))
  const failed: string[] = []
  const cards: TodayCard[] = [...extra]
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') cards.push(...r.value)
    else failed.push(jobs[i]!.id)
  })
  const seen = new Set<string>()
  const unique = cards.filter((c) => (seen.has(c.key) ? false : (seen.add(c.key), true)))
  unique.sort((a, b) => a.priority - b.priority || (order.get(a.module as never) ?? -1) - (order.get(b.module as never) ?? -1))
  const shown = unique.slice(0, cap)
  const collapsed: Record<string, number> = {}
  for (const c of unique.slice(cap)) collapsed[c.module] = (collapsed[c.module] ?? 0) + 1
  return { shown, collapsed, failed: [...new Set(failed)] }
}
