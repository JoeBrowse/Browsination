import { useState } from 'react'
import { Link } from 'react-router'
import { Button, EmptyState, Screen, SectionTitle } from '@/core/ui/primitives'
import { useQuery } from '@/core/ui/useQuery'
import { useChessRepo } from '../useChess'

export function StudentsScreen() {
  const repo = useChessRepo()
  const [name, setName] = useState('')
  const [tpl, setTpl] = useState({ title: '', body: '' })
  const students = useQuery(() => repo.students(), ['students', 'people'])
  const templates = useQuery(() => repo.templates(), ['lesson_templates'])
  return (
    <Screen title="Students">
      {!students.loading && (students.data?.length ?? 0) === 0 ? <EmptyState>No students yet</EmptyState> : null}
      <div className="list">
        {(students.data ?? []).map((s) => (
          <Link key={s.id} to={s.id} className="list-row">
            <div className="grow">
              <div className="title">{s.name}</div>
              {s.level || s.goals ? <div className="sub">{[s.level, s.goals].filter(Boolean).join(' · ')}</div> : null}
            </div>
          </Link>
        ))}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          void repo.addStudent(name)
          setName('')
        }}
      >
        <input aria-label="New student" placeholder="New student" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          Add
        </Button>
      </form>
      <SectionTitle>Lesson plan templates</SectionTitle>
      <div className="list">
        {(templates.data ?? []).map((t) => (
          <div key={t.id} className="list-row">
            <div className="grow">
              <div className="title">{t.title}</div>
              <div className="sub" style={{ whiteSpace: 'pre-wrap' }}>
                {t.body}
              </div>
            </div>
            <Button ariaLabel={`Remove template ${t.title}`} onClick={() => void repo.removeTemplate(t.id)}>
              ×
            </Button>
          </div>
        ))}
      </div>
      <form
        className="stack"
        style={{ gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (!tpl.title.trim()) return
          void repo.addTemplate(tpl.title, tpl.body)
          setTpl({ title: '', body: '' })
        }}
      >
        <input aria-label="Template title" placeholder="Template title" value={tpl.title} onChange={(e) => setTpl({ ...tpl, title: e.target.value })} />
        <textarea aria-label="Template body" placeholder="Plan" value={tpl.body} onChange={(e) => setTpl({ ...tpl, body: e.target.value })} />
        <Button type="submit" disabled={!tpl.title.trim()}>
          Add template
        </Button>
      </form>
    </Screen>
  )
}
