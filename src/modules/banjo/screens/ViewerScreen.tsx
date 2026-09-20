import { X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useServices } from '@/app/services'
import { base64ToBytes } from '@/core/platform/fileStore'
import { keepScreenAwake } from '@/core/platform/keepAwake'
import { useQuery } from '@/core/ui/useQuery'

/** Full-screen viewer for a piece's PDF or image. Keeps the screen awake while open. */
export function ViewerScreen() {
  const { fileId = '' } = useParams()
  const s = useServices()
  const navigate = useNavigate()
  const [zoom, setZoom] = useState(1)
  const q = useQuery(() => s.fileRows.get(fileId), ['files'], [fileId])
  const file = q.data
  useEffect(() => {
    void keepScreenAwake(true)
    return () => void keepScreenAwake(false)
  }, [])
  return (
    <div className="viewer">
      <div className="viewer-bar">
        <button className="btn icon" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
          <ZoomOut size={20} aria-hidden />
        </button>
        <button className="btn icon" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>
          <ZoomIn size={20} aria-hidden />
        </button>
        <span className="grow small muted" style={{ textAlign: 'center' }}>
          {file?.title ?? ''}
        </span>
        <button className="btn icon" aria-label="Close viewer" onClick={() => navigate(-1)}>
          <X size={20} aria-hidden />
        </button>
      </div>
      <div className="viewer-body">
        {file ? file.mime.startsWith('image/') ? <ImageView path={file.rel_path} mime={file.mime} zoom={zoom} /> : <PdfView path={file.rel_path} zoom={zoom} /> : null}
      </div>
    </div>
  )
}

function ImageView({ path, mime, zoom }: { path: string; mime: string; zoom: number }) {
  const s = useServices()
  const q = useQuery(() => s.files.displayUrl(path, mime), [], [path])
  return q.data ? <img src={q.data} alt="" style={{ width: `${zoom * 100}%`, display: 'block' }} /> : null
}

function PdfView({ path, zoom }: { path: string; zoom: number }) {
  const s = useServices()
  const host = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pages, setPages] = useState(0)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [pdfjs, b64] = await Promise.all([import('pdfjs-dist'), s.files.readBase64(path)])
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
        const doc = await pdfjs.getDocument({ data: base64ToBytes(b64) }).promise
        if (cancelled || !host.current) return
        host.current.replaceChildren()
        setPages(doc.numPages)
        const width = host.current.clientWidth || 400
        const dpr = Math.min(3, window.devicePixelRatio || 1)
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i)
          if (cancelled || !host.current) return
          const base = page.getViewport({ scale: 1 })
          const scale = (width * zoom) / base.width
          const viewport = page.getViewport({ scale: scale * dpr })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = `${viewport.width / dpr}px`
          canvas.style.height = `${viewport.height / dpr}px`
          canvas.style.display = 'block'
          canvas.style.marginBottom = '8px'
          host.current.appendChild(canvas)
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas }).promise
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [path, zoom, s.files])
  return (
    <div ref={host} aria-label={pages ? `PDF, ${pages} pages` : 'PDF'}>
      {error ? <div className="empty">{error}</div> : null}
    </div>
  )
}
