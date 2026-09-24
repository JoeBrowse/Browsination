import { FOCUS_LOG_TYPE } from '../focus/focusStore'
import type { LogTypeDef } from './types'

/** Log types core writes itself. Listed alongside the modules' own in History. */
export const CORE_LOG_TYPES: LogTypeDef[] = [
  {
    type: FOCUS_LOG_TYPE,
    module: 'core',
    label: 'Focus',
    value: { label: 'Minutes', unit: 'min', min: 1 },
    fields: [
      { key: 'title', label: 'On' },
      { key: 'planned_minutes', label: 'Planned', kind: 'number' },
    ],
  },
]
