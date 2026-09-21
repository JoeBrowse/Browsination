import { useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { Button } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { findExercises, MUSCLES, type ExerciseDef } from '../data/exercises'
import { useFitnessRepo } from '../useFitness'

/** Search the database (aliases included) or add a custom lift; tap a row to pick it. */
export function ExercisePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (e: ExerciseDef) => void }) {
  const repo = useFitnessRepo()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState<string>('Chest')
  const custom = useQuery(() => repo.customExercises(), ['fitness_exercises'])
  const extra: ExerciseDef[] = (custom.data ?? []).map((c) => ({ id: c.id, name: c.name, muscle: c.muscle, type: c.type, pattern: c.pattern, cue: c.cue }))
  const list = findExercises(q, extra).slice(0, 60)
  const addCustom = async () => {
    if (!name.trim()) return
    const row = await repo.addCustomExercise({ name, muscle })
    setName('')
    setAdding(false)
    onPick({ id: row.id, name: row.name, muscle: row.muscle, type: row.type, pattern: '', cue: '' })
  }
  return (
    <Sheet open={open} onClose={onClose} title="Exercise">
      <div className="stack">
        <input aria-label="Search exercises" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <div className="list" style={{ maxHeight: '48vh', overflow: 'auto' }}>
          {list.map((e) => (
            <button key={e.id} className="list-row" style={{ minHeight: 44 }} onClick={() => onPick(e)}>
              <span className="grow" style={{ textAlign: 'left' }}>
                {e.name}
              </span>
              <span className="muted small">{e.muscle}</span>
            </button>
          ))}
          {list.length === 0 ? <div className="muted small">No match</div> : null}
        </div>
        {adding ? (
          <div className="stack" style={{ gap: 8 }}>
            <input aria-label="Custom exercise name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Chips label="Muscle" value={muscle} onChange={setMuscle} options={[...MUSCLES, 'Other'].map((m) => ({ label: m, value: m }))} />
            <div className="btn-row">
              <Button onClick={() => setAdding(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => void addCustom()} disabled={!name.trim()}>
                Add
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setAdding(true)}>New exercise</Button>
        )}
      </div>
    </Sheet>
  )
}
