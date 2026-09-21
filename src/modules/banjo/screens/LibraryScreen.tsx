import { useState } from 'react'
import { Link } from 'react-router'
import { Chips } from '@/app/tasks/fields'
import { Button, EmptyState, Screen } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { percent } from '../learning/logic'
import { STATUSES, type PieceStatus } from '../repo'
import { useBanjoRepo } from '../useBanjo'

export function LibraryScreen() {
  const repo = useBanjoRepo()
  const [filter, setFilter] = useState<PieceStatus | 'all'>('all')
  const [title, setTitle] = useState('')
  const q = useQuery(() => repo.pieces(), ['banjo_pieces'])
  const pieces = (q.data ?? []).filter((p) => filter === 'all' || p.status === filter)
  return (
    <Screen title="Library">
      <Chips label="Status" value={filter} onChange={setFilter} options={[{ label: 'All', value: 'all' as PieceStatus | 'all' }, ...STATUSES.map((s) => ({ label: s.label, value: s.key as PieceStatus | 'all' }))]} />
      <form
        className="row"
        style={{ marginTop: 10 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          void repo.addPiece(title)
          setTitle('')
        }}
      >
        <input aria-label="New piece" placeholder="New piece" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button type="submit" variant="primary" disabled={!title.trim()}>
          Add
        </Button>
      </form>
      {!q.loading && pieces.length === 0 ? <EmptyState>No pieces yet</EmptyState> : null}
      <div className="list">
        {pieces.map((p) => (
          <Link key={p.id} to={`piece/${p.id}`} className="list-row">
            <div className="grow">
              <div className="title">{p.title}</div>
              <div className="sub">{[p.tuning || null, STATUSES.find((s) => s.key === p.status)?.label, p.bars ? `${percent(Math.min(1, p.learned_bars / p.bars))} of ${p.bars} bars` : null].filter(Boolean).join(' · ')}</div>
            </div>
          </Link>
        ))}
      </div>
    </Screen>
  )
}
