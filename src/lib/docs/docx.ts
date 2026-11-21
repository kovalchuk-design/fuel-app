import { placeCells, type Align, type DCell, type DocModel } from './model.ts'

const FONT = 'Times New Roman'

/** docx: альбомна A4, таблиця з об'єднаннями; ширини — у відсотках від робочої ширини. */
export async function renderDocx(m: DocModel): Promise<Blob> {
  const D = await import('docx')
  const jc = (a: Align) => (a === 'center' ? D.AlignmentType.CENTER : a === 'right' ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT)
  const W = 15400 // 29.7см − поля 1.2 см ×2, у twips ≈ 15400
  const total = m.colWidths.reduce((a, b) => a + b, 0)
  const widths = m.colWidths.map((w) => Math.round((w / total) * W))
  const run = (text: string, size: number, bold = false) => new D.TextRun({ text, font: FONT, size: size * 2, bold })
  const para = (text: string, o: { align?: Align; bold?: boolean; size?: number; after?: number } = {}) =>
    new D.Paragraph({ alignment: jc(o.align ?? 'left'), spacing: { after: o.after ?? 60 }, children: [run(text, o.size ?? 10, o.bold)] })
  const border = { style: D.BorderStyle.SINGLE, size: 4, color: '000000' }
  const borders = { top: border, bottom: border, left: border, right: border }

  const mkRows = (rows: DCell[][], header: boolean) => {
    const placed = placeCells(rows, widths.length)
    return rows.map((_, ri) =>
      new D.TableRow({
        tableHeader: header,
        cantSplit: true,
        children: placed.filter((p) => p.row === ri).map((p) => {
          const w = widths.slice(p.col, p.col + p.colSpan).reduce((a, b) => a + b, 0)
          return new D.TableCell({
            columnSpan: p.colSpan > 1 ? p.colSpan : undefined,
            rowSpan: p.rowSpan > 1 ? p.rowSpan : undefined,
            width: { size: w, type: D.WidthType.DXA },
            borders,
            verticalAlign: D.VerticalAlign.CENTER,
            margins: { top: 30, bottom: 30, left: 60, right: 60 },
            children: [new D.Paragraph({
              alignment: jc(header ? 'center' : (p.cell.align ?? m.bodyAlign[p.col])),
              // Одинарний інтервал без відступів: заголовок не «розтягується» на всю висоту клітинки.
              spacing: { before: 0, after: 0, line: 240, lineRule: D.LineRuleType.AUTO },
              children: [run(p.cell.text, 9, header || !!p.cell.bold)],
            })],
          })
        }),
      }),
    )
  }

  const children: (InstanceType<typeof D.Paragraph> | InstanceType<typeof D.Table>)[] = [
    ...m.before.map((l) => para(l.text, { align: l.align, bold: l.bold, size: l.size, after: 80 })),
    para('', { after: 60 }),
    new D.Table({ columnWidths: widths, width: { size: W, type: D.WidthType.DXA }, rows: [...mkRows(m.header, true), ...mkRows(m.body, false)] }),
    para('', { after: 120 }),
    ...m.after.map((l) => para(l.text, { align: l.align, bold: l.bold, size: l.size })),
    para('', { after: 120 }),
  ]
  for (const s of m.signatures) {
    if (s.heading) children.push(para(s.heading, { bold: true }))
    const nb = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' }
    const nob = { top: nb, bottom: nb, left: nb, right: nb }
    const cw = [Math.round(W * 0.55), Math.round(W * 0.23), Math.round(W * 0.22)]
    children.push(new D.Table({
      columnWidths: cw, width: { size: W, type: D.WidthType.DXA },
      rows: [new D.TableRow({ cantSplit: true, children: [s.title, s.rank, s.name].map((t, i) =>
        new D.TableCell({ width: { size: cw[i], type: D.WidthType.DXA }, borders: nob, children: [para(t, { align: i === 2 ? 'right' : 'left' })] })) })],
    }))
    children.push(para('', { after: 80 }))
  }

  const doc = new D.Document({
    // Явні значення за замовчуванням: Word, Pages і перегляд не підставляють власні відступи.
    styles: { default: { document: { run: { font: FONT, size: 18 }, paragraph: { spacing: { before: 0, after: 0, line: 240, lineRule: D.LineRuleType.AUTO } } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838, orientation: D.PageOrientation.LANDSCAPE }, margin: { top: 700, bottom: 700, left: 680, right: 680 } } },
      children,
    }],
  })
  return D.Packer.toBlob(doc)
}
