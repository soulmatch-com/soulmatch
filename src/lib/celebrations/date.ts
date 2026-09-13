export type DateOnly = {
  year: number
  month: number
  day: number
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function parseDateOnly(value: string): DateOnly | null {
  if (!DATE_ONLY_PATTERN.test(value)) return null
  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(year, month - 1, day)
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return { year, month, day }
}

export function isValidDateOnly(value: string): boolean {
  return parseDateOnly(value) !== null
}

export function formatDateOnly(value: DateOnly): string {
  return `${value.year}-${pad(value.month)}-${pad(value.day)}`
}

export function localDateToDateOnly(date = new Date()): string {
  return formatDateOnly({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  })
}

export function compareDateOnlyStrings(left: string, right: string): -1 | 0 | 1 {
  if (left === right) return 0
  return left < right ? -1 : 1
}

export function shiftDateOnlyYears(value: string | Date, years: number): string {
  const base = typeof value === 'string'
    ? parseDateOnly(value)
    : {
        year: value.getFullYear(),
        month: value.getMonth() + 1,
        day: value.getDate(),
      }
  if (!base) throw new Error(`Invalid date-only value: ${value}`)
  return localDateToDateOnly(new Date(base.year - years, base.month - 1, base.day))
}

export function calculateAgeFromDateOnly(value: string, reference = new Date()): number {
  const birth = parseDateOnly(value)
  if (!birth) return Number.NaN
  const today = {
    year: reference.getFullYear(),
    month: reference.getMonth() + 1,
    day: reference.getDate(),
  }
  let age = today.year - birth.year
  if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) {
    age--
  }
  return age
}

export function getCelebrationDateBounds(reference = new Date()) {
  const today = localDateToDateOnly(reference)
  return {
    today,
    minDateOfBirth: shiftDateOnlyYears(reference, 120),
    maxDateOfBirth: shiftDateOnlyYears(reference, 18),
  }
}

export function getAlternativeDateConflictMessage(preferredDate: string, alternativeDate: string, today: string) {
  if (
    alternativeDate &&
    compareDateOnlyStrings(preferredDate, today) >= 0 &&
    compareDateOnlyStrings(alternativeDate, today) >= 0 &&
    alternativeDate === preferredDate
  ) {
    return 'Alternative date must differ from preferred date'
  }
  return undefined
}
