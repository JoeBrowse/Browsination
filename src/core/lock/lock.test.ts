import { describe, expect, it } from 'vitest'
import { effectiveMode, isModuleLocked, shouldRelock, useLock } from './lockStore'
import { hashPin, isValidPin, verifyPin } from './pin'

describe('pin', () => {
  it('hashes with a fresh salt and verifies only the right PIN', async () => {
    const a = await hashPin('2468', 1000)
    const b = await hashPin('2468', 1000)
    expect(a.hash).not.toBe(b.hash)
    expect(a.length).toBe(4)
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(await verifyPin('2468', a)).toBe(true)
    expect(await verifyPin('2469', a)).toBe(false)
    expect(await verifyPin('24680', a)).toBe(false)
    expect(await verifyPin('abcd', a)).toBe(false)
  })
  it('accepts 4 to 8 digits only', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('12345678')).toBe(true)
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('123456789')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
  })
})

describe('lock store', () => {
  it('relocks only after the grace period', () => {
    expect(shouldRelock(null, 10_000, 60)).toBe(false)
    expect(shouldRelock(0, 59_000, 60)).toBe(false)
    expect(shouldRelock(0, 60_000, 60)).toBe(true)
    expect(shouldRelock(0, 0, 0)).toBe(true)
  })
  it('a mode without a PIN is off', () => {
    expect(effectiveMode({ mode: 'app', hasPin: false })).toBe('off')
    expect(effectiveMode({ mode: 'money', hasPin: true })).toBe('money')
  })
  it('locks the money module in money mode and everything in app mode', () => {
    const money = { requiresLock: true }
    const brain = {}
    expect(isModuleLocked({ mode: 'money', hasPin: true, locked: true }, money)).toBe(true)
    expect(isModuleLocked({ mode: 'money', hasPin: true, locked: true }, brain)).toBe(false)
    expect(isModuleLocked({ mode: 'app', hasPin: true, locked: true }, brain)).toBe(true)
    expect(isModuleLocked({ mode: 'money', hasPin: true, locked: false }, money)).toBe(false)
    expect(isModuleLocked({ mode: 'off', hasPin: true, locked: true }, money)).toBe(false)
  })
  it('background then foreground past the grace re-locks', () => {
    const s = useLock.getState()
    s.configure({ mode: 'money', hasPin: true, graceSeconds: 60 })
    s.unlock()
    s.hidden(1000)
    s.shown(30_000)
    expect(useLock.getState().locked).toBe(false)
    s.hidden(40_000)
    s.shown(100_001)
    expect(useLock.getState().locked).toBe(true)
    s.unlock()
    s.configure({ mode: 'off' })
    s.lock()
    expect(useLock.getState().locked).toBe(false)
  })
})
