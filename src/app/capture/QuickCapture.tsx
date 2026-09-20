import { useEffect, useRef, useState } from 'react'
import { Button } from '@/core/ui/primitives'
import { Sheet } from '@/core/ui/Sheet'
import { useServices } from '../services'
import { toast, useShell } from '../shellStore'

/** Type, save, gone. Lands in the inbox with no category. */
export function QuickCapture() {
  const s = useServices()
  const setHandler = useShell((st) => st.setCaptureHandler)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setHandler(() => setOpen(true))
    return () => setHandler(null)
  }, [setHandler])

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 50)
  }, [open])

  const save = async () => {
    const title = text.trim()
    if (!title) return
    await s.items.create({ title })
    setText('')
    setOpen(false)
    toast('Captured')
  }

  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="Capture">
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <input ref={input} aria-label="Capture text" value={text} onChange={(e) => setText(e.target.value)} placeholder="What?" autoComplete="off" enterKeyHint="done" />
        <Button type="submit" variant="primary" block disabled={!text.trim()}>
          Save
        </Button>
      </form>
    </Sheet>
  )
}
