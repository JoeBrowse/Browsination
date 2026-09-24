import { useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { calendarDay } from '../time/localDay'
import { Button } from '../ui/primitives'
import { Sheet } from '../ui/Sheet'
import type { LeagueFields } from './LeagueView'
import type { FixtureRow, LeagueRepo, TeamRow } from './repo'

export function FixtureSheet({ repo, seasonId, fixture, open, onClose, fields, teams = [] }: { repo: LeagueRepo; seasonId: string; fixture: FixtureRow | null; open: boolean; onClose: () => void; fields: LeagueFields; teams?: TeamRow[] }) {
  const [d, setD] = useState({
    date: fixture?.date ?? calendarDay(),
    opponent: fixture?.opponent ?? '',
    opponent_team: fixture?.opponent_team ?? '',
    home: fixture?.home ?? 1,
    round: fixture?.round ?? null,
    venue: fixture?.venue ?? '',
    start_time: fixture?.start_time ?? '',
    board: fixture?.board ?? null,
    colour: fixture?.colour ?? null,
    result: fixture?.result ?? null,
    my_rating: fixture?.my_rating ?? null,
    opponent_rating: fixture?.opponent_rating ?? null,
    pgn: fixture?.pgn ?? '',
    notes: fixture?.notes ?? '',
  })
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }))
  const num = (v: string) => (v.trim() === '' ? null : Number(v))
  const them = teams.find((t) => t.name === d.opponent_team)
  const save = async () => {
    if (fixture) await repo.updateFixture(fixture.id, d)
    else await repo.addFixture({ season_id: seasonId, ...d })
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={fixture ? 'Fixture' : 'New fixture'}>
      <div className="stack">
        <div className="row">
          <input type="date" aria-label="Fixture date" value={d.date} onChange={(e) => set('date', e.target.value)} />
          <input type="time" aria-label="Start time" value={d.start_time} onChange={(e) => set('start_time', e.target.value)} style={{ width: 120 }} />
        </div>
        <div className="row">
          <input aria-label="Opponent" placeholder="Opponent" value={d.opponent} onChange={(e) => set('opponent', e.target.value)} />
          <input aria-label="Opponent team" placeholder="Their team" list="league-teams" value={d.opponent_team} onChange={(e) => set('opponent_team', e.target.value)} />
          <datalist id="league-teams">
            {teams.map((t) => (
              <option key={t.id} value={t.name} />
            ))}
          </datalist>
        </div>
        <div className="row">
          <Chips
            label="Where"
            value={d.home}
            onChange={(v) => set('home', v ?? 1)}
            options={[
              { label: 'Home', value: 1 as number | null },
              { label: 'Away', value: 0 as number | null },
            ]}
          />
          <input type="number" aria-label="Round" placeholder="Round" value={d.round ?? ''} onChange={(e) => set('round', num(e.target.value))} style={{ width: 90 }} />
        </div>
        <input aria-label="Venue" placeholder="Venue" value={d.venue} onChange={(e) => set('venue', e.target.value)} />
        {them && (them.captain || them.phone || them.email || them.night) ? (
          <div className="btn-row">
            {them.captain ? <span className="sub">{them.captain}</span> : null}
            {them.night ? <span className="pill">{them.night}</span> : null}
            {them.phone ? <a className="pill" href={`tel:${them.phone.replace(/\s/g, '')}`}>Call</a> : null}
            {them.email ? <a className="pill" href={`mailto:${them.email}`}>Email</a> : null}
          </div>
        ) : null}
        {fields.board || fields.colour ? (
          <div className="row">
            {fields.board ? <input type="number" aria-label="Board" placeholder="Board" value={d.board ?? ''} onChange={(e) => set('board', num(e.target.value))} style={{ width: 100 }} /> : null}
            {fields.colour ? (
              <Chips
                label="Colour"
                value={d.colour}
                onChange={(v) => set('colour', v)}
                options={[
                  { label: 'White', value: 'white' as 'white' | 'black' | null },
                  { label: 'Black', value: 'black' as 'white' | 'black' | null },
                ]}
              />
            ) : null}
          </div>
        ) : null}
        <Chips
          label="Result"
          value={d.result}
          onChange={(v) => set('result', v)}
          options={[
            { label: 'Win', value: 1 as number | null },
            { label: 'Draw', value: 0.5 as number | null },
            { label: 'Loss', value: 0 as number | null },
            { label: 'Not played', value: null },
          ]}
        />
        {fields.ratings ? (
          <div className="row">
            <input type="number" aria-label="My rating" placeholder="My rating" value={d.my_rating ?? ''} onChange={(e) => set('my_rating', num(e.target.value))} />
            <input type="number" aria-label="Opponent rating" placeholder="Their rating" value={d.opponent_rating ?? ''} onChange={(e) => set('opponent_rating', num(e.target.value))} />
          </div>
        ) : null}
        {fields.pgn ? <textarea aria-label="PGN" placeholder="PGN (optional)" value={d.pgn} onChange={(e) => set('pgn', e.target.value)} style={{ fontFamily: 'monospace' }} /> : null}
        <textarea aria-label="Fixture notes" placeholder="Notes" value={d.notes} onChange={(e) => set('notes', e.target.value)} />
        <div className="btn-row">
          <Button variant="primary" onClick={() => void save()}>
            Save
          </Button>
          {fixture ? (
            <Button
              variant="danger"
              onClick={() => {
                void repo.removeFixture(fixture.id)
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
