import { LeagueView } from '@/core/league/LeagueView'
import { Screen } from '@/core/ui/primitives'

export function LeagueScreen() {
  return (
    <Screen title="League">
      <LeagueView module="chess" defaultTeam="Cardiff Crows" fields={{ board: true, colour: true, ratings: true, pgn: true }} />
    </Screen>
  )
}
