import { Chips } from '@/app/tasks/fields'
import type { Settings } from '@/core/settings/schema'
import { Card, Toggle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { useServices } from '../../services'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, value) => ({ label, value }))

/** When the weekly review is due and the focus timer defaults. */
export function ReviewSection() {
  const s = useServices()
  const q = useQuery(() => s.settings.all(), ['settings'])
  const v = q.data
  if (!v) return null
  const set = <K extends keyof Settings>(k: K, value: Settings[K]) => void s.settings.set(k, value)
  return (
    <Card>
      <div className="stack" style={{ gap: 10 }}>
        <div className="row">
          <span className="grow">Review day</span>
          <input type="time" aria-label="Review time" style={{ width: 120 }} value={v['review.time']} onChange={(e) => set('review.time', e.target.value)} />
        </div>
        <Chips label="Review day" value={v['review.day']} onChange={(d) => set('review.day', d)} options={DAYS} />
        <div className="row">
          <span className="grow">Review reminder</span>
          <Toggle label="Review reminder" checked={v['review.reminder']} onChange={(on) => set('review.reminder', on)} />
        </div>
        <div className="row">
          <span className="grow">Focus length</span>
          <Chips label="Focus minutes" value={v['focus.minutes']} onChange={(n) => set('focus.minutes', n)} options={[15, 25, 45, 60].map((n) => ({ label: `${n}`, value: n }))} />
        </div>
        <div className="row">
          <span className="grow">Break</span>
          <Chips label="Break minutes" value={v['focus.breakMinutes']} onChange={(n) => set('focus.breakMinutes', n)} options={[0, 5, 10].map((n) => ({ label: n ? `${n}` : 'None', value: n }))} />
        </div>
        <div className="row">
          <span className="grow">Focus end notification</span>
          <Toggle label="Focus end notification" checked={v['focus.endNotification']} onChange={(on) => set('focus.endNotification', on)} />
        </div>
      </div>
    </Card>
  )
}
