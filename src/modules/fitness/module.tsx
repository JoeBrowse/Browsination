import { Dumbbell } from 'lucide-react'
import type { ModuleDef } from '@/core/modules/types'
import { FitnessSettings } from './FitnessSettings'
import { BodyScreen } from './screens/BodyScreen'
import { ExerciseScreen } from './screens/ExerciseScreen'
import { ExercisesScreen } from './screens/ExercisesScreen'
import { FitnessScreen } from './screens/FitnessScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { ProgrammesScreen } from './screens/ProgrammesScreen'
import { WorkoutScreen } from './screens/WorkoutScreen'
import { fitnessConsistency, fitnessToday } from './today'
import { WorkoutPanel } from './WorkoutPanel'

export const fitnessModule: ModuleDef = {
  id: 'fitness',
  name: 'Gym',
  icon: Dumbbell,
  accent: '#f26a6a',
  order: 30,
  routes: [
    { index: true, element: <FitnessScreen /> },
    { path: 'workout/:id', element: <WorkoutScreen /> },
    { path: 'history', element: <HistoryScreen /> },
    { path: 'exercises', element: <ExercisesScreen /> },
    { path: 'exercise/:id', element: <ExerciseScreen /> },
    { path: 'programmes', element: <ProgrammesScreen /> },
    { path: 'body', element: <BodyScreen /> },
  ],
  panels: [{ key: 'fitness.panel', component: WorkoutPanel }],
  today: [fitnessToday],
  consistency: fitnessConsistency,
  settings: FitnessSettings,
}
