import { useState } from 'react'
import { Chips, RecurrenceField } from '@/app/tasks/fields'
import { describeRule, parseRule } from '@/core/recurrence/rrule'
import { calendarDay, daysBetween, formatDay } from '@/core/time/localDay'
import { Button, EmptyState, Screen } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { MoneyInput } from '../fields'
import { pounds } from '../logic'
import type { AdminKind, AdminRow } from '../repo'
import { useLifeRepo } from '../useLife'

const KINDS: { key: AdminKind; label: string }[] = [
  { key: 'renewal', label: 'Renewals' },
  { key: 'health', label: 'Health' },
  { key: 'subscription', label: 'Subs' },
  { key: 'document', label: 'Documents' },
]

/** Renewals and expiries, health upkeep, subscriptions, and where important documents live. */
export function AdminScreen() {
  const repo = useLifeRepo()
  const [kind, setKind] = useState<AdminKind>('renewal')
  const [editing, setEditing] = useState<AdminRow | null | 'new'>(null)
  const q = useQuery(() => repo.admin(kind), ['admin_items'], [kind])
  const today = calendarDay()
  const rows = q.data ?? []
  const monthly = kind === 'subscription' ? rows.reduce((n, r) => n + monthlyCost(r), 0) : 0
  return (
    <Screen title="Admin" right={<Button onClick={() => setEditing('new')}>Add</Button>}>
      <Chips label="Kind" value={kind} onChange={setKind} options={KINDS.map((k) => ({ label: k.label, value: k.key }))} />
      {kind === 'subscription' && monthly ? <div className="muted small" style={{ marginTop: 8 }}>{pounds(monthly)} per month</div> : null}
      {!q.loading && rows.length === 0 ? <EmptyState>Nothing here</EmptyState> : null}
      <div className="list">
        {rows.map((r) => {
          const d = r.due_date ? daysBetween(today, r.due_date) : null
          const rule = parseRule(r.recurrence)
          return (
            <div key={r.id} className="list-row">
              <button className="grow task-body" onClick={() => setEditing(r)}>
                <div className="title">{r.name}</div>
                <div className="sub">
                  {[
                    r.due_date ? `${formatDay(r.due_date)}${d !== null ? (d < 0 ? ` · ${-d}d overdue` : d === 0 ? ' · today' : ` · ${d}d`) : ''}` : null,
                    rule ? describeRule(rule) : null,
                    r.cost_pence != null ? pounds(r.cost_pence) : null,
                    r.location || null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </button>
              {kind !== 'document' ? (
                <Button onClick={() => void repo.adminDone(r.id, today)} ariaLabel={`Done ${r.name}`}>
                  Done
                </Button>
              ) : null}
            </div>
          )
        })}
      </div>
      <AdminSheet key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id} kind={kind} row={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </Screen>
  )
}

function monthlyCost(r: AdminRow): number {
  if (r.cost_pence == null) return 0
  const rule = parseRule(r.recurrence)
  if (!rule) return 0
  if (rule.freq === 'MONTHLY') return Math.round(r.cost_pence / rule.interval)
  if (rule.freq === 'YEARLY') return Math.round(r.cost_pence / (12 * rule.interval))
  if (rule.freq === 'WEEKLY') return Math.round((r.cost_pence * 52) / 12 / rule.interval)
  return Math.round((r.cost_pence * 365) / 12 / rule.interval)
}

function AdminSheet({ kind, row, open, onClose }: { kind: AdminKind; row: AdminRow | null; open: boolean; onClose: () => void }) {
  const repo = useLifeRepo()
  const [d, setD] = useState({ name: row?.name ?? '', due_date: row?.due_date ?? '', recurrence: row?.recurrence ?? null, cost_pence: row?.cost_pence ?? null, location: row?.location ?? '', notes: row?.notes ?? '' })
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }))
  const save = async () => {
    if (!d.name.trim()) return
    const patch = { name: d.name, due_date: d.due_date || null, recurrence: d.recurrence, cost_pence: d.cost_pence, location: d.location, notes: d.notes }
    if (row) await repo.updateAdmin(row.id, patch)
    else await repo.addAdmin({ kind, ...patch })
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={row ? row.name : KINDS.find((k) => k.key === kind)?.label}>
      <div className="stack">
        <input aria-label="Name" placeholder="Name" value={d.name} onChange={(e) => set('name', e.target.value)} />
        {kind !== 'document' ? <input type="date" aria-label="Due date" value={d.due_date} onChange={(e) => set('due_date', e.target.value)} /> : null}
        {kind !== 'document' ? <RecurrenceField recurrence={d.recurrence} recurFrom="due" onChange={(r) => set('recurrence', r)} /> : null}
        {kind === 'subscription' || kind === 'renewal' ? <MoneyInput label="Cost" value={d.cost_pence} onChange={(v) => set('cost_pence', v)} placeholder="Cost £" /> : null}
        <input aria-label="Location" placeholder="Where is it" value={d.location} onChange={(e) => set('location', e.target.value)} />
        <textarea aria-label="Notes" placeholder="Notes (no ID numbers)" value={d.notes} onChange={(e) => set('notes', e.target.value)} />
        <div className="btn-row">
          <Button variant="primary" onClick={() => void save()} disabled={!d.name.trim()}>
            Save
          </Button>
          {row ? (
            <Button
              variant="danger"
              onClick={() => {
                void repo.removeAdmin(row.id)
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
