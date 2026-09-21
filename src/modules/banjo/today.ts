import type { TodayContext } from '@/core/modules/types'
import { settingsRepo } from '@/core/repos/settings'
import { banjoRepo } from './repo'

/** One digest line when reviews are due; nothing otherwise. */
export async function banjoDigest(ctx: TodayContext): Promise<string[]> {
  if (!(await settingsRepo(ctx.db).get('banjo.reviewDigest'))) return []
  const due = (await banjoRepo(ctx.db).chunks()).filter((c) => c.due <= ctx.today).length
  return due ? [`Banjo: ${due} review${due === 1 ? '' : 's'} due`] : []
}
