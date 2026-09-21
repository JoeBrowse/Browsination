import type { Migration } from './types'

/**
 * Stage 7: money. Manual entry only. Accounts carry a name, a kind and (for cards) a limit and
 * payment day: never a login, card number, sort code or account number. Balances are dated
 * snapshots; net worth is derived at read time. Holdings and credit scores are manual too.
 * Trips and gift ideas can point at a savings goal (plain text column, cleared by the goal repo).
 */
export const m0008: Migration = {
  version: 8,
  name: 'money',
  tables: ['accounts', 'balance_snapshots', 'holdings', 'savings_goals', 'credit_scores'],
  statements: [
    `CREATE TABLE accounts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('current','savings','isa','credit','pension','cash','other')),
      provider TEXT NOT NULL DEFAULT '',
      credit_limit_pence INTEGER,
      payment_due_day INTEGER CHECK (payment_due_day IS NULL OR payment_due_day BETWEEN 1 AND 31),
      payment_reminder INTEGER NOT NULL DEFAULT 1,
      archived INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE balance_snapshots (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      day TEXT NOT NULL,
      balance_pence INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (account_id, day)
    )`,
    `CREATE INDEX idx_snapshots_day ON balance_snapshots(day)`,
    `CREATE TABLE holdings (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
      ticker TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      quantity REAL NOT NULL DEFAULT 0,
      cost_pence INTEGER NOT NULL DEFAULT 0,
      price_pence INTEGER,
      price_updated_at TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE savings_goals (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      target_pence INTEGER NOT NULL,
      deadline TEXT,
      account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
      saved_pence INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','done','dropped')),
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE credit_scores (
      id TEXT PRIMARY KEY NOT NULL,
      day TEXT NOT NULL,
      score INTEGER NOT NULL,
      agency TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_credit_scores_day ON credit_scores(day)`,
    `ALTER TABLE trips ADD COLUMN goal_id TEXT`,
    `ALTER TABLE gift_ideas ADD COLUMN budget_pence INTEGER`,
    `ALTER TABLE gift_ideas ADD COLUMN goal_id TEXT`,
  ],
  fixtures: () => {
    const t = '2026-09-28T09:00:00.000Z'
    return {
      accounts: [
        { id: 'ac-1', name: 'Current', kind: 'current', provider: 'Monzo', credit_limit_pence: null, payment_due_day: null, payment_reminder: 1, archived: 0, sort_order: 0, notes: '', created_at: t, updated_at: t },
        { id: 'ac-2', name: 'Rainy day', kind: 'savings', provider: '', credit_limit_pence: null, payment_due_day: null, payment_reminder: 1, archived: 0, sort_order: 1, notes: '', created_at: t, updated_at: t },
        { id: 'ac-3', name: 'ISA', kind: 'isa', provider: 'Vanguard', credit_limit_pence: null, payment_due_day: null, payment_reminder: 1, archived: 0, sort_order: 2, notes: '', created_at: t, updated_at: t },
        { id: 'ac-4', name: 'Credit card', kind: 'credit', provider: '', credit_limit_pence: 250000, payment_due_day: 14, payment_reminder: 1, archived: 0, sort_order: 3, notes: '', created_at: t, updated_at: t },
      ],
      balance_snapshots: [
        { id: 'bs-1', account_id: 'ac-1', day: '2026-08-01', balance_pence: 120000, note: '', created_at: t, updated_at: t },
        { id: 'bs-2', account_id: 'ac-1', day: '2026-09-01', balance_pence: 150000, note: '', created_at: t, updated_at: t },
        { id: 'bs-3', account_id: 'ac-2', day: '2026-09-01', balance_pence: 400000, note: '', created_at: t, updated_at: t },
        { id: 'bs-4', account_id: 'ac-3', day: '2026-09-01', balance_pence: 812550, note: '', created_at: t, updated_at: t },
        { id: 'bs-5', account_id: 'ac-4', day: '2026-09-01', balance_pence: 43210, note: '', created_at: t, updated_at: t },
      ],
      holdings: [{ id: 'h-1', account_id: 'ac-3', ticker: 'VWRP', name: 'FTSE All-World', quantity: 62.5, cost_pence: 600000, price_pence: 10520, price_updated_at: t, archived: 0, notes: '', created_at: t, updated_at: t }],
      savings_goals: [{ id: 'sg-1', name: 'Japan 2027', target_pence: 350000, deadline: '2027-04-01', account_id: 'ac-2', saved_pence: 0, status: 'active', notes: '', created_at: t, updated_at: t }],
      credit_scores: [{ id: 'cs-1', day: '2026-09-01', score: 812, agency: 'experian', note: '', created_at: t, updated_at: t }],
      trips: [{ id: 't-2', name: 'Japan', destination: 'Tokyo', start_date: '2027-04-10', end_date: '2027-04-24', budget_pence: 350000, spent_pence: null, booking_refs: '[]', notes: '', status: 'idea', goal_id: 'sg-1', created_at: t, updated_at: t }],
      gift_ideas: [{ id: 'g-2', person_id: 'p-1', title: 'Weekend away', notes: '', status: 'idea', budget_pence: 15000, goal_id: 'sg-1', created_at: t, updated_at: t }],
      log_entries: [{ id: 'l-10', type: 'money_checkin', module: 'money', ts: '2026-09-01T18:00:00.000Z', ts_end: null, tz_offset_min: 60, value: 1319340, unit: 'pence', payload: '{"accounts":4}', entity_type: null, entity_id: null, created_at: t, updated_at: t }],
    }
  },
}
