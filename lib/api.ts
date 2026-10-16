/**
 * kueneere-api (GraphQL) клиент.
 *  - access/refresh token-ийг localStorage-д хадгална
 *  - TOKEN_EXPIRED / UNAUTHENTICATED үед refresh хийж нэг удаа дахин оролдоно
 *  - Refresh бүтэлгүйтвэл "kueneere:logout" event цацна (AuthProvider сонсоно)
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003/graphql"
export const API_BASE = API_URL.replace(/\/graphql\/?$/, "")
export const STORE_URL = (
  process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:3000"
).replace(/\/$/, "")

const STORAGE_KEY = "kueneere-admin-auth"
export const LOGOUT_EVENT = "kueneere:logout"

export interface Tokens {
  accessToken: string
  refreshToken: string
}

export function getTokens(): Tokens | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Tokens) : null
  } catch {
    return null
  }
}

export function setTokens(tokens: Tokens | null) {
  try {
    if (tokens) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* private mode */
  }
}

export class ApiError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

interface GqlResponse<T> {
  data?: T
  errors?: { message: string; extensions?: { code?: string } }[]
}

async function rawRequest<T>(
  query: string,
  variables: Record<string, unknown> | undefined,
  token?: string,
): Promise<GqlResponse<T>> {
  let res: Response
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    })
  } catch {
    throw new ApiError(
      "API-тай холбогдож чадсангүй. kueneere-api асаалттай эсэхийг шалгана уу.",
      "NETWORK",
    )
  }
  return (await res.json()) as GqlResponse<T>
}

let refreshing: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  const tokens = getTokens()
  if (!tokens?.refreshToken) return false
  refreshing ??= (async () => {
    const r = await rawRequest<{ refreshToken: Tokens }>(
      `mutation($t: String!) { refreshToken(input: { refreshToken: $t }) { accessToken refreshToken } }`,
      { t: tokens.refreshToken },
    ).catch(() => null)
    const next = r?.data?.refreshToken
    if (next) setTokens(next)
    return !!next
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

const AUTH_CODES = new Set(["TOKEN_EXPIRED", "UNAUTHENTICATED"])

export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  let json = await rawRequest<T>(query, variables, getTokens()?.accessToken)
  let code = json.errors?.[0]?.extensions?.code

  if (code && AUTH_CODES.has(code) && getTokens()) {
    if (await tryRefresh()) {
      json = await rawRequest<T>(query, variables, getTokens()?.accessToken)
      code = json.errors?.[0]?.extensions?.code
    }
    if (code && AUTH_CODES.has(code)) {
      setTokens(null)
      window.dispatchEvent(new Event(LOGOUT_EVENT))
    }
  }

  if (json.errors?.length) {
    const e = json.errors[0]
    throw new ApiError(e.message, e.extensions?.code)
  }
  return json.data as T
}

/** POST /uploads — S3 эсвэл серверийн диск рүү файл оруулна */
export async function uploadFile(
  file: File,
  folder = "products",
): Promise<{ url: string; key: string }> {
  const send = () => {
    const body = new FormData()
    body.append("file", file)
    body.append("folder", folder)
    return fetch(`${API_BASE}/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getTokens()?.accessToken ?? ""}` },
      body,
    })
  }
  let res = await send()
  if (res.status === 401 && (await tryRefresh())) res = await send()
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = Array.isArray(json.message) ? json.message[0] : json.message
    throw new ApiError(msg || `Upload алдаа (${res.status})`)
  }
  return json
}

/**
 * Зургийн хаягийг бүрэн URL болгоно:
 *   http(s)://…      → хэвээр
 *   /uploads/…       → API сервер дээр
 *   /images/…        → kueneree (дэлгүүр)-ийн public хавтас
 */
export function resolveImage(url?: string | null): string {
  if (!url) return "/placeholder.svg"
  if (/^(https?:|data:|blob:)/.test(url)) return url
  if (url.startsWith("/uploads/")) return `${API_BASE}${url}`
  return `${STORE_URL}${url.startsWith("/") ? "" : "/"}${url}`
}

export function formatMNT(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—"
  return `₮${Math.round(value).toLocaleString("en-US")}`
}
