import { useState } from 'react'
import { Link } from 'react-router'
import { Button, EmptyState, Screen } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { useWorkRepo } from '../useWork'

/** Colleagues and contacts (people rows with context 'work'). */
export function WorkPeopleScreen() {
  const repo = useWorkRepo()
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const q = useQuery(() => repo.contacts(), ['people'])
  return (
    <Screen title="People">
      {!q.loading && (q.data?.length ?? 0) === 0 ? <EmptyState>No contacts yet</EmptyState> : null}
      <div className="list">
        {(q.data ?? []).map((p) => {
          const days = p.last_contacted_at ? Math.floor((Date.now() - Date.parse(p.last_contacted_at)) / 86_400_000) : null
          return (
            <Link key={p.id} to={p.id} className="list-row">
              <div className="grow">
                <div className="title">{p.name}</div>
                <div className="sub">{[p.role, days !== null ? `last 1:1 ${days}d ago` : null].filter(Boolean).join(' · ')}</div>
              </div>
            </Link>
          )
        })}
      </div>
      <form
        className="row"
        style={{ marginTop: 12 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          void repo.addContact(name, role)
          setName('')
          setRole('')
        }}
      >
        <input aria-label="Contact name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input aria-label="Role" placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} />
        <Button type="submit" disabled={!name.trim()}>
          Add
        </Button>
      </form>
    </Screen>
  )
}
