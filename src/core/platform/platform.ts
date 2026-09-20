import { Capacitor } from '@capacitor/core'

export const isNative = (): boolean => Capacitor.isNativePlatform()
export const platformName = (): string => Capacitor.getPlatform()
