import { Crown } from 'lucide-react'
import type { ModuleDef } from '@/core/modules/types'
import { chessWeek } from './week'
import { startCalendarSync } from './runner'
import { CalendarScreen } from './screens/CalendarScreen'
import { ChessScreen } from './screens/ChessScreen'
import { LeagueScreen } from './screens/LeagueScreen'
import { RepertoireScreen } from './screens/RepertoireScreen'
import { StudentScreen } from './screens/StudentScreen'
import { StudentsScreen } from './screens/StudentsScreen'
import { TournamentsScreen } from './screens/TournamentsScreen'
import { chessDigest, chessToday } from './today'
import { chessLogTypes } from './logTypes'

export const chessModule: ModuleDef = {
  logTypes: chessLogTypes,
  id: 'chess',
  name: 'Chess',
  icon: Crown,
  accent: '#f2b84b',
  order: 30,
  week: chessWeek,
  routes: [
    { index: true, element: <ChessScreen /> },
    { path: 'calendar', element: <CalendarScreen /> },
    { path: 'students', element: <StudentsScreen /> },
    { path: 'students/:id', element: <StudentScreen /> },
    { path: 'repertoire', element: <RepertoireScreen /> },
    { path: 'tournaments', element: <TournamentsScreen /> },
    { path: 'league', element: <LeagueScreen /> },
  ],
  today: [chessToday],
  digest: chessDigest,
  start: ({ db }) => startCalendarSync(db),
}
