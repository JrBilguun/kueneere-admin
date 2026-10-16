import { gql } from "@/lib/api"

export type ProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED"
export const PRODUCT_STATUSES: ProductStatus[] = ["ACTIVE", "DRAFT", "ARCHIVED"]

export type TranslationLang = "en" | "ko"
export const TRANSLATION_FIELDS = ["name", "color", "fitNote", "details", "care"] as const
export type TranslationField = (typeof TRANSLATION_FIELDS)[number]
export type Translations = Partial<Record<TranslationLang, Partial<Record<TranslationField, string>>>>

export interface ProductImage {
  id?: string
  imageUrl: string
  alt?: string | null
  position?: number
}

export interface ProductVariant {
  id: string
  size: string
  color: string
  sku: string | null
  stock: number
  price: number | null
  position: number
}

export interface Category {
  id: string
  name: string
  slug: string
  position: number
  isActive: boolean
  translations: Partial<Record<TranslationLang, { name?: string }>> | null
}

export interface AdminProduct {
  id: string
  name: string
  slug: string
  price: number
  compareAtPrice: number | null
  currency: string
  status: ProductStatus
  isFeatured: boolean
  position: number
  dropName: string | null
  color: string | null
  colorHex: string | null
  mainImage: string | null
  description: string | null
  details: string | null
  care: string | null
  fitNote: string | null
  translations: Translations | null
  categoryId: number | null
  createdAt: string
  updatedAt: string
  category: { id: string; name: string } | null
  images: ProductImage[]
  variants: ProductVariant[]
}

const PRODUCT_FIELDS = `
  id name slug price compareAtPrice currency status isFeatured position dropName
  color colorHex mainImage description details care fitNote translations categoryId
  createdAt updatedAt
  category { id name }
  images { id imageUrl alt position }
  variants { id size color sku stock price position }
`

const CATEGORY_FIELDS = `id name slug position isActive translations`

export async function fetchCatalog(): Promise<{ products: AdminProduct[]; categories: Category[] }> {
  const data = await gql<{
    products: { nodes: AdminProduct[] }
    categories: { nodes: Category[] }
  }>(`
    query AdminCatalog {
      products(paging: { limit: 500 }, sorting: [{ field: position, direction: ASC }, { field: createdAt, direction: DESC }]) {
        nodes { ${PRODUCT_FIELDS} }
      }
      categories(paging: { limit: 100 }, sorting: [{ field: position, direction: ASC }]) {
        nodes { ${CATEGORY_FIELDS} }
      }
    }
  `)
  return { products: data.products.nodes, categories: data.categories.nodes }
}

export interface SaveProductPayload {
  id?: number
  name: string
  slug?: string
  categoryId?: number | null
  status: ProductStatus
  isFeatured: boolean
  dropName?: string | null
  price: number
  compareAtPrice?: number | null
  color?: string | null
  colorHex?: string | null
  fitNote?: string | null
  description?: string | null
  details?: string | null
  care?: string | null
  translations?: Translations | null
  images: { imageUrl: string; alt?: string }[]
  variants: { id?: number; size: string; color?: string; sku?: string; stock: number; price?: number }[]
}

export async function saveProduct(input: SaveProductPayload): Promise<AdminProduct> {
  const data = await gql<{ saveProduct: AdminProduct }>(
    `mutation SaveProduct($i: SaveProductInput!) { saveProduct(input: $i) { ${PRODUCT_FIELDS} } }`,
    { i: input },
  )
  return data.saveProduct
}

export async function setProductStatus(id: string, status: ProductStatus): Promise<void> {
  await gql(`mutation($id: ID!, $u: UpdateProductInput!) { updateOneProduct(input: { id: $id, update: $u }) { id } }`, {
    id,
    u: { status },
  })
}

export async function deleteProduct(id: string): Promise<void> {
  await gql(`mutation($id: ID!) { deleteOneProduct(input: { id: $id }) { id } }`, { id })
}

export async function createCategory(name: string, en?: string, ko?: string): Promise<Category> {
  const data = await gql<{ createOneCategory: Category }>(
    `mutation($c: CreateCategoryInput!) { createOneCategory(input: { category: $c }) { ${CATEGORY_FIELDS} } }`,
    { c: { name, translations: buildCategoryTranslations(en, ko) } },
  )
  return data.createOneCategory
}

export async function updateCategory(id: string, name: string, en?: string, ko?: string, position?: number): Promise<void> {
  await gql(`mutation($id: ID!, $u: UpdateCategoryInput!) { updateOneCategory(input: { id: $id, update: $u }) { id } }`, {
    id,
    u: { name, translations: buildCategoryTranslations(en, ko), ...(position !== undefined ? { position } : {}) },
  })
}

export async function deleteCategory(id: string): Promise<void> {
  await gql(`mutation($id: ID!) { deleteOneCategory(input: { id: $id }) { id } }`, { id })
}

function buildCategoryTranslations(en?: string, ko?: string) {
  const t: Record<string, { name: string }> = {}
  if (en?.trim()) t.en = { name: en.trim() }
  if (ko?.trim()) t.ko = { name: ko.trim() }
  return Object.keys(t).length ? t : null
}

export const totalStock = (p: Pick<AdminProduct, "variants">) =>
  p.variants.reduce((s, v) => s + v.stock, 0)

export const LOW_STOCK = 3

export const APPAREL_SIZES = ["XS", "S", "M", "L", "XL"]
