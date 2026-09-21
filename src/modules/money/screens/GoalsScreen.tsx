import { useState } from 'react'
import { Link } from 'react-router'
import { formatDay } from '@/core/time/localDay'
import { Button, EmptyState, Screen, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { goalProgress } from '../logic'
import type { GoalRow } from '../repo'
import { GoalSheet } from '../sheets/GoalSheet'
import { moneyShort, useAccounts, useMoneyRepo } from '../useMoney'

export function GoalsScreen() {
  const repo = useMoneyRepo()
  const acc = useAccounts()
  const [editing, setEditing] = useState<GoalRow | null | 'new'>(null)
  const q = useQuery(async () => ({ goals: await repo.goals(), linked: await repo.linkedCounts() }), ['savings_goals', 'trips', 'gift_ideas'])
  const goals = q.data?.goals ?? []
  const linked = new Map((q.data?.linked ?? []).map((l) => [l.goal_id, l]))
  const today = acc.data?.today ?? ''
  const balanceOf = (id: string | null) => (id ? (acc.data?.latest.get(id)?.balance_pence ?? null) : null)
  const active = goals.filter((g) => g.status === 'active')
  const rest = goals.filter((g) => g.status !== 'active')
  const row = (g: GoalRow) => {
    const p = goalProgress(g, balanceOf(g.account_id), today)
    const l = linked.get(g.id)
    return (
      <button key={g.id} className="list-row" onClick={() => setEditing(g)} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
        <div className="kv" style={{ minHeight: 28 }}>
          <span className="title">{g.name}</span>
          <span>
            {moneyShort(p.saved)} <span className="muted">of {moneyShort(p.target)}</span>
          </span>
        </div>
        <div className="progress" aria-label={`${Math.round(p.fraction * 100)}%`}>
          <div style={{ width: `${p.fraction * 100}%` }} />
        </div>
        <div className="sub" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>
            {g.deadline ? `by ${formatDay(g.deadline)}` : ''}
            {p.monthly !== null ? ` · ${moneyShort(p.monthly)} a month` : p.remaining === 0 ? ' · there' : ''}
          </span>
          <span>{l ? `${l.n} linked · ${moneyShort(l.total)}` : ''}</span>
        </div>
      </button>
    )
  }
  return (
    <Screen title="Goals" right={<Button onClick={() => setEditing('new')}>Add</Button>}>
      {q.data && goals.length === 0 ? <EmptyState>No goals yet</EmptyState> : null}
      <div className="list">{active.map(row)}</div>
      {rest.length ? (
        <>
          <SectionTitle>Done or dropped</SectionTitle>
          <div className="list" style={{ opacity: 0.7 }}>
            {rest.map(row)}
          </div>
        </>
      ) : null}
      {editing && editing !== 'new' ? <LinkedList goalId={editing.id} /> : null}
      <GoalSheet open={editing !== null} onClose={() => setEditing(null)} goal={editing === 'new' ? null : editing} accounts={acc.data?.accounts ?? []} />
    </Screen>
  )
}

/** Trips and gifts that point at this goal (linked from their own screens). */
function LinkedList({ goalId }: { goalId: string }) {
  const repo = useMoneyRepo()
  const q = useQuery(() => repo.linkedBudgets(goalId), ['trips', 'gift_ideas'], [goalId])
  if (!q.data?.length) return null
  return (
    <div className="muted small" style={{ marginTop: 10 }}>
      {q.data.map((l) => (
        <div key={l.id}>
          <Link to={l.href}>{l.label}</Link> {moneyShort(l.budget_pence)}
        </div>
      ))}
    </div>
  )
}
