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
    const v = grid(buildVidomist(inp)).find((x) => x[2] === 'Богдан 2251')!
    expect(v[10]).toBe('59900')
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
    expect(grid(buildVidomist(inp)).filter((r) => r[6] === '0').length).toBeGreaterThan(5)
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
  it('Відомість: колонки машини об’єднані (№, марка, тип, номер, № листа, спідометр); колонки «Підрозділ» немає', () => {
    const m = buildVidomist(inp)
    const placed = placeCells(m.body, m.colWidths.length).filter((p) => p.row === 0)
    expect(placed.filter((p) => p.rowSpan === 2).map((p) => p.col).sort((a, b) => a - b)).toEqual([0, 2, 3, 4, 5, 10])
  })
  it('Донесення: № і найменування об’єднані на рядки л/кг', () => {
    const m = buildDonesennya(inp)
    const placed = placeCells(m.body, m.colWidths.length).filter((p) => p.row === 0)
    expect(placed.filter((p) => p.rowSpan === 2).map((p) => p.col)).toEqual([0, 1])
  })
  it('Відомість без колонки «Підрозділ»', () => {
    const m = buildVidomist(inp)
    expect(placeCells(m.header, m.colWidths.length).some((p) => p.cell.text === 'Підрозділ')).toBe(false)
    expect(m.colWidths).toHaveLength(11)
  })
  it('тіло таблиць по центру, крім колонки з назвою пального (по лівому краю)', () => {
    const fuelHeaders = ['Марка ПММ', 'Найменування пального', 'Найменування військового майна']
    for (const m of [buildRaspiska(inp), buildVidomist(inp), buildDonesennya(inp)]) {
      const fuelCol = placeCells(m.header, m.colWidths.length).find((p) => fuelHeaders.includes(p.cell.text))!.col
      m.bodyAlign.forEach((a, i) => expect(a, `${m.id}, колонка ${i + 1}`).toBe(i === fuelCol ? 'left' : 'center'))
    }
  })
})

describe('ширини колонок: назви пального в один рядок, слова заголовків не розриваються', () => {
  // Найвужчий випадок — docx: робоча ширина 770 пт, шрифт 9 пт, поля клітинки по 3 пт.
  const PAGE_PT = 770, PAD_PT = 6, SIZE = 9
  const FUEL_COLS = ['Марка ПММ', 'Найменування пального', 'Найменування військового майна']
  it('усі колонки з видом пального вміщують найдовшу назву в один рядок', async () => {
    const { PDFDocument } = await import('pdf-lib')
    const fontkit = (await import('@pdf-lib/fontkit')).default
    const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit)
    const reg = await pdf.embedFont(fonts.regular)
    const bold = await pdf.embedFont(fonts.bold)
    for (const m of [buildRaspiska(inp), buildVidomist(inp), buildDonesennya(inp)]) {
      const total = m.colWidths.reduce((a, b) => a + b, 0)
      const widthOf = (col: number) => (m.colWidths[col] / total) * PAGE_PT - PAD_PT
      const headers = placeCells(m.header, m.colWidths.length)
      // колонки пального за заголовком
      const fuelCols = headers.filter((p) => FUEL_COLS.includes(p.cell.text)).map((p) => p.col)
      expect(fuelCols.length, m.id).toBe(1)
      for (const p of placeCells(m.body, m.colWidths.length)) {
        if (p.col !== fuelCols[0]) continue
        const w = (p.cell.bold ? bold : reg).widthOfTextAtSize(p.cell.text, SIZE)
        expect(w, `${m.id}: «${p.cell.text}» ${w.toFixed(0)} пт > ${widthOf(p.col).toFixed(0)} пт`).toBeLessThanOrEqual(widthOf(p.col))
      }
      // військові/заводські номери (напр. «J 88K07000845») не розриваються посеред
      const numCol = headers.find((p) => /номер/.test(p.cell.text))
      if (numCol) {
        for (const p of placeCells(m.body, m.colWidths.length)) {
          if (p.col !== numCol.col || p.cell.text === '') continue
          const w = reg.widthOfTextAtSize(p.cell.text, SIZE)
          expect(w, `${m.id}: номер «${p.cell.text}» ${w.toFixed(0)} пт > ${widthOf(p.col).toFixed(0)} пт`).toBeLessThanOrEqual(widthOf(p.col))
        }
      }
      // найдовше слово кожного заголовка вміщується без розриву посеред слова
      for (const p of headers) {
        const avail = p.colSpan === 1 ? widthOf(p.col) : [...Array(p.colSpan).keys()].reduce((a, k) => a + widthOf(p.col + k) + PAD_PT, 0) - PAD_PT
        for (const word of p.cell.text.split(/\s+/)) {
          const w = bold.widthOfTextAtSize(word, SIZE)
          expect(w, `${m.id}: слово «${word}» у заголовку ${w.toFixed(0)} пт > ${avail.toFixed(0)} пт`).toBeLessThanOrEqual(avail)
        }
      }
    }
  })
})

describe('Донесення: кілограми як у вихідному документі (окремий облік, без густини)', () => {
  const g = grid(buildDonesennya(inp))
  // [пальне, початок кг, прибуло кг, залишок на кінець кг] — рядки «кг» вихідного Донесення; порожньо там, де в оригіналі порожньо
  const expected: [string, string, string, string][] = [
    ['А-80 ДЗ', '118', '216', ''], ['А-80', '22', '', '22'], ['А-92 Євро 5 Е0', '4', '', '4'], ['А-95 Євро 5 Е0', '35', '122', ''],
    ['ДП-З Євро 5 В5', '1483', '', '1483'], ['ДП-Л Євро 5 В5', '169', '727', ''], ['ДП-Л Євро 5 В0', '1279', '249', ''],
    ['ДП-Л Євро 5 В0 (ДТ.Е К5 сорт Е)', '434', '', '434'], ['ДП-Артика Євро 5 В0', '', '', ''],
  ]
  for (const [name, open, recv, close] of expected) {
    it(`${name}: початок ${open || '—'}, прибуло ${recv || '—'}, кінець ${close || '—'}`, () => {
      const i = g.findIndex((r) => r[1] === name)
      const kg = g[i + 1]
      expect(kg[2]).toBe('кг')
      expect([kg[3], kg[4], kg[8]]).toEqual([open, recv, close])
      // «вибуло» в кг не показується (в оригіналі порожньо)
      expect([kg[5], kg[6], kg[7]]).toEqual(['', '', ''])
    })
  }
})

describe('правило: машина показує всі види пального свого класу', () => {
  // Дозволені пари = усі види категорії машини (як у БД після міграції fuel_classes_all_types).
  const all = octoberFixture()
  const full = {
    ...all,
    vehicleFuels: all.vehicles.flatMap((v) => all.fuels.filter((f) => f.category === v.fuel_class).map((f, i) => ({ vehicle_id: v.id, fuel_type_id: f.id, position: 100 + i }))),
  }
  const rows = grid(buildRaspiska(full))
  const fuelsOf = (name: string) => rows.filter((r) => r[1] === name).map((r) => r[5])
  it('бензинова ГАЗ 32213: усі 4 види бензину (з нулями), жодного дизелю', () => {
    expect(fuelsOf('ГАЗ 32213').sort()).toEqual(['А-80', 'А-80 ДЗ', 'А-92 Євро 5 Е0', 'А-95 Євро 5 Е0'])
  })
  it('дизельний Богдан 2251: усі 5 видів дизелю, жодного бензину', () => {
    expect(fuelsOf('Богдан 2251').sort()).toEqual([
      'ДП-Артика Євро 5 В0', 'ДП-З Євро 5 В5', 'ДП-Л Євро 5 В0', 'ДП-Л Євро 5 В0 (ДТ.Е К5 сорт Е)', 'ДП-Л Євро 5 В5',
    ].sort())
  })
  it('цифри не змінюються від додаткових нульових рядків: Богдан В5 = 15 + 185 − 167 = 33', () => {
    const r = rows.find((x) => x[1] === 'Богдан 2251' && x[5] === 'ДП-Л Євро 5 В5')!
    expect([r[6], r[7], r[8], r[10]]).toEqual(['15', '185', '167', '33'])
  })
  it('підсумки Донесення не залежать від кількості нульових рядків', () => {
    const d = grid(buildDonesennya(full)).find((r) => r[1] === 'ДП-Л Євро 5 В5')!
    expect([d[3], d[4], d[7], d[8]]).toEqual(['281', '865', '805', '341'])
  })
})

describe('рядок з номерами колонок під заголовком', () => {
  for (const [name, build] of [['Розшифровка', buildRaspiska], ['Відомість', buildVidomist], ['Донесення', buildDonesennya]] as const) {
    it(`${name}: останній рядок заголовка — 1…N по числу колонок, по центру, не жирним`, () => {
      const m = build(inp)
      const last = m.header[m.header.length - 1]
      expect(last.map((c) => c.text)).toEqual(Array.from({ length: m.colWidths.length }, (_, i) => String(i + 1)))
      expect(last.every((c) => c.align === 'center' && c.bold === false)).toBe(true)
    })
  }
  it('Відомість: 11 колонок пронумеровано 1–11 (як у вихідній формі)', () => {
    expect(buildVidomist(inp).colWidths).toHaveLength(11)
  })
})

describe('Відомість: секції за видом пального з підсумками під кожною', () => {
  const m = buildVidomist(inp)
  const g = grid(m)
  const names = () => g.map((r) => r[2]).filter((x, i, a) => x !== 'ВСЬОГО' && x !== '' && a.indexOf(x) === i)
  it('порядок машин: спершу А-80 (ЗІЛ, УАЗ, ГАЗ 66), потім А-95/А-92 (ГАЗ 32213, Фольцваген), потім дизель', () => {
    expect(names().slice(0, 6)).toEqual(['ЗІЛ ММЗ', 'УАЗ 3962', 'ГАЗ 66 (АП2)', 'ГАЗ 32213', 'Фольцваген', 'М-508'])
  })
  it('№ з/п йдуть підряд по секціях: 1…22', () => {
    const nums = placeCells(m.body, m.colWidths.length).filter((p) => p.col === 0 && p.cell.text !== '').map((p) => p.cell.text)
    expect(nums).toEqual(Array.from({ length: 22 }, (_, i) => String(i + 1)))
  })
  it('підсумки: А-80, А-80 ДЗ — одразу після ГАЗ 66, перед ГАЗ 32213', () => {
    const idx = (pred: (r: string[]) => boolean) => g.findIndex(pred)
    const lastGaz66 = g.map((r, i) => (r[2] === 'ГАЗ 66 (АП2)' ? i : -1)).filter((i) => i >= 0).pop()!
    const tA80 = idx((r) => r[2] === 'ВСЬОГО' && r[1] === 'А-80')
    const tDz = idx((r) => r[2] === 'ВСЬОГО' && r[1] === 'А-80 ДЗ')
    const firstGaz32 = idx((r) => r[2] === 'ГАЗ 32213')
    expect(tA80).toBe(lastGaz66 + 1)
    expect(tDz).toBe(lastGaz66 + 2)
    expect(firstGaz32).toBe(tDz + 1)
  })
  it('підсумки А-95 і А-92 (у цьому порядку) — після Фольцвагена, перед дизелем', () => {
    const t95 = g.findIndex((r) => r[2] === 'ВСЬОГО' && r[1] === 'А-95 Євро 5 Е0')
    const t92 = g.findIndex((r) => r[2] === 'ВСЬОГО' && r[1] === 'А-92 Євро 5 Е0')
    const lastVw = g.map((r, i) => (r[2] === 'Фольцваген' ? i : -1)).filter((i) => i >= 0).pop()!
    expect(t95).toBe(lastVw + 1)
    expect(t92).toBe(t95 + 1)
    expect(g.findIndex((r) => r[2] === 'М-508')).toBe(t92 + 1)
  })
  it('підсумки дизелю — в кінці, суми збігаються з Донесенням (В5 341, В0 1234, ДТ.Е 516,7)', () => {
    const totals = g.filter((r) => r[2] === 'ВСЬОГО')
    expect(totals.map((r) => r[1])).toEqual([
      'А-80', 'А-80 ДЗ', 'А-95 Євро 5 Е0', 'А-92 Євро 5 Е0',
      'ДП-З Євро 5 В5', 'ДП-Л Євро 5 В5', 'ДП-Л Євро 5 В0', 'ДП-Л Євро 5 В0 (ДТ.Е К5 сорт Е)', 'ДП-Артика Євро 5 В0',
    ])
    const by = (n: string) => totals.find((r) => r[1] === n)!
    expect([by('А-80 ДЗ')[6], by('А-80 ДЗ')[7]]).toEqual(['115', '115'])
    expect(by('А-95 Євро 5 Е0')[6]).toBe('79')
    expect(by('А-92 Євро 5 Е0')[6]).toBe('5')
    expect(by('ДП-Л Євро 5 В5')[6]).toBe('341')
    expect(by('ДП-Л Євро 5 В0')[6]).toBe('1234')
    expect(by('ДП-Л Євро 5 В0 (ДТ.Е К5 сорт Е)')[6]).toBe('516,7')
    // діагональ: останній рядок таблиці — підсумок дизелю
    expect(g[g.length - 1][2]).toBe('ВСЬОГО')
  })
  it('мастила у відомість не потрапляють', () => {
    const withOil = {
      ...inp,
      fuels: [...inp.fuels, { id: 'oil', name: 'Масло М6з10В', kind: 'lubricant' as const, category: 'lubricant' as const, sort: 15 }],
      vehicleFuels: [...inp.vehicleFuels, { vehicle_id: inp.vehicles.find((v) => v.seq === 5)!.id, fuel_type_id: 'oil', position: 1 }],
    }
    expect(grid(buildVidomist(withOil)).flat().some((t) => t.includes('Масло'))).toBe(false)
  })
  it('рух за межами секції машини не губиться (А-92 у «А-80» машини з даними)', () => {
    const zil = inp.vehicles.find((v) => v.seq === 3)!
    const moved = { ...inp, balances: [...inp.balances, { period_id: 'p', vehicle_id: zil.id, fuel_type_id: 'А-92 Євро 5 Е0', opening: 10, measured_closing: null }] }
    const gg = grid(buildVidomist(moved))
    const total92 = gg.find((r) => r[2] === 'ВСЬОГО' && r[1] === 'А-92 Євро 5 Е0')!
    expect(total92[6]).toBe('15') // 5 (ГАЗ 32213) + 10 (ЗІЛ)
  })
})
