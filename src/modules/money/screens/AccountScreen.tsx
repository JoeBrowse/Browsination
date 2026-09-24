import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from '@/app/shellStore'
import { calendarDay, formatDay } from '@/core/time/localDay'
import { MoneyInput } from '@/core/ui/MoneyInput'
import { Button, Card, EmptyState, Screen, SectionTitle, Toggle } from '@/core/ui/primitives'
import { Sparkline } from '@/core/ui/Sparkline'
import { useQuery } from '@/core/ui/useQuery'
import { utilisation } from '../logic'
import { kindLabel } from '../repo'
import { AccountSheet } from '../sheets/AccountSheet'
import { money, useMoneyRepo } from '../useMoney'

/** One account: log a balance, see the history, edit or archive. Deleting needs archiving first. */
export function AccountScreen() {
  const { id = '' } = useParams()
  const repo = useMoneyRepo()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState<number | null>(null)
  const [day, setDay] = useState(calendarDay())
  const [confirm, setConfirm] = useState(false)
  const q = useQuery(async () => ({ account: await repo.account(id), snapshots: await repo.snapshots(id) }), ['accounts', 'balance_snapshots'], [id])
  const a = q.data?.account
  const snaps = q.data?.snapshots ?? []
  const last = snaps[snaps.length - 1]
  useEffect(() => {
    if (last && amount === null) setAmount(last.balance_pence)
  }, [last, amount])
  if (q.data && !a) return <Screen title="Account">Not found</Screen>
  if (!a) return <Screen title="Account">{''}</Screen>
  const save = async () => {
    if (amount === null) return
    await repo.logBalance(a.id, day, amount)
    toast(`${a.name} ${money(amount)}`)
  }
  const util = a.kind === 'credit' ? utilisation(last?.balance_pence ?? null, a.credit_limit_pence) : null
  return (
    <Screen title={a.name} right={<Button onClick={() => setEditing(true)}>Edit</Button>}>
      <Card>
        <div className="kv">
          <span className="muted">{kindLabel(a.kind)}{a.provider ? ` · ${a.provider}` : ''}</span>
          <span className="big">{last ? money(last.balance_pence) : '–'}</span>
        </div>
        {last ? <div className="muted small">{formatDay(last.day)}</div> : null}
        {a.kind === 'credit' ? (
          <div className="kv small">
            <span className="muted">Limit</span>
            <span>
              {money(a.credit_limit_pence)}
              {util !== null ? ` · ${Math.round(util * 100)}% used` : ''}
            </span>
          </div>
        ) : null}
        <Sparkline values={snaps.map((s) => s.balance_pence)} label={`${a.name} balance trend`} />
      </Card>
      <SectionTitle>Log balance</SectionTitle>
      <Card>
        <div className="row">
          <div className="grow">
            <MoneyInput label="Balance" value={amount} onChange={setAmount} />
          </div>
          <input type="date" aria-label="Balance date" value={day} onChange={(e) => setDay(e.target.value)} style={{ width: 150 }} />
          <Button variant="primary" onClick={() => void save()} disabled={amount === null}>
            Save
          </Button>
        </div>
      </Card>
      <SectionTitle>History</SectionTitle>
      {snaps.length === 0 ? <EmptyState>No balances yet</EmptyState> : null}
      <div className="list">
        {[...snaps].reverse().map((s) => (
          <div key={s.id} className="list-row" style={{ minHeight: 40 }}>
            <button
              className="grow row"
              style={{ textAlign: 'left' }}
              onClick={() => {
                setDay(s.day)
                setAmount(s.balance_pence)
              }}
            >
              <span className="muted small" style={{ width: 110 }}>
                {formatDay(s.day)}
              </span>
              <span className="grow">{money(s.balance_pence)}</span>
            </button>
            <Button ariaLabel="Remove balance" onClick={() => void repo.removeSnapshot(s.id)}>
              ×
            </Button>
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 20 }}>
        <span className="grow">Archived</span>
        <Toggle label="Archived" checked={!!a.archived} onChange={(on) => void repo.updateAccount(a.id, { archived: on ? 1 : 0 })} />
      </div>
      {a.archived ? (
        <Button variant="danger" onClick={() => (confirm ? void repo.removeAccount(a.id).then(() => navigate('/m/money')) : setConfirm(true))}>
          {confirm ? 'Really delete with history' : 'Delete'}
        </Button>
      ) : null}
      <AccountSheet open={editing} onClose={() => setEditing(false)} account={a} />
    </Screen>
  )
}
