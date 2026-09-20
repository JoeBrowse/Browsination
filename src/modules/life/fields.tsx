import { useEffect, useState } from 'react'
import { parsePounds, pounds } from './logic'

/** Pounds in, pence out. Keeps the text while typing; commits on blur or Enter. */
export function MoneyInput({ value, onChange, label, placeholder = '£' }: { value: number | null; onChange: (pence: number | null) => void; label: string; placeholder?: string }) {
  const [text, setText] = useState(value === null ? '' : (value / 100).toFixed(2))
  useEffect(() => setText(value === null ? '' : (value / 100).toFixed(2)), [value])
  return (
    <input
      inputMode="decimal"
      aria-label={label}
      placeholder={placeholder}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onChange(parsePounds(text))}
      onKeyDown={(e) => e.key === 'Enter' && onChange(parsePounds(text))}
    />
  )
}

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
        <input aria-label="Birthday month and day" placeholder="MM-DD" value={md} onChange={(e) => onChange(/^\d{2}-\d{2}$/.test(e.target.value) ? `--${e.target.value}` : `--${e.target.value}`)} />
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
