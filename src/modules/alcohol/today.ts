import type { ModuleReminder, TodayContext } from '@/core/modules/types'
import { settingsRepo } from '@/core/repos/settings'
import { addDays } from '@/core/time/localDay'
import { dayRange } from '@/core/tasks/queries'
import { alcoholRepo } from './repo'

/** One timed reminder per active medication, per time, per day for the planner's window. Today's already-taken doses are skipped. */
export async function medicationReminders(ctx: TodayContext): Promise<ModuleReminder[]> {
  const settings = settingsRepo(ctx.db)
  if (!(await settings.get('alcohol.medicationReminders'))) return []
  const repo = alcoholRepo(ctx.db)
  const meds = await repo.medications()
  if (meds.length === 0) return []
  const r = dayRange(ctx.calendarToday)
  const takenToday = new Set((await repo.medicationLogsBetween(r.from, r.to)).map((e) => e.entity_id))
  const out: ModuleReminder[] = []
  for (const m of meds) {
    for (const time of repo.medicationTimes(m)) {
      for (let i = 0; i < 14; i++) {
        const day = addDays(ctx.calendarToday, i)
        if (i === 0 && takenToday.has(m.id)) continue
        out.push({ key: `med:${m.id}:${day}T${time}`, at: `${day}T${time}`, title: m.name, body: m.dose, route: '/m/alcohol/medication' })
      }
    }
  }
  return out
}
