import { useState } from 'react'
import type { LogEntry } from '@/core/repos/logEntries'
import { formatDay } from '@/core/time/localDay'
import { minutesLabel } from '@/core/ui/format'
import { Button, EmptyState, Screen } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { useBanjoRepo } from '../useBanjo'

export function SessionsScreen() {
  const repo = useBanjoRepo()
  const [open, setOpen] = useState<LogEntry | null>(null)
  const q = useQuery(() => repo.sessions(200), ['log_entries'])
  return (
    <Screen title="Sessions">
      {!q.loading && (q.data?.length ?? 0) === 0 ? <EmptyState>No sessions yet</EmptyState> : null}
      <div className="list">
        {(q.data ?? []).map((e) => (
          <button key={e.id} className="list-row" onClick={() => setOpen(e)}>
            <span className="muted small" style={{ width: 96 }}>
              {formatDay(e.ts.slice(0, 10))}
            </span>
            <span className="grow">{String(e.payload.worked_on ?? '') || 'practice'}</span>
            <span className="pill">{minutesLabel(e.value ?? 0)}</span>
          </button>
        ))}
      </div>
      <Sheet open={open !== null} onClose={() => setOpen(null)} title={open ? formatDay(open.ts.slice(0, 10)) : ''}>
        {open ? (
          <div className="stack" key={open.id}>
            <input aria-label="Worked on" defaultValue={String(open.payload.worked_on ?? '')} onBlur={(e) => void repo.logs.update(open.id, { payload: { ...open.payload, worked_on: e.target.value } })} />
            <textarea aria-label="Session notes" placeholder="Notes" defaultValue={String(open.payload.notes ?? '')} onBlur={(e) => void repo.logs.update(open.id, { payload: { ...open.payload, notes: e.target.value } })} />
            <div className="row">
              <input type="number" aria-label="Minutes" min={1} defaultValue={open.value ?? 0} style={{ width: 100 }} onBlur={(e) => void repo.logs.update(open.id, { value: Math.max(1, Number(e.target.value) || 1) })} />
              <span className="muted">min</span>
            </div>
            <div className="btn-row">
              <Button onClick={() => setOpen(null)}>Close</Button>
              <Button
                variant="danger"
                onClick={() => {
                  void repo.logs.remove(open.id)
                  setOpen(null)
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </Screen>
  )
}
