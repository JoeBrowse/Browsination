import type { CSSProperties, ReactNode } from 'react'

export function Screen({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="screen">
      <h1 className="screen-title">
        {title}
        <span className="spacer" />
        {right}
      </h1>
      {children}
    </div>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="card" style={style}>
      {children}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="section-title">{children}</div>
}

export function Button({
  children,
  onClick,
  variant,
  disabled,
  block,
  type = 'button',
  ariaLabel,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'danger' | 'icon'
  disabled?: boolean
  block?: boolean
  type?: 'button' | 'submit'
  ariaLabel?: string
}) {
  const cls = ['btn', variant ?? '', block ? 'block' : ''].join(' ').trim()
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={checked} aria-label={label} className="toggle" onClick={() => onChange(!checked)} />
}

export function ListRow({ title, sub, right, onClick }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void }) {
  const body = (
    <>
      <div className="grow">
        <div className="title">{title}</div>
        {sub ? <div className="sub">{sub}</div> : null}
      </div>
      {right}
    </>
  )
  return onClick ? (
    <button className="list-row" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="list-row">{body}</div>
  )
}

/** Applies a module accent to everything inside. */
export function ModuleScope({ accent, children }: { accent: string; children: ReactNode }) {
  return <div style={{ '--accent': accent } as CSSProperties}>{children}</div>
}
