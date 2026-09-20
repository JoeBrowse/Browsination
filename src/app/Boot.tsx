import { useEffect, useMemo, useState } from 'react'
import { RouterProvider } from 'react-router/dom'
import { exportDatabase, exportFilename, serializeEnvelope } from '@/core/backup/exportDb'
import { installNotificationSync } from '@/core/notifications/service'
import { onBackground, onForeground } from '@/core/platform/appEvents'
import { createAppDriver } from '@/core/platform/db'
import { saveExportFile } from '@/core/platform/exportTransport'
import { checkNotificationPermission, createNotificationPort, onNotificationTap } from '@/core/platform/notifications'
import { Button } from '@/core/ui/primitives'
import { bootApp } from './boot'
import { buildRouter } from './router'
import { ServicesContext, type Services } from './services'

type State = { status: 'loading' } | { status: 'ready'; services: Services } | { status: 'error'; error: Error }

export function Boot() {
  const [state, setState] = useState<State>({ status: 'loading' })
  useEffect(() => {
    bootApp().then(
      (services) => setState({ status: 'ready', services }),
      (e: unknown) => setState({ status: 'error', error: e instanceof Error ? e : new Error(String(e)) }),
    )
  }, [])

  if (state.status === 'loading') return null
  if (state.status === 'error') return <BootFailed error={state.error} />
  return <Ready services={state.services} />
}

function Ready({ services }: { services: Services }) {
  const router = useMemo(() => buildRouter(), [])
  useEffect(() => {
    const offSync = installNotificationSync(
      { db: services.db, settings: services.settings, port: createNotificationPort(), permission: checkNotificationPermission },
      { onForeground, onBackground },
    )
    const offTap = onNotificationTap((route) => void router.navigate(route))
    return () => {
      offSync()
      offTap()
    }
  }, [services, router])
  return (
    <ServicesContext.Provider value={services}>
      <RouterProvider router={router} />
    </ServicesContext.Provider>
  )
}

/** Shown when the database cannot be opened or migrated. Data can still leave the device. */
function BootFailed({ error }: { error: Error }) {
  const [msg, setMsg] = useState<string | null>(null)
  const exportRaw = async () => {
    try {
      const db = await createAppDriver()
      const env = await exportDatabase(db, __APP_VERSION__)
      const saved = await saveExportFile(exportFilename(), serializeEnvelope(env))
      setMsg(`Saved to ${saved.location}`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <div className="screen stack">
      <h1 className="screen-title">Cannot start</h1>
      <div className="card">
        <div className="muted small">{error.message}</div>
      </div>
      <Button variant="primary" onClick={() => void exportRaw()}>
        Export data
      </Button>
      <Button onClick={() => location.reload()}>Retry</Button>
      {msg ? <div className="muted small">{msg}</div> : null}
    </div>
  )
}
