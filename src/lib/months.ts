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

/**
 * Звітний період місяця: з 25-го попереднього місяця по 25-те цього. Місяць звіту = місяць, у якому період закінчується
 * (25.09–25.10 це жовтень), як і підписано у вихідних документах.
 */
export function defaultRange(year: number, month: number): { from: string; to: string } {
  const py = month === 1 ? year - 1 : year
  const pm = month === 1 ? 12 : month - 1
  return { from: `${py}-${pad(pm)}-25`, to: `${year}-${pad(month)}-25` }
}
