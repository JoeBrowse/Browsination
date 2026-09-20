import { useEffect, useRef, useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { Button } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'

/** Countdown timer. Stop logs the minutes elapsed (at least one); finishing logs the full length. */
export function TimerSheet({ open, onClose, onDone, defaultMinutes }: { open: boolean; onClose: () => void; onDone: (minutes: number) => void; defaultMinutes: number }) {
  const [minutes, setMinutes] = useState(Math.max(1, Math.round(defaultMinutes)))
  const [left, setLeft] = useState<number | null>(null)
  const startedAt = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    startedAt.current = null
    setLeft(null)
  }
  useEffect(() => stop, [])
  useEffect(() => {
    if (!open) stop()
  }, [open])

  const start = () => {
    startedAt.current = Date.now()
    setLeft(minutes * 60)
    timer.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000)
      const remaining = minutes * 60 - elapsed
      if (remaining <= 0) {
        stop()
        onDone(minutes)
        onClose()
      } else setLeft(remaining)
    }, 500)
  }
  const stopAndLog = () => {
    const elapsedMin = Math.max(1, Math.round((Date.now() - (startedAt.current ?? Date.now())) / 60_000))
    stop()
    onDone(elapsedMin)
    onClose()
  }
  const mm = left !== null ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : null

  return (
    <Sheet open={open} onClose={onClose} title="Meditation">
      <div className="stack">
        {left === null ? (
          <>
            <Chips label="Minutes" value={minutes} onChange={setMinutes} options={[5, 10, 15, 20, 30].map((v) => ({ label: `${v}`, value: v }))} />
            <Button variant="primary" block onClick={start}>
              Start
            </Button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 56, fontWeight: 700, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
              {mm}
            </div>
            <Button block onClick={stopAndLog}>
              Stop
            </Button>
          </>
        )}
      </div>
    </Sheet>
  )
}
