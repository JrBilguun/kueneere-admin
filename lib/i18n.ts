import { getRequestConfig } from "next-intl/server"

export const locales = ["en", "mn", "ko"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "en"

export default getRequestConfig(async ({ locale }) => {
  const messages = (await import(`../messages/${locale}.json`)).default
  return { messages }
})
