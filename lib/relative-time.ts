const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
]

export function relativeTime(date: string | Date, locale = "en"): string {
  const diff = (new Date(date).getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  for (const [unit, secs] of UNITS) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit)
  }
  return rtf.format(0, "minute")
}
