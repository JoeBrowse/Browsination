import type { ReactNode } from 'react'

/** Bottom sheet. Tap the backdrop to close. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        {title ? <h2>{title}</h2> : null}
        {children}
      </div>
    </div>
  )
}
