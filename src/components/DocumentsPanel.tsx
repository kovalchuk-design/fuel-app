import { saveAs } from 'file-saver'
import { useRef, useState } from 'react'
import { Button, Card, ErrorText } from './ui.tsx'
import { buildAll, renderDocx, renderPdf, renderXlsx, type DocModel, type ReportInput } from '../lib/docs/index.ts'

let fontCache: Promise<{ regular: Uint8Array; bold: Uint8Array }> | null = null
const loadFonts = () =>
  (fontCache ??= Promise.all(['Regular', 'Bold'].map(async (w) => {
    const res = await fetch(`${import.meta.env.BASE_URL}fonts/LiberationSerif-${w}.ttf`)
    if (!res.ok) throw new Error('Не вдалося завантажити шрифт')
    return new Uint8Array(await res.arrayBuffer())
  })).then(([regular, bold]) => ({ regular, bold })))

const TITLES: Record<DocModel['id'], string> = { vidomist: 'Відомість заміру', raspiska: 'Розшифровка напрацювання', donesennya: 'Донесення (Додаток 17)' }

export default function DocumentsPanel({ input, blocked }: { input: ReportInput; blocked: boolean }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const host = useRef<HTMLDivElement>(null)
  const models = buildAll(input)

  async function run(m: DocModel, kind: 'xlsx' | 'docx' | 'pdf' | 'preview') {
    setBusy(`${m.id}-${kind}`); setErr(null)
    try {
      if (kind === 'xlsx') saveAs(await renderXlsx(m), `${m.fileName}.xlsx`)
      else if (kind === 'docx') saveAs(await renderDocx(m), `${m.fileName}.docx`)
      else if (kind === 'pdf') saveAs(await renderPdf(m, await loadFonts()), `${m.fileName}.pdf`)
      else {
        const blob = await renderDocx(m)
        setPreview(TITLES[m.id])
        const { renderAsync } = await import('docx-preview')
        await new Promise((r) => setTimeout(r, 0))
        if (host.current) { host.current.innerHTML = ''; await renderAsync(blob, host.current, undefined, { inWrapper: true, ignoreWidth: false }) }
      }
    } catch (e) { setErr((e as Error).message) } finally { setBusy(null) }
  }

  return (
    <Card title="Документи">
      {blocked && <p className="mb-3 text-sm text-danger">Спершу усуньте розбіжності. Після цього завантаження стане доступним.</p>}
      {err && <ErrorText>{err}</ErrorText>}
      <ul className="-my-2 divide-y divide-line">
        {models.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-2 py-3">
            <span className="mr-auto font-semibold">{TITLES[m.id]}</span>
            <div className="flex overflow-hidden rounded-md border border-line" role="group" aria-label={`Завантажити: ${TITLES[m.id]}`}>
              {(['xlsx', 'docx', 'pdf'] as const).map((k) => (
                <button key={k} disabled={blocked || busy !== null} onClick={() => void run(m, k)}
                  className="h-9 border-r border-line bg-surface px-3 text-sm font-semibold last:border-r-0 hover:bg-stripe disabled:cursor-not-allowed disabled:opacity-45">
                  {busy === `${m.id}-${k}` ? '…' : k.toUpperCase()}
                </button>
              ))}
            </div>
            <Button variant="ghost" disabled={blocked || busy !== null} onClick={() => void run(m, 'preview')}>Перегляд</Button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">Кілограми в Донесенні ведуться окремо від літрів: початок вводиться на екрані «Залишки на початок», «Прибуло» береться з надходжень.</p>
      {preview && (
        <div className="fixed inset-0 z-10 flex flex-col bg-ink/60 p-3 sm:p-4" role="dialog" aria-modal="true" aria-label={preview}>
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-t-lg bg-surface px-4 py-2.5">
            <strong>{preview}</strong>
            <Button variant="ghost" onClick={() => setPreview(null)}>Закрити</Button>
          </div>
          <div ref={host} className="mx-auto w-full max-w-6xl flex-1 overflow-auto rounded-b-lg bg-stripe" />
        </div>
      )}
    </Card>
  )
}
