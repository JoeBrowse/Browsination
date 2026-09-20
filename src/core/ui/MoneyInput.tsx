import { useEffect, useState } from 'react'
import { parsePounds } from './format'

/** Pounds in, pence out. Commits on every keystroke; the text is only replaced when the value changes elsewhere. */
export function MoneyInput({ value, onChange, label, placeholder = '£' }: { value: number | null; onChange: (pence: number | null) => void; label: string; placeholder?: string }) {
  const [text, setText] = useState(value === null ? '' : (value / 100).toFixed(2))
  useEffect(() => {
    // Sync from the outside only when the value moves; `text` is deliberately not a dependency.
    if (parsePounds(text) !== value) setText(value === null ? '' : (value / 100).toFixed(2))
  }, [value])
  return (
    <input
      inputMode="decimal"
      aria-label={label}
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        onChange(parsePounds(e.target.value))
      }}
    />
  )
}
