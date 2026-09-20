import { Card, Screen, SectionTitle } from '@/core/ui/primitives'
import { useServices } from '../services'
import { AppearanceSection } from './settings/AppearanceSection'
import { DataSection } from './settings/DataSection'
import { NotificationsSection } from './settings/NotificationsSection'

export function SettingsScreen() {
  const s = useServices()
  return (
    <Screen title="Settings">
      <SectionTitle>Data</SectionTitle>
      <DataSection />
      <SectionTitle>Notifications</SectionTitle>
      <NotificationsSection />
      <SectionTitle>Appearance</SectionTitle>
      <AppearanceSection />
      <SectionTitle>About</SectionTitle>
      <Card>
        <div className="kv">
          <span>Version</span>
          <span className="muted">{s.appVersion}</span>
        </div>
        <div className="kv">
          <span>Schema</span>
          <span className="muted">v{s.schemaVersion}</span>
        </div>
      </Card>
    </Screen>
  )
}
