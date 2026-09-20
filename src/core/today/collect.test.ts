import { Sun } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import type { ModuleDef, TodayCard, TodayContext } from '../modules/types'
import { collectToday } from './collect'

const ctx = { db: {} as never, today: '2026-09-20', calendarToday: '2026-09-20', now: new Date() } satisfies TodayContext
const card = (key: string, module: ModuleDef['id'], priority: number): TodayCard => ({ key, module, kind: 'due', title: key, priority })
const mod = (id: ModuleDef['id'], order: number, cards: TodayCard[] | Error): ModuleDef => ({
  id,
  name: id,
  icon: Sun,
  accent: '#fff',
  order,
  routes: [],
  today: [async () => (cards instanceof Error ? Promise.reject(cards) : cards)],
})

describe('collectToday', () => {
  it('sorts by priority then module order, dedupes, caps, and survives a failing module', async () => {
    const modules = [
      mod('chess', 2, [card('c1', 'chess', 1), card('c2', 'chess', 3)]),
      mod('brain', 1, [card('b1', 'brain', 1), card('b1', 'brain', 1), card('b2', 'brain', 0)]),
      mod('banjo', 3, new Error('boom')),
    ]
    const r = await collectToday(ctx, modules, 3)
    expect(r.shown.map((c) => c.key)).toEqual(['b2', 'b1', 'c1'])
    expect(r.collapsed).toEqual({ chess: 1 })
    expect(r.failed).toEqual(['banjo'])
  })
  it('includes core cards passed in', async () => {
    const r = await collectToday(ctx, [], 5, [{ key: 'x', module: 'core', kind: 'checkin', title: 'x', priority: 0 }])
    expect(r.shown).toHaveLength(1)
  })
})
