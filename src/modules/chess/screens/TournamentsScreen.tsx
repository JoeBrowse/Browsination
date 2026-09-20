import { useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { MoneyInput } from '@/modules/life/fields'
import { pounds } from '@/modules/life/logic'
import { calendarDay, daysBetween, formatDay } from '@/core/time/localDay'
import { Button, EmptyState, Screen } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import type { TournamentRow } from '../repo'
import { useChessRepo } from '../useChess'

type Entered = TournamentRow['entered']

export function TournamentsScreen() {
  const repo = useChessRepo()
  const [editing, setEditing] = useState<TournamentRow | null | 'new'>(null)
  const q = useQuery(() => repo.tournaments(), ['tournaments'])
  const today = calendarDay()
  return (
    <Screen title="Events" right={<Button onClick={() => setEditing('new')}>Add</Button>}>
      {!q.loading && (q.data?.length ?? 0) === 0 ? <EmptyState>No tournaments yet</EmptyState> : null}
      <div className="list">
        {(q.data ?? []).map((t) => {
          const d = t.entry_deadline ? daysBetween(today, t.entry_deadline) : null
          return (
            <div key={t.id} className="list-row" style={{ flexWrap: 'wrap' }}>
              <button className="grow task-body" onClick={() => setEditing(t)}>
                <div className="title">{t.name}</div>
                <div className="sub">
                  {[t.start_date ? formatDay(t.start_date) : null, t.location || null, t.entry_fee_pence != null ? pounds(t.entry_fee_pence) : null, d !== null && t.entered === 'no' ? (d < 0 ? 'deadline passed' : `deadline in ${d}d`) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </button>
              <Chips
                label={`Entered ${t.name}`}
                value={t.entered}
                onChange={(v) => void repo.updateTournament(t.id, { entered: v })}
                options={[
                  { label: 'Not yet', value: 'no' as Entered },
                  { label: 'Entered', value: 'yes' as Entered },
                  { label: 'Skip', value: 'skipped' as Entered },
                ]}
              />
            </div>
          )
        })}
      </div>
      <TournamentSheet key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id} row={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </Screen>
  )
}

function TournamentSheet({ row, open, onClose }: { row: TournamentRow | null; open: boolean; onClose: () => void }) {
  const repo = useChessRepo()
  const [d, setD] = useState({ name: row?.name ?? '', start_date: row?.start_date ?? '', end_date: row?.end_date ?? '', location: row?.location ?? '', entry_deadline: row?.entry_deadline ?? '', entry_fee_pence: row?.entry_fee_pence ?? null, url: row?.url ?? '', notes: row?.notes ?? '' })
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }))
  const save = async () => {
    if (!d.name.trim()) return
    const patch = { name: d.name, start_date: d.start_date || null, end_date: d.end_date || null, location: d.location, entry_deadline: d.entry_deadline || null, entry_fee_pence: d.entry_fee_pence, url: d.url.trim() || null, notes: d.notes }
    if (row) await repo.updateTournament(row.id, patch)
    else await repo.addTournament(patch)
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={row ? row.name : 'New tournament'}>
      <div className="stack">
        <input aria-label="Tournament name" placeholder="Name" value={d.name} onChange={(e) => set('name', e.target.value)} />
        <div className="row">
          <input type="date" aria-label="Start" value={d.start_date} onChange={(e) => set('start_date', e.target.value)} />
          <input type="date" aria-label="End" value={d.end_date} onChange={(e) => set('end_date', e.target.value)} />
        </div>
        <input aria-label="Location" placeholder="Location" value={d.location} onChange={(e) => set('location', e.target.value)} />
        <label className="small muted">
          Entry deadline
          <input type="date" aria-label="Entry deadline" value={d.entry_deadline} onChange={(e) => set('entry_deadline', e.target.value)} />
        </label>
        <MoneyInput label="Entry fee" value={d.entry_fee_pence} onChange={(v) => set('entry_fee_pence', v)} placeholder="Fee £" />
        <input aria-label="Link" placeholder="Link" value={d.url} onChange={(e) => set('url', e.target.value)} inputMode="url" />
        <textarea aria-label="Notes" placeholder="Notes" value={d.notes} onChange={(e) => set('notes', e.target.value)} />
        <div className="btn-row">
          <Button variant="primary" onClick={() => void save()} disabled={!d.name.trim()}>
            Save
          </Button>
          {row ? (
            <Button
              variant="danger"
              onClick={() => {
                void repo.removeTournament(row.id)
                onClose()
              }}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </div>
    </Sheet>
  )
}
