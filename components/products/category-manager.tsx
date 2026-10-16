"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, Plus, Trash2 } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useLanguage } from "@/context/language-context"
import { Category, createCategory, deleteCategory, updateCategory } from "@/lib/products"

interface Row {
  id?: string
  name: string
  en: string
  ko: string
  dirty?: boolean
}

interface CategoryManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  productCounts: Record<string, number>
  onChanged: () => void
  onError: (message: string) => void
}

const inputCls = "h-9 w-full px-2 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-lime"

export function CategoryManager({ open, onOpenChange, categories, productCounts, onChanged, onError }: CategoryManagerProps) {
  const { t } = useLanguage()
  const c = t.products.categoryManager
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [draft, setDraft] = useState<Row>({ name: "", en: "", ko: "" })

  useEffect(() => {
    if (open) {
      setRows(categories.map((cat) => ({ id: cat.id, name: cat.name, en: cat.translations?.en?.name ?? "", ko: cat.translations?.ko?.name ?? "" })))
      setDraft({ name: "", en: "", ko: "" })
    }
  }, [open, categories])

  const guard = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key)
    try {
      await fn()
      onChanged()
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const patch = (id: string, p: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p, dirty: true } : r)))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 gap-0 rounded-none">
        <SheetHeader className="p-5 border-b border-border">
          <SheetTitle>{c.title}</SheetTitle>
          <SheetDescription>{c.subtitle}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-[1fr_88px_88px_64px] gap-2 px-5 py-2 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>{c.name}</span>
            <span>{c.en}</span>
            <span>{c.ko}</span>
            <span />
          </div>
          {rows.map((r, idx) => (
            <div key={r.id} className="grid grid-cols-[1fr_88px_88px_64px] gap-2 px-5 py-2 border-b border-border items-center">
              <div>
                <input value={r.name} onChange={(e) => patch(r.id!, { name: e.target.value })} className={inputCls} aria-label={c.name} />
                <p className="text-[10px] font-mono text-muted-foreground mt-1">
                  {productCounts[r.id!] ?? 0} {c.products}
                </p>
              </div>
              <input value={r.en} onChange={(e) => patch(r.id!, { en: e.target.value })} className={inputCls} aria-label={c.en} />
              <input value={r.ko} onChange={(e) => patch(r.id!, { ko: e.target.value })} className={inputCls} aria-label={c.ko} />
              <div className="flex justify-end gap-1">
                {r.dirty && (
                  <button
                    type="button"
                    aria-label={t.common.save}
                    title={t.common.save}
                    disabled={!r.name.trim() || busy === r.id}
                    onClick={() => guard(r.id!, () => updateCategory(r.id!, r.name.trim(), r.en, r.ko, idx + 1))}
                    className="h-9 w-8 flex items-center justify-center bg-lime text-background disabled:opacity-50"
                  >
                    {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={t.common.delete}
                  title={t.common.delete}
                  disabled={busy === r.id}
                  onClick={() => {
                    if (window.confirm(c.deleteConfirm.replace("{name}", r.name))) void guard(r.id!, () => deleteCategory(r.id!))
                  }}
                  className="h-9 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!draft.name.trim()) return
              void guard("new", async () => {
                await createCategory(draft.name.trim(), draft.en, draft.ko)
                setDraft({ name: "", en: "", ko: "" })
              })
            }}
            className="grid grid-cols-[1fr_88px_88px_64px] gap-2 px-5 py-4 items-center bg-surface"
          >
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={c.add} className={inputCls} aria-label={c.add} />
            <input value={draft.en} onChange={(e) => setDraft({ ...draft, en: e.target.value })} placeholder="EN" className={inputCls} aria-label={c.en} />
            <input value={draft.ko} onChange={(e) => setDraft({ ...draft, ko: e.target.value })} placeholder="KO" className={inputCls} aria-label={c.ko} />
            <button type="submit" disabled={!draft.name.trim() || busy === "new"} className="h-9 flex items-center justify-center bg-lime text-background disabled:opacity-50" aria-label={c.add}>
              {busy === "new" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
