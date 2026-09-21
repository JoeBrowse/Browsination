import { useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { toast } from '@/app/shellStore'
import { calendarDay, formatDay } from '@/core/time/localDay'
import { Button, EmptyState, Screen, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { evidenceText } from '../logic'
import type { EvidenceKind, ProgressionKind, ProgressionRow } from '../repo'
import { useWorkRepo } from '../useWork'

const KINDS: { kind: ProgressionKind; title: string; placeholder: string }[] = [
  { kind: 'goal', title: 'Goals', placeholder: 'New goal' },
  { kind: 'skill', title: 'Skills', placeholder: 'Skill to build' },
  { kind: 'milestone', title: 'Milestones', placeholder: 'Chartership, exam, qualification' },
]

/** Goals, skills, dated milestones and the evidence log that backs an appraisal. */
export function ProgressionScreen() {
  const repo = useWorkRepo()
  const q = useQuery(async () => ({ items: await repo.progression(), evidence: await repo.evidence(), projects: await repo.projects() }), ['progression_items', 'evidence', 'projects'])
  const items = q.data?.items ?? []
  const [showDone, setShowDone] = useState(false)
  return (
    <Screen title="Progression">
      {KINDS.map((k) => (
        <KindSection key={k.kind} kind={k.kind} title={k.title} placeholder={k.placeholder} items={items.filter((i) => i.kind === k.kind && (showDone || i.status === 'active'))} />
      ))}
      {items.some((i) => i.status !== 'active') ? <Button onClick={() => setShowDone((v) => !v)}>{showDone ? 'Hide done' : 'Show done'}</Button> : null}
      <EvidenceSection items={items} evidence={q.data?.evidence ?? []} />
    </Screen>
  )
}

function KindSection({ kind, title, placeholder, items }: { kind: ProgressionKind; title: string; placeholder: string; items: ProgressionRow[] }) {
  const repo = useWorkRepo()
  const [text, setText] = useState('')
  const [date, setDate] = useState('')
  const toggle = (i: ProgressionRow) => void repo.updateProgression(i.id, i.status === 'done' ? { status: 'active', done_date: null } : { status: 'done', done_date: calendarDay() })
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      {items.length === 0 ? <EmptyState>None yet</EmptyState> : null}
      <div className="list">
        {items.map((i) => (
          <div key={i.id} className="list-row" style={{ minHeight: 44 }}>
            <button className={`check${i.status === 'done' ? ' on' : ''}`} aria-label={`Done: ${i.title}`} aria-pressed={i.status === 'done'} onClick={() => toggle(i)} style={{ marginTop: 0 }} />
            <div className="grow" style={{ textDecoration: i.status === 'dropped' ? 'line-through' : 'none' }}>
              <div>{i.title}</div>
              {i.target_date || i.done_date ? <div className="sub">{i.done_date ? `done ${formatDay(i.done_date)}` : `by ${formatDay(i.target_date!)}`}</div> : null}
            </div>
            <Button ariaLabel={`Remove ${i.title}`} onClick={() => void repo.removeProgression(i.id)}>
              ×
            </Button>
          </div>
        ))}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          void repo.addProgression(kind, text, date || null)
          setText('')
          setDate('')
        }}
      >
        <input aria-label={placeholder} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
        {kind !== 'skill' ? <input type="date" aria-label={`${title} target date`} value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 150 }} /> : null}
        <Button type="submit" disabled={!text.trim()}>
          Add
        </Button>
      </form>
    </>
  )
}

function EvidenceSection({ items, evidence }: { items: ProgressionRow[]; evidence: Awaited<ReturnType<ReturnType<typeof useWorkRepo>['evidence']>> }) {
  const repo = useWorkRepo()
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [source, setSource] = useState('')
  const [kind, setKind] = useState<EvidenceKind>('achievement')
  const [day, setDay] = useState(calendarDay())
  const [link, setLink] = useState('')
  const copy = async () => {
    const text = evidenceText(evidence)
    try {
      await navigator.clipboard.writeText(text)
      toast('Copied')
    } catch {
      toast('Copy failed')
    }
  }
  const linked = new Map(items.map((i) => [i.id, i.title]))
  return (
    <>
      <SectionTitle>
        Evidence · {evidence.length}
        {evidence.length ? <Button onClick={() => void copy()}>Copy</Button> : null}
      </SectionTitle>
      <form
        className="stack"
        style={{ gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          void repo.addEvidence({ day, kind, title, detail, source, progression_id: link || null })
          setTitle('')
          setDetail('')
          setSource('')
        }}
      >
        <Chips
          label="Evidence kind"
          value={kind}
          onChange={setKind}
          options={[
            { label: 'Achievement', value: 'achievement' as EvidenceKind },
            { label: 'Feedback', value: 'feedback' as EvidenceKind },
          ]}
        />
        <div className="row">
          <input aria-label="Evidence title" placeholder={kind === 'feedback' ? 'What they said' : 'What you did'} value={title} onChange={(e) => setTitle(e.target.value)} />
          <input type="date" aria-label="Evidence date" value={day} onChange={(e) => setDay(e.target.value)} style={{ width: 150 }} />
        </div>
        <div className="row">
          <input aria-label="Evidence detail" placeholder="Detail (optional)" value={detail} onChange={(e) => setDetail(e.target.value)} />
          <input aria-label="Evidence source" placeholder={kind === 'feedback' ? 'From' : 'Where'} value={source} onChange={(e) => setSource(e.target.value)} style={{ width: 130 }} />
        </div>
        <div className="row">
          <select aria-label="Linked goal" value={link} onChange={(e) => setLink(e.target.value)}>
            <option value="">No link</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
          <Button type="submit" variant="primary" disabled={!title.trim()}>
            Add
          </Button>
        </div>
      </form>
      <div className="list" style={{ marginTop: 10 }}>
        {evidence.map((e) => (
          <div key={e.id} className="list-row" style={{ alignItems: 'flex-start' }}>
            <div className="grow">
              <div>
                <span className="pill" style={{ marginRight: 6 }}>
                  {e.kind === 'feedback' ? 'Feedback' : 'Achievement'}
                </span>
                {e.title}
              </div>
              <div className="sub">
                {formatDay(e.day)}
                {e.source ? ` · ${e.source}` : ''}
                {e.progression_id && linked.get(e.progression_id) ? ` · ${linked.get(e.progression_id)}` : ''}
              </div>
              {e.detail ? <div className="small">{e.detail}</div> : null}
            </div>
            <Button ariaLabel={`Remove evidence ${e.title}`} onClick={() => void repo.removeEvidence(e.id)}>
              ×
            </Button>
          </div>
        ))}
      </div>
    </>
  )
}
