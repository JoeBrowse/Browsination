// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'
import { useShell } from './shellStore'

function renderShell(initial = '/today') {
  const router = createMemoryRouter(
    [
      {
        element: <AppShell />,
        children: [
          { path: 'today', element: <h1>Today screen</h1> },
          { path: 'inbox', element: <h1>Inbox screen</h1> },
          { path: 'modules', element: <h1>Modules screen</h1> },
          { path: 'insights', element: <h1>Insights screen</h1> },
          { path: 'settings', element: <h1>Settings screen</h1> },
        ],
      },
    ],
    { initialEntries: [initial] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('AppShell', () => {
  it('renders the five tabs and navigates between them', async () => {
    const router = renderShell()
    expect(screen.getByText('Today screen')).toBeTruthy()
    for (const label of ['Today', 'Inbox', 'Modules', 'Insights', 'Settings']) expect(screen.getByRole('link', { name: label })).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Settings' }))
    })
    expect(router.state.location.pathname).toBe('/settings')
    expect(screen.getByText('Settings screen')).toBeTruthy()
  })

  it('shows the quick-capture button only once a handler is registered', async () => {
    renderShell()
    expect(screen.queryByRole('button', { name: 'Quick capture' })).toBeNull()
    let taps = 0
    act(() => useShell.getState().setCaptureHandler(() => taps++))
    const fab = screen.getByRole('button', { name: 'Quick capture' })
    fireEvent.click(fab)
    expect(taps).toBe(1)
    act(() => useShell.getState().setCaptureHandler(null))
    expect(screen.queryByRole('button', { name: 'Quick capture' })).toBeNull()
  })
})
