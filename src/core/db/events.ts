/**
 * Table-change bus. Repositories emit after a write; useQuery re-runs on matching tables.
 * '*' means everything changed (import, restore).
 */
type Listener = (tables: string[]) => void

const listeners = new Set<Listener>()

export const dbEvents = {
  emit(tables: string | string[]): void {
    const list = Array.isArray(tables) ? tables : [tables]
    for (const l of listeners) l(list)
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  affects(changed: string[], watched: string[]): boolean {
    return changed.includes('*') || changed.some((t) => watched.includes(t))
  },
}
