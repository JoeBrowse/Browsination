import { createElement } from 'react'
import type { RouteObject } from 'react-router'
import { MODULES } from '@/modules'
import { ModuleLayout } from './ModuleLayout'
import type { ModuleDef, ModuleId } from './types'

/** The single sanctioned core -> modules import. Everything else reaches modules through here. */
export function getModules(list: ModuleDef[] = MODULES): ModuleDef[] {
  validate(list)
  return [...list].sort((a, b) => a.order - b.order)
}

export function getModule(id: ModuleId, list: ModuleDef[] = MODULES): ModuleDef | undefined {
  return list.find((m) => m.id === id)
}

export function moduleRoutes(list: ModuleDef[] = MODULES): RouteObject[] {
  // One layout route per module: accent scope, and the PIN pad in front of modules behind the lock.
  return getModules(list).map((m) => ({ path: `m/${m.id}`, element: createElement(ModuleLayout, { module: m }), children: m.routes, handle: { moduleId: m.id } }))
}

export function modulePath(id: ModuleId, sub = ''): string {
  return `/m/${id}${sub ? `/${sub}` : ''}`
}

function validate(list: ModuleDef[]): void {
  const ids = new Set<string>()
  for (const m of list) {
    if (ids.has(m.id)) throw new Error(`Duplicate module id: ${m.id}`)
    ids.add(m.id)
    if (!m.name || m.name.length > 12) throw new Error(`Module ${m.id}: name must be 1-12 characters`)
  }
}
