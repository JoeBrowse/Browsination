import { BarChart3, Inbox, LayoutGrid, Plus, Settings, Sun } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { QuickCapture } from './capture/QuickCapture'
import { useShell } from './shellStore'

const TABS = [
  { to: '/today', label: 'Today', Icon: Sun },
  { to: '/inbox', label: 'Inbox', Icon: Inbox },
  { to: '/modules', label: 'Modules', Icon: LayoutGrid },
  { to: '/insights', label: 'Insights', Icon: BarChart3 },
  { to: '/settings', label: 'Settings', Icon: Settings },
]

export function BottomNav() {
  return (
    <nav className="nav" aria-label="Main">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon size={22} aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

/** Global quick-capture button. Renders nothing until a feature registers a handler. */
export function QuickCaptureSlot() {
  const handler = useShell((s) => s.captureHandler)
  if (!handler) return null
  return (
    <button className="fab" aria-label="Quick capture" onClick={handler}>
      <Plus size={28} aria-hidden />
    </button>
  )
}

export function ToastHost() {
  const t = useShell((s) => s.toast)
  const clear = useShell((s) => s.clearToast)
  if (!t) return null
  return (
    <div className="toast" role="status">
      {t.message}
      {t.action ? (
        <button
          className="toast-action"
          onClick={() => {
            clear()
            void t.action?.run()
          }}
        >
          {t.action.label}
        </button>
      ) : null}
    </div>
  )
}

export function AppShell({ capture = true }: { capture?: boolean }) {
  return (
    <>
      <Outlet />
      {capture ? <QuickCapture /> : null}
      <QuickCaptureSlot />
      <BottomNav />
      <ToastHost />
    </>
  )
}
