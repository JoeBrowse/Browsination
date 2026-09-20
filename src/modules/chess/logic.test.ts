import { describe, expect, it } from 'vitest'
import { dueForReview, tournamentNudges, treeOrder } from './logic'

describe('dueForReview', () => {
  it('orders never-reviewed first, then by overdue days from the confidence interval', () => {
    const due = dueForReview(
      [
        { id: 'a', confidence: 5, last_reviewed: '2026-09-01' }, // 60d interval, not due
        { id: 'b', confidence: 1, last_reviewed: '2026-09-10' }, // 3d interval, 7 days overdue
        { id: 'c', confidence: 3, last_reviewed: '2026-08-01' }, // 14d interval, 36 overdue
        { id: 'd', confidence: 2, last_reviewed: null },
      ],
      '2026-09-20',
    )
    expect(due.map((l) => l.id)).toEqual(['d', 'c', 'b'])
  })
})

describe('tournamentNudges', () => {
  it('nags inside the lead window until entered or skipped, and drops a week after the deadline', () => {
    const list = [
      { id: '1', name: 'Open', entry_deadline: '2026-09-30', entered: 'no' as const, start_date: null },
      { id: '2', name: 'Rapid', entry_deadline: '2026-09-22', entered: 'no' as const, start_date: null },
      { id: '3', name: 'Done', entry_deadline: '2026-09-22', entered: 'yes' as const, start_date: null },
      { id: '4', name: 'Old', entry_deadline: '2026-09-01', entered: 'no' as const, start_date: null },
      { id: '5', name: 'Far', entry_deadline: '2026-12-01', entered: 'no' as const, start_date: null },
    ]
    const n = tournamentNudges(list, '2026-09-20')
    expect(n.map((x) => [x.title, x.sub, x.priority])).toEqual([
      ['Enter Open?', 'deadline in 10d', 2],
      ['Enter Rapid?', 'deadline in 2d', 0],
    ])
  })
})

describe('treeOrder', () => {
  it('walks parents before children with depth', () => {
    const rows = [
      { id: 'b', parent_id: null, sort_order: 1, name: 'B' },
      { id: 'a', parent_id: null, sort_order: 0, name: 'A' },
      { id: 'a1', parent_id: 'a', sort_order: 0, name: 'A1' },
      { id: 'a1x', parent_id: 'a1', sort_order: 0, name: 'A1x' },
    ]
    expect(treeOrder(rows).map((r) => `${r.depth}:${r.id}`)).toEqual(['0:a', '1:a1', '2:a1x', '0:b'])
  })
})
