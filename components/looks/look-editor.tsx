"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ImagePlus, Loader2, Search, Trash2, X } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { formatMNT, resolveImage, uploadFile } from "@/lib/api"
import { useLanguage } from "@/context/language-context"
import { AdminLook, LookProduct, measureImage, saveLook } from "@/lib/looks"

interface Dot {
  key: string
  productId: number | null
  x: number
  y: number
}

let seq = 0
const dotKey = () => `dot-${Date.now()}-${seq++}`
const clamp = (n: number) => Math.max(0, Math.min(100, n))
const round = (n: number) => Math.round(n * 10) / 10

interface LookEditorProps {
  open: boolean
  look: AdminLook | null
  products: LookProduct[]
  onOpenChange: (open: boolean) => void
  onSaved: (look: AdminLook, created: boolean) => void
}

/**
 * Лук засварлагч:
 *  - зураг чирж оруулах (жинхэнэ харьцаа хэмжигдэнэ)
 *  - зураг дээр дарахад цэг үүсч, бараа сонгох цонх нээгдэнэ
 *  - цэгийг чирж байрлал засах
 *  - нийт үнэ / хямдрал автоматаар
 */
export function LookEditor({ open, look, products, onOpenChange, onSaved }: LookEditorProps) {
  const { t } = useLanguage()
  const e = t.looks.editor

  const [title, setTitle] = useState({ mn: "", en: "", ko: "" })
  const [image, setImage] = useState<{ url: string; width?: number; height?: number } | null>(null)
  const [dots, setDots] = useState<Dot[]>([])
  const [discount, setDiscount] = useState("0")
  const [published, setPublished] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [picker, setPicker] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [initial, setInitial] = useState("")

  const frameRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const drag = useRef<{ key: string; moved: boolean } | null>(null)

  const snap = (v: { title: typeof title; imageUrl: string | null; dots: Pick<Dot, "productId" | "x" | "y">[]; discount: string; published: boolean }) =>
    JSON.stringify([v.title, v.imageUrl, v.dots.map((d) => [d.productId, d.x, d.y]), Number(v.discount) || 0, v.published])

  useEffect(() => {
    if (!open) return
    setTitle({ mn: look?.title ?? "", en: look?.translations?.en?.title ?? "", ko: look?.translations?.ko?.title ?? "" })
    setImage(look ? { url: look.imageUrl, width: look.imageWidth ?? undefined, height: look.imageHeight ?? undefined } : null)
    setDots((look?.items ?? []).map((i) => ({ key: dotKey(), productId: i.productId, x: i.x, y: i.y })))
    setDiscount(String(look?.bundleDiscountPercent ?? 0))
    setPublished(look?.isPublished ?? false)
    setInitial(
      snap({
        title: { mn: look?.title ?? "", en: look?.translations?.en?.title ?? "", ko: look?.translations?.ko?.title ?? "" },
        imageUrl: look?.imageUrl ?? null,
        dots: look?.items ?? [],
        discount: String(look?.bundleDiscountPercent ?? 0),
        published: look?.isPublished ?? false,
      }),
    )
    setSelected(null)
    setPicker(null)
    setError(null)
    setSaving(false)
  }, [open, look])

  const dirty = open && initial !== "" && snap({ title, imageUrl: image?.url ?? null, dots, discount, published }) !== initial

  const byId = useMemo(() => new Map(products.map((p) => [Number(p.id), p])), [products])
  const total = dots.reduce((s, d) => s + (d.productId ? byId.get(d.productId)?.price ?? 0 : 0), 0)
  const pct = Math.min(50, Math.max(0, Number(discount) || 0))
  const discountValue = Math.round((total * pct) / 100)

  // ── Зураг ──
  const handleFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return
    setUploading(true)
    setError(null)
    try {
      const local = URL.createObjectURL(file)
      const dims = await measureImage(local)
      URL.revokeObjectURL(local)
      const res = await uploadFile(file, "assets")
      setImage({ url: res.url, width: dims?.width, height: dims?.height })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
    }
  }

  // Хуучин (seed) зурагт хэмжээ байхгүй бол хэмжиж авна
  useEffect(() => {
    if (image && (!image.width || !image.height)) {
      void measureImage(resolveImage(image.url)).then((d) => d && setImage((im) => (im ? { ...im, ...d } : im)))
    }
  }, [image])

  // ── Цэг ──
  const pointToPct = (clientX: number, clientY: number) => {
    const r = frameRef.current!.getBoundingClientRect()
    return { x: round(clamp(((clientX - r.left) / r.width) * 100)), y: round(clamp(((clientY - r.top) / r.height) * 100)) }
  }

  const onFrameClick = (ev: React.MouseEvent) => {
    if (!image || drag.current) return
    if ((ev.target as HTMLElement).closest("[data-dot],[data-picker]")) return
    const { x, y } = pointToPct(ev.clientX, ev.clientY)
    const key = dotKey()
    setDots((d) => [...d, { key, productId: null, x, y }])
    setSelected(key)
    setPicker(key)
    setQuery("")
  }

  const onDotPointerDown = (ev: React.PointerEvent, key: string) => {
    ev.stopPropagation()
    ;(ev.target as HTMLElement).setPointerCapture(ev.pointerId)
    drag.current = { key, moved: false }
    setSelected(key)
  }
  const onDotPointerMove = (ev: React.PointerEvent) => {
    if (!drag.current) return
    drag.current.moved = true
    const { x, y } = pointToPct(ev.clientX, ev.clientY)
    const k = drag.current.key
    setDots((d) => d.map((dot) => (dot.key === k ? { ...dot, x, y } : dot)))
  }
  const onDotPointerUp = (key: string) => {
    const wasDrag = drag.current?.moved
    setTimeout(() => { drag.current = null }, 0)
    if (!wasDrag) {
      setPicker((p) => (p === key ? null : key))
      setQuery("")
    }
  }

  const choose = (key: string, productId: number) => {
    setDots((d) => d.map((dot) => (dot.key === key ? { ...dot, productId } : dot)))
    setPicker(null)
  }
  const removeDot = (key: string) => {
    setDots((d) => d.filter((x) => x.key !== key))
    if (picker === key) setPicker(null)
  }

  const nudge = (ev: React.KeyboardEvent, key: string) => {
    const step = ev.shiftKey ? 5 : 0.5
    const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    if (ev.key === "Delete" || ev.key === "Backspace") { ev.preventDefault(); removeDot(key); return }
    const d = delta[ev.key]
    if (!d) return
    ev.preventDefault()
    setDots((ds) => ds.map((dot) => (dot.key === key ? { ...dot, x: round(clamp(dot.x + d[0])), y: round(clamp(dot.y + d[1])) } : dot)))
  }

  const filtered = products.filter((p) => !query.trim() || p.name.toLowerCase().includes(query.toLowerCase()) || p.slug.includes(query.toLowerCase()))
  const usedIds = new Set(dots.map((d) => d.productId).filter(Boolean))

  // ── Хадгалах ──
  const requestClose = (next: boolean) => {
    if (!next && dirty && !saving && !window.confirm(t.common.unsaved)) return
    onOpenChange(next)
  }

  const submit = async () => {
    if (!title.mn.trim()) return setError(e.errors.title)
    if (!image) return setError(e.errors.image)
    if (dots.some((d) => !d.productId)) return setError(e.errors.product)
    if (new Set(dots.map((d) => d.productId)).size !== dots.length) return setError(e.errors.duplicate)
    setSaving(true)
    setError(null)
    try {
      const translations: Record<string, { title: string }> = {}
      if (title.en.trim()) translations.en = { title: title.en.trim() }
      if (title.ko.trim()) translations.ko = { title: title.ko.trim() }
      const saved = await saveLook({
        ...(look ? { id: Number(look.id) } : {}),
        title: title.mn.trim(),
        translations: Object.keys(translations).length ? translations : null,
        imageUrl: image.url,
        ...(image.width && image.height ? { imageWidth: image.width, imageHeight: image.height } : {}),
        bundleDiscountPercent: pct,
        isPublished: published,
        items: dots.map((d) => ({ productId: d.productId!, x: d.x, y: d.y })),
      })
      onSaved(saved, !look)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const ratio = image?.width && image?.height ? image.width / image.height : 0.75

  return (
    <Sheet open={open} onOpenChange={requestClose}>
      <SheetContent side="right" className="w-full sm:max-w-[1180px] p-0 gap-0 rounded-none">
        <SheetHeader className="p-5 pb-4 border-b border-border">
          <SheetTitle>{look ? e.editTitle : e.createTitle}</SheetTitle>
          <SheetDescription>{e.canvasHint}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto lg:overflow-hidden grid lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* ── Canvas ── */}
          <div className="bg-muted/40 flex items-center justify-center p-4 lg:p-6 min-h-[360px] lg:overflow-auto">
            {!image ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(ev) => { ev.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(ev) => { ev.preventDefault(); setDragOver(false); void handleFile(ev.dataTransfer.files[0]) }}
                className={cn("w-full max-w-md aspect-[4/5] border-2 border-dashed flex flex-col items-center justify-center gap-3 p-6 text-center transition-colors", dragOver ? "border-lime bg-lime/5" : "border-border hover:border-muted-foreground")}
              >
                {uploading ? <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /> : <ImagePlus className="w-7 h-7 text-muted-foreground" />}
                <p className="text-sm">{uploading ? t.content.image.uploading : e.dropImage}</p>
                <p className="text-xs text-muted-foreground max-w-xs">{e.dropNote}</p>
              </button>
            ) : (
              <div
                ref={frameRef}
                onClick={onFrameClick}
                onDragOver={(ev) => ev.preventDefault()}
                onDrop={(ev) => { ev.preventDefault(); void handleFile(ev.dataTransfer.files[0]) }}
                className="relative select-none cursor-crosshair shadow-xl"
                style={{ aspectRatio: String(ratio), width: `min(100%, calc((100vh - 220px) * ${ratio}))` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveImage(image.url)} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                {dots.map((d, i) => {
                  const product = d.productId ? byId.get(d.productId) : null
                  return (
                    <div key={d.key} className="absolute" style={{ left: `${d.x}%`, top: `${d.y}%` }}>
                      <button
                        type="button"
                        data-dot
                        onPointerDown={(ev) => onDotPointerDown(ev, d.key)}
                        onPointerMove={onDotPointerMove}
                        onPointerUp={() => onDotPointerUp(d.key)}
                        onKeyDown={(ev) => nudge(ev, d.key)}
                        className={cn(
                          "absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 text-xs font-mono font-semibold flex items-center justify-center cursor-grab active:cursor-grabbing touch-none transition-[box-shadow,background-color]",
                          selected === d.key ? "bg-lime text-black border-lime ring-4 ring-lime/30" : product ? "bg-black/70 text-white border-white" : "bg-destructive text-white border-white animate-pulse",
                        )}
                        aria-label={product?.name ?? e.pickProduct}
                      >
                        {i + 1}
                      </button>
                      {picker === d.key && (
                        <div
                          data-picker
                          onClick={(ev) => ev.stopPropagation()}
                          className={cn("absolute z-20 w-72 bg-popover text-popover-foreground border border-border shadow-2xl", d.x > 60 ? "right-6" : "left-6", d.y > 55 ? "bottom-0" : "top-0")}
                        >
                          <div className="flex items-center gap-2 p-2 border-b border-border">
                            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <input autoFocus value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder={e.searchProduct} className="flex-1 bg-transparent text-sm outline-none" />
                            <button type="button" onClick={() => setPicker(null)} aria-label={t.common.close}><X className="w-3.5 h-3.5" /></button>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {filtered.map((p) => {
                              const taken = usedIds.has(Number(p.id)) && d.productId !== Number(p.id)
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  disabled={taken}
                                  onClick={() => choose(d.key, Number(p.id))}
                                  className={cn("w-full flex items-center gap-2.5 px-2 py-1.5 text-left hover:bg-surface-hover disabled:opacity-35", d.productId === Number(p.id) && "bg-lime/10")}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={resolveImage(p.mainImage)} alt="" className="w-8 h-10 object-cover bg-muted shrink-0" />
                                  <span className="flex-1 min-w-0">
                                    <span className="block text-sm truncate">{p.name}</span>
                                    <span className="block text-[11px] font-mono text-muted-foreground">
                                      {formatMNT(p.price)}{p.status !== "ACTIVE" && ` · ${e.inactive}`}
                                    </span>
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                          <button type="button" onClick={() => removeDot(d.key)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive border-t border-border hover:bg-destructive/10">
                            <Trash2 className="w-3.5 h-3.5" /> {e.remove}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(ev) => { void handleFile(ev.target.files?.[0]); ev.target.value = "" }} />
          </div>

          {/* ── Panel ── */}
          <div className="border-l border-border flex flex-col lg:overflow-y-auto">
            <div className="p-5 space-y-4">
              {error && <p role="alert" className="text-sm text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">{error}</p>}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="lk-mn">{e.titleMn} *</Label>
                  <Input id="lk-mn" value={title.mn} onChange={(ev) => setTitle({ ...title, mn: ev.target.value })} placeholder="LOOK 004 — ..." className="mt-1.5 rounded-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="lk-en">{e.titleEn}</Label>
                    <Input id="lk-en" value={title.en} onChange={(ev) => setTitle({ ...title, en: ev.target.value })} className="mt-1.5 rounded-none" />
                  </div>
                  <div>
                    <Label htmlFor="lk-ko">{e.titleKo}</Label>
                    <Input id="lk-ko" value={title.ko} onChange={(ev) => setTitle({ ...title, ko: ev.target.value })} className="mt-1.5 rounded-none" />
                  </div>
                </div>
              </div>

              {image && (
                <button type="button" onClick={() => fileRef.current?.click()} className="w-full h-9 text-sm border border-border hover:bg-surface-hover flex items-center justify-center gap-2">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />} {e.replace}
                </button>
              )}

              <label className="flex items-center justify-between gap-3 h-10 px-3 border border-border cursor-pointer">
                <span className="text-sm">{e.publish}</span>
                <Switch checked={published} onCheckedChange={setPublished} />
              </label>

              <div>
                <Label htmlFor="lk-disc">{e.discount}</Label>
                <Input id="lk-disc" inputMode="numeric" value={discount} onChange={(ev) => setDiscount(ev.target.value.replace(/[^0-9.]/g, ""))} className="mt-1.5 rounded-none font-mono w-28" />
                <p className="text-[11px] text-muted-foreground mt-1">{e.discountHint}</p>
              </div>
            </div>

            <div className="border-t border-border">
              <p className="px-5 pt-4 pb-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">{e.pieces} · {dots.length}</p>
              {dots.length === 0 ? (
                <p className="px-5 pb-4 text-sm text-muted-foreground">{e.noPieces}</p>
              ) : (
                <ol>
                  {dots.map((d, i) => {
                    const p = d.productId ? byId.get(d.productId) : null
                    return (
                      <li
                        key={d.key}
                        onMouseEnter={() => setSelected(d.key)}
                        className={cn("flex items-center gap-3 px-5 py-2 border-t border-border cursor-pointer", selected === d.key && "bg-lime/5")}
                        onClick={() => { setSelected(d.key); setPicker(d.key); setQuery("") }}
                      >
                        <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono shrink-0", selected === d.key ? "bg-lime text-black" : "bg-muted")}>{i + 1}</span>
                        {p ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={resolveImage(p.mainImage)} alt="" className="w-8 h-10 object-cover bg-muted" />
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm truncate">{p.name}</span>
                              <span className="block text-[11px] font-mono text-muted-foreground">x {d.x}% · y {d.y}%</span>
                            </span>
                            <span className="text-sm font-mono">{formatMNT(p.price)}</span>
                          </>
                        ) : (
                          <span className="flex-1 text-sm text-destructive">{e.pickProduct}</span>
                        )}
                        <button type="button" onClick={(ev) => { ev.stopPropagation(); removeDot(d.key) }} aria-label={e.remove} className="p-1 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>

            <div className="mt-auto border-t border-border p-5 space-y-1.5 font-mono text-sm">
              <div className="flex justify-between text-muted-foreground"><span>{e.total}</span><span>{formatMNT(total)}</span></div>
              {pct > 0 && <div className="flex justify-between text-lime"><span>−{pct}%</span><span>−{formatMNT(discountValue)}</span></div>}
              <div className="flex justify-between text-base pt-1.5 border-t border-border"><span>{e.bundle}</span><span>{formatMNT(total - discountValue)}</span></div>
            </div>

            <div className="p-4 border-t border-border flex gap-3 bg-background">
              <button type="button" onClick={() => requestClose(false)} className="flex-1 h-10 text-sm border border-border hover:bg-surface-hover">{t.common.cancel}</button>
              <button type="button" onClick={() => void submit()} disabled={saving || uploading} className="flex-1 h-10 text-sm bg-lime text-background font-medium hover:bg-lime/90 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? t.common.saving : t.common.save}
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
