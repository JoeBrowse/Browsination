import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNative } from './platform'

export interface SavedExport {
  /** Human-readable location shown in the UI. */
  location: string
  /** file:// URI usable by the share sheet (native only). */
  uri: string | null
}

const PUBLIC_DIR = 'Browsination'

/**
 * One-tap export. On Android the file goes to the public Documents folder (survives an
 * uninstall, visible in the Files app); if that is refused it falls back to app storage.
 * In a browser it downloads.
 */
export async function saveExportFile(filename: string, text: string): Promise<SavedExport> {
  if (!isNative()) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return { location: `Downloads/${filename}`, uri: null }
  }
  try {
    const r = await Filesystem.writeFile({
      path: `${PUBLIC_DIR}/${filename}`,
      data: text,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    })
    return { location: `Documents/${PUBLIC_DIR}/${filename}`, uri: r.uri }
  } catch {
    const r = await Filesystem.writeFile({
      path: `exports/${filename}`,
      data: text,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
      recursive: true,
    })
    return { location: `App storage/exports/${filename}`, uri: r.uri }
  }
}

export async function shareFile(uri: string, title: string): Promise<void> {
  await Share.share({ title, files: [uri] })
}

export async function canShare(): Promise<boolean> {
  if (!isNative()) return false
  return (await Share.canShare()).value
}

/** Opens the platform file chooser and resolves with the file text (null if cancelled). */
export function pickTextFile(accept = 'application/json,.json'): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.style.display = 'none'
    document.body.appendChild(input)
    const done = (text: string | null) => {
      input.remove()
      resolve(text)
    }
    input.addEventListener('change', () => {
      const f = input.files?.[0]
      if (!f) return done(null)
      f.text().then(done, () => done(null))
    })
    input.addEventListener('cancel', () => done(null))
    input.click()
  })
}
