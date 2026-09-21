import { useServices } from '@/app/services'
import { activeGoals } from '../repos/savingsGoals'
import { useQuery } from './useQuery'

/** Select an active savings goal (or none). Renders nothing until at least one goal exists. */
export function GoalPicker({ value, onChange, label = 'Savings goal' }: { value: string | null; onChange: (id: string | null) => void; label?: string }) {
  const s = useServices()
  const q = useQuery(() => activeGoals(s.db), ['savings_goals'])
  const goals = q.data ?? []
  if (goals.length === 0 && !value) return null
  return (
    <select aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">No goal</option>
      {goals.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
      {value && !goals.some((g) => g.id === value) ? <option value={value}>(finished goal)</option> : null}
    </select>
  )
}
