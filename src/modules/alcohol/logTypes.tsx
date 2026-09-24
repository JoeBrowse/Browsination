import type { LogEditorProps, LogTypeDef } from '@/core/logs/types'
import { CaffeineSheet } from './CaffeineSheet'
import { DrinkSheet } from './DrinkSheet'
import { LOG } from './repo'

/** History opens the module's own sheet for these, so the measures stay consistent. */
const drinkEditor = ({ entry, open, onClose }: LogEditorProps) => <DrinkSheet entry={entry} open={open} onClose={onClose} />
const caffeineEditor = ({ entry, open, onClose }: LogEditorProps) => <CaffeineSheet entry={entry} open={open} onClose={onClose} />

export const alcoholLogTypes: LogTypeDef[] = [
  {
    type: LOG.drink,
    module: 'alcohol',
    label: 'Drink',
    editor: drinkEditor,
    value: { label: 'Alcohol', unit: 'g', step: 0.1, min: 0 },
    fields: [
      { key: 'name', label: 'Drink' },
      { key: 'units', label: 'Units', kind: 'number' },
      { key: 'volume_ml', label: 'Volume (ml)', kind: 'number' },
      { key: 'abv', label: 'ABV %', kind: 'number' },
    ],
  },
  { type: LOG.caffeine, module: 'alcohol', label: 'Caffeine', editor: caffeineEditor, value: { label: 'Caffeine', unit: 'mg', min: 0 }, fields: [{ key: 'name', label: 'Name' }] },
  {
    type: LOG.medication,
    module: 'alcohol',
    label: 'Medication',
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'dose', label: 'Dose' },
    ],
  },
  { type: LOG.morningAfter, module: 'alcohol', label: 'Morning after', daily: true, addable: true, value: { label: 'Score', min: 1, max: 5 } },
]
