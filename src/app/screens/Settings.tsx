import { getModules } from '@/core/modules/registry'
import { Card, ModuleScope, Screen, SectionTitle } from '@/core/ui/primitives'
import { useServices } from '../services'
import { AppearanceSection } from './settings/AppearanceSection'
import { DataSection } from './settings/DataSection'
import { LockSection } from './settings/LockSection'
import { NotificationsSection } from './settings/NotificationsSection'
import { ReviewSection } from './settings/ReviewSection'

export function SettingsScreen() {
  const s = useServices()
  return (
    <Screen title="Settings">
      <SectionTitle>Data</SectionTitle>
      <DataSection />
      <SectionTitle>Notifications</SectionTitle>
      <NotificationsSection />
      <SectionTitle>Review and focus</SectionTitle>
      <ReviewSection />
      <SectionTitle>Lock</SectionTitle>
      <LockSection />
      {getModules()
        .flatMap((m) => (m.settings ? [{ m, Section: m.settings }] : []))
        .map(({ m, Section }) => (
          <ModuleScope key={m.id} accent={m.accent}>
            <SectionTitle>{m.name}</SectionTitle>
            <Section />
          </ModuleScope>
        ))}
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
