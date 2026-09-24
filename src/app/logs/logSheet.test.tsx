// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { logEntriesRepo } from '@/core/repos/logEntries'
import { localDayOf, localTimeOf } from '@/core/time/localDay'
import { makeTestDb } from '@/test/db'
import { fakeServices } from '@/test/fakeServices'
import { HistoryScreen } from '../screens/History'
import { ServicesContext } from '../services'

async function setup() {
  const db = await makeTestDb()
  const logs = logEntriesRepo(db)
  const s = fakeServices({ db, logs })
  const view = async () =>
    await act(async () => {
      render(
        <ServicesContext.Provider value={s}>
          <MemoryRouter>
            <HistoryScreen />
          </MemoryRouter>
        </ServicesContext.Provider>,
      )
    })
  return { db, logs, view }
}

/** The sheet itself carries the type's name, so the field is the input with that label. */
const type = (label: string, value: string) => fireEvent.change(screen.getAllByLabelText(label).find((el) => el.tagName === 'INPUT')!, { target: { value } })
/** The entry list and the sheet both hold rows with the same labels, so queries say which. */
const inList = (text: string) => within(document.querySelector('.screen .list, main .list, .list')!).getByText(text)
const inSheet = (text: string) => within(document.querySelector('.sheet')!).getByText(text)
const tap = async (el: HTMLElement | Element) => await act(async () => { fireEvent.click(el) })

describe('History', () => {
  it('lists what was logged and moves an entry to when it actually happened', async () => {
    const { logs, view } = await setup()
    const entry = await logs.add({ type: 'break', module: 'snooker', value: 32, unit: 'points', payload: { note: 'blue to black' } })
    await view()
    expect(inList('Break')).toBeTruthy()
    expect(screen.getByText('32 points · blue to black')).toBeTruthy()
    await tap(inList('Break'))
    // when, value and the payload text are all editable
    type('When date', '2026-09-18')
    type('When time', '20:15')
    type('Points', '58')
    type('Note', 'clearance')
    await tap(screen.getByRole('button', { name: 'Save' }))
    const after = (await logs.get(entry.id))!
    expect(localDayOf(after.ts, after.tz_offset_min)).toBe('2026-09-18')
    expect(localTimeOf(after.ts, after.tz_offset_min)).toBe('20:15')
    expect(after.value).toBe(58)
    expect(after.payload.note).toBe('clearance')
  })

  it('logs something that happened days ago', async () => {
    const { logs, view } = await setup()
    await view()
    await tap(screen.getByRole('button', { name: 'Add' }))
    await tap(inSheet('Practice'))
    type('When date', '2026-09-15')
    type('When time', '09:30')
    type('Minutes', '45')
    type('Worked on', 'Cripple Creek')
    await tap(screen.getByRole('button', { name: 'Save' }))
    const [e] = await logs.recent({ type: 'practice' })
    expect(e).toBeTruthy()
    expect(localDayOf(e!.ts, e!.tz_offset_min)).toBe('2026-09-15')
    expect(e!.value).toBe(45)
    expect(e!.payload.worked_on).toBe('Cripple Creek')
    expect(e!.module).toBe('banjo')
  })

  it('changes the day’s entry for a one-a-day type instead of adding a second', async () => {
    const { logs, view } = await setup()
    await logs.add({ type: 'mood', module: 'brain', value: 3, ts: '2026-09-19T11:00:00.000Z', tz_offset_min: 60 })
    await view()
    await tap(screen.getByRole('button', { name: 'Add' }))
    await tap(inSheet('Mood'))
    type('When date', '2026-09-19')
    type('When time', '21:00')
    type('Mood', '5')
    await tap(screen.getByRole('button', { name: 'Save' }))
    const all = await logs.recent({ type: 'mood' })
    expect(all).toHaveLength(1)
    expect(all[0]!.value).toBe(5)
  })

  it('deletes an entry', async () => {
    const { logs, view } = await setup()
    await logs.add({ type: 'meditation', module: 'brain', value: 10, unit: 'min' })
    await view()
    await tap(inList('Meditation'))
    await tap(screen.getByRole('button', { name: 'Delete' }))
    expect(await logs.recent({ type: 'meditation' })).toHaveLength(0)
  })
})
