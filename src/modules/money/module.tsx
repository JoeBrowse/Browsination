import { Wallet } from 'lucide-react'
import type { ModuleDef } from '@/core/modules/types'
import { MoneySettings } from './MoneySettings'
import { AccountScreen } from './screens/AccountScreen'
import { CheckInScreen } from './screens/CheckInScreen'
import { CreditScreen } from './screens/CreditScreen'
import { GoalsScreen } from './screens/GoalsScreen'
import { HoldingsScreen } from './screens/HoldingsScreen'
import { MoneyScreen } from './screens/MoneyScreen'
import { moneyDigest, moneyReminders, moneyToday } from './today'
import { moneyWeek } from './week'

export const moneyModule: ModuleDef = {
  id: 'money',
  name: 'Money',
  icon: Wallet,
  accent: '#d4c56a',
  order: 70,
  requiresLock: true,
  routes: [
    { index: true, element: <MoneyScreen /> },
    { path: 'accounts/:id', element: <AccountScreen /> },
    { path: 'holdings', element: <HoldingsScreen /> },
    { path: 'goals', element: <GoalsScreen /> },
    { path: 'credit', element: <CreditScreen /> },
    { path: 'checkin', element: <CheckInScreen /> },
  ],
  today: [moneyToday],
  digest: moneyDigest,
  reminders: moneyReminders,
  week: moneyWeek,
  settings: MoneySettings,
}
