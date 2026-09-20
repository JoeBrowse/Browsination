import { useCallback } from 'react'
import type { ItemRow } from '@/core/repos/items'
import { completeItem, uncompleteItem } from '@/core/tasks/complete'
import { calendarDay } from '@/core/time/localDay'
import { useServices } from '../services'
import { toast } from '../shellStore'

/** One-tap completion with an undo toast. Recurring items roll forward. */
export function useComplete() {
  const s = useServices()
  return useCallback(
    async (item: ItemRow) => {
      const spawned = await completeItem(s.items, item, calendarDay())
      toast(spawned ? `Done · next ${spawned.due_date}` : 'Done', { label: 'Undo', run: () => uncompleteItem(s.items, item, spawned) })
    },
    [s.items],
  )
}
