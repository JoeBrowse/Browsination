import { useEffect, useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { Button } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { PROJECT_STATUSES, type ProjectArea, type ProjectRow, type ProjectStatus } from '../repo'
import { useWorkRepo } from '../useWork'

interface Draft {
  name: string
  client: string
  area: ProjectArea
  status: ProjectStatus
  notes: string
}
const blank = (area: ProjectArea): Draft => ({ name: '', client: '', area, status: 'active', notes: '' })

/** New or edit: name, client, day job or side, status, notes. Key dates and actions live on the project screen. */
export function ProjectSheet({ open, onClose, project, area = 'work', onCreated }: { open: boolean; onClose: () => void; project?: ProjectRow | null; area?: ProjectArea; onCreated?: (p: ProjectRow) => void }) {
  const repo = useWorkRepo()
  const [d, setD] = useState<Draft>(blank(area))
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    if (open) {
      setD(project ? { name: project.name, client: project.client, area: project.area, status: project.status, notes: project.notes } : blank(area))
      setConfirm(false)
    }
  }, [open, project, area])
  const save = async () => {
    const patch = { name: d.name.trim(), client: d.client.trim(), area: d.area, status: d.status, notes: d.notes }
    if (project) await repo.updateProject(project.id, patch)
    else onCreated?.(await repo.addProject(patch))
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={project ? 'Edit project' : 'New project'}>
      <div className="stack">
        <input aria-label="Project name" placeholder="Name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus />
        <input aria-label="Client" placeholder="Client (optional)" value={d.client} onChange={(e) => setD({ ...d, client: e.target.value })} />
        <Chips
          label="Area"
          value={d.area}
          onChange={(v) => setD({ ...d, area: v })}
          options={[
            { label: 'Day job', value: 'work' as ProjectArea },
            { label: 'Side', value: 'side' as ProjectArea },
          ]}
        />
        <Chips label="Project status" value={d.status} onChange={(status) => setD({ ...d, status })} options={PROJECT_STATUSES} />
        <textarea aria-label="Project notes" placeholder="Notes" value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
        <div className="btn-row">
          {project ? (
            <Button variant="danger" onClick={() => (confirm ? void repo.removeProject(project.id).then(onClose) : setConfirm(true))}>
              {confirm ? 'Really remove' : 'Remove'}
            </Button>
          ) : null}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()} disabled={!d.name.trim()}>
            Save
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
