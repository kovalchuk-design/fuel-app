// @vitest-environment node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildDonesennya, buildRaspiska, buildVidomist } from './build.ts'
import { octoberFixture } from './fixture.ts'
import { placeCells, type DocModel } from './model.ts'
import { renderDocx } from './docx.ts'
import { renderPdf } from './pdf.ts'
import { renderXlsx } from './xlsx.ts'

const inp = octoberFixture()

/** Розгортає тіло таблиці у повну матрицю: клітинка з rowSpan повторюється в усіх рядках, яких вона торкається. */
function grid(m: DocModel): string[][] {
  const g: string[][] = m.body.map(() => Array(m.colWidths.length).fill(''))
  for (const p of placeCells(m.body, m.colWidths.length))
    for (let r = p.row; r < p.row + p.rowSpan; r++) for (let c = p.col; c < p.col + p.colSpan; c++) g[r][c] = p.cell.text
  return g
}
const fonts = {
  regular: new Uint8Array(readFileSync('public/fonts/LiberationSerif-Regular.ttf')),
  bold: new Uint8Array(readFileSync('public/fonts/LiberationSerif-Bold.ttf')),
}

describe('Донесення: підсумки збігаються з наданим жовтневим документом', () => {
  const d = buildDonesennya(inp)
  const row = (name: string) => grid(d).find((r) => r[1] === name)!
  it('ДП-Л В5: 281 / 865 / 805 / 341', () => {
    const r = row('ДП-Л Євро 5 В5')
    expect([r[3], r[4], r[7], r[8]]).toEqual(['281', '865', '805', '341'])
  })
  it('ДП-Л В0: 1442 / 297 / 505 (110 по агрегатах) / 1234', () => {
    const r = row('ДП-Л Євро 5 В0')
    expect([r[3], r[4], r[5], r[6], r[7], r[8]]).toEqual(['1442', '297', '395', '110', '505', '1234'])
  })
  it('А-80 ДЗ: 151 / 290 / 326 / 115', () => {
    const r = row('А-80 ДЗ')
    expect([r[3], r[4], r[7], r[8]]).toEqual(['151', '290', '326', '115'])
  })
  it('А-95: кінець 79; ДП-З: 1743; ДТ.Е: 516,7', () => {
    expect(row('А-95 Євро 5 Е0')[8]).toBe('79')
    expect(row('ДП-З Євро 5 В5')[8]).toBe('1743')
    expect(row('ДП-Л Євро 5 В0 (ДТ.Е К5 сорт Е)')[8]).toBe('516,7')
  })
  it('кг: прибуло береться з надходжень (ДП-Л В5: 727)', () => {
    const g = grid(d)
    const i = g.findIndex((r) => r[1] === 'ДП-Л Євро 5 В5')
    expect(g[i + 1][2]).toBe('кг')
    expect(g[i + 1][4]).toBe('727')
  })
})

describe('Розшифровка / Відомість', () => {
  it('Богдан: пробіг у Відомості — кінець спідометра 59900; Розшифровка: 15+185−167=33', () => {
    const r = grid(buildRaspiska(inp)).find((x) => x[1] === 'Богдан 2251')!
    expect(r.slice(3, 11)).toEqual(['58602', '59900', 'ДП-Л Євро 5 В5', '15', '185', '167', '167', '33'])
    const v = grid(buildVidomist(inp)).find((x) => x[3] === 'Богдан 2251')!
    expect(v[11]).toBe('59900')
  })
  it('сітка не виходить за межі колонок', () => {
    for (const m of [buildRaspiska(inp), buildVidomist(inp), buildDonesennya(inp)]) {
      expect(() => placeCells(m.header, m.colWidths.length)).not.toThrow()
      const placed = placeCells(m.body, m.colWidths.length)
      m.body.forEach((_, i) => {
        const covered = placed.filter((p) => p.row <= i && i < p.row + p.rowSpan).reduce((a, p) => a + p.colSpan, 0)
        expect(covered).toBe(m.colWidths.length)
      })
    }
  })
})

describe('рендер у три формати', () => {
  const out = process.env.DOC_OUT
  for (const [name, build] of [['vidomist', buildVidomist], ['raspiska', buildRaspiska], ['donesennya', buildDonesennya]] as const) {
    it(name, async () => {
      const m = build(inp)
      const [x, d, p] = await Promise.all([renderXlsx(m), renderDocx(m), renderPdf(m, fonts)])
      expect(x.size).toBeGreaterThan(3000)
      expect(d.size).toBeGreaterThan(3000)
      expect(p.size).toBeGreaterThan(3000)
      expect(Buffer.from(await p.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-')
      if (out) {
        mkdirSync(out, { recursive: true })
        writeFileSync(`${out}/${name}.xlsx`, Buffer.from(await x.arrayBuffer()))
        writeFileSync(`${out}/${name}.docx`, Buffer.from(await d.arrayBuffer()))
        writeFileSync(`${out}/${name}.pdf`, Buffer.from(await p.arrayBuffer()))
      }
    }, 30000)
  }
})

describe('спідометр належить машині', () => {
  it('ГАЗ 32213 без заправок: 242969 → 242969 у Розшифровці', () => {
    const r = grid(buildRaspiska(inp)).find((x) => x[1] === 'ГАЗ 32213')!
    expect(r.slice(3, 5)).toEqual(['242969', '242969'])
  })
})

describe('нульові рядки пального показуються (для статистики)', () => {
  const rows = grid(buildRaspiska(inp))
  const of = (name: string) => rows.filter((r) => r[1] === name).map((x) => [x[5], x[6]])
  it('ГАЗ 32213: два види пального — А-92 (5) і А-95 (0)', () => {
    expect(of('ГАЗ 32213')).toEqual([['А-92 Євро 5 Е0', '5'], ['А-95 Євро 5 Е0', '0']])
  })
  it('Фольцваген: А-95 (47) і А-92 (0) у порядку вихідної таблиці', () => {
    expect(of('Фольцваген')).toEqual([['А-95 Євро 5 Е0', '47'], ['А-92 Євро 5 Е0', '0']])
  })
  it('Відомість теж містить нульові рядки', () => {
    expect(grid(buildVidomist(inp)).filter((r) => r[7] === '0').length).toBeGreaterThan(5)
  })
})

describe('об’єднані клітинки і вирівнювання по центру', () => {
  it('Розшифровка: № / марка / номер / спідометр машини об’єднані на всі її рядки пального', () => {
    const m = buildRaspiska(inp)
    const placed = placeCells(m.body, m.colWidths.length)
    for (const col of [0, 1, 2, 3, 4]) {
      const p = placed.find((x) => x.col === col && x.cell.text === (col === 1 ? 'ГАЗ 32213' : x.cell.text) && x.row === 0)!
      expect(p.rowSpan).toBe(2)
    }
  })
  it('Відомість: колонки машини об’єднані (№, підрозділ, марка, тип, номер, № листа, спідометр)', () => {
    const m = buildVidomist(inp)
    const placed = placeCells(m.body, m.colWidths.length).filter((p) => p.row === 0)
    expect(placed.filter((p) => p.rowSpan === 2).map((p) => p.col).sort((a, b) => a - b)).toEqual([0, 1, 3, 4, 5, 6, 11])
  })
  it('Донесення: № і найменування об’єднані на рядки л/кг', () => {
    const m = buildDonesennya(inp)
    const placed = placeCells(m.body, m.colWidths.length).filter((p) => p.row === 0)
    expect(placed.filter((p) => p.rowSpan === 2).map((p) => p.col)).toEqual([0, 1])
  })
  it('усе тіло таблиць вирівняно по центру (як в оригіналі)', () => {
    for (const m of [buildRaspiska(inp), buildVidomist(inp), buildDonesennya(inp)]) expect(m.bodyAlign.every((a) => a === 'center')).toBe(true)
  })
})
