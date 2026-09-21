/* Generated from Iron Log v1.23.0 (src/App.jsx) by the Stage 10 port: recovery windows, activity types and implements. Data only; edit the source table, not this file. */
/** Hours a muscle needs: [direct 0-1 RIR, direct 2+ RIR, indirect 0-1 RIR, indirect 2+ RIR]. */
export const RECOVERY_WINDOWS: Record<string, [number, number, number, number]> = {"Lower Back":[96,60,48,30],"Quads":[84,54,36,24],"Hamstrings":[84,54,36,24],"Glutes":[84,54,42,24],"Chest":[60,42,36,20],"Back":[60,42,36,20],"Triceps":[60,36,30,18],"Biceps":[60,36,30,18],"Traps":[48,36,24,16],"Front Delts":[48,30,24,12],"Side Delts":[36,24,18,12],"Rear Delts":[36,24,18,12],"Forearms":[36,24,18,12],"Calves":[36,24,18,12],"Core":[36,24,18,12],"Shins":[36,24,18,12]}
export const DEFAULT_RECOVERY_WINDOW: [number, number, number, number] = [60, 42, 36, 20]
/** Amber is the last day before ready, whatever the muscle. */
export const AMBER_LEAD_HOURS = 24

export const RECOVERY_PACES: readonly { value: 'faster' | 'normal' | 'slower'; label: string; factor: number }[] = [
  { value: 'faster', label: 'Faster', factor: 0.75 },
  { value: 'normal', label: 'Normal', factor: 1 },
  { value: 'slower', label: 'Slower', factor: 1.35 },
]

export interface ActivityType {
  id: string
  label: string
  primary: string[]
  secondary: string[]
  pace: string | null
}
export const ACTIVITY_TYPES: readonly ActivityType[] = [{"id":"run","label":"Run","primary":["Quads","Calves","Hamstrings"],"secondary":["Glutes","Shins","Core"],"pace":"min/km"},{"id":"walk","label":"Walk","primary":[],"secondary":["Calves","Quads","Glutes"],"pace":"min/km"},{"id":"cycle","label":"Cycle","primary":["Quads"],"secondary":["Glutes","Hamstrings","Calves"],"pace":"km/h"},{"id":"other","label":"Other","primary":[],"secondary":[],"pace":null}]
/** RPE 9 is one rep in reserve, which counts as hard. */
export const HARD_ACTIVITY_RPE = 9

/** One movement, several ways to load it; the first is the default. */
export const EXERCISE_METHODS: Record<string, string[]> = {"bench-press":["Barbell","Dumbbell","Smith Machine","Machine"],"incline-press":["Dumbbell","Barbell","Smith Machine","Machine"],"bent-over-row":["Barbell","Dumbbell","Smith Machine"],"chest-supported-row":["Machine","Dumbbell"],"pullover":["Dumbbell","Cable"],"overhead-press":["Barbell","Dumbbell","Smith Machine","Machine"],"front-raise":["Dumbbell","Cable","Barbell"],"lateral-raise":["Cable","Dumbbell","Machine"],"upright-row":["Cable","Barbell","Dumbbell","Smith Machine"],"reverse-fly":["Cable","Dumbbell","Machine"],"preacher-curl":["EZ Bar","Dumbbell","Machine","Cable"],"hammer-curl":["Dumbbell","Cable"],"eugene-curl":["Cable","Dumbbell"],"reverse-eugene-curl":["Cable","Dumbbell"],"overhead-extension":["Cable","Dumbbell","EZ Bar"],"skull-crusher":["Dumbbell","EZ Bar","Barbell"],"close-grip-bench":["Barbell","Smith Machine"],"squat":["Back","Front","Hack","Smith Machine"],"lunge":["Dumbbell","Barbell","Smith Machine"],"romanian-deadlift":["Barbell","Dumbbell","Smith Machine"],"good-morning":["Barbell","Smith Machine"],"hip-thrust":["Barbell","Smith Machine","Machine","Dumbbell"],"bulgarian-split-squat":["Dumbbell","Barbell","Smith Machine"],"reverse-lunge":["Dumbbell","Barbell","Smith Machine"],"hip-abduction":["Machine","Cable"],"hip-adduction":["Machine","Cable"],"standing-calf-raise":["Machine","Smith Machine","Dumbbell"],"tibialis-raise":["Kettlebell","Machine","Bodyweight"],"reverse-curl":["Barbell","EZ Bar","Dumbbell","Cable"],"wrist-curl":["Dumbbell","Barbell"],"reverse-wrist-curl":["Dumbbell","Barbell"],"shrug":["Dumbbell","Barbell","Smith Machine","Machine","Cable"],"farmers-carry":["Kettlebell","Dumbbell","Barbell"],"deadlift":["Barbell","Dumbbell","Smith Machine"]}
export const CALISTHENIC_LOADINGS: Record<string, string[]> = {"dips":["Bodyweight","Assisted","Weighted"],"pull-ups":["Bodyweight","Assisted","Weighted"],"push-up":["Bodyweight","Assisted","Weighted"],"nordic-curl":["Bodyweight","Assisted","Weighted"],"hanging-leg-raise":["Bodyweight","Weighted"],"reverse-crunch":["Bodyweight","Weighted"],"ab-wheel":["Bodyweight","Weighted"],"plank":["Bodyweight","Weighted"],"dead-hang":["Bodyweight","Weighted"],"seated-dips":["Bodyweight","Weighted"],"back-extension":["Bodyweight","Weighted"],"glute-ham-raise":["Bodyweight","Weighted"]}
