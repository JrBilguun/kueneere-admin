"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  ExternalLink,
  Eye,
  EyeOff,
  FolderTree,
  LayoutGrid,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Rows3,
  Search,
  Star,
  Trash2,
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { formatMNT, resolveImage, STORE_URL } from "@/lib/api"
import { relativeTime } from "@/lib/relative-time"
import { useDashboard } from "@/context/dashboard-context"
import { useLanguage } from "@/context/language-context"
import { useAuth } from "@/context/auth-context"
import {
  AdminProduct,
  Category,
  deleteProduct,
  fetchCatalog,
  LOW_STOCK,
  ProductStatus,
  setProductStatus,
  totalStock,
} from "@/lib/products"
import { ProductEditor } from "@/components/products/product-editor"
import { CategoryManager } from "@/components/products/category-manager"

type StatusFilter = "ALL" | ProductStatus
type View = "grid" | "table"

const VIEW_KEY = "kueneere-admin-products-view"

// Зураг дээр харагдах тул тод (solid) хувилбар
const statusBadgeSolid: Record<ProductStatus, string> = {
  ACTIVE: "bg-lime text-black border-lime",
  DRAFT: "bg-yellow-400 text-black border-yellow-400",
  ARCHIVED: "bg-neutral-800 text-neutral-200 border-neutral-800",
}

const statusBadge: Record<ProductStatus, string> = {
  ACTIVE: "bg-lime/20 text-lime border-lime/30",
  DRAFT: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  ARCHIVED: "bg-muted text-muted-foreground border-border",
}

function ProductsInner() {
  const { t, locale } = useLanguage()
  const p = t.products
  const { addNotification } = useDashboard()
  const { can } = useAuth()
  const canWrite = can("manager")

  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<StatusFilter>("ALL")
  const [categoryId, setCategoryId] = useState("")
  const [view, setView] = useState<View>("grid")

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<AdminProduct | null>(null)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [toDelete, setToDelete] = useState<AdminProduct | null>(null)

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(VIEW_KEY)
      if (v === "grid" || v === "table") setView(v)
    } catch { /* ignore */ }
  }, [])
  const changeView = (v: View) => {
    setView(v)
    try { window.localStorage.setItem(VIEW_KEY, v) } catch { /* ignore */ }
  }

  const notifyError = useCallback(
    (message: string) => addNotification({ title: t.common.loadError, message, type: "error" }),
    [addNotification, t.common.loadError],
  )

  const load = useCallback(async () => {
    try {
      const data = await fetchCatalog()
      setProducts(data.products)
      setCategories(data.categories)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // ── Derived ───────────────────────────────────────
  const stats = useMemo(() => {
    const active = products.filter((x) => x.status === "ACTIVE").length
    const lowStock = products.reduce((s, x) => s + x.variants.filter((v) => v.stock <= LOW_STOCK).length, 0)
    const value = products.reduce(
      (s, x) => s + x.variants.reduce((vs, v) => vs + v.stock * (v.price ?? x.price), 0),
      0,
    )
    return { total: products.length, active, draft: products.length - active, lowStock, value }
  }, [products])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((x) => {
      if (status !== "ALL" && x.status !== status) return false
      if (categoryId && String(x.categoryId ?? "") !== categoryId) return false
      if (!q) return true
      return (
        x.name.toLowerCase().includes(q) ||
        x.slug.includes(q) ||
        (x.translations?.en?.name ?? "").toLowerCase().includes(q) ||
        x.variants.some((v) => (v.sku ?? "").toLowerCase().includes(q))
      )
    })
  }, [products, query, status, categoryId])

  const productCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const x of products) if (x.categoryId != null) m[String(x.categoryId)] = (m[String(x.categoryId)] ?? 0) + 1
    return m
  }, [products])

  // ── Actions ───────────────────────────────────────
  const openCreate = () => { setEditing(null); setEditorOpen(true) }
  const openEdit = (x: AdminProduct) => { setEditing(x); setEditorOpen(true) }

  const onSaved = (saved: AdminProduct, created: boolean) => {
    setProducts((list) => (created ? [saved, ...list] : list.map((x) => (x.id === saved.id ? saved : x))))
    addNotification({ title: created ? p.toast.created : p.toast.updated, message: saved.name, type: "success" })
  }

  const toggleStatus = async (x: AdminProduct) => {
    const next: ProductStatus = x.status === "ACTIVE" ? "DRAFT" : "ACTIVE"
    setProducts((list) => list.map((y) => (y.id === x.id ? { ...y, status: next } : y)))
    try {
      await setProductStatus(x.id, next)
      addNotification({ title: p.toast.statusChanged, message: `${x.name} → ${p.status[next]}`, type: "info" })
    } catch (err) {
      setProducts((list) => list.map((y) => (y.id === x.id ? { ...y, status: x.status } : y)))
      notifyError(err instanceof Error ? err.message : String(err))
    }
  }

  const confirmDelete = async () => {
    const x = toDelete
    if (!x) return
    setToDelete(null)
    try {
      await deleteProduct(x.id)
      setProducts((list) => list.filter((y) => y.id !== x.id))
      addNotification({ title: p.toast.deleted, message: x.name, type: "info" })
    } catch (err) {
      notifyError(err instanceof Error ? err.message : String(err))
    }
  }

  const actionsMenu = (x: AdminProduct) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button aria-label="Actions" className="w-8 h-8 flex items-center justify-center bg-background/80 backdrop-blur-sm hover:bg-surface-hover border border-border">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {canWrite && (
          <DropdownMenuItem onClick={() => openEdit(x)}>
            <Pencil className="w-4 h-4 mr-2" /> {t.common.edit}
          </DropdownMenuItem>
        )}
        {canWrite && (
          <DropdownMenuItem onClick={() => void toggleStatus(x)}>
            {x.status === "ACTIVE" ? <><EyeOff className="w-4 h-4 mr-2" /> {p.card.unpublish}</> : <><Eye className="w-4 h-4 mr-2" /> {p.card.publish}</>}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <a href={`${STORE_URL}/products/${x.slug}`} target="_blank" rel="noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" /> {p.card.openInStore}
          </a>
        </DropdownMenuItem>
        {canWrite && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setToDelete(x)} className="text-red-500 focus:text-red-500">
              <Trash2 className="w-4 h-4 mr-2" /> {t.common.delete}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const statusFilters: { key: StatusFilter; label: string; count: number }[] = [
    { key: "ALL", label: p.filters.all, count: products.length },
    { key: "ACTIVE", label: p.filters.active, count: products.filter((x) => x.status === "ACTIVE").length },
    { key: "DRAFT", label: p.filters.draft, count: products.filter((x) => x.status === "DRAFT").length },
    { key: "ARCHIVED", label: p.filters.archived, count: products.filter((x) => x.status === "ARCHIVED").length },
  ]

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-4 h-4 text-lime" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{p.badge}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{p.title}</h1>
          <p className="text-muted-foreground mt-1">{p.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2 bg-transparent" asChild>
            <a href={STORE_URL} target="_blank" rel="noreferrer">
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">{p.viewStore}</span>
            </a>
          </Button>
          {canWrite && (
            <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => setCategoriesOpen(true)}>
              <FolderTree className="w-4 h-4" />
              <span className="hidden sm:inline">{p.categories}</span>
            </Button>
          )}
          {canWrite && (
            <Button size="sm" className="gap-2 bg-lime text-background hover:bg-lime/90" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              {p.new}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          { label: p.stats.total, value: stats.total },
          { label: p.stats.active, value: stats.active, accent: "text-lime" },
          { label: p.stats.draft, value: stats.draft },
          { label: p.stats.lowStock, value: stats.lowStock, accent: stats.lowStock ? "text-yellow-400" : "" },
          { label: p.stats.inventoryValue, value: formatMNT(stats.value), wide: true },
        ].map((s) => (
          <div key={s.label} className={cn("bg-card border border-border p-4", s.wide && "col-span-2 md:col-span-1")}>
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={cn("text-2xl font-mono font-semibold truncate", s.accent)}>{loading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4 md:mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 lg:pb-0">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={cn(
                "px-3 py-1.5 text-xs sm:text-sm transition-colors whitespace-nowrap flex items-center gap-2",
                status === f.key ? "bg-lime text-background" : "bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover",
              )}
            >
              {f.label}
              <span className={cn("font-mono text-[10px]", status === f.key ? "text-background/70" : "text-muted-foreground")}>{f.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 lg:ml-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={p.filters.search}
              className="w-full h-9 pl-9 pr-3 text-sm bg-transparent border border-border focus:outline-none focus:ring-1 focus:ring-lime"
            />
          </div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label={p.filters.category}
            className="h-9 px-3 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-lime max-w-40"
          >
            <option value="">{p.filters.allCategories}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="flex border border-border">
            {(["grid", "table"] as const).map((v) => (
              <button
                key={v}
                onClick={() => changeView(v)}
                title={p.view[v]}
                aria-label={p.view[v]}
                className={cn("h-9 w-9 flex items-center justify-center", view === v ? "bg-surface-hover text-lime" : "text-muted-foreground hover:text-foreground")}
              >
                {v === "grid" ? <LayoutGrid className="w-4 h-4" /> : <Rows3 className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {loadError ? (
        <div className="bg-card border border-destructive/30 p-8 text-center">
          <p className="text-sm font-medium mb-1">{t.common.loadError}</p>
          <p className="text-xs text-muted-foreground font-mono mb-4">{loadError}</p>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => { setLoading(true); void load() }}>
            <RefreshCw className="w-4 h-4" /> {t.common.retry}
          </Button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border">
              <Skeleton className="aspect-[4/5] rounded-none" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-none" />
                <Skeleton className="h-3 w-1/2 rounded-none" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border border-dashed p-10 md:p-16 text-center">
          <Package className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">{products.length ? p.empty.filtered : p.empty.title}</p>
          {!products.length && <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{p.empty.subtitle}</p>}
          {!products.length && canWrite && (
            <Button size="sm" className="gap-2 bg-lime text-background hover:bg-lime/90 mt-5" onClick={openCreate}>
              <Plus className="w-4 h-4" /> {p.new}
            </Button>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {filtered.map((x, i) => {
            const stock = totalStock(x)
            return (
              <motion.div
                key={x.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 12) * 0.03 }}
                className="group bg-card border border-border hover:border-muted-foreground/40 transition-colors cursor-pointer flex flex-col"
                onClick={() => (canWrite ? openEdit(x) : window.open(`${STORE_URL}/products/${x.slug}`, "_blank"))}
              >
                <div className="relative aspect-[4/5] bg-muted overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImage(x.mainImage ?? x.images[0]?.imageUrl)}
                    alt={x.name}
                    className={cn("w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]", x.status !== "ACTIVE" && "opacity-60 grayscale")}
                  />
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <span className={cn("px-2 py-0.5 text-[10px] font-mono uppercase border", statusBadgeSolid[x.status])}>{p.status[x.status]}</span>
                    {x.isFeatured && (
                      <span className="px-1.5 py-0.5 bg-background/80 border border-border backdrop-blur-sm" title={p.card.featured}>
                        <Star className="w-3 h-3 text-lime fill-lime" />
                      </span>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">{actionsMenu(x)}</div>
                  {x.variants.length > 0 && stock === 0 && (
                    <span className="absolute bottom-2 left-2 bg-destructive text-white text-[10px] font-mono uppercase px-2 py-0.5">{p.card.soldOut}</span>
                  )}
                </div>
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium truncate">{x.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {x.category?.name ?? "—"}{x.dropName ? ` · ${x.dropName}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono text-lime">{formatMNT(x.price)}</p>
                      {x.compareAtPrice != null && x.compareAtPrice > x.price && (
                        <p className="text-[11px] font-mono text-muted-foreground line-through">{formatMNT(x.compareAtPrice)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-auto">
                    {x.variants.length === 0 ? (
                      <span className="text-[11px] font-mono text-muted-foreground">{p.card.noSizes}</span>
                    ) : (
                      x.variants.map((v) => (
                        <span
                          key={v.id}
                          title={`${v.size}: ${v.stock} ${p.card.units}`}
                          className={cn(
                            "px-1.5 py-0.5 text-[10px] font-mono border",
                            v.stock === 0 ? "border-destructive/40 text-destructive line-through" : v.stock <= LOW_STOCK ? "border-yellow-500/40 text-yellow-400" : "border-border text-muted-foreground",
                          )}
                        >
                          {v.size}<span className="opacity-60 ml-1">{v.stock}</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="bg-card border border-border overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="p-3 font-medium">{p.columns.product}</th>
                <th className="p-3 font-medium">{p.columns.category}</th>
                <th className="p-3 font-medium text-right">{p.columns.price}</th>
                <th className="p-3 font-medium text-right">{p.columns.stock}</th>
                <th className="p-3 font-medium">{p.columns.status}</th>
                <th className="p-3 font-medium">{p.columns.updated}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((x) => {
                const stock = totalStock(x)
                const low = x.variants.some((v) => v.stock <= LOW_STOCK)
                return (
                  <tr key={x.id} className="hover:bg-surface-hover transition-colors cursor-pointer" onClick={() => canWrite && openEdit(x)}>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolveImage(x.mainImage ?? x.images[0]?.imageUrl)} alt="" className="w-10 h-12 object-cover bg-muted shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate flex items-center gap-1.5">
                            {x.name}
                            {x.isFeatured && <Star className="w-3 h-3 text-lime fill-lime shrink-0" />}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground truncate">/{x.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{x.category?.name ?? "—"}</td>
                    <td className="p-3 text-sm font-mono text-right">{formatMNT(x.price)}</td>
                    <td className={cn("p-3 text-sm font-mono text-right", stock === 0 && x.variants.length ? "text-destructive" : low ? "text-yellow-400" : "")}>
                      {x.variants.length ? stock : "—"}
                    </td>
                    <td className="p-3">
                      <span className={cn("px-2 py-0.5 text-[10px] font-mono uppercase border", statusBadge[x.status])}>{p.status[x.status]}</span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{relativeTime(x.updatedAt, locale)}</td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>{actionsMenu(x)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ProductEditor
        open={editorOpen}
        product={editing}
        categories={categories}
        onOpenChange={setEditorOpen}
        onSaved={onSaved}
      />

      <CategoryManager
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        categories={categories}
        productCounts={productCounts}
        onChanged={() => void load()}
        onError={notifyError}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>{p.delete.title}</AlertDialogTitle>
            <AlertDialogDescription>{p.delete.description.replace("{name}", toDelete?.name ?? "")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction className="rounded-none bg-destructive text-white hover:bg-destructive/90" onClick={() => void confirmDelete()}>
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <DashboardLayout>
      <ProductsInner />
    </DashboardLayout>
  )
}
