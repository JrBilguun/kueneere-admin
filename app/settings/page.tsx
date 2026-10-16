"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Settings, User, Bell, Shield, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/language-context"
import { useAuth } from "@/context/auth-context"

export default function SettingsPage() {
  const { t, locale } = useLanguage()
  const { user, logout } = useAuth()
  const roleLabels = (user?.roles ?? [])
    .map((r) => t.sidebar.roles[r as keyof typeof t.sidebar.roles] ?? r)
    .join(", ")
  const lastLogin = user?.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleString(locale === "mn" ? "mn-MN" : locale === "ko" ? "ko-KR" : "en-US")
    : "—"

  const settingsSections = [
    {
      title: t.settings.sections.profile.title,
      icon: User,
      description: t.settings.sections.profile.description,
      items: [
        { label: t.settings.sections.profile.fullName, value: user ? `${user.firstName} ${user.lastName}` : "—" },
        { label: t.settings.sections.profile.email, value: user?.email ?? "—" },
        { label: t.settings.sections.profile.role, value: roleLabels || "—" },
      ],
    },
    {
      title: t.settings.sections.notifications.title,
      icon: Bell,
      description: t.settings.sections.notifications.description,
      items: [
        { label: t.settings.sections.notifications.email, value: t.settings.sections.notifications.enabled, toggle: true },
        { label: t.settings.sections.notifications.push, value: t.settings.sections.notifications.enabled, toggle: true },
        { label: t.settings.sections.notifications.digest, value: t.settings.sections.notifications.disabled, toggle: true },
      ],
    },
    {
      title: t.settings.sections.security.title,
      icon: Shield,
      description: t.settings.sections.security.description,
      items: [
        { label: t.settings.sections.security.twoFactor, value: t.settings.sections.notifications.enabled },
        { label: t.settings.sections.security.lastLogin, value: lastLogin },
        { label: t.settings.sections.security.sessions, value: "2 devices" },
      ],
    },
    {
      title: t.settings.sections.integrations.title,
      icon: Key,
      description: t.settings.sections.integrations.description,
      items: [
        { label: t.settings.sections.integrations.meta, value: t.settings.sections.integrations.connected },
        { label: t.settings.sections.integrations.google, value: t.settings.sections.integrations.connected },
        { label: t.settings.sections.integrations.tiktok, value: t.settings.sections.integrations.notConnected },
      ],
    },
  ]

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-4 h-4 text-lime" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              {t.settings.badge}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{t.settings.title}</h1>
          <p className="text-muted-foreground mt-1">
            {t.settings.subtitle}
          </p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {settingsSections.map((section) => (
            <div key={section.title} className="bg-card border border-border">
              <div className="p-4 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 bg-lime/10 flex items-center justify-center">
                  <section.icon className="w-4 h-4 text-lime" />
                </div>
                <div>
                  <h2 className="text-sm font-medium">{section.title}</h2>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
              </div>
              <div className="divide-y divide-border">
                {section.items.map((item) => (
                  <div key={item.label} className="p-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono">{item.value}</span>
                      {"toggle" in item && item.toggle && (
                        <button className="w-10 h-5 bg-lime/20 relative">
                          <div className={`absolute top-0.5 ${item.value === t.settings.sections.notifications.enabled ? "right-0.5 bg-lime" : "left-0.5 bg-muted-foreground"} w-4 h-4 transition-all`} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between p-4 bg-card border border-border">
          <div>
            <p className="text-sm font-medium">{t.auth.signOut}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" className="bg-transparent" onClick={logout}>
            {t.auth.signOut}
          </Button>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-between p-4 bg-card border border-border">
          <div>
            <p className="text-sm font-medium">{t.settings.danger.title}</p>
            <p className="text-xs text-muted-foreground">{t.settings.danger.subtitle}</p>
          </div>
          <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 bg-transparent">
            {t.settings.danger.delete}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
