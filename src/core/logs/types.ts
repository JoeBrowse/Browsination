import type { ComponentType } from 'react'
import type { ModuleId } from '../modules/types'
import type { LogEntry } from '../repos/logEntries'

export interface LogEditorProps {
  entry: LogEntry
  open: boolean
  onClose: () => void
}

/** A payload key shown as an editable field. */
export interface LogField {
  key: string
  /** One or two words. */
  label: string
  kind?: 'text' | 'number'
}

/**
 * How one log type is shown and edited. Owned by the module that writes the type (`logTypes` on
 * its ModuleDef), so the generic editor never has to know what a module means by a number.
 */
export interface LogTypeDef {
  type: string
  module: ModuleId | 'core'
  /** One or two words: 'Drink', 'Break', 'Practice'. */
  label: string
  /** The numeric column, when the type uses one. */
  value?: {
    label: string
    unit?: string
    step?: number
    min?: number
    max?: number
  }
  /** Payload keys worth editing. */
  fields?: LogField[]
  /** One per day: adding one for a day that already has an entry changes that entry. */
  daily?: boolean
  /** Offered in History's add list. Types that need an entity (a habit, a routine) are not. */
  addable?: boolean
  /** The module's own sheet, when a raw edit of the numbers would not add up (a drink's grams and units). */
  editor?: ComponentType<LogEditorProps>
}

export function valueLabel(def: LogTypeDef | undefined, e: { value: number | null; unit: string | null }): string {
  if (e.value == null) return ''
  const unit = def?.value?.unit ?? e.unit ?? ''
  const n = Number.isInteger(e.value) ? String(e.value) : e.value.toFixed(1)
  return unit ? `${n} ${unit}` : n
}

/**
 * One line for a history row: the number, then the text the payload carries. Numeric fields are
 * for the editor, not for the row, so they are left out and the line stays short.
 */
export function describeEntry(def: LogTypeDef | undefined, e: LogEntry): string {
  const bits: string[] = []
  const v = valueLabel(def, e)
  if (v) bits.push(v)
  for (const f of def?.fields ?? []) {
    if (f.kind === 'number') continue
    const raw = e.payload[f.key]
    if (typeof raw !== 'string' || raw === '') continue
    bits.push(raw)
  }
  return bits.slice(0, 3).join(' · ')
}

export const logTypeLabel = (def: LogTypeDef | undefined, type: string): string => def?.label ?? type
