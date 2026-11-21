/** Залишок на кінець = залишок на початок + отримано − використано (літри). */
export function closingBalance(opening: number, received: number, used: number): number {
  return Math.round((opening + received - used) * 100) / 100
}
