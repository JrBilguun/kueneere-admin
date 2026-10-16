"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"

/** Нэвтрээгүй бол /login руу шилжүүлнэ */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === "guest") {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`)
    }
  }, [status, router, pathname])

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground uppercase tracking-wider">
          <div className="w-2 h-2 bg-lime pulse-live" />
          {t.auth.loading}
        </div>
      </div>
    )
  }
  return <>{children}</>
}
