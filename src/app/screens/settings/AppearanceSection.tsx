import type { Settings } from '@/core/settings/schema'
import { Card } from '@/core/ui/primitives'
import { applyTheme } from '@/core/ui/theme'
import { useQuery } from '@/core/ui/useQuery'
import { useServices } from '../../services'

const OPTIONS: Settings['theme'][] = ['dark', 'light', 'system']

export function AppearanceSection() {
  const s = useServices()
  const theme = useQuery(() => s.settings.get('theme'), ['settings'])
  const choose = (t: Settings['theme']) => {
    applyTheme(t)
    void s.settings.set('theme', t)
  }
  return (
    <Card>
      <div className="btn-row">
        {OPTIONS.map((t) => (
          <button key={t} className={`btn${theme.data === t ? ' primary' : ''}`} onClick={() => choose(t)} aria-pressed={theme.data === t}>
            {t}
          </button>
        ))}
      </div>
    </Card>
  )
}
