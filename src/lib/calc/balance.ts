/** Округлення до сотих (літри), без накопичення похибки float. */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100

/** Залишок на кінець = залишок на початок + отримано − використано (літри). */
export function closingBalance(opening: number, received: number, used: number): number {
  return round2(opening + received - used)
}
