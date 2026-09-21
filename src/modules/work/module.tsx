import { Briefcase } from 'lucide-react'
import type { ModuleDef } from '@/core/modules/types'
import { LearningScreen } from './screens/LearningScreen'
import { ProgressionScreen } from './screens/ProgressionScreen'
import { ProjectScreen } from './screens/ProjectScreen'
import { WorkPeopleScreen } from './screens/WorkPeopleScreen'
import { WorkPersonScreen } from './screens/WorkPersonScreen'
import { WorkScreen } from './screens/WorkScreen'
import { workDigest, workToday } from './today'
import { WorkSettings } from './WorkSettings'

export const workModule: ModuleDef = {
  id: 'work',
  name: 'Work',
  icon: Briefcase,
  accent: '#7fb2e5',
  order: 80,
  routes: [
    { index: true, element: <WorkScreen /> },
    { path: 'projects/:id', element: <ProjectScreen /> },
    { path: 'people', element: <WorkPeopleScreen /> },
    { path: 'people/:id', element: <WorkPersonScreen /> },
    { path: 'progression', element: <ProgressionScreen /> },
    { path: 'learning', element: <LearningScreen /> },
  ],
  today: [workToday],
  digest: workDigest,
  settings: WorkSettings,
}
