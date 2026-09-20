/** Minimal file storage. Native and web implementations live in src/core/platform/fileStore.ts. */
export interface FileStore {
  write(path: string, text: string): Promise<void>
  read(path: string): Promise<string>
  list(dir: string): Promise<string[]>
  remove(path: string): Promise<void>
  /** Binary content as base64 (sheet music, images). */
  writeBase64(path: string, base64: string): Promise<void>
  readBase64(path: string): Promise<string>
  /** A URL the WebView can load directly for this path (native file:// converted; web data: URL). */
  displayUrl(path: string, mime: string): Promise<string>
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
    async writeBase64(path, base64) {
      files.set(path, base64)
    },
    async readBase64(path) {
      const t = files.get(path)
      if (t === undefined) throw new Error(`No such file: ${path}`)
      return t
    },
    async displayUrl(path, mime) {
      return `data:${mime};base64,${files.get(path) ?? ''}`
    },
  }
}
