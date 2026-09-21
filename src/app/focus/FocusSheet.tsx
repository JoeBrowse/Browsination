import { useEffect, useState } from 'react'
import { remainingLabel } from '@/core/focus/focusStore'
import type { ItemRow } from '@/core/repos/items'
import { Button } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { useServices } from '../services'
import { Chips } from '../tasks/fields'
import { useFocusSession } from './useFocusSession'

/** Pomodoro-style timer for one item. Time is logged as a `focus` entry when it stops. */
export function FocusSheet({ open, onClose, item, onStarted }: { open: boolean; onClose: () => void; item: Pick<ItemRow, 'id' | 'title' | 'module'> | null; onStarted?: () => void }) {
  const s = useServices()
  const { session, start, stop } = useFocusSession()
  const defaults = useQuery(() => s.settings.get('focus.minutes'), ['settings'])
  const [minutes, setMinutes] = useState<number | null>(null)
  const [, tick] = useState(0)
  useEffect(() => {
    if (!open || !session) return
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [open, session])
  const chosen = minutes ?? defaults.data ?? 25
  return (
    <Sheet open={open} onClose={onClose} title="Focus">
      <div className="stack">
        {session ? (
          <>
            <div className="muted small">{session.title}</div>
            <div className="big" style={{ fontSize: 44, textAlign: 'center' }} aria-live="off">
              {remainingLabel(session)}
            </div>
            <div className="btn-row">
              <Button onClick={onClose}>Hide</Button>
              <Button
                variant="primary"
                onClick={() => {
                  void stop()
                  onClose()
                }}
              >
                Stop
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="muted small">{item?.title ?? 'No item'}</div>
            <Chips label="Focus minutes" value={chosen} onChange={setMinutes} options={[15, 25, 45, 60].map((n) => ({ label: `${n} min`, value: n }))} />
            <div className="btn-row">
              <Button onClick={onClose}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  void start(item, chosen)
                  onClose()
                  onStarted?.()
                }}
              >
                Start
              </Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}
