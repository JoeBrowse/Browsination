import { create } from 'zustand'

/** Ephemeral shell state only. Data lives in SQLite. */
interface ShellState {
  captureHandler: (() => void) | null
  setCaptureHandler: (h: (() => void) | null) => void
  toast: string | null
  showToast: (msg: string) => void
}

let toastTimer: ReturnType<typeof setTimeout> | null = null

export const useShell = create<ShellState>((set) => ({
  captureHandler: null,
  setCaptureHandler: (captureHandler) => set({ captureHandler }),
  toast: null,
  showToast: (toast) => {
    set({ toast })
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => set({ toast: null }), 2500)
  },
}))

export const toast = (msg: string) => useShell.getState().showToast(msg)
