import { BiometricAuth } from '@aparajita/capacitor-biometric-auth'
import { isNative } from './platform'

/** True when the device has enrolled biometry (or a device credential fallback) we can prompt for. */
export async function biometricAvailable(): Promise<boolean> {
  if (!isNative()) return false
  try {
    const r = await BiometricAuth.checkBiometry()
    return r.isAvailable || r.deviceIsSecure
  } catch {
    return false
  }
}

/** Prompts the system dialog. Resolves false on cancel, failure or lockout; never throws. */
export async function biometricAuthenticate(reason: string): Promise<boolean> {
  if (!isNative()) return false
  try {
    await BiometricAuth.authenticate({ reason, cancelTitle: 'Use PIN', allowDeviceCredential: true, androidTitle: 'Browsination', androidConfirmationRequired: false })
    return true
  } catch {
    return false
  }
}
