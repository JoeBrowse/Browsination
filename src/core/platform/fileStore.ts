import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import type { FileStore } from '../backup/fileStore'
import { idb } from './idb'
import { isNative } from './platform'

/** App-private text files: Capacitor Filesystem (Directory.Data) on Android, IndexedDB on the web. */
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
  }
}

function webFileStore(): FileStore {
  return {
    write: (path, text) => idb.set('files', path, text).then(() => undefined),
    async read(path) {
      const t = await idb.get<string>('files', path)
      if (t === undefined) throw new Error(`No such file: ${path}`)
      return t
    },
    async list(dir) {
      const prefix = dir.endsWith('/') ? dir : `${dir}/`
      const keys = await idb.keys('files')
      return keys.map(String).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length))
    },
    remove: (path) => idb.delete('files', path).then(() => undefined),
  }
}

/** Absolute file:// URI for a path in the app data directory (native only). */
export async function dataFileUri(path: string): Promise<string> {
  const r = await Filesystem.getUri({ path, directory: Directory.Data })
  return r.uri
}
