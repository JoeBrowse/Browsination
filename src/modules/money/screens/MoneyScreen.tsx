import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useServices } from '@/app/services'
import { formatDay } from '@/core/time/localDay'
import { Button, Card, EmptyState, Screen, SectionTitle } from '@/core/ui/primitives'
import { Sparkline } from '@/core/ui/Sparkline'
import { useQuery } from '@/core/ui/useQuery'
import { checkInDue, monthChange, monthlyPoints, netWorthNow } from '../logic'
import { kindLabel, type AccountRow } from '../repo'
import { AccountSheet } from '../sheets/AccountSheet'
import { money, moneyShort, signed, useAccounts, useMoneyRepo } from '../useMoney'
import { localDayOf } from '@/core/time/localDay'

export function MoneyScreen() {
  const s = useServices()
  const repo = useMoneyRepo()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const q = useAccounts(showArchived)
  const due = useQuery(async () => {
    const [day, last] = await Promise.all([s.settings.get('money.checkInDay'), repo.lastCheckIn()])
    return checkInDue(q.data?.today ?? '', day, last ? localDayOf(last.ts, last.tz_offset_min) : null)
  }, ['log_entries', 'settings'], [q.data?.today])
  const d = q.data
  const now = d ? netWorthNow(d.series) : null
  const change = d ? monthChange(d.series, d.today) : null
  const trend = d ? monthlyPoints(d.series).map((p) => p.pence) : []
  const archivedCount = d ? d.accounts.filter((a) => a.archived).length : 0
  return (
    <Screen title="Money" right={<Button onClick={() => setAdding(true)}>Add</Button>}>
      <Card>
        <div className="kv">
          <span>Net worth</span>
          <span className="big">{now === null ? '–' : moneyShort(now)}</span>
        </div>
        {change !== null ? (
          <div className="kv small">
            <span className="muted">Last 30 days</span>
            <span className={change >= 0 ? 'pos' : ''}>{signed(change)}</span>
          </div>
        ) : null}
        <Sparkline values={trend} label="Net worth by month" />
      </Card>
      <div className="tray" style={{ marginTop: 14 }}>
        <Link to="checkin" className="tile">
          <span className="label">Check-in</span>
          {due.data ? <span className="pill accent">due</span> : null}
        </Link>
        <Link to="holdings" className="tile">
          <span className="label">Holdings</span>
        </Link>
        <Link to="goals" className="tile">
          <span className="label">Goals</span>
        </Link>
        <Link to="credit" className="tile">
          <span className="label">Credit</span>
        </Link>
      </div>
      <SectionTitle>Accounts</SectionTitle>
      {d && d.accounts.length === 0 ? <EmptyState>No accounts yet</EmptyState> : null}
      <div className="list">
        {(d?.accounts ?? []).map((a) => (
          <AccountRowView key={a.id} account={a} balance={d?.latest.get(a.id)?.balance_pence ?? null} day={d?.latest.get(a.id)?.day ?? null} onOpen={() => navigate(`accounts/${a.id}`)} />
        ))}
      </div>
      {archivedCount > 0 || showArchived ? (
        <Button onClick={() => setShowArchived((v) => !v)}>{showArchived ? 'Hide archived' : `Archived · ${archivedCount}`}</Button>
      ) : d && d.accounts.length > 0 ? (
        <ArchivedToggle onShow={() => setShowArchived(true)} />
      ) : null}
      <AccountSheet open={adding} onClose={() => setAdding(false)} onCreated={(a) => navigate(`accounts/${a.id}`)} />
    </Screen>
  )
}

function ArchivedToggle({ onShow }: { onShow: () => void }) {
  const repo = useMoneyRepo()
  const n = useQuery(async () => (await repo.accounts(true)).filter((a) => a.archived).length, ['accounts'])
  if (!n.data) return null
  return <Button onClick={onShow}>Archived · {n.data}</Button>
}

function AccountRowView({ account, balance, day, onOpen }: { account: AccountRow; balance: number | null; day: string | null; onOpen: () => void }) {
  return (
    <button className="list-row" onClick={onOpen} style={{ opacity: account.archived ? 0.6 : 1 }}>
      <div className="grow" style={{ textAlign: 'left' }}>
        <div className="title">{account.name}</div>
        <div className="sub">
          {kindLabel(account.kind)}
          {account.provider ? ` · ${account.provider}` : ''}
          {day ? ` · ${formatDay(day)}` : ''}
        </div>
      </div>
      <span>{account.kind === 'credit' && balance !== null ? `${money(balance)} owed` : money(balance)}</span>
    </button>
  )
}
