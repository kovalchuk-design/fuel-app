import { placeCells, type DocModel } from './model.ts'

const FONT = 'Times New Roman'
const LINE_PT = 11 // висота одного рядка тексту 9 пт (одинарний інтервал)

/** Скільки рядків займе текст у колонці шириною maxChars символів (перенос по словах). */
function wrapLines(text: string, maxChars: number): number {
  let lines = 0
  for (const para of text.split('\n')) {
    let cur = 0
    lines++
    for (const word of para.split(' ')) {
      const w = word.length
      if (cur === 0) cur = w
      else if (cur + 1 + w <= maxChars) cur += 1 + w
      else { lines++; cur = w }
      while (cur > maxChars) { lines++; cur -= maxChars }
    }
  }
  return lines
}

/** xlsx із форматуванням: об'єднані клітинки, рамки, A4 альбомна, вписування по ширині. */
export async function renderXlsx(m: DocModel): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Лист1', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
  })
  const nc = m.colWidths.length
  const total = m.colWidths.reduce((a, b) => a + b, 0)
  ws.columns = m.colWidths.map((w) => ({ width: Math.max(4, Math.round((w / total) * 150)) }))
  let r = 1
  const line = (text: string, align: 'left' | 'center' | 'right', bold: boolean, size: number) => {
    ws.mergeCells(r, 1, r, nc)
    const c = ws.getCell(r, 1)
    c.value = text
    c.font = { name: FONT, size, bold }
    c.alignment = { horizontal: align, vertical: 'middle', wrapText: true }
    ws.getRow(r).height = Math.max(16, Math.ceil((text.length * size * 0.55) / 700) * (size + 6))
    r++
  }
  for (const l of m.before) line(l.text, l.align ?? 'left', !!l.bold, l.size ?? 10)
  r++
  const table = (rows: typeof m.body, header: boolean) => {
    const start = r
    for (const p of placeCells(rows, nc)) {
      const top = start + p.row, left = p.col + 1
      if (p.rowSpan > 1 || p.colSpan > 1) ws.mergeCells(top, left, top + p.rowSpan - 1, left + p.colSpan - 1)
      const c = ws.getCell(top, left)
      c.value = header ? p.cell.text : (/^-?\d+(,\d+)?$/.test(p.cell.text) && !p.cell.text.startsWith('0') && left > 3 ? Number(p.cell.text.replace(',', '.')) : p.cell.text)
      c.font = { name: FONT, size: 9, bold: header || !!p.cell.bold }
      c.alignment = { horizontal: header ? 'center' : (p.cell.align ?? m.bodyAlign[p.col]), vertical: 'middle', wrapText: true }
    }
    const end = start + rows.length - 1
    for (let i = start; i <= end; i++) for (let j = 1; j <= nc; j++) {
      ws.getCell(i, j).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    }
    if (header) {
      // Висота рядків заголовка за реальною кількістю рядків тексту; об'єднані клітинки не мають зайвого простору.
      const heights = rows.map(() => LINE_PT + 3)
      const placed = placeCells(rows, nc)
      const need = (p: (typeof placed)[number]) => {
        const chars = (ws.columns.slice(p.col, p.col + p.colSpan).reduce((a, c) => a + (c.width ?? 8), 0)) * 0.95
        return wrapLines(p.cell.text, Math.max(3, Math.floor(chars))) * LINE_PT + 3
      }
      for (const p of placed) if (p.rowSpan === 1) heights[p.row] = Math.max(heights[p.row], need(p))
      for (const p of placed) {
        const have = heights.slice(p.row, p.row + p.rowSpan).reduce((a, b) => a + b, 0)
        if (need(p) > have) heights[p.row + p.rowSpan - 1] += need(p) - have
      }
      heights.forEach((h, i) => { ws.getRow(start + i).height = Math.ceil(h) })
    }
    r = end + 1
  }
  table(m.header, true)
  table(m.body, false)
  ws.pageSetup.printTitlesRow = `${m.before.length + 2}:${m.before.length + 1 + m.header.length}`
  r++
  for (const l of m.after) line(l.text, l.align ?? 'left', !!l.bold, l.size ?? 10)
  r++
  for (const s of m.signatures) {
    if (s.heading) { ws.getCell(r, 1).value = s.heading; ws.getCell(r, 1).font = { name: FONT, size: 10, bold: true }; r++ }
    const a = Math.max(2, Math.floor(nc * 0.55)), b = Math.floor(nc * 0.78)
    ws.mergeCells(r, 1, r, a); ws.getCell(r, 1).value = s.title
    ws.mergeCells(r, a + 1, r, b); ws.getCell(r, a + 1).value = s.rank
    ws.mergeCells(r, b + 1, r, nc); ws.getCell(r, b + 1).value = s.name
    for (const c of [1, a + 1, b + 1]) { ws.getCell(r, c).font = { name: FONT, size: 10 }; ws.getCell(r, c).alignment = { wrapText: true, vertical: 'top' } }
    ws.getRow(r).height = s.title.length > 60 ? 30 : 16
    r += 2
  }
  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
