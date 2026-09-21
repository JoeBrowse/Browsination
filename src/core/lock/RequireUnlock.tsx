import { Outlet } from 'react-router'
import type { ModuleDef } from '../modules/types'
import { LockScreen } from './LockScreen'
import { isModuleLocked, useLock } from './lockStore'

/** Layout route for modules with `requiresLock`: the PIN pad replaces the screens while locked. */
export function RequireUnlock({ module }: { module: ModuleDef }) {
  const lock = useLock()
  if (isModuleLocked(lock, module)) return <LockScreen title={`${module.name} locked`} />
  return <Outlet />
}
