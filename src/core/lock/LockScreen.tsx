import { Delete, Fingerprint } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useServices } from '@/app/services'
import { biometricAuthenticate, biometricAvailable } from '../platform/biometric'
import { verifyPin } from './pin'
import { useLock } from './lockStore'

const MAX_TRIES = 5
const COOL_OFF_MS = 30_000

/** Opaque PIN pad. Submits on the last digit; a fingerprint button appears when biometry is on and available. */
export function LockScreen({ title = 'Locked' }: { title?: string }) {
  const s = useServices()
  const lock = useLock()
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(0)
  const [coolUntil, setCoolUntil] = useState<number | null>(null)
  const [bio, setBio] = useState(false)
  const busy = useRef(false)
  const length = useRef(4)
  // Digits arrive faster than React re-renders (hardware keyboard, tests), so the ref is the source of truth.
  const pinRef = useRef('')
  const setDigits = (next: string) => {
    pinRef.current = next
    setPin(next)
  }

  useEffect(() => {
    let live = true
    void s.settings.get('lock.pin').then((rec) => {
      if (live && rec) length.current = rec.length
    })
    if (lock.biometric) {
      void biometricAvailable().then((ok) => {
        if (!live || !ok) return
        setBio(true)
        void biometricAuthenticate('Unlock Browsination').then((yes) => live && yes && lock.unlock())
      })
    }
    return () => {
      live = false
    }
  }, [s.settings, lock.biometric, lock.unlock])

  const submit = async (candidate: string) => {
    if (busy.current) return
    busy.current = true
    try {
      const rec = await s.settings.get('lock.pin')
      if (rec && (await verifyPin(candidate, rec))) {
        lock.unlock()
        return
      }
      setDigits('')
      setWrong((n) => {
        const next = n + 1
        if (next >= MAX_TRIES) {
          setCoolUntil(Date.now() + COOL_OFF_MS)
          return 0
        }
        return next
      })
    } finally {
      busy.current = false
    }
  }
  const press = (d: string) => {
    if (coolUntil && Date.now() < coolUntil) return
    if (coolUntil) setCoolUntil(null)
    const next = (pinRef.current + d).slice(0, 8)
    setDigits(next)
    if (next.length >= length.current) void submit(next)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') setDigits(pinRef.current.slice(0, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  const cooling = coolUntil !== null && Date.now() < coolUntil

  return (
    <div className="lock" role="dialog" aria-label={title}>
      <div className="lock-title">{title}</div>
      <div className="lock-dots" aria-label={`${pin.length} digits entered`}>
        {Array.from({ length: Math.max(length.current, pin.length) }, (_, i) => (
          <span key={i} className={i < pin.length ? 'on' : ''} />
        ))}
      </div>
      <div className="muted small" style={{ minHeight: 20 }}>
        {cooling ? 'Wait 30 seconds' : wrong ? 'Wrong PIN' : ''}
      </div>
      <div className="lock-pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => press(d)} aria-label={`Digit ${d}`}>
            {d}
          </button>
        ))}
        {bio ? (
          <button aria-label="Unlock with biometrics" onClick={() => void biometricAuthenticate('Unlock Browsination').then((ok) => ok && lock.unlock())}>
            <Fingerprint size={26} aria-hidden />
          </button>
        ) : (
          <span />
        )}
        <button onClick={() => press('0')} aria-label="Digit 0">
          0
        </button>
        <button aria-label="Delete digit" onClick={() => setDigits(pinRef.current.slice(0, -1))}>
          <Delete size={24} aria-hidden />
        </button>
      </div>
    </div>
  )
}
