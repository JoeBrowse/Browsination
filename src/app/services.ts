import { createContext, useContext } from 'react'
import type { FileStore } from '@/core/backup/fileStore'
import type { SqlDriver } from '@/core/db/driver'
import { filesRepo, type FilesRepo } from '@/core/repos/files'
import { itemsRepo, type ItemsRepo } from '@/core/repos/items'
import { logEntriesRepo, type LogEntriesRepo } from '@/core/repos/logEntries'
import { peopleRepo, type PeopleRepo } from '@/core/repos/people'
import { settingsRepo, type SettingsRepo } from '@/core/repos/settings'
import { taskQueries, type TaskQueries } from '@/core/tasks/queries'

/** Everything a screen needs. Built once at boot, provided through context. */
export interface Services {
  db: SqlDriver
  files: FileStore
  appVersion: string
  schemaVersion: number
  items: ItemsRepo
  tasks: TaskQueries
  logs: LogEntriesRepo
  people: PeopleRepo
  fileRows: FilesRepo
  settings: SettingsRepo
}

export function buildServices(db: SqlDriver, files: FileStore, appVersion: string, schemaVersion: number): Services {
  return {
    db,
    files,
    appVersion,
    schemaVersion,
    items: itemsRepo(db),
    tasks: taskQueries(db),
    logs: logEntriesRepo(db),
    people: peopleRepo(db),
    fileRows: filesRepo(db),
    settings: settingsRepo(db),
  }
}

export const ServicesContext = createContext<Services | null>(null)

export function useServices(): Services {
  const s = useContext(ServicesContext)
  if (!s) throw new Error('ServicesContext missing')
  return s
}
