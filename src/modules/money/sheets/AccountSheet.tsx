import { useEffect, useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { MoneyInput } from '@/core/ui/MoneyInput'
import { Button, Toggle } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { ACCOUNT_KINDS, type AccountKind, type AccountRow } from '../repo'
import { useMoneyRepo } from '../useMoney'

interface Draft {
  name: string
  kind: AccountKind
  provider: string
  credit_limit_pence: number | null
  payment_due_day: number | null
  payment_reminder: boolean
}

const blank = (): Draft => ({ name: '', kind: 'current', provider: '', credit_limit_pence: null, payment_due_day: null, payment_reminder: true })
const fromRow = (a: AccountRow): Draft => ({ name: a.name, kind: a.kind, provider: a.provider, credit_limit_pence: a.credit_limit_pence, payment_due_day: a.payment_due_day, payment_reminder: !!a.payment_reminder })

/** New or edit. Name, kind and a provider label only; cards add a limit and a payment day. */
export function AccountSheet({ open, onClose, account, onCreated }: { open: boolean; onClose: () => void; account?: AccountRow | null; onCreated?: (a: AccountRow) => void }) {
  const repo = useMoneyRepo()
  const [d, setD] = useState<Draft>(blank())
  useEffect(() => {
    if (open) setD(account ? fromRow(account) : blank())
  }, [open, account])
  const save = async () => {
    const patch = { name: d.name.trim(), kind: d.kind, provider: d.provider.trim(), credit_limit_pence: d.kind === 'credit' ? d.credit_limit_pence : null, payment_due_day: d.kind === 'credit' ? d.payment_due_day : null, payment_reminder: d.payment_reminder ? 1 : 0 }
    if (account) await repo.updateAccount(account.id, patch)
    else onCreated?.(await repo.addAccount(patch))
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={account ? 'Edit account' : 'New account'}>
      <div className="stack">
        <input aria-label="Account name" placeholder="Name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus />
        <Chips label="Kind" value={d.kind} onChange={(kind) => setD({ ...d, kind })} options={ACCOUNT_KINDS.map((k) => ({ label: k.label, value: k.key }))} />
        <input aria-label="Provider" placeholder="Bank or provider (optional)" value={d.provider} onChange={(e) => setD({ ...d, provider: e.target.value })} />
        {d.kind === 'credit' ? (
          <>
            <div className="row">
              <span className="grow">Limit</span>
              <div style={{ width: 140 }}>
                <MoneyInput label="Credit limit" value={d.credit_limit_pence} onChange={(v) => setD({ ...d, credit_limit_pence: v })} />
              </div>
            </div>
            <div className="row">
              <span className="grow">Payment day of month</span>
              <input type="number" inputMode="numeric" min={1} max={31} aria-label="Payment due day" style={{ width: 90 }} value={d.payment_due_day ?? ''} onChange={(e) => setD({ ...d, payment_due_day: e.target.value ? Math.min(31, Math.max(1, Number(e.target.value))) : null })} />
            </div>
            <div className="row">
              <span className="grow">Payment reminder</span>
              <Toggle label="Payment reminder" checked={d.payment_reminder} onChange={(on) => setD({ ...d, payment_reminder: on })} />
            </div>
          </>
        ) : null}
        <div className="btn-row">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()} disabled={!d.name.trim()}>
            Save
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
