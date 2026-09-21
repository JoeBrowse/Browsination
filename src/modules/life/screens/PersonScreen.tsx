import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Chips } from '@/app/tasks/fields'
import { toast } from '@/app/shellStore'
import { calendarDay, formatDay } from '@/core/time/localDay'
import { Button, Card, Screen, SectionTitle } from '@/core/ui/primitives'
import { GoalPicker } from '@/core/ui/GoalPicker'
import { MoneyInput } from '@/core/ui/MoneyInput'
import { useQuery } from '@/core/ui/useQuery'
import { BirthdayInput } from '../fields'
import { nextBirthday } from '../logic'
import { useLifeRepo } from '../useLife'

const KIT = [
  { label: 'Off', value: null as number | null },
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '60d', value: 60 },
  { label: '90d', value: 90 },
]

export function PersonScreen() {
  const { id = '' } = useParams()
  const repo = useLifeRepo()
  const navigate = useNavigate()
  const [gift, setGift] = useState('')
  const q = useQuery(async () => ({ person: await repo.people.get(id), gifts: await repo.people.giftIdeas(id) }), ['people', 'gift_ideas'], [id])
  const p = q.data?.person
  if (!p) return <Screen title="Person">{q.loading ? null : <div className="empty">Not found</div>}</Screen>
  const b = p.birthday ? nextBirthday(p.birthday, calendarDay()) : null
  const update = (patch: Parameters<typeof repo.people.update>[1]) => void repo.people.update(p.id, patch)
  return (
    <Screen
      title={p.name}
      right={
        <Button
          variant="primary"
          onClick={() => {
            void repo.contacted(p.id)
            toast('Contacted')
          }}
        >
          Contacted
        </Button>
      }
    >
      <Card>
        <div className="stack">
          <input aria-label="Name" defaultValue={p.name} onBlur={(e) => update({ name: e.target.value.trim() || p.name })} />
          <input aria-label="Relationship" placeholder="Relationship" defaultValue={p.relationship} onBlur={(e) => update({ relationship: e.target.value })} />
          <BirthdayInput value={p.birthday} onChange={(v) => update({ birthday: v })} />
          {b ? (
            <div className="muted small">
              Next birthday {formatDay(b.day)} ({b.daysUntil === 0 ? 'today' : `${b.daysUntil} days`}){b.age ? `, turning ${b.age}` : ''}
            </div>
          ) : null}
          <div className="kv">
            <span>Last contacted</span>
            <span className="muted">{p.last_contacted_at ? new Date(p.last_contacted_at).toLocaleDateString('en-GB') : 'never'}</span>
          </div>
          <div className="small muted">Keep in touch every</div>
          <Chips label="Keep in touch" value={p.keep_in_touch_days} onChange={(v) => update({ keep_in_touch_days: v })} options={KIT} />
          <textarea aria-label="Notes" placeholder="Notes" defaultValue={p.notes} onBlur={(e) => update({ notes: e.target.value })} />
        </div>
      </Card>
      <SectionTitle>Gift ideas</SectionTitle>
      <div className="list">
        {(q.data?.gifts ?? []).map((g) => (
          <div key={g.id} className="list-row">
            <button className={`check${g.status === 'done' ? ' on' : ''}`} aria-label={`Gift done: ${g.title}`} onClick={() => void repo.people.updateGiftIdea(g.id, { status: g.status === 'done' ? 'idea' : 'done' })} />
            <div className="grow">
              <div style={{ textDecoration: g.status === 'done' ? 'line-through' : 'none' }}>{g.title}</div>
              <div className="row small" style={{ minHeight: 32, gap: 6 }}>
                <div style={{ width: 90 }}>
                  <MoneyInput label={`Budget for ${g.title}`} value={g.budget_pence} onChange={(budget_pence) => void repo.people.updateGiftIdea(g.id, { budget_pence })} />
                </div>
                <GoalPicker label={`Goal for ${g.title}`} value={g.goal_id} onChange={(goal_id) => void repo.people.updateGiftIdea(g.id, { goal_id })} />
              </div>
            </div>
            <Button onClick={() => void repo.people.removeGiftIdea(g.id)} ariaLabel={`Remove gift ${g.title}`}>
              ×
            </Button>
          </div>
        ))}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (!gift.trim()) return
          void repo.people.addGiftIdea(p.id, gift)
          setGift('')
        }}
      >
        <input aria-label="New gift idea" placeholder="Gift idea" value={gift} onChange={(e) => setGift(e.target.value)} />
        <Button type="submit" disabled={!gift.trim()}>
          Add
        </Button>
      </form>
      <div style={{ marginTop: 24 }}>
        <Button
          variant="danger"
          onClick={() => {
            void repo.people.remove(p.id)
            navigate('/m/life/people')
          }}
        >
          Delete person
        </Button>
      </div>
    </Screen>
  )
}
