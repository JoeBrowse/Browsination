import { createSnapshot } from '@/core/backup/snapshots'
import { migrate } from '@/core/db/migrate'
import { MIGRATIONS } from '@/core/db/migrations'
import { createAppDriver } from '@/core/platform/db'
import { createFileStore } from '@/core/platform/fileStore'
import { applyTheme } from '@/core/ui/theme'
import { buildServices, type Services } from './services'

/**
 * Boot order: open database -> (snapshot if a migration is pending) -> migrate -> services.
 * Any failure is surfaced by the Boot component with an export path; the app never
 * renders against a half-migrated schema.
 */
export async function bootApp(): Promise<Services> {
  const db = await createAppDriver()
  const files = createFileStore()
  await db.exec('PRAGMA foreign_keys = ON')
  const result = await migrate(db, MIGRATIONS, {
    onBeforeMigrate: async () => {
      await createSnapshot(db, files, 'pre-migration', __APP_VERSION__)
    },
  })
  const services = buildServices(db, files, __APP_VERSION__, result.to)
  applyTheme(await services.settings.get('theme'))
  return services
}
