// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { fakeServices, makeItem } from '@/test/fakeServices'
import { ToastHost } from '../AppShell'
import { ServicesContext } from '../services'
import { TodayScreen } from './Today'

// The screen is tested on its own: no real modules, so no module panels or cards.
vi.mock('@/core/modules/registry', () => ({ getModules: () => [], modulePath: (id: string) => `/m/${id}` }))

function renderToday(s = fakeServices()) {
  render(
    <ServicesContext.Provider value={s}>
      <MemoryRouter>
        <TodayScreen />
        <ToastHost />
      </MemoryRouter>
    </ServicesContext.Provider>,
  )
  return s
}

describe('TodayScreen', () => {
  it('shows focus, overdue, due-today and chase sections from the task queries', async () => {
    const s = fakeServices()
    const focus = makeItem({ title: 'Deep work', focus_date: '2026-09-20' })
    vi.mocked(s.tasks.focus).mockResolvedValue([focus])
    vi.mocked(s.tasks.overdue).mockResolvedValue([makeItem({ title: 'Late thing', due_date: '2026-09-01' })])
    vi.mocked(s.tasks.dueOn).mockResolvedValue([makeItem({ title: 'Today thing', due_date: '2026-09-20' }), focus])
    vi.mocked(s.tasks.chaseDue).mockResolvedValue([makeItem({ title: 'Plumber', status: 'waiting', chase_date: '2026-09-18' })])
    await act(async () => {
      renderToday(s)
    })
    expect(screen.getByText('Deep work')).toBeTruthy()
    expect(screen.getByText('Overdue · 1')).toBeTruthy()
    expect(screen.getByText('Late thing')).toBeTruthy()
    // an item already in focus is not repeated under Due today
    expect(screen.getByText('Due today · 1')).toBeTruthy()
    expect(screen.getAllByText('Deep work')).toHaveLength(1)
    expect(screen.getByText('Chase · 1')).toBeTruthy()
    expect(screen.getByText('Nothing in the calendar')).toBeTruthy()
  })

  it('completes an item in one tap and offers undo', async () => {
    const s = fakeServices()
    vi.mocked(s.tasks.dueOn).mockResolvedValue([makeItem({ title: 'Call dentist', due_date: '2026-09-20' })])
    await act(async () => {
      renderToday(s)
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Done: Call dentist' }))
    })
    expect(s.items.setStatus).toHaveBeenCalledWith(expect.any(String), 'done')
    expect(screen.getByRole('status').textContent).toContain('Done')
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy()
  })

  it('shows an empty state when nothing is due', async () => {
    await act(async () => {
      renderToday()
    })
    expect(screen.getByText('Clear')).toBeTruthy()
  })
})
