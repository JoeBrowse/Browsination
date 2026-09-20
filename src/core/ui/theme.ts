import type { Settings } from '../settings/schema'

export function applyTheme(theme: Settings['theme']): void {
  const resolved = theme === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme
  document.documentElement.dataset.theme = resolved
  try {
    localStorage.setItem('theme', theme)
  } catch {
    /* private mode */
  }
}
