import { useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { isModuleLocked, useLock } from '@/core/lock/lockStore'
import { describeEntry, type LogTypeDef } from '@/core/logs/types'
import { findLogType, getModules, moduleLogTypes } from '@/core/modules/registry'
import type { LogEntry } from '@/core/repos/logEntries'
import { formatDay, localDayOf, localTimeOf } from '@/core/time/localDay'
import { Button, EmptyState, ModuleScope, Screen, SectionTitle } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { LogSheet, type LogDraft } from '../logs/LogSheet'
import { useServices } from '../services'

const PAGE = 60

/** Everything ever logged, newest first. Tap any row to change it or move it to when it happened. */
export function HistoryScreen() {
  const s = useServices()
  const [module, setModule] = useState<string | null>(null)
  const [type, setType] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE)
  const [editing, setEditing] = useState<LogEntry | null>(null)
  const [adding, setAdding] = useState<LogDraft | null>(null)
  const [picking, setPicking] = useState(false)
  const q = useQuery(() => s.logs.recent({ module: module ?? undefined, type: type ?? undefined, limit }), ['log_entries'], [module, type, limit])
  const present = useQuery(() => s.logs.typesPresent(), ['log_entries'])
  // a locked module's entries stay out of here too, the same as on Today
  const lock = useLock()
  const hidden = new Set(getModules().filter((m) => isModuleLocked(lock, m)).map((m) => m.id as string))
  const shown = (m: string | null) => !m || !hidden.has(m)
  const entries = (q.data ?? []).filter((e) => shown(e.module))
  const rows = (present.data ?? []).filter((r) => shown(r.module))
  const modules = getModules().filter((m) => rows.some((r) => r.module === m.id))
  // only types with something in them: the filter is for finding an entry, not for browsing the schema
  const types = dedupe(rows.filter((r) => !module || r.module === module).flatMap((r) => findLogType(r.type) ?? []))
  const addable = moduleLogTypes().filter((d) => d.addable && shown(d.module === 'core' ? null : d.module))
  let lastDay = ''
  return (
    <Screen title="History">
      <Chips
        label="Module"
        value={module}
        onChange={(v) => {
          setModule(v)
          setType(null)
          setLimit(PAGE)
        }}
        options={[{ label: 'All', value: null }, ...modules.map((m) => ({ label: m.name, value: m.id as string | null }))]}
      />
      <div style={{ marginTop: 8 }}>
        <Chips
          label="Type"
          value={type}
          onChange={(v) => {
            setType(v)
            setLimit(PAGE)
          }}
          options={[{ label: 'All', value: null }, ...types.map((d) => ({ label: d.label, value: d.type as string | null }))]}
        />
      </div>
      <SectionTitle>
        Entries
        <Button onClick={() => setPicking(true)}>Add</Button>
      </SectionTitle>
      {!q.loading && entries.length === 0 ? <EmptyState>Nothing logged yet</EmptyState> : null}
      <div className="list">
        {entries.map((e) => {
          const def = findLogType(e.type)
          const day = localDayOf(e.ts, e.tz_offset_min)
          const header = day !== lastDay ? day : null
          lastDay = day
          const m = getModules().find((x) => x.id === e.module)
          return (
            <div key={e.id}>
              {header ? (
                <div className="sub muted" style={{ marginTop: 10 }}>
                  {formatDay(header)}
                </div>
              ) : null}
              <ModuleScope accent={m?.accent ?? 'var(--accent)'}>
                <button className="list-row" onClick={() => setEditing(e)}>
                  <span className="pill accent" style={{ minWidth: 52, justifyContent: 'center' }}>
                    {localTimeOf(e.ts, e.tz_offset_min)}
                  </span>
                  <div className="grow">
                    <div className="title">{def?.label ?? e.type}</div>
                    <div className="sub">{describeEntry(def, e) || (m ? m.name : '')}</div>
                  </div>
                </button>
              </ModuleScope>
            </div>
          )
        })}
      </div>
      {entries.length >= limit ? (
        <div className="btn-row" style={{ marginTop: 10 }}>
          <Button onClick={() => setLimit((n) => n + PAGE)}>More</Button>
        </div>
      ) : null}
      <Sheet open={picking} onClose={() => setPicking(false)} title="Log what">
        <div className="list">
          {addable.map((d) => (
            <button
              key={d.type}
              className="list-row"
              onClick={() => {
                setPicking(false)
                setAdding({ type: d.type, module: d.module })
              }}
            >
              <div className="grow">
                <div className="title">{d.label}</div>
                <div className="sub">{getModules().find((m) => m.id === d.module)?.name}</div>
              </div>
            </button>
          ))}
        </div>
      </Sheet>
      {editing ? <EntrySheet key={editing.id} entry={editing} onClose={() => setEditing(null)} /> : null}
      {adding ? <LogSheet key={`new:${adding.type}`} draft={adding} open onClose={() => setAdding(null)} /> : null}
    </Screen>
  )
}

/** A module's own sheet when it has one (a drink's grams follow its volume and ABV), else the generic editor. */
function EntrySheet({ entry, onClose }: { entry: LogEntry; onClose: () => void }) {
  const Editor = findLogType(entry.type)?.editor
  if (Editor) return <Editor entry={entry} open onClose={onClose} />
  return <LogSheet entry={entry} open onClose={onClose} />
}

/** One chip per type, whichever module wrote it. */
function dedupe(list: LogTypeDef[]): LogTypeDef[] {
  const seen = new Set<string>()
  return list.filter((d) => {
    if (seen.has(d.type)) return false
    seen.add(d.type)
    return true
  })
}
