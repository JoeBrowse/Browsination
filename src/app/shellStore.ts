import { create } from 'zustand'

export interface ToastAction {
  label: string
  run: () => void | Promise<void>
}

/** Ephemeral shell state only. Data lives in SQLite. */
interface ShellState {
  captureHandler: (() => void) | null
  setCaptureHandler: (h: (() => void) | null) => void
  toast: { message: string; action?: ToastAction } | null
  showToast: (message: string, action?: ToastAction) => void
  clearToast: () => void
}

let toastTimer: ReturnType<typeof setTimeout> | null = null

export const useShell = create<ShellState>((set) => ({
  captureHandler: null,
  setCaptureHandler: (captureHandler) => set({ captureHandler }),
  toast: null,
  showToast: (message, action) => {
    set({ toast: { message, action } })
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => set({ toast: null }), action ? 6000 : 2500)
  },
  clearToast: () => {
    if (toastTimer) clearTimeout(toastTimer)
    set({ toast: null })
  },
}))

export const toast = (message: string, action?: ToastAction) => useShell.getState().showToast(message, action)
