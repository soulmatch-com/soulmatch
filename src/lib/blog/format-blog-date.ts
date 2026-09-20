export type BlogDateLocale = 'en' | 'ta'

/** Formats a public-facing blog date in the site's canonical display timezone. */
export function formatBlogDate(value: string | Date | null | undefined, locale: BlogDateLocale): string {
  if (!value) return ''

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const formatter = new Intl.DateTimeFormat(locale === 'ta' ? 'ta-IN' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })

  return formatter
    .formatToParts(date)
    .filter((part) => part.type === 'day' || part.type === 'month' || part.type === 'year')
    .map((part) => part.value)
    .join(' ')
}
