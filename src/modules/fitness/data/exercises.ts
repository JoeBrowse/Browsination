/* Generated from Iron Log v1.23.0 (src/App.jsx) by the Stage 10 port: the exercise database, aliases and secondary muscles. Data only; edit the source table, not this file. */
export type ExerciseType = 'compound' | 'isolation' | 'mobility'
export interface ExerciseDef {
  id: string
  name: string
  muscle: string
  type: ExerciseType
  pattern: string
  cue: string
}

/** Muscle groups in the order the app lists them. */
export const MUSCLES: readonly string[] = ["Chest","Back","Front Delts","Side Delts","Rear Delts","Biceps","Triceps","Quads","Hamstrings","Glutes","Calves","Shins","Forearms","Traps","Core","Lower Back"]

export const EXERCISES: readonly ExerciseDef[] = [
  { id: "bench-press", name: "Bench Press", muscle: "Chest", type: "compound", pattern: "press", cue: "Shoulder blades pinned back and down, lower to the lower chest, press without letting the elbows flare to 90." },
  { id: "incline-press", name: "Incline Press", muscle: "Chest", type: "compound", pattern: "press-incline", cue: "Bench at 30-45 degrees. Any steeper and it becomes a shoulder press." },
  { id: "dips", name: "Dips", muscle: "Chest", type: "compound", pattern: "press-dip", cue: "Lean the torso forward and let the elbows travel out a little — upright and tucked turns it into a triceps exercise." },
  { id: "cable-fly", name: "Cable Fly", muscle: "Chest", type: "isolation", pattern: "fly", cue: "Soft elbow bend held throughout, bring the hands together and slightly across, resist the stretch on the way back." },
  { id: "pec-deck", name: "Pec Deck", muscle: "Chest", type: "isolation", pattern: "fly", cue: "Set the seat so the handles sit at chest height, squeeze for a beat at the middle, control the return." },
  { id: "push-up", name: "Push-Up", muscle: "Chest", type: "compound", pattern: "press-bodyweight", cue: "Straight line from shoulders to ankles, chest to the floor, elbows at about 45 degrees rather than flared." },
  { id: "pull-ups", name: "Pull-Up", muscle: "Back", type: "compound", pattern: "vertical-pull", cue: "Full dead hang at the bottom, drive the elbows down and back, pause at the top before lowering under control." },
  { id: "bent-over-row", name: "Bent-Over Row", muscle: "Back", type: "compound", pattern: "horizontal-pull", cue: "Hinge to about 45 degrees and hold it, row to the belly button, squeeze the shoulder blades before lowering slowly." },
  { id: "lat-pulldown", name: "Lat Pulldown", muscle: "Back", type: "compound", pattern: "vertical-pull", cue: "Lead with the elbows, pull to the upper chest, resist all the way back up rather than letting it snap." },
  { id: "chest-supported-row", name: "Chest-Supported Row", muscle: "Back", type: "compound", pattern: "horizontal-pull", cue: "Chest stays on the pad the whole set — if you have to peel off it to finish a rep, the weight is too heavy." },
  { id: "cable-row", name: "Seated Cable Row", muscle: "Back", type: "compound", pattern: "horizontal-pull", cue: "Row to the torso with the elbows close, pause a second squeezing the shoulder blades together, stay upright." },
  { id: "db-row", name: "Dumbbell Row", muscle: "Back", type: "compound", pattern: "horizontal-pull", cue: "Stretch fully at the bottom, pull the elbow toward the hip, keep the torso square rather than twisting into it." },
  { id: "straight-arm-pulldown", name: "Straight-Arm Pulldown", muscle: "Back", type: "isolation", pattern: "isolation-pull", cue: "Arms almost straight throughout, pull from the lats not the triceps, stop when the bar reaches the thighs." },
  { id: "pullover", name: "Pullover", muscle: "Back", type: "isolation", pattern: "pullover", cue: "Ribs down, stretch overhead without arching the lower back, pull back over with the arms nearly locked." },
  { id: "overhead-press", name: "Overhead Press", muscle: "Front Delts", type: "compound", pattern: "press-overhead", cue: "Brace hard before the rep, press straight past the face, finish with the biceps by the ears." },
  { id: "front-raise", name: "Front Raise", muscle: "Front Delts", type: "isolation", pattern: "front-raise", cue: "Raise to shoulder height with a soft elbow, no swing from the hips, lower slower than you lifted." },
  { id: "lateral-raise", name: "Lateral Raise", muscle: "Side Delts", type: "isolation", pattern: "lateral", cue: "Lead with the elbow rather than the hand, stop at shoulder height, fight the weight all the way down." },
  { id: "upright-row", name: "Upright Row", muscle: "Side Delts", type: "compound", pattern: "upright-row", cue: "Pull to chest height leading with the elbows. If the shoulder pinches, widen the grip or drop the height." },
  { id: "reverse-fly", name: "Reverse Fly", muscle: "Rear Delts", type: "isolation", pattern: "rear-fly", cue: "Open the arms wide with a fixed elbow angle, think about pulling the hands apart, do not shrug into it." },
  { id: "face-pull", name: "Face Pull", muscle: "Rear Delts", type: "isolation", pattern: "rear-pull", cue: "Pull to eye level and rotate the hands back at the finish, squeeze, keep the elbows high throughout." },
  { id: "preacher-curl", name: "Preacher Curl", muscle: "Biceps", type: "isolation", pattern: "curl-strict", cue: "Armpits into the top of the pad, stop just short of lockout at the bottom to keep tension, squeeze at the top." },
  { id: "cable-curl", name: "Cable Curl", muscle: "Biceps", type: "isolation", pattern: "curl-standard", cue: "Constant tension is the point — control the lowering as deliberately as the lift, elbows pinned to the sides." },
  { id: "hammer-curl", name: "Hammer Curl", muscle: "Biceps", type: "isolation", pattern: "curl-hammer", cue: "Neutral grip throughout, no swing. The slow negative is what builds the brachialis underneath the bicep." },
  { id: "incline-curl", name: "Incline Curl", muscle: "Biceps", type: "isolation", pattern: "curl-stretch", cue: "Let the arms hang behind the body for a full stretch, curl without the shoulders drifting forward." },
  { id: "overhead-extension", name: "Overhead Extension", muscle: "Triceps", type: "isolation", pattern: "extension-overhead", cue: "Elbows stay pointed forward and still. The stretch overhead is where the long head does its work." },
  { id: "pushdown", name: "Pushdown", muscle: "Triceps", type: "isolation", pattern: "extension-pushdown", cue: "Upper arms locked to the ribs, extend fully, let it come back only as far as the elbows can stay put." },
  { id: "seated-dips", name: "Seated Dips", muscle: "Triceps", type: "compound", pattern: "press-dip", cue: "Stay upright with the elbows tucked — the whole point is to keep the load on the triceps rather than the chest." },
  { id: "skull-crusher", name: "Skull Crusher", muscle: "Triceps", type: "isolation", pattern: "extension-lying", cue: "Lower behind the head rather than to the forehead, elbows still, extend without letting them drift apart." },
  { id: "close-grip-bench", name: "Close-Grip Bench Press", muscle: "Triceps", type: "compound", pattern: "press", cue: "Hands roughly shoulder width — narrower wrecks the wrists. Elbows tucked, bar to the lower chest." },
  { id: "hack-dips", name: "Hack Dips", muscle: "Triceps", type: "compound", pattern: "press-dip", cue: "Back flat against the pad, press through the heels of the hands, lock out without shrugging." },
  { id: "squat", name: "Squat", muscle: "Quads", type: "compound", pattern: "squat", cue: "Brace before you unrack. Sit between the hips, knees tracking over the toes, drive the floor away." },
  { id: "leg-extension", name: "Leg Extension", muscle: "Quads", type: "isolation", pattern: "isolation-extension", cue: "Pin the knee joint level with the machine pivot, squeeze hard at the top, lower under control." },
  { id: "leg-press", name: "Leg Press", muscle: "Quads", type: "compound", pattern: "leg-press", cue: "Feet mid-platform, knees tracking over the toes, stop before the lower back rounds off the pad." },
  { id: "lunge", name: "Lunge", muscle: "Quads", type: "compound", pattern: "lunge", cue: "Step out far enough that the front shin stays near vertical, lower until the back knee grazes the floor." },
  { id: "romanian-deadlift", name: "Romanian Deadlift", muscle: "Hamstrings", type: "compound", pattern: "hinge", cue: "Push the hips back with soft knees, bar dragging the legs, stop where the hamstrings stop and the back starts." },
  { id: "seated-leg-curl", name: "Seated Leg Curl", muscle: "Hamstrings", type: "isolation", pattern: "flexion-seated", cue: "Hips stay down in the seat. The stretched position at the top is where seated curls earn their keep." },
  { id: "leg-curl", name: "Lying Leg Curl", muscle: "Hamstrings", type: "isolation", pattern: "flexion", cue: "Hips pressed into the pad, curl all the way, resist the return rather than letting the stack drop." },
  { id: "nordic-curl", name: "Nordic Curl", muscle: "Hamstrings", type: "isolation", pattern: "flexion", cue: "Lower as slowly as you can hold, hips locked straight, catch with the hands only when you have to." },
  { id: "good-morning", name: "Good Morning", muscle: "Hamstrings", type: "compound", pattern: "hinge", cue: "Light. Hinge at the hips with a neutral spine and stand by driving the hips forward, not by pulling with the back." },
  { id: "glute-ham-raise", name: "Glute-Ham Raise", muscle: "Hamstrings", type: "compound", pattern: "flexion", cue: "Hips stay extended throughout — bending at the hip turns it into a back raise. Lower slowly, pull with the hamstrings." },
  { id: "hip-thrust", name: "Hip Thrust", muscle: "Glutes", type: "compound", pattern: "hip-extension", cue: "Chin tucked, ribs down, drive through the heels to full lockout and hold the squeeze for a beat." },
  { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", muscle: "Glutes", type: "compound", pattern: "unilateral-squat", cue: "Front foot far enough forward to lean slightly into it, drop straight down, drive through the whole front foot." },
  { id: "cable-kickback", name: "Cable Kickback", muscle: "Glutes", type: "isolation", pattern: "isolation-extension", cue: "Keep the working knee slightly bent, drive from the hip alone, do not arch the lower back to get more range." },
  { id: "reverse-lunge", name: "Reverse Lunge", muscle: "Glutes", type: "compound", pattern: "lunge", cue: "Step back and lower under control, keep the weight in the front heel, drive back to standing without pushing off the back foot." },
  { id: "hip-abduction", name: "Hip Abduction", muscle: "Glutes", type: "isolation", pattern: "abduction", cue: "Lean the torso forward a touch to bias the upper glute, push out slowly, control the way back in." },
  { id: "hip-adduction", name: "Hip Adduction", muscle: "Glutes", type: "isolation", pattern: "adduction", cue: "Let the legs open until you feel the stretch on the inner thigh, squeeze them together without rocking the hips." },
  { id: "standing-calf-raise", name: "Standing Calf Raise", muscle: "Calves", type: "isolation", pattern: "standing", cue: "Full stretch at the bottom, all the way up onto the toes, pause at both ends rather than bouncing." },
  { id: "seated-calf-raise", name: "Seated Calf Raise", muscle: "Calves", type: "isolation", pattern: "seated", cue: "Knees bent puts the soleus to work, so go slow and hold the top. Speed gets you nothing here." },
  { id: "tibialis-raise", name: "Tibialis Raise", muscle: "Shins", type: "isolation", pattern: "tibialis", cue: "Heels planted, pull the toes up as far as they go, lower slowly. It will cramp before it fails at first." },
  { id: "reverse-curl", name: "Reverse Curl", muscle: "Forearms", type: "isolation", pattern: "curl-reverse", cue: "Overhand grip, wrists locked straight, curl without letting them break backward. Lighter than you think." },
  { id: "eugene-curl", name: "Eugene Curl", muscle: "Forearms", type: "isolation", pattern: "curl-reverse", cue: "Elbow stays behind the torso the whole set. The stretch at the bottom is the point, so keep it light and honest." },
  { id: "reverse-eugene-curl", name: "Reverse Eugene Curl", muscle: "Forearms", type: "isolation", pattern: "curl-reverse", cue: "Same elbow-behind-the-body position as the Eugene curl, overhand. Hits the brachioradialis in a deep stretch." },
  { id: "wrist-curl", name: "Wrist Curl", muscle: "Forearms", type: "isolation", pattern: "flexion-wrist", cue: "Forearms braced on a bench or the thighs, move only at the wrist, let it roll to the fingertips at the bottom." },
  { id: "reverse-wrist-curl", name: "Reverse Wrist Curl", muscle: "Forearms", type: "isolation", pattern: "extension-wrist", cue: "Palms down, forearms still, lift with the back of the hand. Very light — the range is tiny." },
  { id: "plate-pinch", name: "Plate Pinch", muscle: "Forearms", type: "isolation", pattern: "isometric-grip", cue: "Pinch the smooth sides together, stand tall, hold for time. Stop the set when the fingers start to open." },
  { id: "dead-hang", name: "Dead Hang", muscle: "Forearms", type: "isolation", pattern: "isometric", cue: "Relax into a full hang, breathe steadily, hold for time rather than reps." },
  { id: "shrug", name: "Shrug", muscle: "Traps", type: "isolation", pattern: "shrug", cue: "Straight up and down — rolling the shoulders adds nothing. Hold the top for a second on every rep." },
  { id: "farmers-carry", name: "Farmer's Carry", muscle: "Traps", type: "compound", pattern: "carry", cue: "Stand tall, shoulders back, grip hard and take short controlled steps. Carry for distance or time." },
  { id: "cable-crunch", name: "Cable Crunch", muscle: "Core", type: "isolation", pattern: "flexion", cue: "Hips fixed — crunch the ribs toward the pelvis rather than bending at the hip. Squeeze hard at the bottom." },
  { id: "hanging-leg-raise", name: "Hanging Leg Raise", muscle: "Core", type: "isolation", pattern: "flexion", cue: "Curl the pelvis up rather than just lifting the legs, and stop the swing completely between reps." },
  { id: "wood-chop", name: "Cable Woodchop", muscle: "Core", type: "isolation", pattern: "rotation", cue: "Rotate through the torso with the arms staying long, hips turning with it, control the way back." },
  { id: "ab-wheel", name: "Ab Wheel", muscle: "Core", type: "compound", pattern: "anti-extension", cue: "Ribs down and hips tucked before you roll. Go only as far as you can hold that position, not as far as you can reach." },
  { id: "reverse-crunch", name: "Reverse Crunch", muscle: "Core", type: "isolation", pattern: "flexion", cue: "Lift the hips off the floor rather than swinging the knees, and lower one vertebra at a time." },
  { id: "plank", name: "Plank", muscle: "Core", type: "isolation", pattern: "isometric", cue: "Squeeze the glutes and tuck the hips. A hard 30 seconds beats a sagging two minutes." },
  { id: "deadlift", name: "Deadlift", muscle: "Lower Back", type: "compound", pattern: "hinge", cue: "Brace hard before every rep, bar against the shins, push the floor away rather than pulling with the back." },
  { id: "back-extension", name: "45° Back Extension", muscle: "Lower Back", type: "isolation", pattern: "extension-back", cue: "Round or stay neutral by choice, not by accident. Squeeze the glutes at the top, no hyperextension past straight." },
  { id: "worlds-greatest-stretch", name: "World's Greatest Stretch", muscle: 'Mobility', type: 'mobility', pattern: "mobility", cue: "Move slowly through each position, breathe, don't force the range." },
  { id: "couch-stretch", name: "Couch Stretch", muscle: 'Mobility', type: 'mobility', pattern: "mobility", cue: "Keep hips square, ease into it gradually, hold each side for 30-60s." },
  { id: "ninety-ninety-hip-switch", name: "90/90 Hip Switch", muscle: 'Mobility', type: 'mobility', pattern: "mobility", cue: "Keep your chest tall, rotate slowly through the hips, both sides." },
  { id: "thoracic-rotations", name: "Thoracic Spine Rotations", muscle: 'Mobility', type: 'mobility', pattern: "mobility", cue: "Hips stay stacked, rotate from the upper back, both directions." },
  { id: "cat-cow", name: "Cat-Cow", muscle: 'Mobility', type: 'mobility', pattern: "mobility", cue: "Move with your breath, round and arch through the full spine." },
  { id: "doorway-chest-stretch", name: "Doorway Chest Stretch", muscle: 'Mobility', type: 'mobility', pattern: "mobility", cue: "Step through gently, hold 30s per side, don't bounce." },
  { id: "standing-quad-stretch", name: "Standing Quad Stretch", muscle: 'Mobility', type: 'mobility', pattern: "mobility", cue: "Keep knees together, pull the heel toward the glute, hold each side." },
  { id: "childs-pose", name: "Child's Pose", muscle: 'Mobility', type: 'mobility', pattern: "mobility", cue: "Sit back onto your heels, reach forward, breathe deeply and relax." },
]

export const EXERCISE_BY_ID: Record<string, ExerciseDef> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))

/** Other names people use for a movement, so search finds it. */
export const ALIASES: Record<string, string[]> = {"push-up":["press-up","press ups","pressup","pushup"],"pull-ups":["pullup","chin up","chinup"],"overhead-press":["ohp","military press","shoulder press","strict press"],"romanian-deadlift":["rdl","stiff leg deadlift"],"lateral-raise":["side raise","lat raise","side lateral"],"leg-press":["legpress"],"bent-over-row":["barbell row","bent over row","pendlay row"],"lat-pulldown":["pulldown","lat pull down"],"standing-calf-raise":["calf raise","calves"],"seated-calf-raise":["calf raise","calves","soleus"],"hip-thrust":["glute bridge"],"skull-crusher":["lying tricep extension","french press"],"pushdown":["tricep pushdown","cable pushdown"],"face-pull":["facepull","rear delt pull"]}

/** Muscles a lift works hard without being what it is for: half a set of volume, indirect fatigue. */
export const SECONDARY_MUSCLES: Record<string, string[]> = {"bench-press":["Triceps","Front Delts"],"incline-press":["Triceps","Front Delts"],"dips":["Triceps","Front Delts"],"push-up":["Triceps","Front Delts","Core"],"pull-ups":["Biceps","Core"],"bent-over-row":["Rear Delts","Biceps","Lower Back","Traps"],"lat-pulldown":["Biceps"],"chest-supported-row":["Rear Delts","Biceps"],"cable-row":["Biceps","Rear Delts"],"db-row":["Biceps","Rear Delts","Traps"],"overhead-press":["Side Delts"],"upright-row":["Traps","Rear Delts","Biceps"],"reverse-fly":["Back"],"face-pull":["Back","Traps"],"preacher-curl":["Forearms"],"cable-curl":["Forearms"],"hammer-curl":["Forearms"],"incline-curl":["Forearms"],"seated-dips":["Chest","Front Delts"],"close-grip-bench":["Chest","Front Delts"],"hack-dips":["Chest","Front Delts"],"squat":["Glutes","Hamstrings","Core"],"leg-press":["Glutes"],"lunge":["Glutes","Hamstrings"],"romanian-deadlift":["Glutes","Lower Back","Traps"],"seated-leg-curl":["Calves"],"leg-curl":["Calves"],"nordic-curl":["Glutes","Calves"],"good-morning":["Glutes","Lower Back"],"glute-ham-raise":["Glutes","Calves"],"hip-thrust":["Hamstrings"],"bulgarian-split-squat":["Quads"],"reverse-lunge":["Quads","Hamstrings"],"reverse-curl":["Biceps"],"eugene-curl":["Biceps"],"reverse-eugene-curl":["Biceps"],"dead-hang":["Back","Front Delts","Traps"],"plate-pinch":["Traps"],"shrug":["Forearms"],"farmers-carry":["Forearms","Core"],"ab-wheel":["Back","Front Delts"],"plank":["Glutes"],"deadlift":["Glutes","Hamstrings","Traps"],"back-extension":["Glutes","Hamstrings"]}

export const PB_EXERCISE_IDS: readonly string[] = ["bench-press","pull-ups","dips","overhead-press","deadlift","squat"]
/** Tracked by max reps, not load. */
export const BODYWEIGHT_LIFT_IDS: readonly string[] = ["pull-ups","dips"]

export function findExercises(query: string, extra: ExerciseDef[] = []): ExerciseDef[] {
  const qq = query.trim().toLowerCase()
  const all = [...EXERCISES, ...extra]
  if (!qq) return all
  return all.filter((e) => e.name.toLowerCase().includes(qq) || e.muscle.toLowerCase().includes(qq) || (ALIASES[e.id] ?? []).some((a) => a.includes(qq)))
}
