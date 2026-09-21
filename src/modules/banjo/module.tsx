import { Music } from 'lucide-react'
import { lazy, Suspense } from 'react'
import type { ModuleDef } from '@/core/modules/types'
import { BanjoSettings } from './BanjoSettings'
import { PracticePanel } from './PracticePanel'
import { BanjoScreen } from './screens/BanjoScreen'
import { GoalsScreen } from './screens/GoalsScreen'
import { LibraryScreen } from './screens/LibraryScreen'
import { PieceScreen } from './screens/PieceScreen'
import { PlanScreen } from './screens/PlanScreen'
import { SessionsScreen } from './screens/SessionsScreen'
import { banjoDigest } from './today'
import { banjoConsistency } from './week'

const ViewerScreen = lazy(() => import('./screens/ViewerScreen').then((m) => ({ default: m.ViewerScreen })))

export const banjoModule: ModuleDef = {
  id: 'banjo',
  name: 'Banjo',
  icon: Music,
  accent: '#ff9f6b',
  order: 40,
  consistency: banjoConsistency,
  routes: [
    { index: true, element: <BanjoScreen /> },
    { path: 'library', element: <LibraryScreen /> },
    { path: 'library/piece/:id', element: <PieceScreen /> },
    {
      path: 'library/piece/:id/file/:fileId',
      element: (
        <Suspense fallback={null}>
          <ViewerScreen />
        </Suspense>
      ),
    },
    { path: 'goals', element: <GoalsScreen /> },
    { path: 'plan', element: <PlanScreen /> },
    { path: 'sessions', element: <SessionsScreen /> },
  ],
  panels: [{ key: 'banjo.practice', component: PracticePanel }],
  digest: banjoDigest,
  settings: BanjoSettings,
}
