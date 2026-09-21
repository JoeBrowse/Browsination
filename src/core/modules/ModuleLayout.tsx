import { Outlet } from 'react-router'
import { RequireUnlock } from '../lock/RequireUnlock'
import { ModuleScope } from '../ui/primitives'
import type { ModuleDef } from './types'

/** Layout route for every module: applies the module's accent to its screens and sheets, and the lock where required. */
export function ModuleLayout({ module }: { module: ModuleDef }) {
  return <ModuleScope accent={module.accent}>{module.requiresLock ? <RequireUnlock module={module} /> : <Outlet />}</ModuleScope>
}
