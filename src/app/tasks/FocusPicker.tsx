import type { ItemRow } from '@/core/repos/items'
import { formatDay, type LocalDay } from '@/core/time/localDay'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { useServices } from '../services'

export const FOCUS_CAP = 5

/** Pick up to five open items for today. Tapping toggles immediately. */
export function FocusPicker({ open, onClose, today }: { open: boolean; onClose: () => void; today: LocalDay }) {
  const s = useServices()
  const q = useQuery(() => s.tasks.open(), ['items'])
  const items = q.data ?? []
  const chosen = items.filter((i) => i.focus_date === today)
  const toggle = async (i: ItemRow) => {
    const on = i.focus_date === today
    if (!on && chosen.length >= FOCUS_CAP) return
    await s.tasks.setFocus(i.id, on ? null : today)
  }
  return (
    <Sheet open={open} onClose={onClose} title={`Focus ${chosen.length}/${FOCUS_CAP}`}>
      <div className="list">
        {items.map((i) => {
          const on = i.focus_date === today
          return (
            <button key={i.id} className="list-row" onClick={() => void toggle(i)} aria-pressed={on} disabled={!on && chosen.length >= FOCUS_CAP}>
              <input type="checkbox" readOnly checked={on} tabIndex={-1} aria-hidden />
              <div className="grow">
                <div className="title">{i.title}</div>
                {i.due_date ? <div className="sub">{formatDay(i.due_date)}</div> : null}
              </div>
            </button>
          )
        })}
        {!q.loading && items.length === 0 ? <div className="empty">Nothing open</div> : null}
      </div>
    </Sheet>
  )
}
