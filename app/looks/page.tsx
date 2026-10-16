"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, RefreshCw, Shirt, Trash2 } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatMNT, resolveImage, STORE_URL } from "@/lib/api"
import { useDashboard } from "@/context/dashboard-context"
import { useLanguage } from "@/context/language-context"
import { useAuth } from "@/context/auth-context"
import { AdminLook, deleteLook, fetchLookProducts, fetchLooks, LookProduct, reorderLooks } from "@/lib/looks"
import { LookEditor } from "@/components/looks/look-editor"

function LooksInner() {
  const { t } = useLanguage()
  const l = t.looks
  const { addNotification } = useDashboard()
  const { can } = useAuth()
  const canWrite = can("manager", "marketer")

  const [looks, setLooks] = useState<AdminLook[]>([])
  const [products, setProducts] = useState<LookProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<AdminLook | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const fail = useCallback(
    (err: unknown) => addNotification({ title: t.common.loadError, message: err instanceof Error ? err.message : String(err), type: "error" }),
    [addNotification, t.common.loadError],
  )

  const load = useCallback(async () => {
    try {
      const [ls, ps] = await Promise.all([fetchLooks(), fetchLookProducts()])
      setLooks(ls)
      setProducts(ps)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...looks]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setLooks(next)
    try {
      setLooks(await reorderLooks(next.map((x) => Number(x.id))))
    } catch (err) {
      fail(err)
      void load()
    }
  }

  const remove = async (look: AdminLook) => {
    if (!window.confirm(l.deleteConfirm.replace("{name}", look.title))) return
    try {
      await deleteLook(look.id)
      setLooks((ls) => ls.filter((x) => x.id !== look.id))
      addNotification({ title: l.deleted, message: look.title, type: "info" })
    } catch (err) {
      fail(err)
    }
  }

  const onSaved = (saved: AdminLook, created: boolean) => {
    setLooks((ls) => (created ? [...ls, saved] : ls.map((x) => (x.id === saved.id ? saved : x))))
    addNotification({ title: l.saved, message: saved.title, type: "success" })
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shirt className="w-4 h-4 text-lime" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{l.badge}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{l.title}</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">{l.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" className="gap-2 bg-transparent" asChild>
            <a href={`${STORE_URL}/#lookbook`} target="_blank" rel="noreferrer">
              <ExternalLink className="w-4 h-4" /> <span className="hidden sm:inline">{t.products.viewStore}</span>
            </a>
          </Button>
          {canWrite && (
            <Button size="sm" className="gap-2 bg-lime text-background hover:bg-lime/90" onClick={() => { setEditing(null); setEditorOpen(true) }}>
              <Plus className="w-4 h-4" /> {l.new}
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <div className="bg-card border border-destructive/30 p-8 text-center">
          <p className="text-sm font-medium mb-1">{t.common.loadError}</p>
          <p className="text-xs text-muted-foreground font-mono mb-4">{error}</p>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => { setLoading(true); void load() }}>
            <RefreshCw className="w-4 h-4" /> {t.common.retry}
          </Button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-none" />)}
        </div>
      ) : looks.length === 0 ? (
        <div className="bg-card border border-dashed border-border p-12 text-center">
          <Shirt className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{l.empty}</p>
          {canWrite && (
            <Button size="sm" className="gap-2 bg-lime text-background hover:bg-lime/90 mt-5" onClick={() => { setEditing(null); setEditorOpen(true) }}>
              <Plus className="w-4 h-4" /> {l.new}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {looks.map((look, i) => (
            <div key={look.id} className="group bg-card border border-border flex flex-col">
              <div
                className="relative bg-muted overflow-hidden cursor-pointer"
                style={{ aspectRatio: look.imageWidth && look.imageHeight ? `${look.imageWidth} / ${look.imageHeight}` : "3 / 4" }}
                onClick={() => { if (canWrite) { setEditing(look); setEditorOpen(true) } }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveImage(look.imageUrl)} alt={look.title} className={cn("absolute inset-0 w-full h-full object-cover", !look.isPublished && "opacity-60 grayscale")} />
                {look.items.map((it, n) => (
                  <span
                    key={it.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/70 border border-white text-white text-[10px] font-mono flex items-center justify-center"
                    style={{ left: `${it.x}%`, top: `${it.y}%` }}
                    title={it.product?.name}
                  >
                    {n + 1}
                  </span>
                ))}
                <span className={cn("absolute top-2 left-2 px-2 py-0.5 text-[10px] font-mono uppercase", look.isPublished ? "bg-lime text-black" : "bg-yellow-400 text-black")}>
                  {look.isPublished ? l.published : l.draft}
                </span>
                <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-mono bg-black/70 text-white">
                  LOOK {String(i + 1).padStart(3, "0")}
                </span>
              </div>
              <div className="p-4 flex flex-col gap-3 flex-1">
                <div>
                  <h3 className="text-sm font-medium truncate">{look.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {look.items.length} {l.items}
                    {look.bundleDiscountPercent > 0 && <span className="text-lime"> · −{look.bundleDiscountPercent}%</span>}
                  </p>
                </div>
                <div className="flex items-baseline gap-2 font-mono">
                  {look.pricing.discount > 0 && <span className="text-xs text-muted-foreground line-through">{formatMNT(look.pricing.total)}</span>}
                  <span className="text-lg text-lime">{formatMNT(look.pricing.bundlePrice)}</span>
                </div>
                {canWrite && (
                  <div className="flex items-center gap-1 mt-auto pt-3 border-t border-border">
                    <button onClick={() => void move(i, -1)} disabled={i === 0} title={l.moveUp} aria-label={l.moveUp} className="h-8 w-8 flex items-center justify-center border border-border disabled:opacity-30 hover:bg-surface-hover"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => void move(i, 1)} disabled={i === looks.length - 1} title={l.moveDown} aria-label={l.moveDown} className="h-8 w-8 flex items-center justify-center border border-border disabled:opacity-30 hover:bg-surface-hover"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setEditing(look); setEditorOpen(true) }} className="h-8 px-3 ml-auto flex items-center gap-1.5 text-xs border border-border hover:bg-surface-hover"><Pencil className="w-3.5 h-3.5" /> {t.common.edit}</button>
                    <button onClick={() => void remove(look)} aria-label={t.common.delete} className="h-8 w-8 flex items-center justify-center border border-border text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <LookEditor open={editorOpen} look={editing} products={products} onOpenChange={setEditorOpen} onSaved={onSaved} />
    </div>
  )
}

export default function LooksPage() {
  return (
    <DashboardLayout>
      <LooksInner />
    </DashboardLayout>
  )
}
