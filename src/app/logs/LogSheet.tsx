import { useState } from 'react'
import { findLogType } from '@/core/modules/registry'
import type { LogEntry } from '@/core/repos/logEntries'
import { localDayOf, logDayRange } from '@/core/time/localDay'
import { Button } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useServices } from '../services'
import { stampOf, WhenField, whenNow, whenOf, type When } from './WhenField'

export interface LogDraft {
  type: string
  module?: string | null
  value?: number | null
  unit?: string | null
  payload?: Record<string, unknown>
  entity_type?: string | null
  entity_id?: string | null
}

const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v))

/** One-per-day types change the day's entry instead of adding a second one. */
async function entryOnDay(s: ReturnType<typeof useServices>, type: string, stamp: { ts: string; tz_offset_min: number }): Promise<LogEntry | null> {
  const dayStartHour = await s.settings.get('dayStartHour')
  const r = logDayRange(localDayOf(stamp.ts, stamp.tz_offset_min, dayStartHour), dayStartHour)
  return (await s.logs.listByType(type, r.from, r.to))[0] ?? null
}

/**
 * Edits any log entry, whatever module wrote it: when it happened, its number, the text it carries.
 * The same sheet adds one, so anything can be logged after the fact.
 */
export function LogSheet({ entry, draft, open, onClose }: { entry?: LogEntry | null; draft?: LogDraft; open: boolean; onClose: () => void }) {
  const s = useServices()
  const type = entry?.type ?? draft?.type ?? ''
  const def = findLogType(type)
  const [when, setWhen] = useState<When>(entry ? whenOf(entry) : whenNow())
  const [value, setValue] = useState<string>(entry?.value != null ? String(entry.value) : '')
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const src = entry?.payload ?? draft?.payload ?? {}
    return Object.fromEntries((def?.fields ?? []).map((f) => [f.key, src[f.key] == null ? '' : String(src[f.key])]))
  })
  const save = async () => {
    const stamp = stampOf(when)
    const payload = { ...(entry?.payload ?? draft?.payload ?? {}) }
    for (const f of def?.fields ?? []) {
      const raw = fields[f.key] ?? ''
      if (raw === '') delete payload[f.key]
      else payload[f.key] = f.kind === 'number' ? Number(raw) : raw
    }
    const num = def?.value ? numOrNull(value) : (entry?.value ?? draft?.value ?? 1)
    const target = entry ?? (def?.daily ? await entryOnDay(s, type, stamp) : null)
    if (target) await s.logs.update(target.id, { ...stamp, value: num, payload: { ...target.payload, ...payload } })
    else await s.logs.add({ type, module: draft?.module ?? (def?.module === 'core' ? null : def?.module) ?? null, ...stamp, value: num, unit: draft?.unit ?? null, payload, entity_type: draft?.entity_type ?? null, entity_id: draft?.entity_id ?? null })
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={def?.label ?? type}>
      <div className="stack">
        <WhenField value={when} onChange={setWhen} />
        {def?.value ? (
          <div className="stack">
            <span className="sub">{[def.value.label, def.value.unit].filter(Boolean).join(' · ')}</span>
            <input type="number" inputMode="decimal" aria-label={def.value.label} value={value} step={def.value.step ?? 1} min={def.value.min} max={def.value.max} onChange={(e) => setValue(e.target.value)} />
          </div>
        ) : null}
        {(def?.fields ?? []).map((f) => (
          <div key={f.key} className="stack">
            <span className="sub">{f.label}</span>
            <input aria-label={f.label} type={f.kind === 'number' ? 'number' : 'text'} value={fields[f.key] ?? ''} onChange={(e) => setFields((x) => ({ ...x, [f.key]: e.target.value }))} />
          </div>
        ))}
        <div className="btn-row">
          <Button variant="primary" onClick={() => void save()}>
            Save
          </Button>
          {entry ? (
            <Button
              variant="danger"
              onClick={() => {
                void s.logs.remove(entry.id)
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
