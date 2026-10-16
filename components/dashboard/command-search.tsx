"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  BarChart3,
  Calendar,
  Package,
  Shirt,
  PanelsTopLeft,
  Users,
  Wallet,
  FileText,
  TrendingUp,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useLanguage } from "@/context/language-context"

interface CommandSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const router = useRouter()
  const { t } = useLanguage()

  const pages = [
    { name: t.commandSearch.pages.pulse, href: "/", icon: Activity },
    { name: t.commandSearch.pages.architect, href: "/architect", icon: Calendar },
    { name: t.commandSearch.pages.engine, href: "/analytics", icon: BarChart3 },
    { name: t.commandSearch.pages.products, href: "/products", icon: Package },
    { name: t.commandSearch.pages.looks, href: "/looks", icon: Shirt },
    { name: t.commandSearch.pages.content, href: "/content", icon: PanelsTopLeft },
    { name: t.commandSearch.pages.intel, href: "/audience", icon: Users },
    { name: t.commandSearch.pages.budget, href: "/budget", icon: Wallet },
  ]

  const quickActions = [
    { name: t.commandSearch.actions.newCampaign, action: "new-campaign", icon: FileText },
    { name: t.commandSearch.actions.topPerformers, action: "top-performers", icon: TrendingUp },
    { name: t.commandSearch.actions.exportReport, action: "export", icon: FileText },
  ]

  const handleSelect = useCallback(
    (value: string) => {
      onOpenChange(false)
      if (value.startsWith("/")) {
        router.push(value)
      }
    },
    [router, onOpenChange]
  )

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t.commandSearch.placeholder} />
      <CommandList>
        <CommandEmpty>{t.commandSearch.empty}</CommandEmpty>
        <CommandGroup heading={t.commandSearch.groups.pages}>
          {pages.map((page) => (
            <CommandItem
              key={page.href}
              value={page.name}
              onSelect={() => handleSelect(page.href)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <page.icon className="w-4 h-4 text-muted-foreground" />
              <span>{page.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t.commandSearch.groups.quickActions}>
          {quickActions.map((action) => (
            <CommandItem
              key={action.action}
              value={action.name}
              className="flex items-center gap-3 cursor-pointer"
            >
              <action.icon className="w-4 h-4 text-muted-foreground" />
              <span>{action.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

export function useCommandSearch() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return { open, setOpen }
}
