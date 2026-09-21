import { useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { formatDay } from '@/core/time/localDay'
import { Button, Card, EmptyState, Screen, SectionTitle } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { EXERCISE_BY_ID } from '../data/exercises'
import { PROGRAMME_LENGTHS, PROGRAMME_PRESETS, type ProgrammePreset } from '../data/presets'
import { programmeNextIndex, programmeWeek, type ProgrammeDay } from '../logic'
import { useFitnessRepo } from '../useFitness'

/** One active block at a time, built from a preset; finished blocks stay listed. */
export function ProgrammesScreen() {
  const repo = useFitnessRepo()
  const [preset, setPreset] = useState<ProgrammePreset | null>(null)
  const [confirm, setConfirm] = useState(false)
  const q = useQuery(() => repo.programmes(), ['programmes'])
  const active = (q.data ?? []).find((p) => p.status === 'active') ?? null
  const finished = (q.data ?? []).filter((p) => p.status !== 'active')
  const days = active ? repo.programmeDays(active) : []
  const log = active ? repo.programmeLog(active) : []
  const planned = active ? active.weeks * days.length : 0
  const next = days.length ? days[programmeNextIndex(days, log)] : null
  return (
    <Screen title="Programmes">
      {active ? (
        <Card>
          <div className="kv">
            <span className="title">{active.name}</span>
            <span className="muted small">week {programmeWeek(active.created_at, log, active.weeks, Date.now())} of {active.weeks}</span>
          </div>
          <div className="progress" aria-label={`${log.length} of ${planned} sessions`}>
            <div style={{ width: `${planned ? Math.min(100, (log.length / planned) * 100) : 0}%` }} />
          </div>
          <div className="kv small">
            <span className="muted">Sessions</span>
            <span>
              {log.length} of {planned}
            </span>
          </div>
          {next ? (
            <div className="kv small">
              <span className="muted">Next</span>
              <span>{next.name}</span>
            </div>
          ) : null}
          <div className="stack" style={{ gap: 4, marginTop: 6 }}>
            {days.map((d) => (
              <div key={d.key} className="small">
                <span className="pill" style={{ marginRight: 6 }}>
                  {d.name}
                </span>
                <span className="muted">{d.exercises.map((e) => e.name).join(', ')}</span>
              </div>
            ))}
          </div>
          <div className="btn-row" style={{ marginTop: 10 }}>
            <Button onClick={() => (confirm ? void repo.finishProgramme(active.id, log.length < planned) : setConfirm(true))}>{confirm ? 'Really end it' : log.length >= planned ? 'Finish block' : 'End early'}</Button>
          </div>
        </Card>
      ) : (
        <>
          <SectionTitle>Start a block</SectionTitle>
          <div className="list">
            {PROGRAMME_PRESETS.filter((p) => p.days.length).map((p) => (
              <button key={p.key} className="list-row" style={{ minHeight: 44 }} onClick={() => setPreset(p)}>
                <div className="grow" style={{ textAlign: 'left' }}>
                  <div>{p.name}</div>
                  <div className="sub">{p.blurb}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      {finished.length ? (
        <>
          <SectionTitle>Finished</SectionTitle>
          <div className="list" style={{ opacity: 0.8 }}>
            {finished.map((p) => (
              <div key={p.id} className="list-row" style={{ minHeight: 44 }}>
                <div className="grow">
                  <div>{p.name}</div>
                  <div className="sub">
                    {repo.programmeLog(p).length} sessions{p.finished_at ? ` · ${formatDay(p.finished_at.slice(0, 10))}` : ''}
                    {p.ended_early ? ' · ended early' : ''}
                  </div>
                </div>
                <Button ariaLabel={`Remove ${p.name}`} onClick={() => void repo.removeProgramme(p.id)}>
                  ×
                </Button>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {!active && q.data && q.data.length === 0 ? <EmptyState>Pick a preset above</EmptyState> : null}
      <PresetSheet preset={preset} onClose={() => setPreset(null)} />
    </Screen>
  )
}

function PresetSheet({ preset, onClose }: { preset: ProgrammePreset | null; onClose: () => void }) {
  const repo = useFitnessRepo()
  const [weeks, setWeeks] = useState(6)
  const [name, setName] = useState('')
  if (!preset) return null
  const create = async () => {
    const days: ProgrammeDay[] = preset.days.map((d, i) => ({
      key: `d${i}`,
      name: d.name,
      muscles: d.muscles,
      exercises: d.exercises.map((e) => {
        const def = EXERCISE_BY_ID[e.id]
        return { id: e.id, name: def?.name ?? e.id, muscle: def?.muscle ?? d.muscles[0] ?? 'Other', type: def?.type, variant: e.variant }
      }),
    }))
    await repo.addProgramme({ name: name.trim() || preset.name, preset_key: preset.key, weeks, days })
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title={preset.name}>
      <div className="stack">
        <div className="muted small">{preset.blurb}</div>
        <input aria-label="Programme name" placeholder={preset.name} value={name} onChange={(e) => setName(e.target.value)} />
        <Chips label="Weeks" value={weeks} onChange={setWeeks} options={PROGRAMME_LENGTHS.map((l) => ({ label: l.label, value: l.weeks }))} />
        <div className="stack" style={{ gap: 4 }}>
          {preset.days.map((d) => (
            <div key={d.name} className="small">
              <span className="pill" style={{ marginRight: 6 }}>
                {d.name}
              </span>
              <span className="muted">{d.exercises.map((e) => EXERCISE_BY_ID[e.id]?.name ?? e.id).join(', ')}</span>
            </div>
          ))}
        </div>
        <div className="btn-row">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void create()}>
            Start
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
