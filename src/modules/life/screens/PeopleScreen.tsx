import { useState } from 'react'
import { Link } from 'react-router'
import { calendarDay } from '@/core/time/localDay'
import { Button, EmptyState, Screen } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { BirthdayInput } from '../fields'
import { nextBirthday } from '../logic'
import { useLifeRepo } from '../useLife'

export function PeopleScreen() {
  const repo = useLifeRepo()
  const [adding, setAdding] = useState(false)
  const q = useQuery(() => repo.people.list(), ['people'])
  const today = calendarDay()
  return (
    <Screen title="People" right={<Button onClick={() => setAdding(true)}>Add</Button>}>
      {!q.loading && (q.data?.length ?? 0) === 0 ? <EmptyState>No people yet</EmptyState> : null}
      <div className="list">
        {(q.data ?? []).map((p) => {
          const b = p.birthday ? nextBirthday(p.birthday, today) : null
          const days = p.last_contacted_at ? Math.floor((Date.now() - Date.parse(p.last_contacted_at)) / 86_400_000) : null
          return (
            <Link key={p.id} to={p.id} className="list-row">
              <div className="grow">
                <div className="title">{p.name}</div>
                <div className="sub">{[p.relationship, b ? (b.daysUntil === 0 ? 'birthday today' : `birthday in ${b.daysUntil}d`) : null, days !== null ? `contacted ${days}d ago` : null].filter(Boolean).join(' · ')}</div>
              </div>
            </Link>
          )
        })}
      </div>
      <AddPersonSheet open={adding} onClose={() => setAdding(false)} />
    </Screen>
  )
}

function AddPersonSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const repo = useLifeRepo()
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [birthday, setBirthday] = useState<string | null>(null)
  const save = async () => {
    if (!name.trim()) return
    await repo.people.create({ name, relationship, birthday })
    setName('')
    setRelationship('')
    setBirthday(null)
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="New person">
      <div className="stack">
        <input aria-label="Name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input aria-label="Relationship" placeholder="Relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
        <BirthdayInput value={birthday} onChange={setBirthday} />
        <Button variant="primary" block onClick={() => void save()} disabled={!name.trim()}>
          Save
        </Button>
      </div>
    </Sheet>
  )
}
