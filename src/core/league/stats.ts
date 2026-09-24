/** Season statistics shared by chess and snooker. A result is 1, 0.5 or 0 from my point of view. */
export interface FixtureLike {
  result: number | null
  colour?: string | null
  my_rating?: number | null
  opponent_rating?: number | null
}

export interface SeasonStats {
  played: number
  won: number
  drawn: number
  lost: number
  points: number
  /** 0-100, points per game. */
  scorePct: number
  avgOpponentRating: number | null
  /** Linear approximation: average opponent rating + 400 × (wins − losses) / played. */
  performance: number | null
  byColour: Record<string, { played: number; points: number }>
}

export function seasonStats(fixtures: FixtureLike[]): SeasonStats {
  const played = fixtures.filter((f) => f.result !== null)
  const won = played.filter((f) => f.result === 1).length
  const drawn = played.filter((f) => f.result === 0.5).length
  const lost = played.filter((f) => f.result === 0).length
  const points = won + drawn / 2
  const rated = played.filter((f) => f.opponent_rating != null)
  const avgOpp = rated.length ? rated.reduce((n, f) => n + (f.opponent_rating ?? 0), 0) / rated.length : null
  const ratedWon = rated.filter((f) => f.result === 1).length
  const ratedLost = rated.filter((f) => f.result === 0).length
  const byColour: SeasonStats['byColour'] = {}
  for (const f of played) {
    const c = f.colour ?? 'n/a'
    byColour[c] = { played: (byColour[c]?.played ?? 0) + 1, points: (byColour[c]?.points ?? 0) + (f.result ?? 0) }
  }
  return {
    played: played.length,
    won,
    drawn,
    lost,
    points,
    scorePct: played.length ? Math.round((points / played.length) * 100) : 0,
    avgOpponentRating: avgOpp === null ? null : Math.round(avgOpp),
    performance: avgOpp === null ? null : Math.round(avgOpp + (400 * (ratedWon - ratedLost)) / rated.length),
    byColour,
  }
}

export function resultLabel(result: number | null): string {
  return result === 1 ? 'W' : result === 0.5 ? 'D' : result === 0 ? 'L' : '–'
}

/** Fixtures in the order you want to see them: next ones first, then the ones already gone by. */
export function splitFixtures<T extends { date: string }>(list: T[], today: string): { next: T[]; past: T[] } {
  const next = list.filter((f) => f.date >= today).sort((a, b) => a.date.localeCompare(b.date))
  const past = list.filter((f) => f.date < today).sort((a, b) => b.date.localeCompare(a.date))
  return { next, past }
}
