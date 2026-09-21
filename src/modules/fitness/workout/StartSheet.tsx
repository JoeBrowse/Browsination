import { useNavigate } from 'react-router'
import { Button } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { EXERCISE_BY_ID } from '../data/exercises'
import { plannedSets, programmeNextIndex } from '../logic'
import type { ExerciseInput } from '../repo'
import { useFitnessRepo, useFitnessSettings } from '../useFitness'

/** Start a session: the programme's next day, a template, or an empty one. Two taps from the hub. */
export function StartSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const repo = useFitnessRepo()
  const settings = useFitnessSettings()
  const navigate = useNavigate()
  const q = useQuery(async () => ({ programme: await repo.activeProgramme(), templates: await repo.templates() }), ['programmes', 'workout_templates'])
  const unit = settings.data?.unit ?? 'kg'
  const startingSets = settings.data?.startingSets ?? 1
  const withPlanned = async (list: { id: string; name: string; muscle: string; variant?: string }[]): Promise<ExerciseInput[]> => {
    const out: ExerciseInput[] = []
    for (const e of list) {
      const last = await repo.lastFor(e.id)
      out.push({ exercise_id: e.id, name: e.variant ? `${e.name} (${e.variant})` : e.name, muscle: e.muscle, sets: plannedSets(last?.sets ?? null, startingSets) })
    }
    return out
  }
  const start = async (input: { split: string; programme_id?: string; day_key?: string; day_name?: string; exercises: ExerciseInput[] }) => {
    const w = await repo.startWorkout({ unit, ...input })
    onClose()
    navigate(`/m/fitness/workout/${w.id}`)
  }
  const programme = q.data?.programme
  const days = programme ? repo.programmeDays(programme) : []
  const next = programme && days.length ? days[programmeNextIndex(days, repo.programmeLog(programme))]! : null
  return (
    <Sheet open={open} onClose={onClose} title="Start">
      <div className="stack">
        {programme && next ? (
          <Button variant="primary" block onClick={() => void withPlanned(next.exercises).then((exercises) => start({ split: next.name, programme_id: programme.id, day_key: next.key, day_name: next.name, exercises }))}>
            {programme.name}: {next.name}
          </Button>
        ) : null}
        {(q.data?.templates ?? []).map((t) => (
          <Button key={t.id} block onClick={() => void withPlanned(repo.templateExercises(t).map((e) => ({ id: e.id, name: EXERCISE_BY_ID[e.id]?.name ?? e.id, muscle: e.muscle }))).then((exercises) => start({ split: t.name, exercises }))}>
            {t.name}
          </Button>
        ))}
        <Button block onClick={() => void start({ split: '', exercises: [] })}>
          Empty session
        </Button>
      </div>
    </Sheet>
  )
}
