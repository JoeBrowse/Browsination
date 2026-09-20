import { Chips } from '@/app/tasks/fields'
import { useServices } from '@/app/services'
import { Card, Toggle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'

const LEADS = [1, 3, 7, 14, 21, 30]

/** Every nudge type can be switched off here. */
export function LifeSettings() {
  const s = useServices()
  const q = useQuery(() => s.settings.all(), ['settings'])
  const v = q.data
  if (!v) return null
  const leads = v['life.birthdayLeadDays']
  const toggleLead = (n: number) => void s.settings.set('life.birthdayLeadDays', leads.includes(n) ? leads.filter((x) => x !== n) : [...leads, n].sort((a, b) => b - a))
  return (
    <Card>
      <div className="stack" style={{ gap: 10 }}>
        <div className="small muted">Birthday reminders (days before)</div>
        <div className="chips" role="group" aria-label="Birthday lead days">
          {LEADS.map((n) => (
            <button key={n} className={`chip${leads.includes(n) ? ' on' : ''}`} aria-pressed={leads.includes(n)} onClick={() => toggleLead(n)}>
              {n}
            </button>
          ))}
        </div>
        <div className="small muted">Date night nudge when nothing planned within (weeks)</div>
        <Chips label="Date night nudge weeks" value={v['life.dateNightNudgeWeeks']} onChange={(n) => void s.settings.set('life.dateNightNudgeWeeks', n)} options={[0, 2, 3, 4, 6, 8].map((n) => ({ label: n === 0 ? 'Off' : String(n), value: n }))} />
        <div className="small muted">Renewals and appointments (days before)</div>
        <Chips label="Admin lead days" value={v['life.adminLeadDays']} onChange={(n) => void s.settings.set('life.adminLeadDays', n)} options={[0, 7, 14, 30, 60].map((n) => ({ label: n === 0 ? 'Off' : String(n), value: n }))} />
        <div className="row">
          <span className="grow">Keep-in-touch nudges</span>
          <Toggle label="Keep-in-touch nudges" checked={v['life.keepInTouch']} onChange={(on) => void s.settings.set('life.keepInTouch', on)} />
        </div>
      </div>
    </Card>
  )
}
