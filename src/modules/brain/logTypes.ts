import type { LogTypeDef } from '@/core/logs/types'
import { LOG } from './repo'

/** Every brain log type, for the History editor. */
export const brainLogTypes: LogTypeDef[] = [
  { type: LOG.mood, module: 'brain', label: 'Mood', daily: true, addable: true, value: { label: 'Mood', min: 1, max: 5 }, fields: [{ key: 'note', label: 'Note' }] },
  {
    type: LOG.sleep,
    module: 'brain',
    label: 'Sleep',
    daily: true,
    addable: true,
    value: { label: 'Hours', unit: 'h', step: 0.25, min: 0, max: 24 },
    fields: [
      { key: 'bed_at', label: 'Bed' },
      { key: 'wake_at', label: 'Woke' },
      { key: 'quality', label: 'Quality', kind: 'number' },
    ],
  },
  { type: LOG.meditation, module: 'brain', label: 'Meditation', addable: true, value: { label: 'Minutes', unit: 'min', min: 0 } },
  { type: LOG.stretch, module: 'brain', label: 'Stretch', daily: true, addable: true },
  { type: LOG.habit, module: 'brain', label: 'Habit', fields: [{ key: 'name', label: 'Habit' }] },
]
