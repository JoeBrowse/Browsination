/** Minimal text-file storage. Native and web implementations live in src/core/platform/fileStore.ts. */
export interface FileStore {
  write(path: string, text: string): Promise<void>
  read(path: string): Promise<string>
  list(dir: string): Promise<string[]>
  remove(path: string): Promise<void>
}

export function memoryFileStore(): FileStore & { files: Map<string, string> } {
  const files = new Map<string, string>()
  return {
    files,
    async write(path, text) {
      files.set(path, text)
    },
    async read(path) {
      const t = files.get(path)
      if (t === undefined) throw new Error(`No such file: ${path}`)
      return t
    },
    async list(dir) {
      const prefix = dir.endsWith('/') ? dir : `${dir}/`
      return [...files.keys()].filter((p) => p.startsWith(prefix)).map((p) => p.slice(prefix.length))
    },
    async remove(path) {
      files.delete(path)
    },
  }
}
