import { describe, expect, it } from 'vitest'
import { evidenceText, upcomingKeyDates, upcomingMilestones } from './logic'

describe('work logic', () => {
  it('lists key dates inside the window, soonest first, skipping done projects', () => {
    const out = upcomingKeyDates(
      [
        { project: { id: 'a', name: 'Bridge', status: 'active' }, dates: [{ label: 'Report', date: '2026-10-05' }, { label: 'Site visit', date: '2026-10-02' }, { label: 'Old', date: '2026-09-01' }] },
        { project: { id: 'b', name: 'Done one', status: 'done' }, dates: [{ label: 'X', date: '2026-10-02' }] },
        { project: { id: 'c', name: 'Far', status: 'active' }, dates: [{ label: 'Y', date: '2026-12-01' }] },
      ],
      '2026-10-01',
      7,
    )
    expect(out.map((u) => u.title)).toEqual(['Bridge: Site visit', 'Bridge: Report'])
    expect(out[0]!.sub).toBe('tomorrow')
    expect(out[1]!.daysUntil).toBe(4)
  })
  it('lists active milestones with a target inside the window', () => {
    const out = upcomingMilestones(
      [
        { id: '1', kind: 'milestone', title: 'Chartership', status: 'active', target_date: '2026-10-10' },
        { id: '2', kind: 'goal', title: 'Goal', status: 'active', target_date: '2026-10-03' },
        { id: '3', kind: 'milestone', title: 'Done', status: 'done', target_date: '2026-10-03' },
        { id: '4', kind: 'milestone', title: 'No date', status: 'active', target_date: null },
      ],
      '2026-10-01',
      14,
    )
    expect(out.map((u) => u.title)).toEqual(['Chartership'])
    expect(out[0]!.sub).toBe('in 9 days')
  })
  it('formats the evidence log as plain lines', () => {
    expect(evidenceText([{ day: '2026-10-01', kind: 'feedback', title: 'Clear update', detail: 'Client happy', source: 'Priya' }])).toBe('2026-10-01 Feedback: Clear update (Priya) – Client happy')
    expect(evidenceText([{ day: '2026-10-01', kind: 'achievement', title: 'Shipped', detail: '', source: '' }])).toBe('2026-10-01 Achievement: Shipped')
  })
})
