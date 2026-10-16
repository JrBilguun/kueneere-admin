"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Loader2, Lock } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { LanguageSwitcher } from "@/components/dashboard/language-switcher"
import { BrandMark } from "@/components/dashboard/brand-mark"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { API_URL, STORE_URL } from "@/lib/api"

function LoginForm() {
  const { login, status } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next") || "/"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === "authenticated") router.replace(next.startsWith("/") ? next : "/")
  }, [status, router, next])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background noise-overlay grid lg:grid-cols-[1.1fr_1fr]">
      {/* Visual side */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 border-r border-border overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 grayscale"
          style={{ backgroundImage: `url(${STORE_URL}/images/khulan/IMG_2774.jpg)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        <BrandMark className="relative" />
        <div className="relative">
          <p className="text-xs font-mono text-lime uppercase tracking-wider mb-4">ULAANBAATAR / 47.918° N</p>
          <h2 className="text-6xl xl:text-7xl font-semibold tracking-tighter leading-[0.85]">
            AFTER<br /><span className="text-lime">DARK</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-6 max-w-sm">{t.auth.subtitle}</p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <BrandMark compact className="lg:invisible" />
          <LanguageSwitcher compact />
        </div>

        <div className="flex-1 flex items-center">
          <form onSubmit={onSubmit} className="w-full max-w-sm mx-auto space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-3.5 h-3.5 text-lime" />
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{t.auth.badge}</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">{t.auth.title}</h1>
              <p className="text-sm text-muted-foreground mt-1 lg:hidden">{t.auth.subtitle}</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">{t.auth.email}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@kueneere.mn"
                  className="mt-1.5 h-11 rounded-none"
                />
              </div>
              <div>
                <Label htmlFor="password">{t.auth.password}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 h-11 rounded-none"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-lime text-background font-medium flex items-center justify-between px-4 hover:bg-lime/90 transition-colors disabled:opacity-60"
            >
              <span>{submitting ? t.auth.submitting : t.auth.submit}</span>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>

            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span className="truncate">{t.auth.apiHint.replace("{url}", API_URL.replace(/^https?:\/\//, ""))}</span>
              <a href={STORE_URL} target="_blank" rel="noreferrer" className="hover:text-lime shrink-0 ml-3">
                {t.auth.storeLink} ↗
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
