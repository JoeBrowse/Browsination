import { useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { useServices } from '@/app/services'
import { calendarDay, daysBetween, formatDay } from '@/core/time/localDay'
import { Button, EmptyState, Screen } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { MoneyInput } from '../fields'
import { pounds } from '../logic'
import type { DateNightRow } from '../repo'
import { useLifeRepo } from '../useLife'

type Seg = 'ideas' | 'planned' | 'history'

export function DatesScreen() {
  const repo = useLifeRepo()
  const s = useServices()
  const [seg, setSeg] = useState<Seg>('planned')
  const [title, setTitle] = useState('')
  const [planning, setPlanning] = useState<DateNightRow | null>(null)
  const [finishing, setFinishing] = useState<DateNightRow | null>(null)
  const q = useQuery(async () => ({ rows: await repo.dateNights(), weeks: await s.settings.get('life.dateNightNudgeWeeks') }), ['date_nights', 'settings'])
  const rows = q.data?.rows ?? []
  const today = calendarDay()
  const planned = rows.filter((r) => r.status === 'planned')
  const next = planned.filter((r) => r.date && r.date >= today).sort((a, b) => (a.date! < b.date! ? -1 : 1))[0]
  const shown = seg === 'ideas' ? rows.filter((r) => r.status === 'idea') : seg === 'planned' ? planned : rows.filter((r) => r.status === 'done' || r.status === 'skipped')
  const addIdea = async () => {
    if (!title.trim()) return
    await repo.addDateNight({ title })
    setTitle('')
  }
  return (
    <Screen title="Dates">
      <div className="muted small" style={{ marginBottom: 10 }}>
        {next ? `Next ${formatDay(next.date!)} · ${next.title} · in ${daysBetween(today, next.date!)} days` : q.data && q.data.weeks > 0 ? `Nothing planned in the next ${q.data.weeks} weeks` : 'Nothing planned'}
      </div>
      <Chips
        label="Dates"
        value={seg}
        onChange={setSeg}
        options={[
          { label: 'Ideas', value: 'ideas' as Seg },
          { label: 'Planned', value: 'planned' as Seg },
          { label: 'History', value: 'history' as Seg },
        ]}
      />
      {seg === 'ideas' ? (
        <form
          className="row"
          style={{ marginTop: 10 }}
          onSubmit={(e) => {
            e.preventDefault()
            void addIdea()
          }}
        >
          <input aria-label="New date idea" placeholder="Idea" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button type="submit" variant="primary" disabled={!title.trim()}>
            Add
          </Button>
        </form>
      ) : null}
      {!q.loading && shown.length === 0 ? <EmptyState>Nothing here</EmptyState> : null}
      <div className="list">
        {shown.map((r) => (
          <div key={r.id} className="list-row">
            <div className="grow">
              <div className="title">{r.title}</div>
              <div className="sub">{[r.date ? formatDay(r.date) : null, r.place || null, r.status === 'done' ? `spent ${pounds(r.spent_pence) || '–'}` : r.budget_pence != null ? `budget ${pounds(r.budget_pence)}` : null, r.status === 'skipped' ? 'skipped' : null].filter(Boolean).join(' · ')}</div>
            </div>
            {r.status === 'idea' ? <Button onClick={() => setPlanning(r)}>Plan</Button> : null}
            {r.status === 'planned' ? (
              <>
                <Button onClick={() => setPlanning(r)}>Edit</Button>
                <Button variant="primary" onClick={() => setFinishing(r)}>
                  Done
                </Button>
              </>
            ) : null}
            {r.status !== 'done' ? (
              <Button onClick={() => void (r.status === 'planned' ? repo.updateDateNight(r.id, { status: 'skipped' }) : repo.removeDateNight(r.id))} ariaLabel={`Remove ${r.title}`}>
                ×
              </Button>
            ) : null}
          </div>
        ))}
      </div>
      <PlanSheet row={planning} onClose={() => setPlanning(null)} />
      <FinishSheet row={finishing} onClose={() => setFinishing(null)} />
    </Screen>
  )
}

function PlanSheet({ row, onClose }: { row: DateNightRow | null; onClose: () => void }) {
  const repo = useLifeRepo()
  const [date, setDate] = useState(row?.date ?? '')
  const [place, setPlace] = useState(row?.place ?? '')
  const [budget, setBudget] = useState<number | null>(row?.budget_pence ?? null)
  const save = async () => {
    if (!row) return
    await repo.updateDateNight(row.id, { status: 'planned', date: date || null, place, budget_pence: budget })
    onClose()
  }
  return (
    <Sheet open={row !== null} onClose={onClose} title={row?.title}>
      <div className="stack">
        <input type="date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input aria-label="Place" placeholder="Place" value={place} onChange={(e) => setPlace(e.target.value)} />
        <MoneyInput label="Budget" value={budget} onChange={setBudget} placeholder="Budget £" />
        <Button variant="primary" block onClick={() => void save()}>
          Save
        </Button>
      </div>
    </Sheet>
  )
}

function FinishSheet({ row, onClose }: { row: DateNightRow | null; onClose: () => void }) {
  const repo = useLifeRepo()
  const [spent, setSpent] = useState<number | null>(row?.budget_pence ?? null)
  return (
    <Sheet open={row !== null} onClose={onClose} title="How was it?">
      <div className="stack">
        <MoneyInput label="Spent" value={spent} onChange={setSpent} placeholder="Spent £" />
        <Button
          variant="primary"
          block
          onClick={() => {
            if (row) void repo.completeDateNight(row.id, spent)
            onClose()
          }}
        >
          Done
        </Button>
      </div>
    </Sheet>
  )
}
