import { placeCells, type DCell, type DocModel, type Align } from './model.ts'

export interface PdfFonts { regular: Uint8Array; bold: Uint8Array }

/** PDF у браузері: pdf-lib + Liberation Serif (кирилиця), A4 альбомна, шапка таблиці повторюється на сторінках. */
export async function renderPdf(m: DocModel, fonts: PdfFonts): Promise<Blob> {
  const { PDFDocument, rgb } = await import('pdf-lib')
  const fontkit = (await import('@pdf-lib/fontkit')).default
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const reg = await pdf.embedFont(fonts.regular, { subset: true })
  const bold = await pdf.embedFont(fonts.bold, { subset: true })

  const PW = 841.89, PH = 595.28, ML = 28, MT = 30, MB = 34
  const CW = PW - 2 * ML
  const total = m.colWidths.reduce((a, b) => a + b, 0)
  const xs = [0]
  for (const w of m.colWidths) xs.push(xs[xs.length - 1] + (w / total) * CW)
  const black = rgb(0, 0, 0)

  let page = pdf.addPage([PW, PH])
  let y = PH - MT

  const wrap = (text: string, font: typeof reg, size: number, maxW: number): string[] => {
    const out: string[] = []
    for (const para of text.split('\n')) {
      let cur = ''
      for (const word of para.split(' ')) {
        const tryLine = cur ? `${cur} ${word}` : word
        if (font.widthOfTextAtSize(tryLine, size) <= maxW) { cur = tryLine; continue }
        if (cur) out.push(cur)
        let w = word
        while (font.widthOfTextAtSize(w, size) > maxW && w.length > 1) {
          let k = w.length - 1
          while (k > 1 && font.widthOfTextAtSize(w.slice(0, k), size) > maxW) k--
          out.push(w.slice(0, k)); w = w.slice(k)
        }
        cur = w
      }
      out.push(cur)
    }
    return out
  }
  const textX = (a: Align, x0: number, w: number, tw: number) => (a === 'center' ? x0 + (w - tw) / 2 : a === 'right' ? x0 + w - tw - 2 : x0 + 2)
  const newPage = () => { page = pdf.addPage([PW, PH]); y = PH - MT }
  const ensure = (h: number) => { if (y - h < MB) { newPage(); return true } return false }

  const drawLines = (lines: { text: string; align?: Align; bold?: boolean; size?: number }[]) => {
    for (const l of lines) {
      const size = l.size ?? 10, font = l.bold ? bold : reg
      for (const ln of wrap(l.text, font, size, CW)) {
        ensure(size + 3)
        const tw = font.widthOfTextAtSize(ln, size)
        page.drawText(ln, { x: ML + textX(l.align ?? 'left', 0, CW, tw), y: y - size, size, font, color: black })
        y -= size + 3
      }
    }
  }

  const SIZE = 8.5, LH = 10.5, PAD = 2.5
  const cellLines = (c: DCell, w: number, isBold: boolean) => wrap(c.text, isBold ? bold : reg, SIZE, w - 2 * PAD)

  const drawHeader = () => {
    const placed = placeCells(m.header, m.colWidths.length)
    const hs = m.header.map(() => LH + 2 * PAD)
    for (const p of placed) {
      const w = xs[p.col + p.colSpan] - xs[p.col]
      const need = cellLines(p.cell, w, true).length * LH + 2 * PAD
      if (p.rowSpan === 1) hs[p.row] = Math.max(hs[p.row], need)
    }
    for (const p of placed) {
      const w = xs[p.col + p.colSpan] - xs[p.col]
      const need = cellLines(p.cell, w, true).length * LH + 2 * PAD
      const have = hs.slice(p.row, p.row + p.rowSpan).reduce((a, b) => a + b, 0)
      if (need > have) hs[p.row + p.rowSpan - 1] += need - have
    }
    const total = hs.reduce((a, b) => a + b, 0)
    ensure(total + 40)
    const tops = hs.reduce<number[]>((acc, h) => [...acc, acc[acc.length - 1] - h], [y])
    for (const p of placed) {
      const x0 = ML + xs[p.col], w = xs[p.col + p.colSpan] - xs[p.col]
      const top = tops[p.row], h = tops[p.row] - tops[p.row + p.rowSpan]
      page.drawRectangle({ x: x0, y: top - h, width: w, height: h, borderColor: black, borderWidth: 0.6 })
      const lines = cellLines(p.cell, w, true)
      let ty = top - (h - lines.length * LH) / 2 - SIZE
      for (const ln of lines) {
        page.drawText(ln, { x: x0 + textX('center', 0, w, bold.widthOfTextAtSize(ln, SIZE)), y: ty, size: SIZE, font: bold, color: black })
        ty -= LH
      }
    }
    y -= total
  }

  drawLines(m.before)
  y -= 6
  drawHeader()

  for (const row of m.body) {
    const placed = placeCells([row], m.colWidths.length)
    const h = Math.max(LH + 2 * PAD, ...placed.map((p) => cellLines(p.cell, xs[p.col + p.colSpan] - xs[p.col], !!p.cell.bold).length * LH + 2 * PAD))
    if (y - h < MB) { newPage(); drawHeader() }
    for (const p of placed) {
      const x0 = ML + xs[p.col], w = xs[p.col + p.colSpan] - xs[p.col]
      page.drawRectangle({ x: x0, y: y - h, width: w, height: h, borderColor: black, borderWidth: 0.4 })
      const font = p.cell.bold ? bold : reg
      const lines = cellLines(p.cell, w, !!p.cell.bold)
      let ty = y - (h - lines.length * LH) / 2 - SIZE
      for (const ln of lines) {
        page.drawText(ln, { x: x0 + textX(p.cell.align ?? m.bodyAlign[p.col], 0, w, font.widthOfTextAtSize(ln, SIZE)), y: ty, size: SIZE, font, color: black })
        ty -= LH
      }
    }
    y -= h
  }

  y -= 10
  drawLines(m.after)
  y -= 8
  for (const s of m.signatures) {
    const tl = wrap(s.title, reg, 10, CW * 0.52)
    const need = tl.length * 12 + (s.heading ? 14 : 0) + 10
    ensure(need)
    if (s.heading) { page.drawText(s.heading, { x: ML, y: y - 10, size: 10, font: bold, color: black }); y -= 14 }
    tl.forEach((ln, i) => page.drawText(ln, { x: ML, y: y - 10 - i * 12, size: 10, font: reg, color: black }))
    page.drawText(s.rank, { x: ML + CW * 0.58, y: y - 10, size: 10, font: reg, color: black })
    page.drawText(s.name, { x: ML + CW - reg.widthOfTextAtSize(s.name, 10), y: y - 10, size: 10, font: reg, color: black })
    y -= tl.length * 12 + 10
  }

  const bytes = await pdf.save()
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
}
