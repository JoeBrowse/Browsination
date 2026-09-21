import { useEffect, useState } from 'react'
import { MoneyInput } from '@/core/ui/MoneyInput'
import { Button } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import type { AccountRow, HoldingRow } from '../repo'
import { useMoneyRepo } from '../useMoney'

interface Draft {
  ticker: string
  name: string
  quantity: string
  cost_pence: number | null
  price_pence: number | null
  account_id: string | null
}
const blank = (): Draft => ({ ticker: '', name: '', quantity: '', cost_pence: null, price_pence: null, account_id: null })
const fromRow = (h: HoldingRow): Draft => ({ ticker: h.ticker, name: h.name, quantity: String(h.quantity), cost_pence: h.cost_pence, price_pence: h.price_pence, account_id: h.account_id })

/** Ticker, quantity, what it cost, and a price typed in by hand. Records only; nothing here advises. */
export function HoldingSheet({ open, onClose, holding, accounts }: { open: boolean; onClose: () => void; holding?: HoldingRow | null; accounts: AccountRow[] }) {
  const repo = useMoneyRepo()
  const [d, setD] = useState<Draft>(blank())
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    if (open) {
      setD(holding ? fromRow(holding) : blank())
      setConfirm(false)
    }
  }, [open, holding])
  const qty = Number(d.quantity)
  const valid = d.ticker.trim() !== '' && Number.isFinite(qty) && qty >= 0
  const save = async () => {
    const patch = { ticker: d.ticker.trim().toUpperCase(), name: d.name.trim(), quantity: qty, cost_pence: d.cost_pence ?? 0, account_id: d.account_id }
    if (holding) {
      await repo.updateHolding(holding.id, patch)
      if (d.price_pence !== holding.price_pence) await repo.setPrice(holding.id, d.price_pence)
    } else await repo.addHolding({ ...patch, price_pence: d.price_pence })
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={holding ? 'Edit holding' : 'New holding'}>
      <div className="stack">
        <div className="row">
          <input aria-label="Ticker" placeholder="Ticker" value={d.ticker} onChange={(e) => setD({ ...d, ticker: e.target.value })} style={{ width: 120 }} autoFocus />
          <input aria-label="Holding name" placeholder="Name (optional)" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </div>
        <div className="row">
          <span className="grow">Quantity</span>
          <input type="number" inputMode="decimal" step="any" aria-label="Quantity" style={{ width: 140 }} value={d.quantity} onChange={(e) => setD({ ...d, quantity: e.target.value })} />
        </div>
        <div className="row">
          <span className="grow">Total cost</span>
          <div style={{ width: 140 }}>
            <MoneyInput label="Total cost" value={d.cost_pence} onChange={(v) => setD({ ...d, cost_pence: v })} />
          </div>
        </div>
        <div className="row">
          <span className="grow">Price per unit</span>
          <div style={{ width: 140 }}>
            <MoneyInput label="Price per unit" value={d.price_pence} onChange={(v) => setD({ ...d, price_pence: v })} />
          </div>
        </div>
        <div className="row">
          <span className="grow">Held in</span>
          <select aria-label="Held in account" value={d.account_id ?? ''} onChange={(e) => setD({ ...d, account_id: e.target.value || null })}>
            <option value="">–</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="btn-row">
          {holding ? (
            <Button variant="danger" onClick={() => (confirm ? void repo.removeHolding(holding.id).then(onClose) : setConfirm(true))}>
              {confirm ? 'Really remove' : 'Remove'}
            </Button>
          ) : null}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()} disabled={!valid}>
            Save
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
