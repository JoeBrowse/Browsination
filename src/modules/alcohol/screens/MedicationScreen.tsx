import { useState } from 'react'
import { LogSheet } from '@/app/logs/LogSheet'
import type { LogEntry } from '@/core/repos/logEntries'
import { formatDay, localDayOf, localTimeOf } from '@/core/time/localDay'
import { Button, EmptyState, Screen, SectionTitle, Toggle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { useAlcoholRepo } from '../useAlcohol'

/** A plain log of name, dose and time with reminders. No advice, no interaction claims. */
export function MedicationScreen() {
  const repo = useAlcoholRepo()
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [times, setTimes] = useState('08:00')
  const [editing, setEditing] = useState<LogEntry | null>(null)
  const meds = useQuery(() => repo.medications(false), ['medications'])
  const recent = useQuery(() => repo.medicationLogsBetween(new Date(Date.now() - 7 * 86_400_000).toISOString(), new Date(Date.now() + 60_000).toISOString()), ['log_entries'])
  const add = async () => {
    if (!name.trim()) return
    const list = times
      .split(',')
      .map((t) => t.trim())
      .filter((t) => /^\d{2}:\d{2}$/.test(t))
    await repo.addMedication(name, dose, list)
    setName('')
    setDose('')
  }
  return (
    <Screen title="Medication">
      {!meds.loading && (meds.data?.length ?? 0) === 0 ? <EmptyState>Nothing yet</EmptyState> : null}
      <div className="list">
        {(meds.data ?? []).map((m) => (
          <div key={m.id} className="list-row">
            <div className="grow">
              <div className="title">
                {m.name} <span className="muted small">{m.dose}</span>
              </div>
              <div className="sub">{repo.medicationTimes(m).join(', ') || 'no reminder times'}</div>
            </div>
            <Button onClick={() => void repo.logMedication(m)} ariaLabel={`Take ${m.name}`}>
              Taken
            </Button>
            <Toggle label={`Active ${m.name}`} checked={!!m.active} onChange={(on) => void repo.updateMedication(m.id, { active: on ? 1 : 0 })} />
            <Button ariaLabel={`Remove ${m.name}`} onClick={() => void repo.removeMedication(m.id)}>
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
          void add()
        }}
      >
        <div className="row">
          <input aria-label="Medication name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input aria-label="Dose" placeholder="Dose" value={dose} onChange={(e) => setDose(e.target.value)} />
        </div>
        <input aria-label="Reminder times" placeholder="Times, e.g. 08:00, 20:00" value={times} onChange={(e) => setTimes(e.target.value)} />
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          Add
        </Button>
      </form>
      <SectionTitle>Last 7 days</SectionTitle>
      <div className="list">
        {[...(recent.data ?? [])].reverse().map((e) => (
          <button key={e.id} className="list-row" style={{ minHeight: 40 }} onClick={() => setEditing(e)}>
            <span className="muted small" style={{ width: 120 }}>
              {formatDay(localDayOf(e.ts, e.tz_offset_min))} {localTimeOf(e.ts, e.tz_offset_min)}
            </span>
            <span className="grow">
              {String(e.payload.name ?? '')} <span className="muted small">{String(e.payload.dose ?? '')}</span>
            </span>
          </button>
        ))}
      </div>
      {editing ? <LogSheet key={editing.id} entry={editing} open onClose={() => setEditing(null)} /> : null}
    </Screen>
  )
}
