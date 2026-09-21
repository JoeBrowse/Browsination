import { useServices } from '@/app/services'
import { todayLocal } from '@/core/time/localDay'
import { useQuery } from '@/core/ui/useQuery'
import { useBanjoRepo } from '../useBanjo'
import { pieceProgress, planSession, type Progress } from './logic'

/** Pieces, chunks, today's plan and per-piece progress in one read. */
export function usePlan() {
  const s = useServices()
  const repo = useBanjoRepo()
  return useQuery(
    async () => {
      const [dayStartHour, maxReviews, pieces, chunks] = await Promise.all([s.settings.get('dayStartHour'), s.settings.get('banjo.maxReviews'), repo.pieces(), repo.chunks()])
      const today = todayLocal(new Date(), dayStartHour)
      const progress = new Map<string, Progress>(pieces.map((p) => [p.id, pieceProgress(p, chunks)]))
      const reviewsDone = await repo.reviewsOn(today)
      return { today, pieces, chunks, plan: planSession(pieces, chunks, today, maxReviews), progress, reviewsDone, dueCount: chunks.filter((c) => c.due <= today).length }
    },
    ['banjo_pieces', 'banjo_chunks', 'settings', 'log_entries'],
  )
}

export type PlanData = NonNullable<ReturnType<typeof usePlan>['data']>
