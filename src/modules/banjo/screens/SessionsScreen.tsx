import { useState } from 'react'
import { LogSheet } from '@/app/logs/LogSheet'
import type { LogEntry } from '@/core/repos/logEntries'
import { formatDay, localDayOf } from '@/core/time/localDay'
import { minutesLabel } from '@/core/ui/format'
import { EmptyState, Screen } from '@/core/ui/primitives'
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
              {formatDay(localDayOf(e.ts, e.tz_offset_min))}
            </span>
            <span className="grow">{String(e.payload.worked_on ?? '') || 'practice'}</span>
            <span className="pill">{minutesLabel(e.value ?? 0)}</span>
          </button>
        ))}
      </div>
      {open ? <LogSheet key={open.id} entry={open} open onClose={() => setOpen(null)} /> : null}
    </Screen>
  )
}
