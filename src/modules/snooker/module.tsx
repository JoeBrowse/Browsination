import { Target } from 'lucide-react'
import { LeagueView } from '@/core/league/LeagueView'
import type { ModuleDef } from '@/core/modules/types'
import { Screen } from '@/core/ui/primitives'
import { RoutineScreen } from './screens/RoutineScreen'
import { SnookerScreen } from './screens/SnookerScreen'

function SnookerLeagueScreen() {
  return (
    <Screen title="Snooker league">
      <LeagueView module="snooker" defaultTeam="" fields={{}} />
    </Screen>
  )
}

export const snookerModule: ModuleDef = {
  id: 'snooker',
  name: 'Snooker',
  icon: Target,
  accent: '#4fd1c5',
  order: 50,
  routes: [
    { index: true, element: <SnookerScreen /> },
    { path: 'routine/:id', element: <RoutineScreen /> },
    { path: 'league', element: <SnookerLeagueScreen /> },
  ],
}
