import { Chips } from '@/app/tasks/fields'
import { useServices } from '@/app/services'
import type { Settings } from '@/core/settings/schema'
import { Card, Toggle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'

export function WorkSettings() {
  const s = useServices()
  const q = useQuery(() => s.settings.all(), ['settings'])
  const v = q.data
  if (!v) return null
  const set = <K extends keyof Settings>(k: K, value: Settings[K]) => void s.settings.set(k, value)
  return (
    <Card>
      <div className="stack" style={{ gap: 10 }}>
        <div className="row">
          <span className="grow">Key dates on Today</span>
          <Chips label="Key date lead days" value={v['work.leadDays']} onChange={(n) => set('work.leadDays', n)} options={[0, 3, 7, 14].map((n) => ({ label: n === 0 ? 'Off' : `${n}d`, value: n }))} />
        </div>
        <div className="row">
          <span className="grow">In morning digest</span>
          <Toggle label="Work in morning digest" checked={v['work.digest']} onChange={(on) => set('work.digest', on)} />
        </div>
      </div>
    </Card>
  )
}
