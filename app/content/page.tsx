"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, ExternalLink, ImagePlus, Loader2, PanelsTopLeft, RefreshCw, Trash2 } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { gql, resolveImage, STORE_URL, uploadFile } from "@/lib/api"
import { useDashboard } from "@/context/dashboard-context"
import { useLanguage } from "@/context/language-context"
import { useAuth } from "@/context/auth-context"

type Lang = "mn" | "en" | "ko"
const LANGS: Lang[] = ["mn", "en", "ko"]
type SectionKey = "hero" | "ticker" | "campaign" | "community" | "newsletter"
type Data = Record<string, unknown> & { i18n?: Partial<Record<Lang, Record<string, string>>> }
const EMPTY: Data = {}

interface FieldDef {
  name: string
  label: string
  type?: "text" | "image" | "multiline"
}

/* ───────── Зураг сонгох талбар ───────── */
function ImageField({ label, value, onChange, onError }: { label: string; value: string; onChange: (v: string) => void; onError: (m: string) => void }) {
  const { t } = useLanguage()
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const pick = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      onChange((await uploadFile(file, "assets")).url)
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 flex gap-3">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); void pick(e.dataTransfer.files[0]) }}
          className="relative w-28 h-36 shrink-0 bg-muted border border-border overflow-hidden group"
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveImage(value)} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus className="w-5 h-5 m-auto text-muted-foreground absolute inset-0" />
          )}
          <span className="absolute inset-0 bg-background/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs transition-opacity">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t.content.image.upload}
          </span>
          {busy && <span className="absolute inset-0 bg-background/70 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin" /></span>}
        </button>
        <div className="flex-1 min-w-0 space-y-2">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={t.content.image.url} className="rounded-none font-mono text-xs" />
          <div className="flex gap-2">
            <button type="button" onClick={() => ref.current?.click()} className="h-8 px-3 text-xs border border-border hover:bg-surface-hover flex items-center gap-1.5">
              <ImagePlus className="w-3.5 h-3.5" /> {t.content.image.upload}
            </button>
            {value && (
              <button type="button" onClick={() => onChange("")} className="h-8 px-3 text-xs border border-border text-muted-foreground hover:text-destructive flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> {t.content.image.remove}
              </button>
            )}
          </div>
        </div>
        <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = "" }} />
      </div>
    </div>
  )
}

/* ───────── Нэг хэсэг ───────── */
function SectionCard({
  sectionKey, title, desc, fields, i18nFields, initial, onSaved, canWrite, preview,
}: {
  sectionKey: SectionKey
  title: string
  desc: string
  fields: FieldDef[]
  i18nFields: FieldDef[]
  initial: Data
  onSaved: (key: SectionKey, data: Data) => void
  canWrite: boolean
  preview?: (data: Data, lang: Lang) => React.ReactNode
}) {
  const { t } = useLanguage()
  const { addNotification } = useDashboard()
  const [data, setData] = useState<Data>(initial)
  const [lang, setLang] = useState<Lang>("mn")
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => setData(initial), [initial])
  const dirty = JSON.stringify(data) !== JSON.stringify(initial)

  const setField = (name: string, value: string) => setData((d) => ({ ...d, [name]: value }))
  const setI18n = (name: string, value: string) =>
    setData((d) => ({ ...d, i18n: { ...(d.i18n ?? {}), [lang]: { ...(d.i18n?.[lang] ?? {}), [name]: value } } }))

  const err = (m: string) => addNotification({ title: t.common.loadError, message: m, type: "error" })

  const save = async () => {
    setSaving(true)
    try {
      await gql(`mutation($k: String!, $d: JSON!) { updateSiteContent(key: $k, data: $d) }`, { k: sectionKey, d: data })
      onSaved(sectionKey, data)
      setSavedAt(Date.now())
      addNotification({ title: t.content.saved, message: title, type: "success" })
    } catch (e) {
      err(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const render = (f: FieldDef, value: string, onChange: (v: string) => void, id: string) =>
    f.type === "image" ? (
      <ImageField key={id} label={f.label} value={value} onChange={onChange} onError={err} />
    ) : (
      <div key={id}>
        <Label htmlFor={id}>{f.label}</Label>
        {f.type === "multiline" ? (
          <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={2} disabled={!canWrite} className="mt-1.5 rounded-none" />
        ) : (
          <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={!canWrite} className="mt-1.5 rounded-none" />
        )}
      </div>
    )

  return (
    <section className="bg-card border border-border">
      <div className="p-4 border-b border-border flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">{title}</h2>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        {canWrite && (
          <button
            onClick={() => void save()}
            disabled={!dirty || saving}
            className={cn("h-9 px-4 text-sm flex items-center gap-2 shrink-0 transition-colors", dirty ? "bg-lime text-background hover:bg-lime/90" : "border border-border text-muted-foreground")}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : !dirty && savedAt ? <Check className="w-4 h-4" /> : null}
            {saving ? t.common.saving : t.content.save}
          </button>
        )}
      </div>
      <div className={cn("p-4 md:p-5 grid gap-6", preview && "lg:grid-cols-[1fr_320px]")}>
        <div className="space-y-4">
          {fields.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              {fields.map((f) => (
                <div key={f.name} className={cn(f.type === "image" && "sm:col-span-2")}>
                  {render(f, String(data[f.name] ?? ""), (v) => setField(f.name, v), `${sectionKey}-${f.name}`)}
                </div>
              ))}
            </div>
          )}
          {i18nFields.length > 0 && (
            <div className="border border-border">
              <div className="flex border-b border-border">
                {LANGS.map((l) => (
                  <button key={l} type="button" onClick={() => setLang(l)} className={cn("px-4 py-2 text-xs font-mono uppercase border-b-2 -mb-px", lang === l ? "border-lime text-foreground" : "border-transparent text-muted-foreground")}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="p-4 space-y-4">
                {i18nFields.map((f) => render(f, data.i18n?.[lang]?.[f.name] ?? "", (v) => setI18n(f.name, v), `${sectionKey}-${lang}-${f.name}`))}
              </div>
            </div>
          )}
        </div>
        {preview && <div>{preview(data, lang)}</div>}
      </div>
    </section>
  )
}

/* ───────── Хуудас ───────── */
function ContentInner() {
  const { t } = useLanguage()
  const c = t.content
  const { can } = useAuth()
  const canWrite = can("manager", "marketer")
  const [content, setContent] = useState<Record<string, Data> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const d = await gql<{ siteContent: Record<string, Data> }>(`{ siteContent }`)
      setContent(d.siteContent ?? {})
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const onSaved = (key: SectionKey, data: Data) => setContent((cur) => ({ ...(cur ?? {}), [key]: data }))

  const heroPreview = (d: Data, lang: Lang) => (
    <div className="sticky top-4">
      <p className="text-[11px] font-mono uppercase text-muted-foreground mb-2">Preview · {lang}</p>
      <div className="relative aspect-[3/4] bg-black overflow-hidden text-white">
        {d.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveImage(String(d.image))} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-[8px] font-mono text-[#c6ff00] tracking-wider">{String(d.eyebrow ?? "")}</p>
          <p className="text-5xl font-black tracking-[-0.09em] leading-[0.8] my-3">
            {String(d.titleLine1 ?? "")}<br /><span className="text-[#c6ff00]">{String(d.titleLine2 ?? "")}</span>
          </p>
          <div className="flex items-end justify-between gap-2">
            <p className="text-[8px] font-mono leading-snug">{String(d.dropLabel ?? "")}<br />{d.i18n?.[lang]?.subtitle}</p>
            <span className="bg-[#c6ff00] text-black text-[8px] font-mono px-2 py-1.5 whitespace-nowrap">{d.i18n?.[lang]?.cta} ↓</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <PanelsTopLeft className="w-4 h-4 text-lime" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{c.badge}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{c.title}</h1>
          <p className="text-muted-foreground mt-1">{c.subtitle}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent" asChild>
          <a href={STORE_URL} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /> {c.preview}</a>
        </Button>
      </div>

      {error ? (
        <div className="bg-card border border-destructive/30 p-8 text-center">
          <p className="text-xs text-muted-foreground font-mono mb-4">{error}</p>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => void load()}><RefreshCw className="w-4 h-4" /> {t.common.retry}</Button>
        </div>
      ) : !content ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-none" />)}</div>
      ) : (
        <div className="space-y-6">
          <SectionCard
            sectionKey="hero" title={c.hero.title} desc={c.hero.desc} canWrite={canWrite} onSaved={onSaved}
            initial={content.hero ?? EMPTY}
            fields={[
              { name: "image", label: c.hero.image, type: "image" },
              { name: "titleLine1", label: c.hero.line1 },
              { name: "titleLine2", label: c.hero.line2 },
              { name: "eyebrow", label: c.hero.eyebrow },
              { name: "dropLabel", label: c.hero.drop },
              { name: "frameLabel", label: c.hero.frame },
            ]}
            i18nFields={[{ name: "subtitle", label: c.hero.subtitle }, { name: "cta", label: c.hero.cta }]}
            preview={heroPreview}
          />
          <SectionCard
            sectionKey="ticker" title={c.ticker.title} desc={c.ticker.desc} canWrite={canWrite} onSaved={onSaved}
            initial={content.ticker ?? EMPTY} fields={[]}
            i18nFields={[{ name: "text", label: c.ticker.text }]}
          />
          <SectionCard
            sectionKey="campaign" title={c.campaign.title} desc={c.campaign.desc} canWrite={canWrite} onSaved={onSaved}
            initial={content.campaign ?? EMPTY}
            fields={[
              { name: "titleLine1", label: c.campaign.line1 },
              { name: "titleLine2", label: c.campaign.line2 },
              { name: "image1", label: c.campaign.image1, type: "image" },
              { name: "image2", label: c.campaign.image2, type: "image" },
            ]}
            i18nFields={[{ name: "date", label: c.campaign.date, type: "multiline" }]}
          />
          <SectionCard
            sectionKey="community" title={c.community.title} desc={c.community.desc} canWrite={canWrite} onSaved={onSaved}
            initial={content.community ?? EMPTY}
            fields={[{ name: "hashtag", label: c.community.hashtag }]}
            i18nFields={[{ name: "text", label: c.community.text }]}
          />
          <SectionCard
            sectionKey="newsletter" title={c.newsletter.title} desc={c.newsletter.desc} canWrite={canWrite} onSaved={onSaved}
            initial={content.newsletter ?? EMPTY} fields={[]}
            i18nFields={[{ name: "heading", label: c.newsletter.heading, type: "multiline" }]}
          />
        </div>
      )}
    </div>
  )
}

export default function ContentPage() {
  return (
    <DashboardLayout>
      <ContentInner />
    </DashboardLayout>
  )
}
