import { useState } from 'react'
import { Button, Card, EmptyState, Screen } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { holdingValue } from '../logic'
import type { HoldingRow } from '../repo'
import { HoldingSheet } from '../sheets/HoldingSheet'
import { money, moneyShort, signed, useMoneyRepo } from '../useMoney'

/** Manual prices. Totals and per-holding gain are shown as recorded; nothing is recommended. */
export function HoldingsScreen() {
  const repo = useMoneyRepo()
  const [editing, setEditing] = useState<HoldingRow | null | 'new'>(null)
  const q = useQuery(async () => ({ holdings: await repo.holdings(), accounts: await repo.accounts() }), ['holdings', 'accounts'])
  const rows = (q.data?.holdings ?? []).map((h) => ({ h, v: holdingValue(h) }))
  const priced = rows.filter((r) => r.v.value !== null)
  const totalValue = priced.reduce((n, r) => n + (r.v.value ?? 0), 0)
  const totalCost = priced.reduce((n, r) => n + r.h.cost_pence, 0)
  const accountName = (id: string | null) => q.data?.accounts.find((a) => a.id === id)?.name
  return (
    <Screen title="Holdings" right={<Button onClick={() => setEditing('new')}>Add</Button>}>
      {rows.length ? (
        <Card>
          <div className="kv">
            <span>Value</span>
            <span className="big">{moneyShort(totalValue)}</span>
          </div>
          <div className="kv small">
            <span className="muted">Cost</span>
            <span>{moneyShort(totalCost)}</span>
          </div>
          <div className="kv small">
            <span className="muted">Gain</span>
            <span className={totalValue - totalCost >= 0 ? 'pos' : ''}>
              {signed(totalValue - totalCost)}
              {totalCost > 0 ? ` (${(((totalValue - totalCost) / totalCost) * 100).toFixed(1)}%)` : ''}
            </span>
          </div>
        </Card>
      ) : null}
      {q.data && rows.length === 0 ? <EmptyState>No holdings yet</EmptyState> : null}
      <div className="list" style={{ marginTop: 12 }}>
        {rows.map(({ h, v }) => (
          <button key={h.id} className="list-row" onClick={() => setEditing(h)}>
            <div className="grow" style={{ textAlign: 'left' }}>
              <div className="title">
                {h.ticker} <span className="muted small">{h.name}</span>
              </div>
              <div className="sub">
                {h.quantity} × {money(h.price_pence)}
                {accountName(h.account_id) ? ` · ${accountName(h.account_id)}` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>{v.value === null ? '–' : moneyShort(v.value)}</div>
              {v.gain !== null ? (
                <div className={`small ${v.gain >= 0 ? 'pos' : 'muted'}`}>
                  {signed(v.gain)}
                  {v.gainPct !== null ? ` · ${(v.gainPct * 100).toFixed(1)}%` : ''}
                </div>
              ) : null}
            </div>
          </button>
        ))}
      </div>
      <HoldingSheet open={editing !== null} onClose={() => setEditing(null)} holding={editing === 'new' ? null : editing} accounts={q.data?.accounts ?? []} />
    </Screen>
  )
}
