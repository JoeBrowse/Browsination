import { Chips } from '@/app/tasks/fields'
import { useServices } from '@/app/services'
import type { Settings } from '@/core/settings/schema'
import { Card, Toggle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'

export function MoneySettings() {
  const s = useServices()
  const q = useQuery(() => s.settings.all(), ['settings'])
  const v = q.data
  if (!v) return null
  const set = <K extends keyof Settings>(k: K, value: Settings[K]) => void s.settings.set(k, value)
  return (
    <Card>
      <div className="stack" style={{ gap: 10 }}>
        <div className="row">
          <span className="grow">Check-in day of month</span>
          <input type="number" inputMode="numeric" min={1} max={28} aria-label="Check-in day" style={{ width: 90 }} defaultValue={v['money.checkInDay']} onBlur={(e) => {
            const n = Math.round(Number(e.target.value))
            if (n >= 1 && n <= 28) set('money.checkInDay', n)
          }} />
        </div>
        <div className="row">
          <span className="grow">Check-in in morning digest</span>
          <Toggle label="Check-in in morning digest" checked={v['money.checkInDigest']} onChange={(on) => set('money.checkInDigest', on)} />
        </div>
        <div className="row">
          <span className="grow">Card payment reminders</span>
          <Toggle label="Card payment reminders" checked={v['money.paymentReminders']} onChange={(on) => set('money.paymentReminders', on)} />
        </div>
        <div className="row">
          <span className="grow">Days ahead</span>
          <Chips label="Payment lead days" value={v['money.paymentLeadDays']} onChange={(n) => set('money.paymentLeadDays', n)} options={[1, 3, 7].map((n) => ({ label: String(n), value: n }))} />
        </div>
        <div className="row">
          <span className="grow">Reminder time</span>
          <input type="time" aria-label="Payment reminder time" style={{ width: 120 }} value={v['money.reminderTime']} onChange={(e) => set('money.reminderTime', e.target.value)} />
        </div>
      </div>
    </Card>
  )
}
