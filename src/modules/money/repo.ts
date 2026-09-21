import type { SqlDriver } from '@/core/db/driver'
import { newId, nowIso } from '@/core/ids'
import { deleteRow, getRow, insertRow, updateRow } from '@/core/repos/base'
import { logEntriesRepo } from '@/core/repos/logEntries'
import type { LocalDay } from '@/core/time/localDay'

export type AccountKind = 'current' | 'savings' | 'isa' | 'credit' | 'pension' | 'cash' | 'other'
export const ACCOUNT_KINDS: { key: AccountKind; label: string }[] = [
  { key: 'current', label: 'Current' },
  { key: 'savings', label: 'Savings' },
  { key: 'isa', label: 'ISA' },
  { key: 'credit', label: 'Credit card' },
  { key: 'pension', label: 'Pension' },
  { key: 'cash', label: 'Cash' },
  { key: 'other', label: 'Other' },
]
export const kindLabel = (k: AccountKind) => ACCOUNT_KINDS.find((x) => x.key === k)?.label ?? k

/** Name, kind, provider and card terms only. No login, card number, sort code or account number, by design. */
export interface AccountRow {
  id: string
  name: string
  kind: AccountKind
  provider: string
  credit_limit_pence: number | null
  payment_due_day: number | null
  payment_reminder: number
  archived: number
  sort_order: number
  notes: string
  created_at: string
  updated_at: string
}
export interface SnapshotRow {
  id: string
  account_id: string
  day: LocalDay
  balance_pence: number
  note: string
  created_at: string
  updated_at: string
}
export interface HoldingRow {
  id: string
  account_id: string | null
  ticker: string
  name: string
  quantity: number
  /** Total paid, in pence. */
  cost_pence: number
  /** Manually entered price per unit, in pence. */
  price_pence: number | null
  price_updated_at: string | null
  archived: number
  notes: string
  created_at: string
  updated_at: string
}
export type GoalStatus = 'active' | 'done' | 'dropped'
export interface GoalRow {
  id: string
  name: string
  target_pence: number
  deadline: LocalDay | null
  /** When set, progress is that account's latest balance; otherwise `saved_pence`. */
  account_id: string | null
  saved_pence: number
  status: GoalStatus
  notes: string
  created_at: string
  updated_at: string
}
export interface CreditScoreRow {
  id: string
  day: LocalDay
  score: number
  agency: string
  note: string
  created_at: string
  updated_at: string
}
export interface LinkedBudget {
  id: string
  label: string
  budget_pence: number | null
  href: string
}

export const CHECKIN_TYPE = 'money_checkin'

export function moneyRepo(db: SqlDriver) {
  const logs = logEntriesRepo(db)
  const stamp = <T extends object>(row: T): T & { created_at: string; updated_at: string } => {
    const t = nowIso()
    return { ...row, created_at: t, updated_at: t }
  }
  return {
    logs,
    // accounts
    accounts: (includeArchived = false) => db.query<AccountRow>(`SELECT * FROM accounts ${includeArchived ? '' : 'WHERE archived = 0'} ORDER BY archived, sort_order, created_at`),
    account: (id: string) => getRow<AccountRow>(db, 'accounts', id),
    async addAccount(input: Partial<AccountRow> & { name: string; kind: AccountKind }): Promise<AccountRow> {
      const count = (await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM accounts'))[0]?.n ?? 0
      const row: AccountRow = stamp({ id: newId(), name: input.name.trim(), kind: input.kind, provider: input.provider ?? '', credit_limit_pence: input.credit_limit_pence ?? null, payment_due_day: input.payment_due_day ?? null, payment_reminder: input.payment_reminder ?? 1, archived: 0, sort_order: input.sort_order ?? count, notes: input.notes ?? '' })
      await insertRow(db, 'accounts', row)
      return row
    },
    updateAccount: (id: string, patch: Partial<Omit<AccountRow, 'id' | 'created_at'>>) => updateRow(db, 'accounts', id, { ...patch, updated_at: nowIso() }),
    removeAccount: (id: string) => deleteRow(db, 'accounts', id),
    // balances
    snapshots: (accountId: string) => db.query<SnapshotRow>('SELECT * FROM balance_snapshots WHERE account_id = ? ORDER BY day', [accountId]),
    allSnapshots: () => db.query<SnapshotRow>('SELECT * FROM balance_snapshots ORDER BY day, created_at'),
    async latestBalances(): Promise<Map<string, SnapshotRow>> {
      const rows = await db.query<SnapshotRow>('SELECT s.* FROM balance_snapshots s JOIN (SELECT account_id, MAX(day) AS day FROM balance_snapshots GROUP BY account_id) m ON m.account_id = s.account_id AND m.day = s.day')
      return new Map(rows.map((r) => [r.account_id, r]))
    },
    /** One balance per account per day: logging twice on a day replaces the earlier figure. */
    async logBalance(accountId: string, day: LocalDay, balance_pence: number, note = ''): Promise<void> {
      const existing = (await db.query<SnapshotRow>('SELECT * FROM balance_snapshots WHERE account_id = ? AND day = ?', [accountId, day]))[0]
      if (existing) await updateRow(db, 'balance_snapshots', existing.id, { balance_pence, note, updated_at: nowIso() })
      else await insertRow(db, 'balance_snapshots', stamp({ id: newId(), account_id: accountId, day, balance_pence, note }))
    },
    removeSnapshot: (id: string) => deleteRow(db, 'balance_snapshots', id),
    // holdings
    holdings: (includeArchived = false) => db.query<HoldingRow>(`SELECT * FROM holdings ${includeArchived ? '' : 'WHERE archived = 0'} ORDER BY ticker`),
    async addHolding(input: Partial<HoldingRow> & { ticker: string }): Promise<HoldingRow> {
      const row: HoldingRow = stamp({ id: newId(), account_id: input.account_id ?? null, ticker: input.ticker.trim().toUpperCase(), name: input.name ?? '', quantity: input.quantity ?? 0, cost_pence: input.cost_pence ?? 0, price_pence: input.price_pence ?? null, price_updated_at: input.price_pence != null ? nowIso() : null, archived: 0, notes: input.notes ?? '' })
      await insertRow(db, 'holdings', row)
      return row
    },
    updateHolding: (id: string, patch: Partial<Omit<HoldingRow, 'id' | 'created_at'>>) => updateRow(db, 'holdings', id, { ...patch, updated_at: nowIso() }),
    setPrice: (id: string, price_pence: number | null) => updateRow(db, 'holdings', id, { price_pence, price_updated_at: price_pence == null ? null : nowIso(), updated_at: nowIso() }),
    removeHolding: (id: string) => deleteRow(db, 'holdings', id),
    // goals
    goals: () => db.query<GoalRow>(`SELECT * FROM savings_goals ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'done' THEN 1 ELSE 2 END, deadline IS NULL, deadline, created_at`),
    goal: (id: string) => getRow<GoalRow>(db, 'savings_goals', id),
    async addGoal(input: Partial<GoalRow> & { name: string; target_pence: number }): Promise<GoalRow> {
      const row: GoalRow = stamp({ id: newId(), name: input.name.trim(), target_pence: input.target_pence, deadline: input.deadline ?? null, account_id: input.account_id ?? null, saved_pence: input.saved_pence ?? 0, status: input.status ?? 'active', notes: input.notes ?? '' })
      await insertRow(db, 'savings_goals', row)
      return row
    },
    updateGoal: (id: string, patch: Partial<Omit<GoalRow, 'id' | 'created_at'>>) => updateRow(db, 'savings_goals', id, { ...patch, updated_at: nowIso() }),
    async removeGoal(id: string): Promise<void> {
      await db.run('UPDATE trips SET goal_id = NULL WHERE goal_id = ?', [id])
      await db.run('UPDATE gift_ideas SET goal_id = NULL WHERE goal_id = ?', [id])
      await deleteRow(db, 'savings_goals', id)
    },
    /** Trips and gift ideas pointing at a goal, with their budgets. */
    async linkedBudgets(goalId: string): Promise<LinkedBudget[]> {
      const trips = await db.query<{ id: string; name: string; budget_pence: number | null }>('SELECT id, name, budget_pence FROM trips WHERE goal_id = ? ORDER BY start_date', [goalId])
      const gifts = await db.query<{ id: string; title: string; budget_pence: number | null; person_id: string }>('SELECT id, title, budget_pence, person_id FROM gift_ideas WHERE goal_id = ? ORDER BY created_at', [goalId])
      return [...trips.map((t) => ({ id: t.id, label: t.name, budget_pence: t.budget_pence, href: `/m/life/trips/${t.id}` })), ...gifts.map((g) => ({ id: g.id, label: `Gift: ${g.title}`, budget_pence: g.budget_pence, href: `/m/life/people/${g.person_id}` }))]
    },
    linkedCounts: () => db.query<{ goal_id: string; n: number; total: number }>('SELECT goal_id, COUNT(*) AS n, COALESCE(SUM(budget_pence), 0) AS total FROM (SELECT goal_id, budget_pence FROM trips WHERE goal_id IS NOT NULL UNION ALL SELECT goal_id, budget_pence FROM gift_ideas WHERE goal_id IS NOT NULL) GROUP BY goal_id'),
    // credit scores
    creditScores: () => db.query<CreditScoreRow>('SELECT * FROM credit_scores ORDER BY day, created_at'),
    async addCreditScore(day: LocalDay, score: number, agency: string, note = ''): Promise<CreditScoreRow> {
      const row: CreditScoreRow = stamp({ id: newId(), day, score, agency, note })
      await insertRow(db, 'credit_scores', row)
      return row
    },
    removeCreditScore: (id: string) => deleteRow(db, 'credit_scores', id),
    // monthly check-in (a log entry, so insights can see it)
    lastCheckIn: () => logs.lastOfType(CHECKIN_TYPE),
    completeCheckIn: (netWorthPence: number, accounts: number) => logs.add({ type: CHECKIN_TYPE, module: 'money', value: netWorthPence, unit: 'pence', payload: { accounts } }),
  }
}

export type MoneyRepo = ReturnType<typeof moneyRepo>
