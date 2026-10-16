"use client"

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight, ImagePlus, Link2, Loader2, Star, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { resolveImage, uploadFile } from "@/lib/api"
import { useLanguage } from "@/context/language-context"

export interface EditableImage {
  key: string
  imageUrl: string
  alt?: string
}

interface ImageManagerProps {
  images: EditableImage[]
  onChange: (images: EditableImage[]) => void
  onError: (message: string) => void
}

let seq = 0
export const imageKey = () => `img-${Date.now()}-${seq++}`

/** Барааны зургууд: upload (drag & drop), URL-аар нэмэх, дараалал, нүүр зураг */
export function ImageManager({ images, onChange, onError }: ImageManagerProps) {
  const { t } = useLanguage()
  const e = t.products.editor
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [url, setUrl] = useState("")

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"))
    if (!list.length) return
    setUploading((n) => n + list.length)
    let current = images
    for (const file of list) {
      try {
        const res = await uploadFile(file, "products")
        current = [...current, { key: imageKey(), imageUrl: res.url }]
        onChange(current)
      } catch (err) {
        onError(`${e.errors.uploadFailed}: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setUploading((n) => n - 1)
      }
    }
  }

  const move = (index: number, dir: -1 | 1) => {
    const next = [...images]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const makeCover = (index: number) => {
    const next = [...images]
    const [img] = next.splice(index, 1)
    onChange([img, ...next])
  }

  const addUrl = () => {
    const v = url.trim()
    if (!v) return
    onChange([...images, { key: imageKey(), imageUrl: v }])
    setUrl("")
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {images.map((img, i) => (
          <div key={img.key} className={cn("relative group aspect-[4/5] bg-muted border overflow-hidden", i === 0 ? "border-lime" : "border-border")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveImage(img.imageUrl)} alt="" className="w-full h-full object-cover" />
            {i === 0 && (
              <span className="absolute top-1.5 left-1.5 bg-lime text-background text-[10px] font-mono px-1.5 py-0.5 uppercase">
                {e.cover}
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-background/85 backdrop-blur-sm opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <button type="button" title={e.moveLeft} aria-label={e.moveLeft} onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 hover:text-lime disabled:opacity-30">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {i !== 0 && (
                <button type="button" title={e.makeCover} aria-label={e.makeCover} onClick={() => makeCover(i)} className="p-1.5 hover:text-lime">
                  <Star className="w-3.5 h-3.5" />
                </button>
              )}
              <button type="button" title={e.remove} aria-label={e.remove} onClick={() => onChange(images.filter((x) => x.key !== img.key))} className="p-1.5 hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button type="button" title={e.moveRight} aria-label={e.moveRight} onClick={() => move(i, 1)} disabled={i === images.length - 1} className="p-1.5 hover:text-lime disabled:opacity-30">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {Array.from({ length: uploading }).map((_, i) => (
          <div key={`up-${i}`} className="aspect-[4/5] border border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[10px] font-mono">{e.uploading}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(ev) => { ev.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(ev) => {
          ev.preventDefault()
          setDragOver(false)
          void handleFiles(ev.dataTransfer.files)
        }}
        className={cn(
          "w-full border-2 border-dashed p-6 text-center transition-colors",
          dragOver ? "border-lime bg-lime/5" : "border-border hover:border-muted-foreground",
        )}
      >
        <ImagePlus className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm">{e.dropzone}</p>
        <p className="text-xs text-muted-foreground mt-1">{e.dropzoneNote}</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple
        hidden
        onChange={(ev) => {
          if (ev.target.files) void handleFiles(ev.target.files)
          ev.target.value = ""
        }}
      />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={url}
            onChange={(ev) => setUrl(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); addUrl() } }}
            placeholder={e.urlPlaceholder}
            className="w-full h-9 pl-9 pr-3 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-lime"
          />
        </div>
        <button type="button" onClick={addUrl} className="h-9 px-3 text-sm border border-border hover:bg-surface-hover">
          {e.addUrl}
        </button>
      </div>
    </div>
  )
}
