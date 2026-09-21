/**
 * PIN storage. The PIN itself is never stored: a PBKDF2-SHA256 derivation with a random salt is,
 * in the settings table (so it travels with exports). The database is not encrypted; the lock is a
 * privacy screen for a personal device, not a vault.
 */
export interface PinRecord {
  hash: string
  salt: string
  iterations: number
  /** Digit count, so the lock screen can submit on the last digit. */
  length: number
}

export const PIN_ITERATIONS = 120_000
export const PIN_MIN = 4
export const PIN_MAX = 8

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_MIN},${PIN_MAX}}$`).test(pin)
}

const hex = (bytes: ArrayBuffer | Uint8Array): string => Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')
const unhex = (s: string): Uint8Array => new Uint8Array((s.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16)))

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' }, key, 256)
  return hex(bits)
}

export async function hashPin(pin: string, iterations = PIN_ITERATIONS): Promise<PinRecord> {
  if (!isValidPin(pin)) throw new Error(`PIN must be ${PIN_MIN}-${PIN_MAX} digits`)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { hash: await derive(pin, salt, iterations), salt: hex(salt), iterations, length: pin.length }
}

export async function verifyPin(pin: string, record: PinRecord): Promise<boolean> {
  if (!/^\d+$/.test(pin)) return false
  const got = await derive(pin, unhex(record.salt), record.iterations)
  // Constant-time compare.
  if (got.length !== record.hash.length) return false
  let diff = 0
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ record.hash.charCodeAt(i)
  return diff === 0
}
