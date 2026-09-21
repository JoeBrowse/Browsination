import { createHashRouter, Navigate, type RouteObject } from 'react-router'
import { moduleRoutes } from '@/core/modules/registry'
import { AppShell } from './AppShell'
import { InboxScreen } from './screens/Inbox'
import { InsightsScreen } from './screens/Insights'
import { ModulesScreen } from './screens/Modules'
import { ReviewScreen } from './screens/Review'
import { SettingsScreen } from './screens/Settings'
import { TodayScreen } from './screens/Today'

export function appRoutes(): RouteObject[] {
  return [
    {
      element: <AppShell />,
      children: [
        { index: true, element: <Navigate to="/today" replace /> },
        { path: 'today', element: <TodayScreen /> },
        { path: 'inbox', element: <InboxScreen /> },
        { path: 'modules', element: <ModulesScreen /> },
        { path: 'insights', element: <InsightsScreen /> },
        { path: 'settings', element: <SettingsScreen /> },
        { path: 'review', element: <ReviewScreen /> },
        ...moduleRoutes(),
        { path: '*', element: <Navigate to="/today" replace /> },
      ],
    },
  ]
}

export function buildRouter() {
  return createHashRouter(appRoutes())
}
