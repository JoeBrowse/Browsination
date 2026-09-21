import { Home } from 'lucide-react'
import type { ModuleDef } from '@/core/modules/types'
import { LifeSettings } from './LifeSettings'
import { AdminScreen } from './screens/AdminScreen'
import { DatesScreen } from './screens/DatesScreen'
import { LifeScreen } from './screens/LifeScreen'
import { ListsScreen } from './screens/ListsScreen'
import { PeopleScreen } from './screens/PeopleScreen'
import { PersonScreen } from './screens/PersonScreen'
import { TripScreen } from './screens/TripScreen'
import { TripsScreen } from './screens/TripsScreen'
import { lifeDigest, lifeToday } from './today'
import { lifeWeek } from './week'

export const lifeModule: ModuleDef = {
  id: 'life',
  name: 'Life',
  icon: Home,
  accent: '#5fd39a',
  order: 20,
  routes: [
    { index: true, element: <LifeScreen /> },
    { path: 'lists', element: <ListsScreen /> },
    { path: 'people', element: <PeopleScreen /> },
    { path: 'people/:id', element: <PersonScreen /> },
    { path: 'dates', element: <DatesScreen /> },
    { path: 'trips', element: <TripsScreen /> },
    { path: 'trips/:id', element: <TripScreen /> },
    { path: 'admin', element: <AdminScreen /> },
  ],
  today: [lifeToday],
  digest: lifeDigest,
  week: lifeWeek,
  settings: LifeSettings,
}
