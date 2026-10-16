"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ExternalLink, Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { STORE_URL } from "@/lib/api"
import { useLanguage } from "@/context/language-context"
import {
  AdminProduct,
  Category,
  PRODUCT_STATUSES,
  ProductStatus,
  saveProduct,
  SaveProductPayload,
  TRANSLATION_FIELDS,
  TranslationField,
  TranslationLang,
} from "@/lib/products"
import { EditableImage, ImageManager, imageKey } from "./image-manager"
import { EditableVariant, VariantEditor, variantKey } from "./variant-editor"

type TransForm = Record<TranslationLang, Record<TranslationField, string>>

interface FormState {
  id?: number
  name: string
  slug: string
  categoryId: string
  status: ProductStatus
  isFeatured: boolean
  dropName: string
  price: string
  compareAtPrice: string
  color: string
  colorHex: string
  fitNote: string
  description: string
  details: string
  care: string
  images: EditableImage[]
  variants: EditableVariant[]
  translations: TransForm
}

const emptyTrans = (): Record<TranslationField, string> =>
  Object.fromEntries(TRANSLATION_FIELDS.map((f) => [f, ""])) as Record<TranslationField, string>

function toForm(p: AdminProduct | null): FormState {
  return {
    id: p ? Number(p.id) : undefined,
    name: p?.name ?? "",
    slug: p?.slug ?? "",
    categoryId: p?.categoryId != null ? String(p.categoryId) : "",
    status: p?.status ?? "DRAFT",
    isFeatured: p?.isFeatured ?? false,
    dropName: p?.dropName ?? "",
    price: p ? String(p.price) : "",
    compareAtPrice: p?.compareAtPrice != null ? String(p.compareAtPrice) : "",
    color: p?.color ?? "",
    colorHex: p?.colorHex ?? "",
    fitNote: p?.fitNote ?? "",
    description: p?.description ?? "",
    details: p?.details ?? "",
    care: p?.care ?? "",
    images: (p?.images ?? []).map((i) => ({ key: imageKey(), imageUrl: i.imageUrl, alt: i.alt ?? undefined })),
    variants: (p?.variants ?? []).map((v) => ({
      key: variantKey(),
      id: Number(v.id),
      size: v.size,
      sku: v.sku ?? "",
      stock: String(v.stock),
      price: v.price != null ? String(v.price) : "",
    })),
    translations: {
      en: { ...emptyTrans(), ...(p?.translations?.en ?? {}) },
      ko: { ...emptyTrans(), ...(p?.translations?.ko ?? {}) },
    },
  }
}

const orNull = (s: string) => (s.trim() ? s.trim() : null)

function toPayload(f: FormState): SaveProductPayload {
  const translations: SaveProductPayload["translations"] = {}
  for (const lang of ["en", "ko"] as const) {
    const entries = Object.entries(f.translations[lang]).filter(([, v]) => v.trim())
    if (entries.length) translations[lang] = Object.fromEntries(entries.map(([k, v]) => [k, v.trim()]))
  }
  return {
    ...(f.id ? { id: f.id } : {}),
    name: f.name.trim(),
    ...(f.slug.trim() ? { slug: f.slug.trim() } : {}),
    categoryId: f.categoryId ? Number(f.categoryId) : null,
    status: f.status,
    isFeatured: f.isFeatured,
    dropName: orNull(f.dropName),
    price: Number(f.price || 0),
    compareAtPrice: f.compareAtPrice.trim() ? Number(f.compareAtPrice) : null,
    color: orNull(f.color),
    colorHex: /^#[0-9a-fA-F]{3,8}$/.test(f.colorHex) ? f.colorHex : null,
    fitNote: orNull(f.fitNote),
    description: orNull(f.description),
    details: orNull(f.details),
    care: orNull(f.care),
    translations: Object.keys(translations).length ? translations : null,
    images: f.images.map((i) => ({ imageUrl: i.imageUrl, ...(i.alt ? { alt: i.alt } : {}) })),
    variants: f.variants
      .filter((v) => v.size.trim())
      .map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        size: v.size.trim().toUpperCase(),
        ...(f.color.trim() ? { color: f.color.trim() } : {}),
        ...(v.sku.trim() ? { sku: v.sku.trim() } : {}),
        stock: parseInt(v.stock, 10) || 0,
        ...(v.price.trim() ? { price: Number(v.price) } : {}),
      })),
  }
}

interface ProductEditorProps {
  open: boolean
  product: AdminProduct | null
  categories: Category[]
  onOpenChange: (open: boolean) => void
  onSaved: (product: AdminProduct, created: boolean) => void
}

const selectCls =
  "w-full mt-1.5 h-10 px-3 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-lime"

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-6 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function ProductEditor({ open, product, categories, onOpenChange, onSaved }: ProductEditorProps) {
  const { t } = useLanguage()
  const e = t.products.editor
  const [form, setForm] = useState<FormState>(() => toForm(product))
  const [initial, setInitial] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transLang, setTransLang] = useState<TranslationLang>("en")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      const f = toForm(product)
      setForm(f)
      setInitial(JSON.stringify(toPayload(f)))
      setError(null)
      setSaving(false)
      scrollRef.current?.scrollTo({ top: 0 })
    }
  }, [open, product])

  const dirty = useMemo(() => open && JSON.stringify(toPayload(form)) !== initial, [form, initial, open])
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const requestClose = (next: boolean) => {
    if (!next && dirty && !saving && !window.confirm(t.common.unsaved)) return
    onOpenChange(next)
  }

  const submit = async (ev?: React.FormEvent) => {
    ev?.preventDefault()
    if (!form.name.trim()) return setError(e.errors.name)
    if (!(Number(form.price) >= 0) || form.price.trim() === "") return setError(e.errors.price)
    setSaving(true)
    setError(null)
    try {
      const saved = await saveProduct(toPayload(form))
      onSaved(saved, !form.id)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    ["general", e.sections.general],
    ["media", e.sections.media],
    ["inventory", e.sections.inventory],
    ["details", e.sections.details],
    ["translations", e.sections.translations],
  ] as const

  const statusStyles: Record<ProductStatus, string> = {
    ACTIVE: "bg-lime text-background border-lime",
    DRAFT: "bg-yellow-500/15 text-yellow-400 border-yellow-500/40",
    ARCHIVED: "bg-muted text-muted-foreground border-border",
  }

  return (
    <Sheet open={open} onOpenChange={requestClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 gap-0 rounded-none">
        <form onSubmit={submit} className="flex flex-col h-full">
          <SheetHeader className="p-5 pb-3 border-b border-border space-y-1">
            <SheetTitle className="text-lg">{product ? e.editTitle : e.createTitle}</SheetTitle>
            <SheetDescription className="font-mono text-xs flex items-center gap-2">
              {product ? (
                <a href={`${STORE_URL}/products/${product.slug}`} target="_blank" rel="noreferrer" className="hover:text-lime inline-flex items-center gap-1">
                  /products/{product.slug} <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span>{e.slugHint}</span>
              )}
            </SheetDescription>
            <nav className="flex gap-1 pt-2 overflow-x-auto -mx-1">
              {sections.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => document.getElementById(`pe-${id}`)?.scrollIntoView({ behavior: "smooth" })}
                  className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-hover whitespace-nowrap"
                >
                  {label}
                </button>
              ))}
            </nav>
          </SheetHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6">
            {error && (
              <p role="alert" className="text-sm text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}

            <Section id="pe-general" title={e.sections.general}>
              <div>
                <Label htmlFor="pe-name">{e.name} *</Label>
                <Input id="pe-name" value={form.name} onChange={(ev) => set("name", ev.target.value)} placeholder={e.namePlaceholder} className="mt-1.5 rounded-none" maxLength={255} autoFocus={!product} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pe-slug">{e.slug}</Label>
                  <Input id="pe-slug" value={form.slug} onChange={(ev) => set("slug", ev.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="heavy-zip-hoodie" className="mt-1.5 rounded-none font-mono text-sm" />
                </div>
                <div>
                  <Label htmlFor="pe-category">{e.category}</Label>
                  <select id="pe-category" value={form.categoryId} onChange={(ev) => set("categoryId", ev.target.value)} className={selectCls}>
                    <option value="">{e.noCategory}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label>{e.status}</Label>
                <div className="grid grid-cols-3 mt-1.5">
                  {PRODUCT_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set("status", s)}
                      className={cn("h-9 text-sm border -ml-px first:ml-0 transition-colors", form.status === s ? statusStyles[s] : "border-border text-muted-foreground hover:text-foreground")}
                    >
                      {t.products.status[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pe-price">{e.price} *</Label>
                  <Input id="pe-price" inputMode="numeric" value={form.price} onChange={(ev) => set("price", ev.target.value.replace(/[^0-9.]/g, ""))} placeholder="189000" className="mt-1.5 rounded-none font-mono" />
                </div>
                <div>
                  <Label htmlFor="pe-compare">{e.compareAt}</Label>
                  <Input id="pe-compare" inputMode="numeric" value={form.compareAtPrice} onChange={(ev) => set("compareAtPrice", ev.target.value.replace(/[^0-9.]/g, ""))} placeholder="—" className="mt-1.5 rounded-none font-mono" />
                  <p className="text-[11px] text-muted-foreground mt-1">{e.compareAtHint}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 items-end">
                <div>
                  <Label htmlFor="pe-drop">{e.drop}</Label>
                  <Input id="pe-drop" value={form.dropName} onChange={(ev) => set("dropName", ev.target.value)} placeholder={e.dropPlaceholder} className="mt-1.5 rounded-none" maxLength={100} />
                </div>
                <label className="flex items-center justify-between gap-3 h-10 px-3 border border-border cursor-pointer">
                  <span className="text-sm">{e.featured}</span>
                  <Switch checked={form.isFeatured} onCheckedChange={(v) => set("isFeatured", v)} />
                </label>
              </div>
            </Section>

            <Section id="pe-media" title={e.sections.media}>
              <ImageManager images={form.images} onChange={(images) => set("images", images)} onError={setError} />
            </Section>

            <Section id="pe-inventory" title={e.sections.inventory}>
              <VariantEditor variants={form.variants} onChange={(variants) => set("variants", variants)} />
            </Section>

            <Section id="pe-details" title={e.sections.details}>
              <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-end">
                <div>
                  <Label htmlFor="pe-color">{e.colorName}</Label>
                  <Input id="pe-color" value={form.color} onChange={(ev) => set("color", ev.target.value)} placeholder="ХАР" className="mt-1.5 rounded-none" maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="pe-hex">{e.colorHex}</Label>
                  <div className="flex mt-1.5">
                    <input type="color" aria-label={e.colorHex} value={/^#[0-9a-fA-F]{6}$/.test(form.colorHex) ? form.colorHex : "#111111"} onChange={(ev) => set("colorHex", ev.target.value)} className="h-10 w-10 bg-background border border-border p-1 cursor-pointer" />
                    <Input id="pe-hex" value={form.colorHex} onChange={(ev) => set("colorHex", ev.target.value)} placeholder="#111111" className="rounded-none w-28 font-mono text-sm -ml-px" />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="pe-fit">{e.fitNote}</Label>
                <Textarea id="pe-fit" value={form.fitNote} onChange={(ev) => set("fitNote", ev.target.value)} rows={2} className="mt-1.5 rounded-none" maxLength={500} />
              </div>
              <div>
                <Label htmlFor="pe-desc">{e.description}</Label>
                <Textarea id="pe-desc" value={form.description} onChange={(ev) => set("description", ev.target.value)} rows={3} className="mt-1.5 rounded-none" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pe-details">{e.details}</Label>
                  <Textarea id="pe-details" value={form.details} onChange={(ev) => set("details", ev.target.value)} rows={3} className="mt-1.5 rounded-none" />
                </div>
                <div>
                  <Label htmlFor="pe-care">{e.care}</Label>
                  <Textarea id="pe-care" value={form.care} onChange={(ev) => set("care", ev.target.value)} rows={3} className="mt-1.5 rounded-none" />
                </div>
              </div>
            </Section>

            <Section id="pe-translations" title={e.sections.translations}>
              <p className="text-xs text-muted-foreground -mt-2">{e.translationsHint}</p>
              <div className="flex border-b border-border">
                {(["en", "ko"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setTransLang(lang)}
                    className={cn("px-4 py-2 text-xs font-mono uppercase border-b-2 -mb-px", transLang === lang ? "border-lime text-foreground" : "border-transparent text-muted-foreground")}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              {(["name", "color"] as const).map((field) => (
                <div key={field}>
                  <Label htmlFor={`pe-t-${field}`}>{field === "name" ? e.name.replace(/\(.*\)/, "").trim() : e.colorName}</Label>
                  <Input
                    id={`pe-t-${field}`}
                    value={form.translations[transLang][field]}
                    onChange={(ev) =>
                      set("translations", { ...form.translations, [transLang]: { ...form.translations[transLang], [field]: ev.target.value } })
                    }
                    placeholder={field === "name" ? form.name : form.color}
                    className="mt-1.5 rounded-none"
                  />
                </div>
              ))}
              {(["fitNote", "details", "care"] as const).map((field) => (
                <div key={field}>
                  <Label htmlFor={`pe-t-${field}`}>{e[field]}</Label>
                  <Textarea
                    id={`pe-t-${field}`}
                    value={form.translations[transLang][field]}
                    onChange={(ev) =>
                      set("translations", { ...form.translations, [transLang]: { ...form.translations[transLang], [field]: ev.target.value } })
                    }
                    rows={2}
                    className="mt-1.5 rounded-none"
                  />
                </div>
              ))}
            </Section>
          </div>

          <div className="p-4 border-t border-border flex items-center gap-3 bg-background">
            <span className="text-xs font-mono text-muted-foreground mr-auto">{dirty ? "●" : ""}</span>
            <button type="button" onClick={() => requestClose(false)} className="h-10 px-4 text-sm border border-border hover:bg-surface-hover">
              {t.common.cancel}
            </button>
            <button type="submit" disabled={saving} className="h-10 px-5 text-sm bg-lime text-background font-medium hover:bg-lime/90 disabled:opacity-60 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? t.common.saving : t.common.save}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
