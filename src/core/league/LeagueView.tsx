import { useMemo, useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { useServices } from '@/app/services'
import { formatDay } from '../time/localDay'
import { Button, Card, EmptyState, SectionTitle } from '../ui/primitives'
import { useQuery } from '../ui/useQuery'
import { FixtureSheet } from './FixtureSheet'
import { leagueRepo, type FixtureRow } from './repo'
import { resultLabel, seasonStats } from './stats'

export interface LeagueFields {
  board?: boolean
  colour?: boolean
  ratings?: boolean
  pgn?: boolean
}

/** Seasons, fixtures, results and season stats. Shared by chess and snooker. */
export function LeagueView({ module, defaultTeam, fields }: { module: string; defaultTeam: string; fields: LeagueFields }) {
  const s = useServices()
  const repo = useMemo(() => leagueRepo(s.db, module), [s.db, module])
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const [newSeason, setNewSeason] = useState('')
  const [editing, setEditing] = useState<FixtureRow | null | 'new'>(null)
  const seasons = useQuery(() => repo.seasons(), ['league_seasons'])
  const current = seasonId ?? seasons.data?.[0]?.id ?? null
  const fixtures = useQuery(() => (current ? repo.fixtures(current) : Promise.resolve([] as FixtureRow[])), ['league_fixtures'], [current])
  const stats = seasonStats(fixtures.data ?? [])
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
          <div className="list">
            {(fixtures.data ?? []).map((f) => (
              <button key={f.id} className="list-row" onClick={() => setEditing(f)}>
                <span className={`pill${f.result === 1 ? ' accent' : ''}`} style={{ width: 36, justifyContent: 'center' }}>
                  {resultLabel(f.result)}
                </span>
                <div className="grow">
                  <div className="title">{[f.opponent || 'TBC', f.opponent_team ? `(${f.opponent_team})` : null].filter(Boolean).join(' ')}</div>
                  <div className="sub">{[formatDay(f.date), fields.board && f.board ? `board ${f.board}` : null, fields.colour ? f.colour : null, fields.ratings && f.opponent_rating ? `${f.opponent_rating}` : null].filter(Boolean).join(' · ')}</div>
                </div>
              </button>
            ))}
          </div>
          <FixtureSheet key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id} repo={repo} seasonId={season.id} fixture={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} fields={fields} />
        </>
      ) : (
        <EmptyState>Add a season</EmptyState>
      )}
    </>
  )
}
