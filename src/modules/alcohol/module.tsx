import { Wine } from 'lucide-react'
import type { ModuleDef } from '@/core/modules/types'
import { AlcoholPanel } from './AlcoholPanel'
import { AlcoholSettings } from './AlcoholSettings'
import { AlcoholScreen } from './screens/AlcoholScreen'
import { MedicationScreen } from './screens/MedicationScreen'
import { medicationReminders } from './today'
import { alcoholConsistency } from './week'

export const alcoholModule: ModuleDef = {
  id: 'alcohol',
  name: 'Drinks',
  icon: Wine,
  accent: '#e07a9a',
  order: 60,
  consistency: alcoholConsistency,
  routes: [
    { index: true, element: <AlcoholScreen /> },
    { path: 'medication', element: <MedicationScreen /> },
  ],
  panels: [{ key: 'alcohol.panel', component: AlcoholPanel }],
  reminders: medicationReminders,
  settings: AlcoholSettings,
}
