"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"
import { useLanguage } from "./language-context"
import { gql } from "@/lib/api"
import { relativeTime } from "@/lib/relative-time"

/**
 * Dashboard state — өмнө нь mock өгөгдөлтэй байсан бол одоо kueneere-api-аас
 * (campaigns, marketingMetrics, budgetOverview, audienceSegments) уншина.
 * Хуудсуудын ашигладаг интерфейс (useDashboard) хэвээр.
 */

// Types
export type CampaignStatus = "live" | "paused" | "scheduled" | "ended"

export interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  roas: number
  channel: string
  lastUpdated: string
  startDate?: Date
  endDate?: Date
  progress?: number
  budget?: number
}

export interface AudienceSegment {
  id: string
  name: string
  size: number
  growth: number
  engagement: number
  ltv: number
  engagementLevel: "high" | "medium" | "low"
}

export interface BudgetItem {
  id: string
  channel: string
  allocated: number
  spent: number
}

export interface BudgetTransaction {
  id: string
  description: string
  amount: number
  channel: string | null
  occurredAt: string
}

export interface Notification {
  id: string
  title: string
  message: string
  type: "success" | "warning" | "error" | "info"
  timestamp: Date
}

interface Metrics {
  totalImpressions: number
  activeROAS: number
  conversionRate: number
  totalClicks: number
  totalSpend: number
  totalRevenue: number
  ctr: number
  liveCampaigns: number
}

interface DashboardState {
  campaigns: Campaign[]
  selectedCampaignId: string | null
  totalBudget: number
  dailyBudget: number
  totalSpent: number
  channelBudgets: BudgetItem[]
  transactions: BudgetTransaction[]
  audienceSegments: AudienceSegment[]
  notifications: Notification[]
  isLoading: boolean
  error: string | null
  metrics: Metrics
}

interface DashboardContextType extends DashboardState {
  addCampaign: (campaign: Omit<Campaign, "id" | "lastUpdated" | "clicks" | "conversions" | "revenue" | "roas"> & Partial<Campaign>) => Promise<void>
  updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>
  deleteCampaign: (id: string) => Promise<void>
  toggleCampaignStatus: (id: string) => Promise<void>
  selectCampaign: (id: string | null) => void

  updateBudget: (totalBudget: number, dailyBudget: number) => Promise<void>
  topUpBudget: (amount: number) => Promise<void>
  updateChannelBudget: (channel: string, allocated: number) => Promise<void>
  addSpend: (channel: string, amount: number) => Promise<void>

  addNotification: (notification: Omit<Notification, "id" | "timestamp">) => void
  dismissNotification: (id: string) => void

  refreshMetrics: () => Promise<void>
  reload: () => Promise<void>
}

// ── GraphQL ──────────────────────────────────────────
const DASHBOARD_QUERY = `
  query Dashboard {
    campaigns(paging: { limit: 200 }, sorting: [{ field: updatedAt, direction: DESC }]) {
      nodes {
        id name status channel budget spend revenue impressions clicks conversions
        startDate endDate updatedAt progress roas
      }
    }
    marketingMetrics {
      totalImpressions totalClicks totalSpend totalRevenue activeROAS ctr conversionRate liveCampaigns
    }
    budgetOverview {
      totalSpent
      settings { totalBudget dailyBudget }
      channels { id channel allocated spent }
      recentTransactions { id description amount channel occurredAt }
    }
    audienceSegments(paging: { limit: 100 }, sorting: [{ field: size, direction: DESC }]) {
      nodes { id name size growth engagement ltv engagementLevel }
    }
  }
`

const METRICS_QUERY = `{ marketingMetrics { totalImpressions totalClicks totalSpend totalRevenue activeROAS ctr conversionRate liveCampaigns } }`

const CAMPAIGN_FIELDS = `id`

interface ApiCampaign {
  id: string
  name: string
  status: string
  channel: string
  budget: number
  spend: number
  revenue: number
  impressions: number
  clicks: number
  conversions: number
  startDate: string | null
  endDate: string | null
  updatedAt: string
  progress: number
  roas: number
}

const parseDate = (s: string | null): Date | undefined => {
  if (!s) return undefined
  const [y, m, d] = s.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d)
}

const toDateString = (d: Date | string | undefined): string | undefined => {
  if (!d) return undefined
  if (typeof d === "string") return d.slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const emptyMetrics: Metrics = {
  totalImpressions: 0,
  activeROAS: 0,
  conversionRate: 0,
  totalClicks: 0,
  totalSpend: 0,
  totalRevenue: 0,
  ctr: 0,
  liveCampaigns: 0,
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { t, locale } = useLanguage()
  const tRef = useRef(t)
  useEffect(() => { tRef.current = t }, [t])

  const [rawCampaigns, setRawCampaigns] = useState<ApiCampaign[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [totalBudget, setTotalBudget] = useState(0)
  const [dailyBudget, setDailyBudget] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)
  const [channelBudgets, setChannelBudgets] = useState<BudgetItem[]>([])
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([])
  const [audienceSegments, setAudienceSegments] = useState<AudienceSegment[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics)

  // ── Notifications ────────────────────────────────
  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp">) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
    }
    setNotifications(prev => [newNotification, ...prev].slice(0, 10))
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id))
    }, 5000)
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const notifyError = useCallback((err: unknown) => {
    addNotification({
      title: tRef.current.common.loadError,
      message: err instanceof Error ? err.message : String(err),
      type: "error",
    })
  }, [addNotification])

  // ── Loading ──────────────────────────────────────
  const reload = useCallback(async () => {
    try {
      const data = await gql<{
        campaigns: { nodes: ApiCampaign[] }
        marketingMetrics: Metrics
        budgetOverview: {
          totalSpent: number
          settings: { totalBudget: number; dailyBudget: number }
          channels: BudgetItem[]
          recentTransactions: BudgetTransaction[]
        }
        audienceSegments: { nodes: AudienceSegment[] }
      }>(DASHBOARD_QUERY)
      setRawCampaigns(data.campaigns.nodes)
      setMetrics(data.marketingMetrics)
      setTotalBudget(data.budgetOverview.settings.totalBudget)
      setDailyBudget(data.budgetOverview.settings.dailyBudget)
      setTotalSpent(data.budgetOverview.totalSpent)
      setChannelBudgets(data.budgetOverview.channels)
      setTransactions(data.budgetOverview.recentTransactions)
      setAudienceSegments(data.audienceSegments.nodes)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  const refreshMetrics = useCallback(async () => {
    try {
      const data = await gql<{ marketingMetrics: Metrics }>(METRICS_QUERY)
      setMetrics(data.marketingMetrics)
    } catch {
      /* дараагийн удаа */
    }
  }, [])

  // Live metrics — 30 сек тутам
  useEffect(() => {
    const interval = setInterval(() => { void refreshMetrics() }, 30000)
    return () => clearInterval(interval)
  }, [refreshMetrics])

  const campaigns: Campaign[] = rawCampaigns.map((c) => ({
    id: String(c.id),
    name: c.name,
    status: c.status.toLowerCase() as CampaignStatus,
    spend: c.spend,
    impressions: c.impressions,
    clicks: c.clicks,
    conversions: c.conversions,
    revenue: c.revenue,
    roas: c.roas,
    channel: c.channel,
    budget: c.budget,
    progress: c.progress,
    startDate: parseDate(c.startDate),
    endDate: parseDate(c.endDate),
    lastUpdated: relativeTime(c.updatedAt, locale),
  }))

  // ── Mutations ────────────────────────────────────
  const run = useCallback(async (fn: () => Promise<unknown>, success?: Omit<Notification, "id" | "timestamp">) => {
    try {
      await fn()
      await reload()
      if (success) addNotification(success)
    } catch (err) {
      notifyError(err)
      throw err
    }
  }, [reload, addNotification, notifyError])

  const addCampaign: DashboardContextType["addCampaign"] = useCallback(async (campaign) => {
    await run(
      () => gql(`mutation($c: CreateCampaignInput!) { createOneCampaign(input: { campaign: $c }) { ${CAMPAIGN_FIELDS} } }`, {
        c: {
          name: campaign.name,
          channel: campaign.channel,
          budget: campaign.budget ?? 0,
          status: (campaign.status ?? "scheduled").toUpperCase(),
          startDate: toDateString(campaign.startDate),
          endDate: toDateString(campaign.endDate),
        },
      }),
      {
        title: tRef.current.notifications.campaignCreated,
        message: tRef.current.notifications.campaignCreatedMsg.replace("{name}", campaign.name),
        type: "success",
      },
    )
  }, [run])

  const updateCampaign = useCallback(async (id: string, updates: Partial<Campaign>) => {
    const update: Record<string, unknown> = {}
    if (updates.name !== undefined) update.name = updates.name
    if (updates.channel !== undefined) update.channel = updates.channel
    if (updates.budget !== undefined) update.budget = Number(updates.budget)
    if (updates.spend !== undefined) update.spend = Number(updates.spend)
    if (updates.status !== undefined) update.status = updates.status.toUpperCase()
    if (updates.startDate !== undefined) update.startDate = toDateString(updates.startDate)
    if (updates.endDate !== undefined) update.endDate = toDateString(updates.endDate)
    if (Object.keys(update).length === 0) return
    await run(() =>
      gql(`mutation($id: ID!, $u: UpdateCampaignInput!) { updateOneCampaign(input: { id: $id, update: $u }) { id } }`, { id, u: update }),
    )
  }, [run])

  const deleteCampaign = useCallback(async (id: string) => {
    const campaign = rawCampaigns.find(c => String(c.id) === id)
    await run(
      () => gql(`mutation($id: ID!) { deleteOneCampaign(input: { id: $id }) { id } }`, { id }),
      campaign && {
        title: tRef.current.notifications.campaignDeleted,
        message: tRef.current.notifications.campaignDeletedMsg.replace("{name}", campaign.name),
        type: "info",
      },
    )
  }, [run, rawCampaigns])

  const toggleCampaignStatus = useCallback(async (id: string) => {
    await run(() => gql(`mutation($id: ID!) { toggleCampaignStatus(id: $id) { id status } }`, { id }))
  }, [run])

  const selectCampaign = useCallback((id: string | null) => {
    setSelectedCampaignId(id)
  }, [])

  const updateBudget = useCallback(async (newTotalBudget: number, newDailyBudget: number) => {
    await run(() =>
      gql(`mutation($i: UpdateBudgetSettingsInput!) { updateBudgetSettings(input: $i) { totalBudget } }`, {
        i: { totalBudget: newTotalBudget, dailyBudget: newDailyBudget },
      }),
    )
  }, [run])

  const topUpBudget = useCallback(async (amount: number) => {
    await run(
      () => gql(`mutation($i: TopUpBudgetInput!) { topUpBudget(input: $i) { totalBudget } }`, { i: { amount } }),
      {
        title: tRef.current.notifications.fundsAdded,
        message: tRef.current.notifications.fundsAddedMsg.replace("${amount}", `$${amount.toLocaleString()}`),
        type: "success",
      },
    )
  }, [run])

  const updateChannelBudget = useCallback(async (channel: string, allocated: number) => {
    const row = channelBudgets.find(b => b.channel === channel)
    await run(() =>
      row
        ? gql(`mutation($id: ID!, $u: UpdateChannelBudgetInput!) { updateOneChannelBudget(input: { id: $id, update: $u }) { id } }`, { id: row.id, u: { allocated } })
        : gql(`mutation($c: CreateChannelBudgetInput!) { createOneChannelBudget(input: { channelBudget: $c }) { id } }`, { c: { channel, allocated } }),
    )
  }, [run, channelBudgets])

  const addSpend = useCallback(async (channel: string, amount: number) => {
    await run(() => gql(`mutation($i: RecordSpendInput!) { recordSpend(input: $i) { id } }`, { i: { channel, amount } }))
  }, [run])

  const value: DashboardContextType = {
    campaigns,
    selectedCampaignId,
    totalBudget,
    dailyBudget,
    totalSpent,
    channelBudgets,
    transactions,
    audienceSegments,
    notifications,
    isLoading,
    error,
    metrics,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    toggleCampaignStatus,
    selectCampaign,
    updateBudget,
    topUpBudget,
    updateChannelBudget,
    addSpend,
    addNotification,
    dismissNotification,
    refreshMetrics,
    reload,
  }

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

const noopAsync = async () => {}

// Default values for when context is not available (SSR/build time)
const defaultContextValue: DashboardContextType = {
  campaigns: [],
  selectedCampaignId: null,
  totalBudget: 0,
  dailyBudget: 0,
  totalSpent: 0,
  channelBudgets: [],
  transactions: [],
  audienceSegments: [],
  notifications: [],
  isLoading: true,
  error: null,
  metrics: emptyMetrics,
  addCampaign: noopAsync,
  updateCampaign: noopAsync,
  deleteCampaign: noopAsync,
  toggleCampaignStatus: noopAsync,
  selectCampaign: () => {},
  updateBudget: noopAsync,
  topUpBudget: noopAsync,
  updateChannelBudget: noopAsync,
  addSpend: noopAsync,
  addNotification: () => {},
  dismissNotification: () => {},
  refreshMetrics: noopAsync,
  reload: noopAsync,
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    return defaultContextValue
  }
  return context
}
