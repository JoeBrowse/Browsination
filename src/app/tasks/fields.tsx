import { getModules } from '@/core/modules/registry'
import { PRESETS, formatRule, parseRule, type Rule } from '@/core/recurrence/rrule'
import type { RecurFrom } from '@/core/repos/items'
import { addDays, calendarDay, formatDay, type LocalDay } from '@/core/time/localDay'
import { weekday } from '@/core/recurrence/rrule'

export function Chips<T extends string | number | null>({
  options,
  value,
  onChange,
  label,
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" className={`chip${o.value === value ? ' on' : ''}`} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function nextMonday(from: LocalDay): LocalDay {
  const w = weekday(from)
  return addDays(from, 7 - w)
}

export function DueDateField({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const today = calendarDay()
  const quick = [
    { label: 'None', value: null },
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
    { label: 'Next Mon', value: nextMonday(today) },
  ]
  const isQuick = quick.some((q) => q.value === value)
  return (
    <div className="stack" style={{ gap: 6 }}>
      <Chips label="Due" options={quick} value={isQuick ? value : ('custom' as unknown as null)} onChange={onChange} />
      <input type="date" aria-label="Due date" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} />
      {value ? <div className="muted small">{formatDay(value)}</div> : null}
    </div>
  )
}

export function PriorityField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Chips
      label="Priority"
      value={value}
      onChange={onChange}
      options={[
        { label: 'None', value: 0 },
        { label: 'Low', value: 1 },
        { label: 'Normal', value: 2 },
        { label: 'High', value: 3 },
      ]}
    />
  )
}

export function ModuleField({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const options = [{ label: 'None', value: null as string | null }, ...getModules().map((m) => ({ label: m.name, value: m.id as string }))]
  return <Chips label="Module" options={options} value={value} onChange={onChange} />
}

export function RecurrenceField({
  recurrence,
  recurFrom,
  onChange,
}: {
  recurrence: string | null
  recurFrom: RecurFrom
  onChange: (recurrence: string | null, recurFrom: RecurFrom) => void
}) {
  const rule = parseRule(recurrence)
  const every = rule?.freq === 'DAILY' && rule.interval > 1
  const current = every ? 'every' : (PRESETS.find((p) => (p.rule ? formatRule(p.rule) : null) === (rule ? formatRule(rule) : null))?.label ?? 'custom')
  const options = [...PRESETS.map((p) => ({ label: p.label, value: p.label })), { label: 'Every N days', value: 'every' }]
  const pick = (label: string) => {
    if (label === 'every') return onChange(formatRule({ freq: 'DAILY', interval: 2 }), recurFrom)
    const preset = PRESETS.find((p) => p.label === label)
    onChange(preset?.rule ? formatRule(preset.rule) : null, recurFrom)
  }
  return (
    <div className="stack" style={{ gap: 6 }}>
      <Chips label="Repeat" options={options} value={current} onChange={pick} />
      {every ? (
        <div className="row">
          <span>Every</span>
          <input
            type="number"
            min={2}
            max={365}
            aria-label="Interval days"
            style={{ width: 90 }}
            value={rule.interval}
            onChange={(e) => onChange(formatRule({ freq: 'DAILY', interval: Math.max(2, Number(e.target.value) || 2) } satisfies Rule), recurFrom)}
          />
          <span>days</span>
        </div>
      ) : null}
      {rule ? (
        <Chips
          label="Repeat from"
          value={recurFrom}
          onChange={(v) => onChange(recurrence, v)}
          options={[
            { label: 'From due date', value: 'due' as RecurFrom },
            { label: 'From completion', value: 'done' as RecurFrom },
          ]}
        />
      ) : null}
    </div>
  )
}
