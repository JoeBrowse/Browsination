import { gramsOf, ukUnitsOf } from './model'

export interface DrinkPreset {
  key: string
  label: string
  volumeMl: number
  abv: number
}

/** UK measures. ABV is the usual default; the sheet lets it be changed before logging. */
export const DRINK_PRESETS: DrinkPreset[] = [
  { key: 'pint', label: 'Pint', volumeMl: 568, abv: 4.5 },
  { key: 'half', label: 'Half', volumeMl: 284, abv: 4.5 },
  { key: 'bottle', label: 'Bottle', volumeMl: 330, abv: 5 },
  { key: 'can', label: 'Can', volumeMl: 440, abv: 4.8 },
  { key: 'wine-small', label: 'Wine 125', volumeMl: 125, abv: 12.5 },
  { key: 'wine-medium', label: 'Wine 175', volumeMl: 175, abv: 12.5 },
  { key: 'wine-large', label: 'Wine 250', volumeMl: 250, abv: 12.5 },
  { key: 'single', label: 'Single', volumeMl: 25, abv: 40 },
  { key: 'double', label: 'Double', volumeMl: 50, abv: 40 },
  { key: 'custom', label: 'Custom', volumeMl: 330, abv: 5 },
]

export interface DrinkSpec {
  preset: string
  name: string
  volumeMl: number
  abv: number
}

export function drinkMeasures(spec: { volumeMl: number; abv: number }): { grams: number; units: number } {
  return { grams: Math.round(gramsOf(spec.volumeMl, spec.abv) * 100) / 100, units: Math.round(ukUnitsOf(spec.volumeMl, spec.abv) * 100) / 100 }
}

export function describeDrink(spec: DrinkSpec): string {
  return `${spec.name || spec.preset} ${spec.volumeMl}ml ${spec.abv}%`
}
