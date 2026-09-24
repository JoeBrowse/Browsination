import type { LogTypeDef } from '@/core/logs/types'

export const lifeLogTypes: LogTypeDef[] = [
  { type: 'contact', module: 'life', label: 'Contact', fields: [{ key: 'name', label: 'Person' }] },
  {
    type: 'date_night',
    module: 'life',
    label: 'Date night',
    fields: [
      { key: 'title', label: 'What' },
      { key: 'spent_pence', label: 'Spent (pence)', kind: 'number' },
    ],
  },
  { type: 'admin_done', module: 'life', label: 'Admin done', fields: [{ key: 'name', label: 'What' }] },
]
