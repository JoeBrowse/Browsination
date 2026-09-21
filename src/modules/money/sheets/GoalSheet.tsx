import { useEffect, useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { MoneyInput } from '@/core/ui/MoneyInput'
import { Button } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import type { AccountRow, GoalRow, GoalStatus } from '../repo'
import { useMoneyRepo } from '../useMoney'

interface Draft {
  name: string
  target_pence: number | null
  deadline: string
  account_id: string | null
  saved_pence: number | null
  status: GoalStatus
}
const blank = (): Draft => ({ name: '', target_pence: null, deadline: '', account_id: null, saved_pence: null, status: 'active' })
const fromRow = (g: GoalRow): Draft => ({ name: g.name, target_pence: g.target_pence, deadline: g.deadline ?? '', account_id: g.account_id, saved_pence: g.saved_pence, status: g.status })

/** Target, deadline and where progress comes from: an account's balance, or a figure kept by hand. */
export function GoalSheet({ open, onClose, goal, accounts }: { open: boolean; onClose: () => void; goal?: GoalRow | null; accounts: AccountRow[] }) {
  const repo = useMoneyRepo()
  const [d, setD] = useState<Draft>(blank())
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    if (open) {
      setD(goal ? fromRow(goal) : blank())
      setConfirm(false)
    }
  }, [open, goal])
  const valid = d.name.trim() !== '' && d.target_pence !== null && d.target_pence > 0
  const save = async () => {
    const patch = { name: d.name.trim(), target_pence: d.target_pence ?? 0, deadline: d.deadline || null, account_id: d.account_id, saved_pence: d.account_id ? 0 : (d.saved_pence ?? 0), status: d.status }
    if (goal) await repo.updateGoal(goal.id, patch)
    else await repo.addGoal(patch)
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={goal ? 'Edit goal' : 'New goal'}>
      <div className="stack">
        <input aria-label="Goal name" placeholder="Name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus />
        <div className="row">
          <span className="grow">Target</span>
          <div style={{ width: 140 }}>
            <MoneyInput label="Target" value={d.target_pence} onChange={(v) => setD({ ...d, target_pence: v })} />
          </div>
        </div>
        <div className="row">
          <span className="grow">By</span>
          <input type="date" aria-label="Deadline" value={d.deadline} onChange={(e) => setD({ ...d, deadline: e.target.value })} />
        </div>
        <div className="row">
          <span className="grow">Progress from</span>
          <select aria-label="Progress from account" value={d.account_id ?? ''} onChange={(e) => setD({ ...d, account_id: e.target.value || null })}>
            <option value="">Typed in</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} balance
              </option>
            ))}
          </select>
        </div>
        {!d.account_id ? (
          <div className="row">
            <span className="grow">Saved so far</span>
            <div style={{ width: 140 }}>
              <MoneyInput label="Saved so far" value={d.saved_pence} onChange={(v) => setD({ ...d, saved_pence: v })} />
            </div>
          </div>
        ) : null}
        {goal ? (
          <Chips
            label="Goal status"
            value={d.status}
            onChange={(status) => setD({ ...d, status })}
            options={[
              { label: 'Active', value: 'active' as GoalStatus },
              { label: 'Done', value: 'done' as GoalStatus },
              { label: 'Dropped', value: 'dropped' as GoalStatus },
            ]}
          />
        ) : null}
        <div className="btn-row">
          {goal ? (
            <Button variant="danger" onClick={() => (confirm ? void repo.removeGoal(goal.id).then(onClose) : setConfirm(true))}>
              {confirm ? 'Really remove' : 'Remove'}
            </Button>
          ) : null}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()} disabled={!valid}>
            Save
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
