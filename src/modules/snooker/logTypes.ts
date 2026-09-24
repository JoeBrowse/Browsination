import type { LogTypeDef } from '@/core/logs/types'
import { LOG } from './repo'

export const snookerLogTypes: LogTypeDef[] = [
  { type: LOG.break, module: 'snooker', label: 'Break', addable: true, value: { label: 'Points', unit: 'points', min: 0 }, fields: [{ key: 'note', label: 'Note' }] },
  {
    type: LOG.attempt,
    module: 'snooker',
    label: 'Routine',
    value: { label: 'Score' },
    fields: [
      { key: 'routine', label: 'Routine' },
      { key: 'note', label: 'Note' },
    ],
  },
  { type: 'match_result', module: 'snooker', label: 'Frame result', value: { label: 'Result' } },
]
