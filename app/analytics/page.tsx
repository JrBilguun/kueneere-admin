"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { PerformanceChart, AttributionRadar, MetricCard } from "@/components/dashboard/analytics-charts"
import { BarChart3, Download, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/language-context"
import { useDashboard } from "@/context/dashboard-context"
import { useEffect, useState } from "react"
import { gql } from "@/lib/api"

interface ChannelRow { channel: string; spend: number; revenue: number; roas: number; conversions: number; clicks: number; impressions: number }

// Mock performance data
const performanceData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - (29 - i))
  return {
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    roas: 3.2 + Math.random() * 1.5 + (i * 0.02),
    spend: 8000 + Math.random() * 4000 + (i * 100),
  }
})

// Attribution data
const attributionData = [
  { channel: "Meta Ads", value: 85, fullMark: 100 },
  { channel: "Google Ads", value: 72, fullMark: 100 },
  { channel: "TikTok", value: 58, fullMark: 100 },
  { channel: "YouTube", value: 45, fullMark: 100 },
  { channel: "Email", value: 68, fullMark: 100 },
  { channel: "Organic", value: 52, fullMark: 100 },
]

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(0)
}

function PerformanceEngineInner() {
  const { t } = useLanguage()
  const { metrics: m, audienceSegments } = useDashboard()
  const [channelBreakdown, setChannelBreakdown] = useState<(ChannelRow & { name: string })[]>([])

  useEffect(() => {
    gql<{ channelPerformance: ChannelRow[] }>(
      `{ channelPerformance { channel spend revenue roas conversions clicks impressions } }`,
    )
      .then((d) => setChannelBreakdown(d.channelPerformance.map((c) => ({ ...c, name: c.channel }))))
      .catch(() => setChannelBreakdown([]))
  }, [])

  const totalConversions = channelBreakdown.reduce((s, c) => s + c.conversions, 0)
  const cpa = totalConversions > 0 ? m.totalSpend / totalConversions : 0
  const avgLtv = audienceSegments.length
    ? audienceSegments.reduce((s, a) => s + a.ltv, 0) / audienceSegments.length
    : 0

  const metrics = [
    { title: t.analytics.metrics.avgRoas, value: `${m.activeROAS.toFixed(1)}x`, change: 12.5, detail: t.analytics.metrics.avgRoasDetail },
    { title: t.analytics.metrics.totalRevenue, value: `$${compact(m.totalRevenue)}`, change: 18.3, detail: t.analytics.metrics.totalRevenueDetail },
    { title: t.analytics.metrics.cpa, value: `$${cpa.toFixed(2)}`, change: -8.2, detail: t.analytics.metrics.cpaDetail },
    { title: t.analytics.metrics.ctr, value: `${m.ctr.toFixed(1)}%`, change: 5.4, detail: t.analytics.metrics.ctrDetail },
    { title: t.analytics.metrics.convRate, value: `${m.conversionRate.toFixed(1)}%`, change: -2.1, detail: t.analytics.metrics.convRateDetail },
    { title: t.analytics.metrics.ltv, value: `₮${compact(avgLtv)}`, change: 22.8, detail: t.analytics.metrics.ltvDetail },
  ]

  return (
      <div className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 md:mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-4 h-4 text-lime" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                {t.analytics.badge}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{t.analytics.title}</h1>
            <p className="text-muted-foreground mt-1">
              {t.analytics.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">{t.analytics.last30Days}</span>
              <span className="sm:hidden">{t.analytics.last30DaysMobile}</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{t.analytics.export}</span>
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              change={metric.change}
              detail={metric.detail}
            />
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="lg:col-span-2">
            <PerformanceChart data={performanceData} />
          </div>
          <div>
            <AttributionRadar data={attributionData} />
          </div>
        </div>

        {/* Channel Breakdown Table */}
        <div className="bg-card border border-border">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-medium">{t.analytics.channelBreakdown.title}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">{t.analytics.channelBreakdown.columns.channel}</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-4">{t.analytics.channelBreakdown.columns.spend}</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-4">{t.analytics.channelBreakdown.columns.revenue}</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-4">{t.analytics.channelBreakdown.columns.roas}</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-4">{t.analytics.channelBreakdown.columns.conversions}</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-4">{t.analytics.channelBreakdown.columns.share}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {channelBreakdown.map((channel) => {
                  const totalRevenue = channelBreakdown.reduce((sum, c) => sum + c.revenue, 0)
                  const share = totalRevenue > 0 ? (channel.revenue / totalRevenue) * 100 : 0

                  return (
                    <tr key={channel.name} className="hover:bg-surface-hover transition-colors">
                      <td className="p-4">
                        <span className="text-sm font-medium">{channel.name}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-mono">${(channel.spend / 1000).toFixed(0)}K</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-mono">${(channel.revenue / 1000).toFixed(0)}K</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`text-sm font-mono ${channel.roas >= 4 ? "text-lime" : ""}`}>
                          {channel.roas.toFixed(1)}x
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-mono">{channel.conversions.toLocaleString()}</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-muted overflow-hidden">
                            <div
                              className="h-full bg-lime"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-10">
                            {share.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  )
}

export default function PerformanceEngine() {
  return (
    <DashboardLayout>
      <PerformanceEngineInner />
    </DashboardLayout>
  )
}
