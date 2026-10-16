"use client"

import { Minus, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/context/language-context"
import { APPAREL_SIZES, LOW_STOCK } from "@/lib/products"

export interface EditableVariant {
  key: string
  id?: number
  size: string
  sku: string
  stock: string
  price: string
}

let seq = 0
export const variantKey = () => `var-${Date.now()}-${seq++}`

export const emptyVariant = (size = ""): EditableVariant => ({
  key: variantKey(),
  size,
  sku: "",
  stock: "0",
  price: "",
})

interface VariantEditorProps {
  variants: EditableVariant[]
  onChange: (variants: EditableVariant[]) => void
}

const cell =
  "h-9 w-full px-2 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-lime font-mono"

/** Хэмжээ тус бүрийн үлдэгдэл / SKU / тусгай үнэ */
export function VariantEditor({ variants, onChange }: VariantEditorProps) {
  const { t } = useLanguage()
  const e = t.products.editor

  const update = (key: string, patch: Partial<EditableVariant>) =>
    onChange(variants.map((v) => (v.key === key ? { ...v, ...patch } : v)))

  const bump = (v: EditableVariant, delta: number) =>
    update(v.key, { stock: String(Math.max(0, (parseInt(v.stock, 10) || 0) + delta)) })

  const addPreset = (sizes: string[]) => {
    const existing = new Set(variants.map((v) => v.size.trim().toUpperCase()))
    onChange([...variants, ...sizes.filter((s) => !existing.has(s)).map((s) => emptyVariant(s))])
  }

  const total = variants.reduce((s, v) => s + (parseInt(v.stock, 10) || 0), 0)
  const dupes = new Set(
    variants
      .map((v) => v.size.trim().toUpperCase())
      .filter((s, i, arr) => s && arr.indexOf(s) !== i),
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => addPreset(APPAREL_SIZES)} className="h-8 px-3 text-xs font-mono border border-border hover:border-lime hover:text-lime">
          + {e.presetApparel}
        </button>
        <button type="button" onClick={() => addPreset(["OS"])} className="h-8 px-3 text-xs font-mono border border-border hover:border-lime hover:text-lime">
          + {e.presetOne}
        </button>
        <span className="ml-auto text-xs font-mono text-muted-foreground">
          {e.totalStock}: <span className="text-foreground">{total}</span>
        </span>
      </div>

      {variants.length === 0 ? (
        <p className="text-sm text-muted-foreground border border-dashed border-border p-4">{e.noVariants}</p>
      ) : (
        <div className="border border-border">
          <div className="grid grid-cols-[72px_1fr_132px_96px_32px] gap-2 px-2 py-2 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>{e.size}</span>
            <span>{e.sku}</span>
            <span>{e.stock}</span>
            <span>{e.priceOverride}</span>
            <span />
          </div>
          {variants.map((v) => {
            const stock = parseInt(v.stock, 10) || 0
            return (
              <div key={v.key} className="grid grid-cols-[72px_1fr_132px_96px_32px] gap-2 px-2 py-2 border-b border-border last:border-b-0 items-center">
                <input
                  aria-label={e.size}
                  value={v.size}
                  onChange={(ev) => update(v.key, { size: ev.target.value.toUpperCase() })}
                  className={cn(cell, "uppercase text-center", dupes.has(v.size.trim().toUpperCase()) && "border-destructive")}
                  placeholder="M"
                  maxLength={20}
                />
                <input aria-label={e.sku} value={v.sku} onChange={(ev) => update(v.key, { sku: ev.target.value })} className={cell} placeholder="—" maxLength={100} />
                <div className="flex items-center">
                  <button type="button" aria-label="-1" onClick={() => bump(v, -1)} className="h-9 w-8 border border-border border-r-0 flex items-center justify-center hover:bg-surface-hover">
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    aria-label={e.stock}
                    inputMode="numeric"
                    value={v.stock}
                    onChange={(ev) => update(v.key, { stock: ev.target.value.replace(/[^0-9]/g, "") })}
                    className={cn(cell, "text-center", stock === 0 ? "text-destructive" : stock <= LOW_STOCK ? "text-yellow-400" : "")}
                  />
                  <button type="button" aria-label="+1" onClick={() => bump(v, 1)} className="h-9 w-8 border border-border border-l-0 flex items-center justify-center hover:bg-surface-hover">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <input
                  aria-label={e.priceOverride}
                  inputMode="numeric"
                  value={v.price}
                  onChange={(ev) => update(v.key, { price: ev.target.value.replace(/[^0-9.]/g, "") })}
                  className={cell}
                  placeholder="₮"
                />
                <button type="button" aria-label={e.remove} onClick={() => onChange(variants.filter((x) => x.key !== v.key))} className="h-9 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <button type="button" onClick={() => onChange([...variants, emptyVariant()])} className="h-8 px-3 text-xs border border-border hover:bg-surface-hover flex items-center gap-1.5">
        <Plus className="w-3.5 h-3.5" /> {e.addSize}
      </button>
    </div>
  )
}
