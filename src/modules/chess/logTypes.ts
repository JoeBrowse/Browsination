import type { LogTypeDef } from '@/core/logs/types'

export const chessLogTypes: LogTypeDef[] = [
  {
    type: 'match_result',
    module: 'chess',
    label: 'Match result',
    value: { label: 'Result', min: 0, max: 1, step: 0.5 },
    fields: [
      { key: 'opponent', label: 'Opponent' },
      { key: 'colour', label: 'Colour' },
      { key: 'board', label: 'Board', kind: 'number' },
    ],
  },
]
