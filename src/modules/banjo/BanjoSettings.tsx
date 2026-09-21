import { Chips } from '@/app/tasks/fields'
import { useServices } from '@/app/services'
import type { Settings } from '@/core/settings/schema'
import { Card, Toggle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'

export function BanjoSettings() {
  const s = useServices()
  const q = useQuery(() => s.settings.all(), ['settings'])
  const v = q.data
  if (!v) return null
  const set = <K extends keyof Settings>(k: K, value: Settings[K]) => void s.settings.set(k, value)
  return (
    <Card>
      <div className="stack" style={{ gap: 10 }}>
        <div className="row">
          <span className="grow">Reviews per session</span>
          <Chips label="Reviews per session" value={v['banjo.maxReviews']} onChange={(n) => set('banjo.maxReviews', n)} options={[3, 5, 8].map((n) => ({ label: `${n}`, value: n }))} />
        </div>
        <div className="row">
          <span className="grow">Due reviews in morning digest</span>
          <Toggle label="Due reviews in morning digest" checked={v['banjo.reviewDigest']} onChange={(on) => set('banjo.reviewDigest', on)} />
        </div>
      </div>
    </Card>
  )
}
