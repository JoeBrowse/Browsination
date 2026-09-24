import { useMemo, useState, type ReactNode } from 'react'
import { Chips } from '@/app/tasks/fields'
import { useServices } from '@/app/services'
import { calendarDay, formatDay } from '../time/localDay'
import { Button, Card, EmptyState, SectionTitle } from '../ui/primitives'
import { useQuery } from '../ui/useQuery'
import { FixtureSheet } from './FixtureSheet'
import { leagueRepo, type FixtureRow } from './repo'
import { TeamsList } from './TeamsList'
import { resultLabel, seasonStats, splitFixtures } from './stats'

export interface LeagueFields {
  board?: boolean
  colour?: boolean
  ratings?: boolean
  pgn?: boolean
}

/** Seasons, fixtures, results, the opposition directory and season stats. Shared by chess and snooker. */
export function LeagueView({ module, defaultTeam, fields, actions }: { module: string; defaultTeam: string; fields: LeagueFields; actions?: ReactNode }) {
  const s = useServices()
  const repo = useMemo(() => leagueRepo(s.db, module), [s.db, module])
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const [newSeason, setNewSeason] = useState('')
  const [editing, setEditing] = useState<FixtureRow | null | 'new'>(null)
  const seasons = useQuery(() => repo.seasons(), ['league_seasons'])
  const current = seasonId ?? seasons.data?.[0]?.id ?? null
  const fixtures = useQuery(() => (current ? repo.fixtures(current) : Promise.resolve([] as FixtureRow[])), ['league_fixtures'], [current])
  const teams = useQuery(() => repo.teams(), ['league_teams'])
  const stats = seasonStats(fixtures.data ?? [])
  const split = splitFixtures(fixtures.data ?? [], calendarDay())
  const season = seasons.data?.find((x) => x.id === current)
  return (
    <>
      {seasons.data && seasons.data.length ? (
        <Chips label="Season" value={current} onChange={setSeasonId} options={seasons.data.map((x) => ({ label: x.name, value: x.id as string | null }))} />
      ) : null}
      <form
        className="row"
        style={{ marginTop: 8 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (!newSeason.trim()) return
          void repo.addSeason({ name: newSeason, team: defaultTeam }).then((row) => setSeasonId(row.id))
          setNewSeason('')
        }}
      >
        <input aria-label="New season" placeholder="New season (e.g. 2026/27)" value={newSeason} onChange={(e) => setNewSeason(e.target.value)} />
        <Button type="submit" disabled={!newSeason.trim()}>
          Add
        </Button>
      </form>
      {actions ? <div className="btn-row" style={{ marginTop: 8 }}>{actions}</div> : null}
      {season ? (
        <>
          <Card style={{ marginTop: 12 }}>
            <div className="kv">
              <span>{season.team || defaultTeam}</span>
              <span className="pill accent">
                {stats.won}-{stats.drawn}-{stats.lost}
              </span>
            </div>
            <div className="kv">
              <span className="muted">Played</span>
              <span>{stats.played}</span>
            </div>
            <div className="kv">
              <span className="muted">Points</span>
              <span>
                {stats.points} ({stats.scorePct}%)
              </span>
            </div>
            {fields.ratings && stats.avgOpponentRating !== null ? (
              <div className="kv">
                <span className="muted">Avg opponent · performance</span>
                <span>
                  {stats.avgOpponentRating} · {stats.performance}
                </span>
              </div>
            ) : null}
            {fields.colour && Object.keys(stats.byColour).length ? (
              <div className="kv">
                <span className="muted">By colour</span>
                <span>
                  {Object.entries(stats.byColour)
                    .map(([c, v]) => `${c} ${v.points}/${v.played}`)
                    .join(' · ')}
                </span>
              </div>
            ) : null}
          </Card>
          <SectionTitle>
            Fixtures
            <Button onClick={() => setEditing('new')}>Add</Button>
          </SectionTitle>
          {!fixtures.loading && (fixtures.data?.length ?? 0) === 0 ? <EmptyState>No fixtures yet</EmptyState> : null}
          {(['next', 'past'] as const).map((which) =>
            split[which].length ? (
              <div key={which}>
                {split.next.length && split.past.length ? <div className="sub muted" style={{ marginTop: 8 }}>{which === 'next' ? 'Next' : 'Played'}</div> : null}
                <div className="list">
                  {split[which].map((f) => (
                    <button key={f.id} className="list-row" onClick={() => setEditing(f)}>
                      <span className={`pill${f.result === 1 ? ' accent' : ''}`} style={{ width: 36, justifyContent: 'center' }}>
                        {resultLabel(f.result)}
                      </span>
                      <div className="grow">
                        <div className="title">
                          {f.home ? 'v' : 'at'} {[f.opponent_team || f.opponent || 'TBC', f.opponent_team && f.opponent ? `(${f.opponent})` : null].filter(Boolean).join(' ')}
                        </div>
                        <div className="sub">{[formatDay(f.date), f.start_time || null, f.round ? `round ${f.round}` : null, fields.board && f.board ? `board ${f.board}` : null, fields.colour ? f.colour : null, fields.ratings && f.opponent_rating ? `${f.opponent_rating}` : null].filter(Boolean).join(' · ')}</div>
                        {f.venue ? <div className="sub muted">{f.venue}</div> : null}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null,
          )}
          <FixtureSheet key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id} repo={repo} seasonId={season.id} fixture={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} fields={fields} teams={teams.data ?? []} />
          <TeamsList repo={repo} teams={teams.data ?? []} />
        </>
      ) : (
        <EmptyState>Add a season</EmptyState>
      )}
    </>
  )
}
