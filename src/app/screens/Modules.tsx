import { Link } from 'react-router'
import { getModules, modulePath } from '@/core/modules/registry'
import { EmptyState, Screen } from '@/core/ui/primitives'

/** Phone-style app tray: one tile per module, obvious symbol, one-word name. */
export function ModulesScreen() {
  const modules = getModules()
  return (
    <Screen title="Modules">
      {modules.length === 0 ? <EmptyState>No modules yet</EmptyState> : null}
      <div className="tray">
        {modules.map((m) => (
          <Link key={m.id} to={modulePath(m.id)} className="tile" style={{ '--accent': m.accent } as React.CSSProperties}>
            <span className="tile-icon">
              <m.icon size={30} aria-hidden />
            </span>
            <span className="label">{m.name}</span>
          </Link>
        ))}
      </div>
    </Screen>
  )
}
