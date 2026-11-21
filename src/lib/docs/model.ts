/** Єдина модель табличного документа: з неї рендеряться xlsx, docx та PDF. */
export type Align = 'left' | 'center' | 'right'

export interface DCell { text: string; colSpan?: number; rowSpan?: number; align?: Align; bold?: boolean }
export interface TextLine { text: string; align?: Align; bold?: boolean; size?: number }
export interface Signature { heading?: string; title: string; rank: string; name: string }

export interface DocModel {
  id: 'raspiska' | 'vidomist' | 'donesennya'
  fileName: string
  /** Відносні ширини колонок. */
  colWidths: number[]
  before: TextLine[]
  header: DCell[][]
  body: DCell[][]
  /** Вирівнювання за замовчуванням для тіла таблиці по колонках. */
  bodyAlign: Align[]
  after: TextLine[]
  signatures: Signature[]
}

export interface Placed { row: number; col: number; rowSpan: number; colSpan: number; cell: DCell }

/** Розкладає клітинки з rowSpan/colSpan по сітці (клітинки, закриті rowSpan зверху, у рядках не задаються). */
export function placeCells(rows: DCell[][], ncols: number): Placed[] {
  const busy: boolean[][] = []
  const out: Placed[] = []
  rows.forEach((cells, r) => {
    busy[r] ??= []
    let c = 0
    for (const cell of cells) {
      while (busy[r][c]) c++
      const rs = cell.rowSpan ?? 1
      const cs = cell.colSpan ?? 1
      if (c + cs > ncols) throw new Error(`Рядок ${r}: клітинка виходить за межі ${ncols} колонок`)
      for (let i = 0; i < rs; i++) {
        busy[r + i] ??= []
        for (let j = 0; j < cs; j++) busy[r + i][c + j] = true
      }
      out.push({ row: r, col: c, rowSpan: rs, colSpan: cs, cell })
      c += cs
    }
  })
  return out
}

export const cell = (text: string | number, o: Partial<DCell> = {}): DCell => ({ text: String(text), ...o })

/** Рядок з номерами колонок під заголовком (1, 2, 3 …), як у вихідних формах. Не жирний, по центру. */
export const numberingRow = (n: number): DCell[] =>
  Array.from({ length: n }, (_, i) => ({ text: String(i + 1), align: 'center' as const, bold: false }))

export const withNumbers = (header: DCell[][], n: number): DCell[][] => [...header, numberingRow(n)]
