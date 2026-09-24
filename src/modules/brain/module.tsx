import { Brain } from 'lucide-react'
import type { ModuleDef } from '@/core/modules/types'
import { CheckInPanel } from './CheckInPanel'
import { BrainScreen } from './screens/BrainScreen'
import { HabitScreen } from './screens/HabitScreen'
import { brainConsistency } from './week'
import { brainLogTypes } from './logTypes'

export const brainModule: ModuleDef = {
  logTypes: brainLogTypes,
  id: 'brain',
  name: 'Brain',
  icon: Brain,
  accent: '#b48cff',
  order: 10,
  consistency: brainConsistency,
  routes: [
    { index: true, element: <BrainScreen /> },
    { path: 'habit/:id', element: <HabitScreen /> },
  ],
  panels: [{ key: 'brain.checkin', component: CheckInPanel }],
}
