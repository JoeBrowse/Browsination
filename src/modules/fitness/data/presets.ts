/* Generated from Iron Log v1.23.0 (src/App.jsx) by the Stage 10 port: splits, programme presets and block lengths. Data only; edit the source table, not this file. */
export interface PresetExercise {
  id: string
  variant?: string
}
export interface PresetDay {
  name: string
  muscles: string[]
  exercises: PresetExercise[]
}
export interface ProgrammePreset {
  key: string
  name: string
  blurb: string
  days: PresetDay[]
}

/** Muscle groups a split covers, for picking a session by hand. */
export const SPLITS: Record<string, string[]> = {"Full Body":["Chest","Back","Front Delts","Side Delts","Quads","Hamstrings","Glutes","Biceps","Triceps","Core","Calves"],"Upper":["Chest","Back","Front Delts","Side Delts","Rear Delts","Biceps","Triceps","Traps","Forearms"],"Lower":["Quads","Hamstrings","Glutes","Calves","Lower Back","Shins"],"Push":["Chest","Front Delts","Side Delts","Triceps"],"Pull":["Back","Lower Back","Biceps","Rear Delts","Traps","Forearms"],"Legs":["Quads","Hamstrings","Glutes","Calves","Shins","Core"]}

export const PROGRAMME_PRESETS: readonly ProgrammePreset[] = [
  {
    key: "pplul",
    name: "Push Pull Legs Upper Lower",
    blurb: "5 sessions over ~7 days — PPL plus dedicated upper/lower days for extra frequency.",
    days: [
      { name: "Push", muscles: ["Chest","Front Delts","Side Delts","Triceps"], exercises: [{"id":"bench-press"},{"id":"incline-press"},{"id":"overhead-press"},{"id":"lateral-raise"},{"id":"pushdown"},{"id":"overhead-extension"}] },
      { name: "Pull", muscles: ["Back","Rear Delts","Biceps"], exercises: [{"id":"pull-ups"},{"id":"bent-over-row"},{"id":"face-pull"},{"id":"cable-curl"},{"id":"hammer-curl"}] },
      { name: "Legs", muscles: ["Quads","Hamstrings","Calves"], exercises: [{"id":"squat"},{"id":"romanian-deadlift"},{"id":"leg-extension"},{"id":"leg-curl"},{"id":"standing-calf-raise"}] },
      { name: "Upper", muscles: ["Chest","Back","Front Delts","Side Delts","Biceps","Triceps"], exercises: [{"id":"incline-press"},{"id":"cable-row"},{"id":"overhead-press"},{"id":"lateral-raise"},{"id":"cable-curl"},{"id":"pushdown"}] },
      { name: "Lower", muscles: ["Quads","Hamstrings","Glutes","Calves"], exercises: [{"id":"squat","variant":"Front"},{"id":"good-morning"},{"id":"hip-thrust"},{"id":"lunge"},{"id":"glute-ham-raise"},{"id":"seated-calf-raise"}] },
    ],
  },
  {
    key: "ppl",
    name: "Push Pull Legs",
    blurb: "The classic 3-day rotation. Run it once or twice per week.",
    days: [
      { name: "Push", muscles: ["Chest","Front Delts","Side Delts","Triceps"], exercises: [{"id":"bench-press"},{"id":"incline-press"},{"id":"overhead-press"},{"id":"lateral-raise"},{"id":"pushdown"},{"id":"overhead-extension"}] },
      { name: "Pull", muscles: ["Back","Rear Delts","Biceps"], exercises: [{"id":"deadlift"},{"id":"pull-ups"},{"id":"bent-over-row"},{"id":"face-pull"},{"id":"cable-curl"},{"id":"hammer-curl"}] },
      { name: "Legs", muscles: ["Quads","Hamstrings","Calves"], exercises: [{"id":"squat"},{"id":"romanian-deadlift"},{"id":"leg-press"},{"id":"leg-curl"},{"id":"leg-extension"},{"id":"standing-calf-raise"}] },
    ],
  },
  {
    key: "upper-lower",
    name: "Upper Lower",
    blurb: "4 sessions/week hitting each half twice. Balanced and simple.",
    days: [
      { name: "Upper", muscles: ["Chest","Back","Front Delts","Side Delts","Biceps","Triceps"], exercises: [{"id":"bench-press"},{"id":"bent-over-row"},{"id":"overhead-press"},{"id":"lat-pulldown"},{"id":"lateral-raise"},{"id":"cable-curl"},{"id":"pushdown"}] },
      { name: "Lower", muscles: ["Quads","Hamstrings","Glutes","Calves"], exercises: [{"id":"squat"},{"id":"romanian-deadlift"},{"id":"leg-press"},{"id":"leg-curl"},{"id":"hip-thrust"},{"id":"standing-calf-raise"}] },
    ],
  },
  {
    key: "full-body",
    name: "Full Body",
    blurb: "Two alternating full-body sessions, 3x/week. Simple, heavy, effective.",
    days: [
      { name: "Full Body A", muscles: ["Quads","Chest","Back"], exercises: [{"id":"squat"},{"id":"bench-press"},{"id":"bent-over-row"}] },
      { name: "Full Body B", muscles: ["Quads","Front Delts","Back"], exercises: [{"id":"squat"},{"id":"overhead-press"},{"id":"deadlift"}] },
    ],
  },
  {
    key: "bro",
    name: "Bro Split",
    blurb: "One muscle group per day, 5 days. Maximum focus per session.",
    days: [
      { name: "Chest", muscles: ["Chest"], exercises: [{"id":"bench-press"},{"id":"incline-press"},{"id":"dips"},{"id":"cable-fly"},{"id":"pec-deck"}] },
      { name: "Back", muscles: ["Back"], exercises: [{"id":"deadlift"},{"id":"pull-ups"},{"id":"bent-over-row"},{"id":"lat-pulldown"},{"id":"straight-arm-pulldown"}] },
      { name: "Shoulders", muscles: ["Front Delts","Side Delts","Rear Delts"], exercises: [{"id":"overhead-press"},{"id":"lateral-raise"},{"id":"face-pull"},{"id":"reverse-fly"}] },
      { name: "Legs", muscles: ["Quads","Hamstrings","Calves"], exercises: [{"id":"squat"},{"id":"romanian-deadlift"},{"id":"leg-press"},{"id":"leg-curl"},{"id":"leg-extension"},{"id":"standing-calf-raise"}] },
      { name: "Arms", muscles: ["Biceps","Triceps"], exercises: [{"id":"cable-curl"},{"id":"incline-curl"},{"id":"hammer-curl"},{"id":"pushdown"},{"id":"skull-crusher"},{"id":"overhead-extension"}] },
    ],
  },
  {
    key: "arnold",
    name: "Arnold Split",
    blurb: "6 sessions/week: Chest & Back, Shoulders & Arms, Legs — repeated twice. High volume, old-school.",
    days: [
      { name: "Chest & Back", muscles: ["Chest","Back"], exercises: [{"id":"bench-press"},{"id":"incline-press"},{"id":"dips"},{"id":"pull-ups"},{"id":"bent-over-row"},{"id":"straight-arm-pulldown"}] },
      { name: "Shoulders & Arms", muscles: ["Front Delts","Side Delts","Rear Delts","Biceps","Triceps"], exercises: [{"id":"overhead-press"},{"id":"close-grip-bench"},{"id":"lateral-raise"},{"id":"face-pull"},{"id":"cable-curl"},{"id":"preacher-curl"},{"id":"pushdown"}] },
      { name: "Legs", muscles: ["Quads","Hamstrings","Calves"], exercises: [{"id":"squat"},{"id":"leg-press"},{"id":"leg-extension"},{"id":"romanian-deadlift"},{"id":"leg-curl"},{"id":"standing-calf-raise"},{"id":"seated-calf-raise"}] },
    ],
  },
  {
    key: "project-arms",
    name: "Project Arms",
    blurb: "Upper, lower, arms — twice through, with a rest day after each block. Two dedicated arm sessions a week and direct forearm and grip work.",
    days: [
      { name: "Upper A", muscles: ["Back","Chest","Front Delts","Side Delts","Rear Delts"], exercises: [{"id":"pull-ups"},{"id":"bench-press"},{"id":"overhead-press"},{"id":"cable-fly"},{"id":"lateral-raise"},{"id":"face-pull"}] },
      { name: "Lower A", muscles: ["Quads","Hamstrings","Glutes","Calves","Core"], exercises: [{"id":"squat","variant":"Hack"},{"id":"romanian-deadlift"},{"id":"hip-thrust"},{"id":"hip-adduction"},{"id":"standing-calf-raise"},{"id":"cable-crunch"}] },
      { name: "Arms A", muscles: ["Triceps","Biceps","Forearms","Traps"], exercises: [{"id":"overhead-extension"},{"id":"cable-curl"},{"id":"hammer-curl"},{"id":"wrist-curl"},{"id":"reverse-wrist-curl"},{"id":"farmers-carry"}] },
      { name: "Upper B", muscles: ["Chest","Back","Side Delts","Rear Delts"], exercises: [{"id":"incline-press"},{"id":"bent-over-row"},{"id":"dips"},{"id":"lat-pulldown"},{"id":"lateral-raise"},{"id":"reverse-fly"}] },
      { name: "Lower B", muscles: ["Quads","Hamstrings","Glutes","Shins","Core"], exercises: [{"id":"leg-press"},{"id":"leg-curl"},{"id":"leg-extension"},{"id":"hip-abduction"},{"id":"tibialis-raise"},{"id":"hanging-leg-raise"}] },
      { name: "Arms B", muscles: ["Triceps","Biceps","Forearms"], exercises: [{"id":"pushdown"},{"id":"preacher-curl"},{"id":"reverse-curl"},{"id":"eugene-curl"},{"id":"reverse-eugene-curl"},{"id":"plate-pinch"}] },
    ],
  },
  {
    key: "custom",
    name: "Custom",
    blurb: "Build your own days from scratch.",
    days: [
    ],
  },
]

export const PROGRAMME_LENGTHS: readonly { weeks: number; label: string; desc: string; recommended?: boolean }[] = [{"weeks":4,"label":"4 weeks","desc":"Short block or a test run."},{"weeks":6,"label":"6 weeks","desc":"Recommended — long enough to progress, short enough to stay fresh.","recommended":true},{"weeks":8,"label":"8 weeks","desc":"Recommended — a full training block with room to peak.","recommended":true},{"weeks":12,"label":"12 weeks","desc":"Long build. Consider a deload around the midpoint."}]
