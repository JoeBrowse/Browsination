// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fakeServices } from '@/test/fakeServices'
import { ServicesContext } from '../services'
import { ToastHost } from '../AppShell'
import { useShell } from '../shellStore'
import { QuickCapture } from './QuickCapture'

describe('QuickCapture', () => {
  it('registers the global handler, saves to the inbox and closes', async () => {
    const s = fakeServices()
    render(
      <ServicesContext.Provider value={s}>
        <QuickCapture />
        <ToastHost />
      </ServicesContext.Provider>,
    )
    expect(useShell.getState().captureHandler).not.toBeNull()
    expect(screen.queryByLabelText('Capture text')).toBeNull()

    act(() => useShell.getState().captureHandler?.())
    const input = screen.getByLabelText('Capture text')
    fireEvent.change(input, { target: { value: '  Buy milk ' } })
    await act(async () => {
      fireEvent.submit(input.closest('form')!)
    })
    expect(s.items.create).toHaveBeenCalledWith({ title: 'Buy milk' })
    expect(screen.queryByLabelText('Capture text')).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('Captured')
  })

  it('does not save empty text', async () => {
    const s = fakeServices()
    render(
      <ServicesContext.Provider value={s}>
        <QuickCapture />
      </ServicesContext.Provider>,
    )
    act(() => useShell.getState().captureHandler?.())
    const input = screen.getByLabelText('Capture text')
    await act(async () => {
      fireEvent.submit(input.closest('form')!)
    })
    expect(s.items.create).not.toHaveBeenCalled()
  })
})
