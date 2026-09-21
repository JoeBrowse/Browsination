import { useEffect, useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { hashPin, isValidPin, verifyPin } from '@/core/lock/pin'
import type { LockMode } from '@/core/lock/lockStore'
import { biometricAuthenticate, biometricAvailable } from '@/core/platform/biometric'
import type { Settings } from '@/core/settings/schema'
import { Button, Card, Toggle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { useServices } from '../../services'
import { toast } from '../../shellStore'

const MODES: { label: string; value: LockMode }[] = [
  { label: 'Off', value: 'off' },
  { label: 'Money', value: 'money' },
  { label: 'Whole app', value: 'app' },
]
const GRACE = [
  { label: 'Straight away', value: 0 },
  { label: '1 min', value: 60 },
  { label: '5 min', value: 300 },
  { label: '15 min', value: 900 },
]

/** PIN (hashed) plus optional biometrics. Changing anything here needs the current PIN or a biometric pass. */
export function LockSection() {
  const s = useServices()
  const q = useQuery(() => s.settings.all(), ['settings'])
  const [verified, setVerified] = useState(false)
  const [current, setCurrent] = useState('')
  const [pending, setPending] = useState<LockMode | null>(null)
  const [pin1, setPin1] = useState('')
  const [pin2, setPin2] = useState('')
  const [editingPin, setEditingPin] = useState(false)
  const [bio, setBio] = useState(false)
  useEffect(() => {
    void biometricAvailable().then(setBio)
  }, [])
  const v = q.data
  if (!v) return null
  const set = <K extends keyof Settings>(k: K, value: Settings[K]) => void s.settings.set(k, value)
  const rec = v['lock.pin']
  const gate = rec !== null && !verified

  const verify = async () => {
    if (rec && (await verifyPin(current, rec))) setVerified(true)
    else toast('Wrong PIN')
    setCurrent('')
  }
  const savePin = async () => {
    if (!isValidPin(pin1) || pin1 !== pin2) return
    set('lock.pin', await hashPin(pin1))
    if (pending) set('lock.mode', pending)
    setPending(null)
    setPin1('')
    setPin2('')
    setEditingPin(false)
    setVerified(true)
    toast('PIN set')
  }
  const chooseMode = (mode: LockMode) => {
    if (mode !== 'off' && rec === null) {
      setPending(mode)
      setEditingPin(true)
      return
    }
    set('lock.mode', mode)
  }
  const removePin = () => {
    set('lock.mode', 'off')
    set('lock.pin', null)
    set('lock.biometric', false)
    setVerified(false)
  }
  const pinField = (label: string, value: string, onChange: (t: string) => void) => (
    <input type="password" inputMode="numeric" pattern="\d*" autoComplete="off" aria-label={label} placeholder={label} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 8))} style={{ width: 150 }} />
  )

  if (gate)
    return (
      <Card>
        <div className="row">
          <span className="grow">Current PIN</span>
          {pinField('Current PIN', current, setCurrent)}
          <Button onClick={() => void verify()} disabled={!current}>
            Verify
          </Button>
        </div>
        {bio && v['lock.biometric'] ? <Button onClick={() => void biometricAuthenticate('Change lock settings').then((ok) => ok && setVerified(true))}>Use biometrics</Button> : null}
      </Card>
    )

  return (
    <Card>
      <div className="stack" style={{ gap: 10 }}>
        <Chips label="Lock mode" value={pending ?? v['lock.mode']} onChange={chooseMode} options={MODES} />
        {editingPin ? (
          <div className="stack" style={{ gap: 8 }}>
            <div className="row">
              {pinField('New PIN', pin1, setPin1)}
              {pinField('Repeat PIN', pin2, setPin2)}
            </div>
            <div className="btn-row">
              <Button
                onClick={() => {
                  setEditingPin(false)
                  setPending(null)
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={() => void savePin()} disabled={!isValidPin(pin1) || pin1 !== pin2}>
                Save PIN
              </Button>
            </div>
            <div className="muted small">4 to 8 digits. The data itself is not encrypted; a forgotten PIN means clearing the app data (export first), unless biometrics are on.</div>
          </div>
        ) : (
          <div className="row">
            <span className="grow">PIN</span>
            <Button onClick={() => setEditingPin(true)}>{rec ? 'Change' : 'Set'}</Button>
            {rec ? <Button onClick={removePin}>Remove</Button> : null}
          </div>
        )}
        {rec && bio ? (
          <div className="row">
            <span className="grow">Biometrics</span>
            <Toggle label="Unlock with biometrics" checked={v['lock.biometric']} onChange={(on) => set('lock.biometric', on)} />
          </div>
        ) : null}
        {rec ? (
          <div className="row">
            <span className="grow">Re-lock after</span>
            <Chips label="Re-lock after" value={v['lock.graceSeconds']} onChange={(n) => set('lock.graceSeconds', n)} options={GRACE} />
          </div>
        ) : null}
      </div>
    </Card>
  )
}
