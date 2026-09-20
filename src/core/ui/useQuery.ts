import { useCallback, useEffect, useRef, useState } from 'react'
import { dbEvents } from '../db/events'

export interface QueryState<T> {
  data: T | undefined
  loading: boolean
  error: Error | null
  refresh: () => void
}

/**
 * Runs an async read and re-runs it when any of `tables` changes (or on '*').
 * `fn` should be stable or listed in deps; repositories emit table names after writes.
 */
export function useQuery<T>(fn: () => Promise<T>, tables: string[], deps: unknown[] = []): QueryState<T> {
  const [state, setState] = useState<{ data: T | undefined; loading: boolean; error: Error | null }>({ data: undefined, loading: true, error: null })
  const [tick, setTick] = useState(0)
  const fnRef = useRef(fn)
  fnRef.current = fn
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let live = true
    fnRef
      .current()
      .then((data) => live && setState({ data, loading: false, error: null }))
      .catch((e: unknown) => live && setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e : new Error(String(e)) })))
    return () => {
      live = false
    }
  }, [tick, ...deps])

  const tableKey = tables.join('|')
  useEffect(() => dbEvents.subscribe((changed) => dbEvents.affects(changed, tableKey.split('|')) && refresh()), [refresh, tableKey])

  return { ...state, refresh }
}
