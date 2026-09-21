import { useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { calendarDay, daysBetween, formatDay } from '@/core/time/localDay'
import { Button, Card, EmptyState, Screen, SectionTitle, Toggle } from '@/core/ui/primitives'
import { Sparkline } from '@/core/ui/Sparkline'
import { useQuery } from '@/core/ui/useQuery'
import { nextDueDate, utilisation } from '../logic'
import { money, moneyShort, useAccounts, useMoneyRepo } from '../useMoney'

const AGENCIES = ['Experian', 'Equifax', 'TransUnion', 'ClearScore', 'Other'].map((a) => ({ label: a, value: a.toLowerCase() }))

/** Cards: balance, limit, utilisation and the next payment date. Credit score: a manual history. */
export function CreditScreen() {
  const repo = useMoneyRepo()
  const acc = useAccounts()
  const scores = useQuery(() => repo.creditScores(), ['credit_scores'])
  const [score, setScore] = useState('')
  const [agency, setAgency] = useState('experian')
  const [day, setDay] = useState(calendarDay())
  const cards = (acc.data?.accounts ?? []).filter((a) => a.kind === 'credit')
  const today = acc.data?.today ?? calendarDay()
  const balance = (id: string) => acc.data?.latest.get(id)?.balance_pence ?? null
  const totalOwed = cards.reduce((n, c) => n + (balance(c.id) ?? 0), 0)
  const totalLimit = cards.reduce((n, c) => n + (c.credit_limit_pence ?? 0), 0)
  const totalUtil = utilisation(totalOwed, totalLimit)
  const latest = scores.data?.[scores.data.length - 1]
  const addScore = async () => {
    const n = Number(score)
    if (!Number.isFinite(n) || n <= 0) return
    await repo.addCreditScore(day, Math.round(n), agency)
    setScore('')
  }
  return (
    <Screen title="Credit">
      {acc.data && cards.length === 0 ? <EmptyState>No cards yet</EmptyState> : null}
      {cards.length > 1 ? (
        <Card>
          <div className="kv">
            <span>All cards</span>
            <span>
              {moneyShort(totalOwed)} of {moneyShort(totalLimit)}
              {totalUtil !== null ? ` · ${Math.round(totalUtil * 100)}%` : ''}
            </span>
          </div>
        </Card>
      ) : null}
      <div className="list">
        {cards.map((c) => {
          const owed = balance(c.id)
          const util = utilisation(owed, c.credit_limit_pence)
          const due = c.payment_due_day ? nextDueDate(today, c.payment_due_day) : null
          return (
            <div key={c.id} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
              <div className="kv" style={{ minHeight: 28 }}>
                <span className="title">{c.name}</span>
                <span>
                  {money(owed)}
                  {c.credit_limit_pence ? <span className="muted"> of {moneyShort(c.credit_limit_pence)}</span> : null}
                </span>
              </div>
              {util !== null ? (
                <div className="progress" aria-label={`${Math.round(util * 100)}% used`}>
                  <div style={{ width: `${Math.min(100, util * 100)}%` }} />
                </div>
              ) : null}
              <div className="row small" style={{ minHeight: 32 }}>
                <span className="grow muted">
                  {util !== null ? `${Math.round(util * 100)}% used` : 'no limit set'}
                  {due ? ` · payment ${formatDay(due)} (${daysBetween(today, due)}d)` : ''}
                </span>
                <Toggle label={`Payment reminder ${c.name}`} checked={!!c.payment_reminder} onChange={(on) => void repo.updateAccount(c.id, { payment_reminder: on ? 1 : 0 })} />
              </div>
            </div>
          )
        })}
      </div>
      <SectionTitle>Credit score</SectionTitle>
      <Card>
        <div className="kv">
          <span>Latest</span>
          <span className="big">{latest ? latest.score : '–'}</span>
        </div>
        {latest ? (
          <div className="muted small">
            {formatDay(latest.day)} · {latest.agency}
          </div>
        ) : null}
        <Sparkline values={(scores.data ?? []).map((s) => s.score)} label="Credit score trend" />
      </Card>
      <form
        className="stack"
        style={{ gap: 8, marginTop: 10 }}
        onSubmit={(e) => {
          e.preventDefault()
          void addScore()
        }}
      >
        <div className="row">
          <input type="number" inputMode="numeric" aria-label="Score" placeholder="Score" value={score} onChange={(e) => setScore(e.target.value)} style={{ width: 120 }} />
          <input type="date" aria-label="Score date" value={day} onChange={(e) => setDay(e.target.value)} />
          <Button type="submit" variant="primary" disabled={!score}>
            Add
          </Button>
        </div>
        <Chips label="Agency" value={agency} onChange={setAgency} options={AGENCIES} />
      </form>
      {scores.data?.length ? (
        <div className="list" style={{ marginTop: 12 }}>
          {[...scores.data].reverse().map((s) => (
            <div key={s.id} className="list-row" style={{ minHeight: 40 }}>
              <span className="muted small" style={{ width: 110 }}>
                {formatDay(s.day)}
              </span>
              <span className="grow">
                {s.score} <span className="muted small">{s.agency}</span>
              </span>
              <Button ariaLabel="Remove score" onClick={() => void repo.removeCreditScore(s.id)}>
                ×
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </Screen>
  )
}
