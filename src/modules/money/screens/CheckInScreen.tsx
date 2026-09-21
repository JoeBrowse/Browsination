import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from '@/app/shellStore'
import { calendarDay, formatDay } from '@/core/time/localDay'
import { MoneyInput } from '@/core/ui/MoneyInput'
import { Button, Card, Screen } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { holdingValue, monthKey, netWorthNow, netWorthSeries, valueOn } from '../logic'
import { kindLabel, type HoldingRow } from '../repo'
import { money, moneyShort, signed, useMoneyRepo } from '../useMoney'
import { addDays } from '@/core/time/localDay'

/**
 * Monthly check-in: one account per step with the last balance ready to confirm, then holdings
 * prices, then the result. Every save is immediate, so leaving and coming back resumes.
 */
export function CheckInScreen() {
  const repo = useMoneyRepo()
  const navigate = useNavigate()
  const today = calendarDay()
  const q = useQuery(async () => ({ accounts: await repo.accounts(), latest: await repo.latestBalances(), holdings: await repo.holdings(), snapshots: await repo.allSnapshots() }), ['accounts', 'balance_snapshots', 'holdings'])
  const accounts = useMemo(() => q.data?.accounts ?? [], [q.data])
  const latest = q.data?.latest
  const doneThisMonth = useCallback(
    (id: string) => {
      const l = latest?.get(id)
      return !!l && monthKey(l.day) === monthKey(today)
    },
    [latest, today],
  )
  const [step, setStep] = useState<number | null>(null)
  useEffect(() => {
    if (step === null && q.data) {
      const first = accounts.findIndex((a) => !doneThisMonth(a.id))
      setStep(first === -1 ? accounts.length : first)
    }
  }, [q.data, accounts, step, doneThisMonth])
  const [amount, setAmount] = useState<number | null>(null)
  const account = step !== null ? accounts[step] : undefined
  useEffect(() => {
    if (account) setAmount(q.data?.latest.get(account.id)?.balance_pence ?? null)
  }, [account, q.data])
  const total = accounts.length + (q.data?.holdings.length ? 1 : 0)
  const next = () => setStep((s) => (s ?? 0) + 1)
  const saveBalance = async () => {
    if (!account || amount === null) return
    await repo.logBalance(account.id, today, amount)
    next()
  }
  const series = q.data ? netWorthSeries(q.data.accounts, q.data.snapshots) : []
  const finish = async () => {
    await repo.completeCheckIn(netWorthNow(series) ?? 0, accounts.length)
    toast('Check-in done')
    navigate('/m/money')
  }
  if (!q.data || step === null) return <Screen title="Check-in">{''}</Screen>
  if (accounts.length === 0)
    return (
      <Screen title="Check-in">
        <Card>Add an account first</Card>
      </Screen>
    )
  const progress = Math.min(step, total) / Math.max(1, total)
  const bar = (
    <div className="progress" aria-label={`Step ${Math.min(step + 1, total)} of ${total}`}>
      <div style={{ width: `${progress * 100}%` }} />
    </div>
  )
  if (account) {
    const last = q.data.latest.get(account.id)
    return (
      <Screen title="Check-in" right={<span className="muted small">{`${step + 1} of ${total}`}</span>}>
        {bar}
        <Card>
          <div className="title">{account.name}</div>
          <div className="muted small">
            {kindLabel(account.kind)}
            {last ? ` · ${money(last.balance_pence)} on ${formatDay(last.day)}` : ' · no balance yet'}
            {doneThisMonth(account.id) ? ' · done this month' : ''}
          </div>
          <div style={{ marginTop: 12 }}>
            <MoneyInput label={`${account.name} balance`} value={amount} onChange={setAmount} />
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <Button onClick={next}>Skip</Button>
            {last ? (
              <Button onClick={() => void repo.logBalance(account.id, today, last.balance_pence).then(next)}>Same</Button>
            ) : null}
            <Button variant="primary" onClick={() => void saveBalance()} disabled={amount === null}>
              Save
            </Button>
          </div>
        </Card>
      </Screen>
    )
  }
  if (step === accounts.length && q.data.holdings.length) {
    return (
      <Screen title="Check-in" right={<span className="muted small">{`${total} of ${total}`}</span>}>
        {bar}
        <Card>
          <div className="title">Prices</div>
          <div className="stack" style={{ gap: 8, marginTop: 8 }}>
            {q.data.holdings.map((h) => (
              <PriceRow key={h.id} holding={h} />
            ))}
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <Button variant="primary" onClick={next}>
              Next
            </Button>
          </div>
        </Card>
      </Screen>
    )
  }
  const now = netWorthNow(series)
  const before = valueOn(series, addDays(today, -1))
  return (
    <Screen title="Check-in">
      {bar}
      <Card>
        <div className="kv">
          <span>Net worth</span>
          <span className="big">{now === null ? '–' : moneyShort(now)}</span>
        </div>
        {now !== null && before !== null ? (
          <div className="kv small">
            <span className="muted">Since last time</span>
            <span className={now - before >= 0 ? 'pos' : ''}>{signed(now - before)}</span>
          </div>
        ) : null}
        <div className="btn-row" style={{ marginTop: 12 }}>
          <Button onClick={() => setStep(0)}>Back</Button>
          <Button variant="primary" onClick={() => void finish()}>
            Done
          </Button>
        </div>
      </Card>
    </Screen>
  )
}

function PriceRow({ holding }: { holding: HoldingRow }) {
  const repo = useMoneyRepo()
  const v = holdingValue(holding)
  return (
    <div className="row">
      <span className="grow">
        {holding.ticker} <span className="muted small">{holding.quantity} · {v.value === null ? '–' : moneyShort(v.value)}</span>
      </span>
      <div style={{ width: 130 }}>
        <MoneyInput label={`${holding.ticker} price`} value={holding.price_pence} onChange={(p) => void repo.setPrice(holding.id, p)} />
      </div>
    </div>
  )
}
