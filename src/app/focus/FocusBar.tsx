import { useEffect, useState } from 'react'
import { endsAt, remainingLabel, useFocus } from '@/core/focus/focusStore'
import { Button } from '@/core/ui/primitives'
import { useFocusSession } from './useFocusSession'

/** Sits above the tab bar while a focus session runs: what, how long left, Stop. Renders nothing otherwise. */
export function FocusBar() {
  const session = useFocus((f) => f.session)
  return session ? <RunningBar /> : null
}

function RunningBar() {
  const { session, stop } = useFocusSession()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!session) return null
  const over = now >= endsAt(session)
  return (
    <div className="focus-bar" role="status">
      <span className="pill accent">{over ? 'Done' : remainingLabel(session, now)}</span>
      <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {session.title}
      </span>
      <Button onClick={() => void stop()}>{over ? 'Log' : 'Stop'}</Button>
    </div>
  )
}
