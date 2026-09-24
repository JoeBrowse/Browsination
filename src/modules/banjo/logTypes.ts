import type { LogTypeDef } from '@/core/logs/types'
import { LOG } from './repo'

export const banjoLogTypes: LogTypeDef[] = [
  {
    type: LOG.practice,
    module: 'banjo',
    label: 'Practice',
    addable: true,
    value: { label: 'Minutes', unit: 'min', min: 1 },
    fields: [
      { key: 'worked_on', label: 'Worked on' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  {
    type: LOG.learn,
    module: 'banjo',
    label: 'Bars learned',
    value: { label: 'Bars', unit: 'bars', min: 1 },
    fields: [
      { key: 'from_bar', label: 'From bar', kind: 'number' },
      { key: 'to_bar', label: 'To bar', kind: 'number' },
    ],
  },
  { type: LOG.review, module: 'banjo', label: 'Chunk review', value: { label: 'Rating', min: 1, max: 3 } },
]
