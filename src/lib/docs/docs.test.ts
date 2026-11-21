// @vitest-environment node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildDonesennya, buildRaspiska, buildVidomist } from './build.ts'
import { octoberFixture } from './fixture.ts'
import { placeCells } from './model.ts'
import { renderDocx } from './docx.ts'
import { renderPdf } from './pdf.ts'
import { renderXlsx } from './xlsx.ts'

const inp = octoberFixture()
const fonts = {
  regular: new Uint8Array(readFileSync('public/fonts/LiberationSerif-Regular.ttf')),
  bold: new Uint8Array(readFileSync('public/fonts/LiberationSerif-Bold.ttf')),
}

describe('Донесення: підсумки збігаються з наданим жовтневим документом', () => {
  const d = buildDonesennya(inp)
  const row = (name: string) => d.body.find((r) => r[1].text === name)!.map((c) => c.text)
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
    const i = d.body.findIndex((r) => r[1].text === 'ДП-Л Євро 5 В5')
    expect(d.body[i + 1][4].text).toBe('727')
  })
})

describe('Розшифровка / Відомість', () => {
  it('Богдан: пробіг у Відомості — кінець спідометра 59900; Розшифровка: 15+185−167=33', () => {
    const r = buildRaspiska(inp).body.find((x) => x[1].text === 'Богдан 2251')!.map((c) => c.text)
    expect(r.slice(3, 11)).toEqual(['58602', '59900', 'ДП-Л Євро 5 В5', '15', '185', '167', '167', '33'])
    const v = buildVidomist(inp).body.find((x) => x[3].text === 'Богдан 2251')!.map((c) => c.text)
    expect(v[11]).toBe('59900')
  })
  it('сітка не виходить за межі колонок', () => {
    for (const m of [buildRaspiska(inp), buildVidomist(inp), buildDonesennya(inp)]) {
      expect(() => placeCells(m.header, m.colWidths.length)).not.toThrow()
      for (const row of m.body) expect(row.reduce((a, c) => a + (c.colSpan ?? 1), 0)).toBe(m.colWidths.length)
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
    const r = buildRaspiska(inp).body.find((x) => x[1].text === 'ГАЗ 32213')!.map((c) => c.text)
    expect(r.slice(3, 5)).toEqual(['242969', '242969'])
  })
})

describe('нульові рядки пального показуються (для статистики)', () => {
  const rows = buildRaspiska(inp).body
  const of = (name: string) => rows.filter((_, i) => {
    // рядки машини: перший з назвою, далі порожні в колонці назви до наступної машини
    const start = rows.findIndex((x) => x[1].text === name)
    let end = start + 1
    while (end < rows.length && rows[end][1].text === '') end++
    return i >= start && i < end
  })
  it('ГАЗ 32213: два види пального — А-92 (5) і А-95 (0)', () => {
    const r = of('ГАЗ 32213').map((x) => [x[5].text, x[6].text])
    expect(r).toEqual([['А-92 Євро 5 Е0', '5'], ['А-95 Євро 5 Е0', '0']])
  })
  it('Фольцваген: А-95 (47) і А-92 (0) у порядку вихідної таблиці', () => {
    expect(of('Фольцваген').map((x) => [x[5].text, x[6].text])).toEqual([['А-95 Євро 5 Е0', '47'], ['А-92 Євро 5 Е0', '0']])
  })
  it('Відомість теж містить нульові рядки', () => {
    const v = buildVidomist(inp).body.filter((r) => r[7].text === '0')
    expect(v.length).toBeGreaterThan(5)
  })
})
