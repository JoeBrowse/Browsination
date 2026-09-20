import { CapacitorHttp } from '@capacitor/core'
import { isNative } from './platform'

/** GET a text resource. Native requests go through the Capacitor HTTP plugin, which is not bound by WebView CORS. */
export async function fetchText(url: string): Promise<string> {
  if (isNative()) {
    const r = await CapacitorHttp.get({ url, responseType: 'text', connectTimeout: 15_000, readTimeout: 20_000 })
    if (r.status < 200 || r.status >= 300) throw new Error(`HTTP ${r.status}`)
    return typeof r.data === 'string' ? r.data : JSON.stringify(r.data)
  }
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.text()
}
