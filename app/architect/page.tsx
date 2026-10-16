"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { GanttTimeline } from "@/components/dashboard/gantt-timeline"
import { Calendar, Plus, Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDashboard } from "@/context/dashboard-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/context/language-context"

// Parse date string as local date to avoid timezone issues
const parseLocalDate = (dateInput: Date | string): Date => {
  if (dateInput instanceof Date) return dateInput
  const str = String(dateInput)
  if (str.includes("T")) {
    return new Date(str)
  }
  const [year, month, day] = str.split("-").map(Number)
  return new Date(year, month - 1, day)
}

// Format date as YYYY-MM-DD in local timezone
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function CampaignArchitectContent() {
  const { campaigns, addCampaign, updateCampaign, deleteCampaign, toggleCampaignStatus } = useDashboard()
  const { t } = useLanguage()
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    channel: "Meta Ads",
    budget: 10000,
    startDate: formatLocalDate(new Date()),
    endDate: formatLocalDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
  })
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filteredCampaigns = campaigns.filter(c => {
    if (statusFilter === "all") return true
    return c.status === statusFilter
  })

  const totalCampaigns = campaigns.length
  const activeCampaigns = campaigns.filter(c => c.status === "live").length
  const scheduledCampaigns = campaigns.filter(c => c.status === "scheduled").length
  const totalCampaignBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0)

  // Gantt хугацааны цонх — кампанит ажлуудын огнооноос автоматаар (өмнө нь 2026 оны 1-4 сар тогтмол байсан)
  const timelineRange = (() => {
    const today = new Date()
    const starts = campaigns.map(c => c.startDate?.getTime()).filter((x): x is number => !!x)
    const ends = campaigns.map(c => c.endDate?.getTime()).filter((x): x is number => !!x)
    const minStart = Math.min(today.getTime() - 30 * 86400000, ...starts)
    const maxEnd = Math.max(today.getTime() + 60 * 86400000, ...ends)
    const start = new Date(minStart)
    const end = new Date(maxEnd)
    return {
      start: new Date(start.getFullYear(), start.getMonth(), 1),
      end: new Date(end.getFullYear(), end.getMonth() + 1, 0),
    }
  })()

  const handleCreateCampaign = async () => {
    await addCampaign({
      name: newCampaign.name,
      status: "scheduled",
      spend: 0,
      impressions: 0,
      channel: newCampaign.channel,
      lastUpdated: "Just now",
      startDate: parseLocalDate(newCampaign.startDate),
      endDate: parseLocalDate(newCampaign.endDate),
      progress: 0,
      budget: newCampaign.budget,
    }).catch(() => undefined)
    setNewCampaign({ 
      name: "", 
      channel: "Meta Ads", 
      budget: 10000,
      startDate: formatLocalDate(new Date()),
      endDate: formatLocalDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    })
    setShowNewCampaign(false)
  }

  const handleCampaignUpdate = (id: string, updates: Record<string, unknown>) => {
    updateCampaign(id, updates)
  }

  const handleCampaignDelete = (id: string) => {
    deleteCampaign(id)
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-4 h-4 text-lime" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              {t.architect.badge}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{t.architect.title}</h1>
          <p className="text-muted-foreground mt-1">
            {t.architect.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-sm bg-transparent border border-border focus:outline-none focus:ring-1 focus:ring-lime"
          >
            <option value="all">{t.architect.filter.all}</option>
            <option value="live">{t.architect.filter.live}</option>
            <option value="paused">{t.architect.filter.paused}</option>
            <option value="scheduled">{t.architect.filter.scheduled}</option>
            <option value="ended">{t.architect.filter.ended}</option>
          </select>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t.architect.export}</span>
          </Button>
          <Button 
            size="sm" 
            className="gap-2 bg-lime text-background hover:bg-lime/90"
            onClick={() => setShowNewCampaign(true)}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t.architect.newCampaign}</span>
          </Button>
        </div>
      </div>

      {showNewCampaign && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{t.architect.modal.createTitle}</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowNewCampaign(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t.architect.modal.name}</Label>
                <Input
                  id="name"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t.architect.modal.namePlaceholder}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="channel">{t.architect.modal.channel}</Label>
                <select
                  id="channel"
                  value={newCampaign.channel}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, channel: e.target.value }))}
                  className="w-full mt-1 h-10 px-3 bg-background border border-border focus:outline-none focus:ring-1 focus:ring-lime"
                >
                  <option value="Meta Ads">Meta Ads</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="TikTok Ads">TikTok Ads</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Email">Email</option>
                  <option value="Multi-channel">Multi-channel</option>
                </select>
              </div>
              <div>
                <Label htmlFor="budget">{t.architect.modal.budget}</Label>
                <Input
                  id="budget"
                  type="number"
                  value={newCampaign.budget}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, budget: Number(e.target.value) }))}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">{t.architect.modal.startDate}</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newCampaign.startDate}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, startDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">{t.architect.modal.endDate}</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newCampaign.endDate}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, endDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 bg-transparent"
                  onClick={() => setShowNewCampaign(false)}
                >
                  {t.architect.modal.cancel}
                </Button>
                <Button 
                  className="flex-1 bg-lime text-background hover:bg-lime/90"
                  onClick={handleCreateCampaign}
                  disabled={!newCampaign.name}
                >
                  {t.architect.modal.create}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-card border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">{t.architect.stats.total}</p>
          <p className="text-2xl font-mono font-semibold">{totalCampaigns}</p>
        </div>
        <div className="bg-card border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">{t.architect.stats.active}</p>
          <p className="text-2xl font-mono font-semibold text-lime">{activeCampaigns}</p>
        </div>
        <div className="bg-card border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">{t.architect.stats.scheduled}</p>
          <p className="text-2xl font-mono font-semibold text-blue-400">{scheduledCampaigns}</p>
        </div>
        <div className="bg-card border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">{t.architect.stats.budget}</p>
          <p className="text-2xl font-mono font-semibold">${(totalCampaignBudget / 1000).toFixed(0)}K</p>
        </div>
      </div>

      <GanttTimeline
        campaigns={filteredCampaigns.map(c => ({
          ...c,
          startDate: c.startDate ? parseLocalDate(c.startDate) : new Date(),
          endDate: c.endDate ? parseLocalDate(c.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          progress: c.progress || 0,
          budget: c.budget || 0,
        }))}
        startDate={timelineRange.start}
        endDate={timelineRange.end}
        onCampaignUpdate={handleCampaignUpdate}
        onCampaignDelete={handleCampaignDelete}
      />

      <div className="mt-6 md:mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">{t.architect.details.title}</h2>
          <span className="text-xs text-muted-foreground">{t.architect.details.hint}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-card border border-border p-4 hover:bg-surface-hover transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-muted-foreground">{campaign.id.toUpperCase()}</span>
                <div className={`w-2 h-2 ${campaign.status === "live" ? "bg-lime pulse-live" : campaign.status === "scheduled" ? "bg-blue-500" : campaign.status === "paused" ? "bg-yellow-500" : "bg-muted-foreground"}`} />
              </div>
              <h3 className="text-sm font-medium mb-1 group-hover:text-lime transition-colors">
                {campaign.name}
              </h3>
              <p className="text-xs text-muted-foreground mb-2">{campaign.channel}</p>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">
                  {campaign.startDate ? parseLocalDate(campaign.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"} - {campaign.endDate ? parseLocalDate(campaign.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t.architect.details.budgetLabel}</span>
                <span className="font-mono">${((campaign.budget || 0) / 1000).toFixed(0)}K</span>
              </div>
              <div className="mt-3 h-1 bg-muted overflow-hidden">
                <div
                  className="h-full bg-lime transition-all"
                  style={{ width: `${campaign.progress || 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground capitalize">{campaign.status}</span>
                {(campaign.status === "live" || campaign.status === "paused") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleCampaignStatus(campaign.id)
                    }}
                  >
                    {campaign.status === "live" ? t.architect.details.pause : t.architect.details.resume}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CampaignArchitect() {
  return (
    <DashboardLayout>
      <CampaignArchitectContent />
    </DashboardLayout>
  )
}
