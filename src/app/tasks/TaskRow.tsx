import { Check, Repeat } from 'lucide-react'
import { describeRule, parseRule } from '@/core/recurrence/rrule'
import type { ItemRow } from '@/core/repos/items'
import { formatDay } from '@/core/time/localDay'

const PRIORITY = ['', 'low', 'normal', 'high']

export function TaskRow({ item, onOpen, onDone, showDue = true }: { item: ItemRow; onOpen: (item: ItemRow) => void; onDone?: (item: ItemRow) => void; showDue?: boolean }) {
  const rule = parseRule(item.recurrence)
  const bits: string[] = []
  if (showDue && item.due_date) bits.push(`${formatDay(item.due_date)}${item.due_time ? ` ${item.due_time}` : ''}`)
  if (item.status === 'waiting' && item.chase_date) bits.push(`chase ${formatDay(item.chase_date)}`)
  if (item.module) bits.push(item.module)
  if (item.priority >= 3) bits.push('high')
  else if (item.priority === 1) bits.push(PRIORITY[1]!)
  return (
    <div className="list-row task-row">
      {onDone ? (
        <button className="check" aria-label={`Done: ${item.title}`} onClick={() => onDone(item)}>
          <Check size={18} aria-hidden />
        </button>
      ) : null}
      <button className="grow task-body" onClick={() => onOpen(item)}>
        <div className="title">{item.title}</div>
        {bits.length || rule ? (
          <div className="sub">
            {bits.join(' · ')}
            {rule ? (
              <span className="pill" style={{ marginLeft: bits.length ? 6 : 0 }}>
                <Repeat size={12} aria-hidden /> {describeRule(rule)}
              </span>
            ) : null}
          </div>
        ) : null}
      </button>
    </div>
  )
}
