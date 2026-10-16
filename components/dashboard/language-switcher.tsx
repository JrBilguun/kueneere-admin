"use client"

import { useLanguage, type Locale } from "@/context/language-context"
import { Globe } from "lucide-react"

const localeOptions: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "mn", label: "МН" },
  { value: "ko", label: "KO" },
]

interface LanguageSwitcherProps {
  /** compact=true → header дээр жижиг хэмжээтэй */
  compact?: boolean
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLanguage()

  return (
    <div className={`flex items-center gap-1 ${compact ? "px-1 py-1" : "px-3 py-2"}`}>
      <Globe className={`text-muted-foreground shrink-0 ${compact ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
      <div className="flex items-center">
        {localeOptions.map((option, idx) => (
          <button
            key={option.value}
            onClick={() => setLocale(option.value)}
            title={option.value === "en" ? "English" : option.value === "mn" ? "Монгол" : "한국어"}
            className={`
              font-mono transition-colors
              ${compact ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5 text-xs"}
              ${idx < localeOptions.length - 1 ? "border-r border-border" : ""}
              ${locale === option.value
                ? "text-lime font-bold"
                : "text-muted-foreground hover:text-foreground"
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
