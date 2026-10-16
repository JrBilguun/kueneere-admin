"use client"

import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import { gql, getTokens, setTokens, LOGOUT_EVENT } from "@/lib/api"

export interface AdminUser {
  id: string
  email: string | null
  firstName: string
  lastName: string
  roles: string[]
  avatarUrl: string | null
  lastLoginAt: string | null
}

type Status = "loading" | "authenticated" | "guest"

interface AuthContextType {
  user: AdminUser | null
  status: Status
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  reload: () => Promise<void>
  can: (...roles: string[]) => boolean
}

const USER_FIELDS = `id email firstName lastName roles avatarUrl lastLoginAt`

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [status, setStatus] = useState<Status>("loading")

  const reload = useCallback(async () => {
    if (!getTokens()) {
      setUser(null)
      setStatus("guest")
      return
    }
    try {
      const data = await gql<{ me: AdminUser }>(`{ me { ${USER_FIELDS} } }`)
      setUser(data.me)
      setStatus("authenticated")
    } catch {
      setTokens(null)
      setUser(null)
      setStatus("guest")
    }
  }, [])

  useEffect(() => {
    void reload()
    const onLogout = () => {
      setUser(null)
      setStatus("guest")
    }
    window.addEventListener(LOGOUT_EVENT, onLogout)
    return () => window.removeEventListener(LOGOUT_EVENT, onLogout)
  }, [reload])

  const login = useCallback(async (email: string, password: string) => {
    const data = await gql<{
      adminLogin: { accessToken: string; refreshToken: string; user: AdminUser }
    }>(
      `mutation($i: LoginInput!) { adminLogin(input: $i) { accessToken refreshToken user { ${USER_FIELDS} } } }`,
      { i: { email, password } },
    )
    setTokens({
      accessToken: data.adminLogin.accessToken,
      refreshToken: data.adminLogin.refreshToken,
    })
    setUser(data.adminLogin.user)
    setStatus("authenticated")
  }, [])

  const logout = useCallback(() => {
    setTokens(null)
    setUser(null)
    setStatus("guest")
  }, [])

  const can = useCallback(
    (...roles: string[]) =>
      !!user && (user.roles.includes("admin") || roles.some((r) => user.roles.includes(r))),
    [user],
  )

  return (
    <AuthContext.Provider value={{ user, status, login, logout, reload, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
