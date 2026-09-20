import { pounds } from '@/core/ui/format'

export { MoneyInput } from '@/core/ui/MoneyInput'

export function Money({ pence }: { pence: number | null | undefined }) {
  return <span>{pounds(pence)}</span>
}

/** Birthday input: date, or month-day when the year is unknown. Stores 'YYYY-MM-DD' or '--MM-DD'. */
export function BirthdayInput({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const unknownYear = value?.startsWith('--') ?? false
  const dateValue = value && !unknownYear ? value : ''
  const md = unknownYear ? value!.slice(2) : ''
  return (
    <div className="stack" style={{ gap: 6 }}>
      {unknownYear ? (
        <input aria-label="Birthday month and day" placeholder="MM-DD" value={md} onChange={(e) => onChange(`--${e.target.value}`)} />
      ) : (
        <input type="date" aria-label="Birthday" value={dateValue} onChange={(e) => onChange(e.target.value || null)} />
      )}
      <label className="row small" style={{ minHeight: 32 }}>
        <input type="checkbox" checked={unknownYear} onChange={(e) => onChange(e.target.checked ? `--${(dateValue || '2000-01-01').slice(5)}` : null)} style={{ width: 20, height: 20 }} />
        <span>Year unknown</span>
      </label>
    </div>
  )
}
