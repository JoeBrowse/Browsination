import { useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { formatDay } from '@/core/time/localDay'
import { Button, EmptyState, Screen } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { percent } from '../learning/logic'
import type { GoalRow } from '../repo'
import { useBanjoRepo } from '../useBanjo'

export function GoalsScreen() {
  const repo = useBanjoRepo()
  const [seg, setSeg] = useState<GoalRow['status']>('active')
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<GoalRow['kind']>('piece')
  const [date, setDate] = useState('')
  const q = useQuery(() => repo.goals(seg), ['banjo_goals'], [seg])
  const pieces = useQuery(() => repo.pieces(), ['banjo_pieces'])
  const progressOf = (pieceId: string | null) => {
    const p = pieceId ? pieces.data?.find((x) => x.id === pieceId) : null
    return p?.bars ? percent(Math.min(1, p.learned_bars / p.bars)) : null
  }
  return (
    <Screen title="Goals">
      <Chips
        label="Goals"
        value={seg}
        onChange={setSeg}
        options={[
          { label: 'Active', value: 'active' as GoalRow['status'] },
          { label: 'Done', value: 'done' as GoalRow['status'] },
        ]}
      />
      {!q.loading && (q.data?.length ?? 0) === 0 ? <EmptyState>Nothing here</EmptyState> : null}
      <div className="list" style={{ marginTop: 8 }}>
        {(q.data ?? []).map((g) => (
          <div key={g.id} className="list-row">
            <button className={`check${g.status === 'done' ? ' on' : ''}`} aria-label={`Done: ${g.title}`} onClick={() => void repo.updateGoal(g.id, { status: g.status === 'done' ? 'active' : 'done' })} />
            <div className="grow">
              <div className="title">{g.title}</div>
              <div className="sub">{[g.kind, g.target_date ? `by ${formatDay(g.target_date)}` : null].filter(Boolean).join(' · ')}</div>
            </div>
            {progressOf(g.piece_id) ? <span className="pill accent">{progressOf(g.piece_id)}</span> : null}
            <Button ariaLabel={`Remove goal ${g.title}`} onClick={() => void repo.removeGoal(g.id)}>
              ×
            </Button>
          </div>
        ))}
      </div>
      <form
        className="stack"
        style={{ gap: 8, marginTop: 12 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          void repo.addGoal({ title, kind, target_date: date || null })
          setTitle('')
          setDate('')
        }}
      >
        <input aria-label="New goal" placeholder="New goal" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="row">
          <Chips
            label="Goal kind"
            value={kind}
            onChange={setKind}
            options={[
              { label: 'Piece', value: 'piece' as GoalRow['kind'] },
              { label: 'Technique', value: 'technique' as GoalRow['kind'] },
            ]}
          />
          <input type="date" aria-label="Target date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button type="submit" variant="primary" disabled={!title.trim()}>
          Add
        </Button>
      </form>
    </Screen>
  )
}
