import { useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { useServices } from '@/app/services'
import { toast } from '@/app/shellStore'
import { createSnapshot } from '@/core/backup/snapshots'
import { pickTextFile } from '@/core/platform/exportTransport'
import type { Settings } from '@/core/settings/schema'
import { Button, Card } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { RECOVERY_PACES } from './data/recovery'
import { applyImport, loadExisting } from './import/apply'
import { IronLogImportError, parseBackup, planImport, summarise, type ImportPlan } from './import/ironlog'
import { useFitnessRepo } from './useFitness'

export function FitnessSettings() {
  const s = useServices()
  const repo = useFitnessRepo()
  const q = useQuery(() => s.settings.all(), ['settings'])
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [busy, setBusy] = useState(false)
  const v = q.data
  if (!v) return null
  const set = <K extends keyof Settings>(k: K, value: Settings[K]) => void s.settings.set(k, value)
  const pick = async () => {
    const text = await pickTextFile()
    if (!text) return
    try {
      const backup = parseBackup(text)
      setPlan(planImport(backup, await loadExisting(repo)))
    } catch (e) {
      toast(e instanceof IronLogImportError ? e.message : 'Could not read that file')
    }
  }
  const run = async () => {
    if (!plan) return
    setBusy(true)
    try {
      await createSnapshot(s.db, s.files, 'pre-import', s.appVersion)
      const done = await applyImport(repo, s.settings, plan)
      toast(`Imported ${done.workouts} sessions`)
      setPlan(null)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }
  const summary = plan ? summarise(plan) : null
  return (
    <Card>
      <div className="stack" style={{ gap: 10 }}>
        <div className="row">
          <span className="grow">Unit</span>
          <Chips label="Weight unit" value={v['fitness.weightUnit']} onChange={(u) => set('fitness.weightUnit', u)} options={[{ label: 'kg', value: 'kg' as const }, { label: 'lb', value: 'lb' as const }]} />
        </div>
        <div className="row">
          <span className="grow">Sets to start with</span>
          <Chips label="Starting sets" value={v['fitness.startingSets']} onChange={(n) => set('fitness.startingSets', n)} options={[1, 2, 3].map((n) => ({ label: `${n}`, value: n }))} />
        </div>
        <div className="row">
          <span className="grow">Recovery pace</span>
          <Chips label="Recovery pace" value={v['fitness.recoveryPace']} onChange={(p) => set('fitness.recoveryPace', p)} options={RECOVERY_PACES.map((p) => ({ label: p.label, value: p.value }))} />
        </div>
        <div className="row">
          <span className="grow">Weight goal ({v['fitness.weightUnit']})</span>
          <input type="number" inputMode="decimal" step="0.5" aria-label="Weight goal" style={{ width: 110 }} defaultValue={v['fitness.weightGoal'] ?? ''} onBlur={(e) => set('fitness.weightGoal', e.target.value ? Number(e.target.value) : null)} />
        </div>
        <div className="row">
          <span className="grow">Nudge after days off</span>
          <Chips label="Nudge days" value={v['fitness.nudgeDays']} onChange={(n) => set('fitness.nudgeDays', n)} options={[0, 2, 3, 5, 7].map((n) => ({ label: n === 0 ? 'Off' : `${n}`, value: n }))} />
        </div>
        <Button onClick={() => void pick()}>Import Iron Log backup</Button>
      </div>
      <Sheet open={plan !== null} onClose={() => setPlan(null)} title="Iron Log import">
        {plan && summary ? (
          <div className="stack" style={{ gap: 8 }}>
            <div className="muted small">Dry run. Nothing has been written yet.</div>
            {(
              [
                ['Sessions', summary.workouts],
                ['Sets', summary.sets],
                ['Unfinished session', summary.inProgress],
                ['Weigh-ins', summary.bodyweights],
                ['Activities', summary.activities],
                ['Programmes', summary.programmes],
                ['Templates', summary.templates],
                ['Custom exercises', summary.customExercises],
                ['Records', summary.records],
                ['Targets', summary.goals],
              ] as [string, number][]
            ).map(([label, n]) => (
              <div key={label} className="kv" style={{ minHeight: 28 }}>
                <span>{label}</span>
                <span className="pill">{n}</span>
              </div>
            ))}
            {plan.skipped.workouts + plan.skipped.programmes + plan.skipped.templates + plan.skipped.activities + plan.skipped.inProgress > 0 ? (
              <div className="muted small">
                Already here, skipped: {plan.skipped.workouts} sessions, {plan.skipped.programmes} programmes, {plan.skipped.templates} templates, {plan.skipped.activities} activities{plan.skipped.inProgress ? ', the unfinished session' : ''}
              </div>
            ) : null}
            {plan.warnings.length ? <div className="small">{[...new Set(plan.warnings)].slice(0, 12).join(' · ')}</div> : null}
            {plan.ignoredKeys.length ? <div className="muted small">Not imported: {plan.ignoredKeys.join(', ')}</div> : null}
            <div className="btn-row">
              <Button onClick={() => setPlan(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => void run()} disabled={busy}>
                {busy ? 'Importing…' : 'Import (snapshot first)'}
              </Button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </Card>
  )
}
