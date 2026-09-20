import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Chips } from '@/app/tasks/fields'
import { ItemSheet } from '@/app/tasks/ItemSheet'
import { useComplete } from '@/app/tasks/useComplete'
import type { ItemRow } from '@/core/repos/items'
import { Button, EmptyState, Screen } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useQuery } from '@/core/ui/useQuery'
import { MoneyInput } from '../fields'
import { pounds } from '../logic'
import { LISTS, type BuyDetailsRow, type ListKey } from '../repo'
import { useLifeRepo } from '../useLife'

/** House, garden, buy and general lists: plain views over items. */
export function ListsScreen() {
  const repo = useLifeRepo()
  const complete = useComplete()
  const [list, setList] = useState<ListKey>('house')
  const [title, setTitle] = useState('')
  const [editing, setEditing] = useState<ItemRow | null>(null)
  const [buy, setBuy] = useState<ItemRow | null>(null)
  const q = useQuery(
    async () => {
      const items = await repo.listItems(list)
      const details = list === 'buy' ? await repo.buyDetailsFor(items.map((i) => i.id)) : []
      return { items, details: new Map(details.map((d) => [d.item_id, d])) }
    },
    ['items', 'buy_details'],
    [list],
  )
  const add = async () => {
    if (!title.trim()) return
    await repo.addListItem(list, title)
    setTitle('')
  }
  const total = list === 'buy' ? [...(q.data?.details.values() ?? [])].reduce((n, d) => n + (d.price_pence ?? 0), 0) : 0
  return (
    <Screen title="Lists" right={list === 'buy' && total ? <span className="pill">{pounds(total)}</span> : null}>
      <Chips label="List" value={list} onChange={setList} options={LISTS.map((l) => ({ label: l.label, value: l.key }))} />
      <form
        className="row"
        style={{ marginTop: 10 }}
        onSubmit={(e) => {
          e.preventDefault()
          void add()
        }}
      >
        <input aria-label="New list item" placeholder="Add" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button type="submit" variant="primary" disabled={!title.trim()}>
          Add
        </Button>
      </form>
      {!q.loading && (q.data?.items.length ?? 0) === 0 ? <EmptyState>Empty</EmptyState> : null}
      <div className="list">
        {(q.data?.items ?? []).map((i) => (
          <Row key={i.id} item={i} details={q.data?.details.get(i.id)} onDone={() => void complete(i)} onOpen={() => setEditing(i)} onPrice={list === 'buy' ? () => setBuy(i) : undefined} />
        ))}
      </div>
      <ItemSheet item={editing} open={editing !== null} onClose={() => setEditing(null)} />
      <BuySheet item={buy} details={buy ? q.data?.details.get(buy.id) : undefined} onClose={() => setBuy(null)} />
    </Screen>
  )
}

function Row({ item, details, onDone, onOpen, onPrice }: { item: ItemRow; details?: BuyDetailsRow; onDone: () => void; onOpen: () => void; onPrice?: () => void }) {
  return (
    <div className="list-row task-row">
      <button className="check" aria-label={`Done: ${item.title}`} onClick={onDone} />
      <button className="grow task-body" onClick={onOpen}>
        <div className="title">{item.title}</div>
        {details?.price_pence != null || details?.url ? <div className="sub">{pounds(details.price_pence)}</div> : null}
      </button>
      {details?.url ? (
        <a href={details.url} target="_blank" rel="noreferrer" className="btn icon" aria-label="Open link">
          <ExternalLink size={18} aria-hidden />
        </a>
      ) : null}
      {onPrice ? (
        <Button onClick={onPrice} ariaLabel={`Price for ${item.title}`}>
          £
        </Button>
      ) : null}
    </div>
  )
}

function BuySheet({ item, details, onClose }: { item: ItemRow | null; details?: BuyDetailsRow; onClose: () => void }) {
  const repo = useLifeRepo()
  const [price, setPrice] = useState<number | null>(details?.price_pence ?? null)
  const [url, setUrl] = useState(details?.url ?? '')
  const save = async () => {
    if (item) await repo.setBuyDetails(item.id, price, url.trim() || null)
    onClose()
  }
  return (
    <Sheet open={item !== null} onClose={onClose} title={item?.title}>
      <div className="stack">
        <MoneyInput label="Price estimate" value={price} onChange={setPrice} />
        <input aria-label="Link" placeholder="Link" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" />
        <Button variant="primary" block onClick={() => void save()}>
          Save
        </Button>
      </div>
    </Sheet>
  )
}
