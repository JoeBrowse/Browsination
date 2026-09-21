import { loadInsights, type Insights, type PeriodSummary } from '@/core/insights/queries'
import { describeCorrelation } from '@/core/insights/stats'
import { todayLocal } from '@/core/time/localDay'
import { Card, EmptyState, Screen, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { Scatter } from '../insights/Scatter'
import { useServices } from '../services'

/** Weekly and monthly summaries, then correlations across the shared log. Everything here is correlation, never cause. */
export function InsightsScreen() {
  const s = useServices()
  const q = useQuery(async () => {
    const dayStartHour = await s.settings.get('dayStartHour')
    return loadInsights(s.db, dayStartHour, todayLocal(new Date(), dayStartHour))
  }, ['log_entries', 'items', 'settings'])
  const d = q.data
  return (
    <Screen title="Insights">
      {d ? (
        <>
          <SectionTitle>This week</SectionTitle>
          <Summary now={d.week.now} before={d.week.before} />
          <SectionTitle>This month</SectionTitle>
          <Summary now={d.month.now} before={d.month.before} />
          <SectionTitle>Correlations · last {d.days} days</SectionTitle>
          {d.correlations.map((c) => (
            <Card key={c.key} style={{ marginBottom: 10 }}>
              <div className="kv" style={{ minHeight: 32 }}>
                <span className="title">{c.title}</span>
                <span className="pill">{c.result.n} pairs</span>
              </div>
              <div className="small">
                {describeCorrelation(c.result)}
                {c.result.r !== null ? <span className="muted"> · r {c.result.r.toFixed(2)}</span> : null}
              </div>
              <div className="muted small">
                {c.x} → {c.y}
              </div>
              <Scatter pairs={c.pairs} label={`${c.title} scatter`} />
            </Card>
          ))}
          <div className="muted small">Correlation, not cause. Under 10 pairs means little.</div>
        </>
      ) : (
        <EmptyState>…</EmptyState>
      )}
    </Screen>
  )
}

function Summary({ now, before }: { now: PeriodSummary; before: PeriodSummary }) {
  const rows: { label: string; value: string; delta: string | null }[] = [
    line('Tasks done', now.tasksDone, before.tasksDone),
    line('Units', now.units, before.units, 1),
    line('Drink-free days', now.drinkFreeDays, before.drinkFreeDays),
    line('Meditation min', now.meditationMin, before.meditationMin),
    line('Practice min', now.practiceMin, before.practiceMin),
    line('Focus min', now.focusMin, before.focusMin),
    { label: 'Mood', value: now.moodAvg === null ? '–' : now.moodAvg.toFixed(1), delta: deltaOf(now.moodAvg, before.moodAvg, 1) },
    { label: 'Sleep h', value: now.sleepAvg === null ? '–' : now.sleepAvg.toFixed(1), delta: deltaOf(now.sleepAvg, before.sleepAvg, 1) },
  ]
  return (
    <Card>
      {rows.map((r) => (
        <div key={r.label} className="kv" style={{ minHeight: 30 }}>
          <span>{r.label}</span>
          <span>
            {r.value}
            {r.delta ? <span className="muted small"> {r.delta}</span> : null}
          </span>
        </div>
      ))}
    </Card>
  )
}

function line(label: string, now: number, before: number, digits = 0) {
  return { label, value: now.toFixed(digits), delta: deltaOf(now, before, digits) }
}
function deltaOf(now: number | null, before: number | null, digits: number): string | null {
  if (now === null || before === null) return null
  const d = now - before
  if (Math.abs(d) < 0.05) return 'same'
  return `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(digits)} vs before`
}
export type { Insights }
