import { gql } from "@/lib/api"

export interface LookProduct {
  id: string
  name: string
  slug: string
  price: number
  status: "ACTIVE" | "DRAFT" | "ARCHIVED"
  mainImage: string | null
}

export interface AdminLook {
  id: string
  title: string
  translations: Partial<Record<"en" | "ko", { title?: string }>> | null
  imageUrl: string
  imageWidth: number | null
  imageHeight: number | null
  bundleDiscountPercent: number
  isPublished: boolean
  position: number
  updatedAt: string
  pricing: { total: number; discount: number; bundlePrice: number }
  items: { id: string; productId: number; x: number; y: number; product: LookProduct | null }[]
}

const LOOK_FIELDS = `
  id title translations imageUrl imageWidth imageHeight bundleDiscountPercent isPublished position updatedAt
  pricing { total discount bundlePrice }
  items { id productId x y product { id name slug price status mainImage } }
`

export async function fetchLooks(): Promise<AdminLook[]> {
  const d = await gql<{ looks: AdminLook[] }>(`{ looks { ${LOOK_FIELDS} } }`)
  return d.looks
}

export async function fetchLookProducts(): Promise<LookProduct[]> {
  const d = await gql<{ products: { nodes: LookProduct[] } }>(
    `{ products(paging: { limit: 500 }, sorting: [{ field: position, direction: ASC }]) { nodes { id name slug price status mainImage } } }`,
  )
  return d.products.nodes
}

export interface SaveLookPayload {
  id?: number
  title: string
  translations: Record<string, { title: string }> | null
  imageUrl: string
  imageWidth?: number
  imageHeight?: number
  bundleDiscountPercent: number
  isPublished: boolean
  items: { productId: number; x: number; y: number }[]
}

export async function saveLook(input: SaveLookPayload): Promise<AdminLook> {
  const d = await gql<{ saveLook: AdminLook }>(
    `mutation($i: SaveLookInput!) { saveLook(input: $i) { ${LOOK_FIELDS} } }`,
    { i: input },
  )
  return d.saveLook
}

export async function deleteLook(id: string): Promise<void> {
  await gql(`mutation($id: ID!) { deleteLook(id: $id) }`, { id })
}

export async function reorderLooks(ids: number[]): Promise<AdminLook[]> {
  const d = await gql<{ reorderLooks: AdminLook[] }>(
    `mutation($ids: [Int!]!) { reorderLooks(ids: $ids) { ${LOOK_FIELDS} } }`,
    { ids },
  )
  return d.reorderLooks
}

/** Зургийн жинхэнэ хэмжээ (цэгийн % зөв байхын тулд) */
export function measureImage(src: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve(null)
    img.src = src
  })
}
