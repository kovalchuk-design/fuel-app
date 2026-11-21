export const MONTHS = ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'] as const

export const monthName = (month: number) => MONTHS[month - 1]
export const monthKey = (year: number, month: number) => year * 12 + (month - 1)

/**
 * Місяць звіту недоступний, якщо за нього вже є звіт або він не пізніший за останній наявний:
 * минулі місяці вибрати не можна, лише ті, що ще не зроблені.
 */
export function isMonthDisabled(year: number, month: number, latest: { year: number; month: number } | null): boolean {
  return latest != null && monthKey(year, month) <= monthKey(latest.year, latest.month)
}

/** Скільки місяців пропущено між останнім звітом і вибраним (0 = наступний підряд). */
export function skippedMonths(year: number, month: number, latest: { year: number; month: number } | null): number {
  return latest ? monthKey(year, month) - monthKey(latest.year, latest.month) - 1 : 0
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Звітний період місяця за домовленістю: з 25-го цього місяця по 25-те наступного. */
export function defaultRange(year: number, month: number): { from: string; to: string } {
  const ny = month === 12 ? year + 1 : year
  const nm = month === 12 ? 1 : month + 1
  return { from: `${year}-${pad(month)}-25`, to: `${ny}-${pad(nm)}-25` }
}
