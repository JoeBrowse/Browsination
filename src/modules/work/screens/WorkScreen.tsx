import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ItemSheet } from '@/app/tasks/ItemSheet'
import { useComplete } from '@/app/tasks/useComplete'
import type { ItemRow } from '@/core/repos/items'
import { calendarDay, formatDay } from '@/core/time/localDay'
import { Button, EmptyState, Screen, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { upcomingKeyDates } from '../logic'
import type { ProjectArea, ProjectRow } from '../repo'
import { ProjectSheet } from '../sheets/ProjectSheet'
import { useWorkRepo } from '../useWork'

/** Hub: day job and side projects kept apart, each with its next action; tiles for people, progression, learning. */
export function WorkScreen() {
  const repo = useWorkRepo()
  const navigate = useNavigate()
  const complete = useComplete()
  const [adding, setAdding] = useState<ProjectArea | null>(null)
  const [editing, setEditing] = useState<ItemRow | null>(null)
  const q = useQuery(async () => ({ projects: await repo.projects(), actions: await repo.openActions() }), ['projects', 'items'])
  const today = calendarDay()
  const projects = q.data?.projects ?? []
  const soon = upcomingKeyDates(
    projects.map((p) => ({ project: p, dates: repo.keyDates(p) })),
    today,
    14,
  )
  const group = (area: ProjectArea, title: string) => {
    const list = projects.filter((p) => p.area === area && p.status !== 'done')
    return (
      <>
        <SectionTitle>
          {title}
          <Button onClick={() => setAdding(area)}>Add</Button>
        </SectionTitle>
        {q.data && list.length === 0 ? <EmptyState>Nothing here</EmptyState> : null}
        <div className="list">
          {list.map((p) => (
            <ProjectRowView key={p.id} project={p} next={q.data?.actions.get(p.id)?.[0] ?? null} onOpen={() => navigate(`projects/${p.id}`)} onOpenAction={setEditing} onDone={(i) => void complete(i)} />
          ))}
        </div>
      </>
    )
  }
  return (
    <Screen title="Work">
      <div className="tray">
        <Link to="people" className="tile">
          <span className="label">People</span>
        </Link>
        <Link to="progression" className="tile">
          <span className="label">Progression</span>
        </Link>
        <Link to="learning" className="tile">
          <span className="label">Learning</span>
        </Link>
      </div>
      {soon.length ? (
        <>
          <SectionTitle>Coming up</SectionTitle>
          <div className="list">
            {soon.map((u) => (
              <Link key={u.key} to={u.href} className="list-row" style={{ minHeight: 44 }}>
                <span className="grow">{u.title}</span>
                <span className="muted small">{formatDay(u.date)}</span>
              </Link>
            ))}
          </div>
        </>
      ) : null}
      {group('work', 'Day job')}
      {group('side', 'Side projects')}
      {projects.some((p) => p.status === 'done') ? (
        <>
          <SectionTitle>Done</SectionTitle>
          <div className="list" style={{ opacity: 0.7 }}>
            {projects
              .filter((p) => p.status === 'done')
              .map((p) => (
                <Link key={p.id} to={`projects/${p.id}`} className="list-row" style={{ minHeight: 44 }}>
                  <span className="grow">{p.name}</span>
                  <span className="muted small">{p.area === 'side' ? 'side' : p.client}</span>
                </Link>
              ))}
          </div>
        </>
      ) : null}
      <ProjectSheet key={adding ?? 'closed'} open={adding !== null} onClose={() => setAdding(null)} area={adding ?? 'work'} onCreated={(p) => navigate(`projects/${p.id}`)} />
      <ItemSheet item={editing} open={editing !== null} onClose={() => setEditing(null)} />
    </Screen>
  )
}

function ProjectRowView({ project, next, onOpen, onOpenAction, onDone }: { project: ProjectRow; next: ItemRow | null; onOpen: () => void; onOpenAction: (i: ItemRow) => void; onDone: (i: ItemRow) => void }) {
  return (
    <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
      <button className="row" style={{ minHeight: 32, textAlign: 'left' }} onClick={onOpen}>
        <span className="grow title">{project.name}</span>
        <span className="muted small">
          {project.client}
          {project.status !== 'active' ? ` · ${project.status}` : ''}
        </span>
      </button>
      {next ? (
        <div className="row small" style={{ minHeight: 32 }}>
          <button className={`check`} aria-label={`Done: ${next.title}`} onClick={() => onDone(next)} style={{ width: 28, height: 28, marginTop: 0 }} />
          <button className="grow" style={{ textAlign: 'left' }} onClick={() => onOpenAction(next)}>
            {next.title}
            {next.due_date ? <span className="muted"> · {formatDay(next.due_date)}</span> : null}
          </button>
        </div>
      ) : (
        <div className="muted small">No next action</div>
      )}
    </div>
  )
}
