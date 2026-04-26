export const AGE_CATEGORIES = [10, 12, 14, 16, 18] as const
export type AgeCategory = (typeof AGE_CATEGORIES)[number]

export function ageYears(dobISO: string, ref: Date = new Date()): number {
  const dob = new Date(dobISO + 'T00:00:00')
  let age = ref.getFullYear() - dob.getFullYear()
  const m = ref.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--
  return age
}

export function categoryFor(age: number): AgeCategory | null {
  for (const c of AGE_CATEGORIES) if (age < c) return c
  return null
}

export function daysUntilNextBirthday(dobISO: string, ref: Date = new Date()): number {
  const dob = new Date(dobISO + 'T00:00:00')
  const next = new Date(ref.getFullYear(), dob.getMonth(), dob.getDate())
  if (next < ref) next.setFullYear(next.getFullYear() + 1)
  return Math.ceil((next.getTime() - ref.getTime()) / 86_400_000)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}
