"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import en from "@/messages/en.json"
import mn from "@/messages/mn.json"
import ko from "@/messages/ko.json"

export type Locale = "en" | "mn" | "ko"

const messages: Record<Locale, typeof en> = { en, mn, ko }

type Messages = typeof en

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Messages
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")

  useEffect(() => {
    const saved = localStorage.getItem("aether-locale") as Locale | null
    if (saved && (saved === "en" || saved === "mn" || saved === "ko")) {
      setLocaleState(saved)
    }
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem("aether-locale", newLocale)
  }, [])

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: messages[locale] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider")
  return ctx
}
