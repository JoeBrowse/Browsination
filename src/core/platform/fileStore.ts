import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import type { FileStore } from '../backup/fileStore'
import { idb } from './idb'
import { isNative } from './platform'

/** App-private files: Capacitor Filesystem (Directory.Data) on Android, IndexedDB on the web. */
export function createFileStore(): FileStore {
  return isNative() ? nativeFileStore() : webFileStore()
}

function nativeFileStore(): FileStore {
  const directory = Directory.Data
  return {
    async write(path, text) {
      await Filesystem.writeFile({ path, data: text, directory, encoding: Encoding.UTF8, recursive: true })
    },
    async read(path) {
      const r = await Filesystem.readFile({ path, directory, encoding: Encoding.UTF8 })
      return typeof r.data === 'string' ? r.data : await r.data.text()
    },
    async list(dir) {
      try {
        const r = await Filesystem.readdir({ path: dir, directory })
        return r.files.map((f) => f.name)
      } catch {
        return []
      }
    },
    async remove(path) {
      await Filesystem.deleteFile({ path, directory })
    },
    async writeBase64(path, base64) {
      await Filesystem.writeFile({ path, data: base64, directory, recursive: true })
    },
    async readBase64(path) {
      const r = await Filesystem.readFile({ path, directory })
      if (typeof r.data === 'string') return r.data
      const buf = new Uint8Array(await r.data.arrayBuffer())
      return bytesToBase64(buf)
    },
    async displayUrl(path) {
      const r = await Filesystem.getUri({ path, directory })
      return Capacitor.convertFileSrc(r.uri)
    },
  }
}

function webFileStore(): FileStore {
  const readText = async (path: string) => {
    const t = await idb.get<string>('files', path)
    if (t === undefined) throw new Error(`No such file: ${path}`)
    return t
  }
  return {
    write: (path, text) => idb.set('files', path, text).then(() => undefined),
    read: readText,
    async list(dir) {
      const prefix = dir.endsWith('/') ? dir : `${dir}/`
      const keys = await idb.keys('files')
      return keys.map(String).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length))
    },
    remove: (path) => idb.delete('files', path).then(() => undefined),
    writeBase64: (path, base64) => idb.set('files', path, base64).then(() => undefined),
    readBase64: readText,
    displayUrl: async (path, mime) => `data:${mime};base64,${await readText(path)}`,
  }
}

/** Absolute file:// URI for a path in the app data directory (native only). */
export async function dataFileUri(path: string): Promise<string> {
  const r = await Filesystem.getUri({ path, directory: Directory.Data })
  return r.uri
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(s)
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
