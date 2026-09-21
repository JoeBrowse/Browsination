import type { SqlDriver } from '../db/driver'

/** The little the rest of the app needs to know about savings goals: which ones can be linked to. */
export interface GoalOption {
  id: string
  name: string
}

export const activeGoals = (db: SqlDriver) => db.query<GoalOption>(`SELECT id, name FROM savings_goals WHERE status = 'active' ORDER BY name`)
