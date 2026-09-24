import { useState } from 'react'
import { Button, Card, EmptyState, SectionTitle } from '../ui/primitives'
import { Sheet } from '../ui/Sheet'
import type { LeagueRepo, TeamRow } from './repo'

const FIELDS = [
  ['club', 'Club'],
  ['venue', 'Venue'],
  ['address', 'Address'],
  ['night', 'Night'],
  ['captain', 'Captain'],
  ['phone', 'Phone'],
  ['email', 'Email'],
] as const

function TeamSheet({ repo, team, open, onClose }: { repo: LeagueRepo; team: TeamRow | null; open: boolean; onClose: () => void }) {
  const [name, setName] = useState(team?.name ?? '')
  const [d, setD] = useState<Record<string, string>>(Object.fromEntries(FIELDS.map(([k]) => [k, team?.[k] ?? ''])))
  const [notes, setNotes] = useState(team?.notes ?? '')
  const save = async () => {
    if (!name.trim()) return
    if (team) await repo.updateTeam(team.id, { name: name.trim(), ...d, notes })
    else await repo.upsertTeam({ name: name.trim(), ...d, notes })
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={team ? 'Team' : 'New team'}>
      <div className="stack">
        <input aria-label="Team name" placeholder="Team" value={name} onChange={(e) => setName(e.target.value)} />
        {FIELDS.map(([k, label]) => (
          <input key={k} aria-label={label} placeholder={label} value={d[k] ?? ''} onChange={(e) => setD((x) => ({ ...x, [k]: e.target.value }))} />
        ))}
        <textarea aria-label="Team notes" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="btn-row">
          <Button variant="primary" onClick={() => void save()} disabled={!name.trim()}>
            Save
          </Button>
          {team ? (
            <Button
              variant="danger"
              onClick={() => {
                void repo.removeTeam(team.id)
                onClose()
              }}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </div>
    </Sheet>
  )
}

/** Who to ring and where to turn up: the opposition directory, all of it editable. */
export function TeamsList({ repo, teams }: { repo: LeagueRepo; teams: TeamRow[] }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TeamRow | null | 'new'>(null)
  return (
    <>
      <SectionTitle>
        <button className="linky" onClick={() => setOpen((v) => !v)}>
          Teams {teams.length ? `(${teams.length})` : ''} {open ? '−' : '+'}
        </button>
        {open ? <Button onClick={() => setEditing('new')}>Add</Button> : null}
      </SectionTitle>
      {open ? (
        <>
          {teams.length === 0 ? <EmptyState>No teams yet</EmptyState> : null}
          <div className="list">
            {teams.map((t) => (
              <Card key={t.id}>
                <div className="kv">
                  <button className="title" onClick={() => setEditing(t)}>
                    {t.name}
                  </button>
                  {t.night ? <span className="pill">{t.night}</span> : null}
                </div>
                {t.venue || t.address ? <div className="sub">{[t.venue, t.address].filter(Boolean).join(', ')}</div> : null}
                {t.captain || t.phone || t.email ? (
                  <div className="btn-row" style={{ marginTop: 6 }}>
                    {t.captain ? <span className="sub">{t.captain}</span> : null}
                    {t.phone ? (
                      <a className="pill" href={`tel:${t.phone.replace(/\s/g, '')}`}>
                        Call
                      </a>
                    ) : null}
                    {t.email ? (
                      <a className="pill" href={`mailto:${t.email}`}>
                        Email
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {t.notes ? <div className="sub muted">{t.notes}</div> : null}
              </Card>
            ))}
          </div>
        </>
      ) : null}
      <TeamSheet key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id} repo={repo} team={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </>
  )
}
