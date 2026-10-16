"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Wallet, Plus, TrendingUp, AlertTriangle, CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDashboard } from "@/context/dashboard-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/context/language-context"
import { relativeTime } from "@/lib/relative-time"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

const monthlySpend = Array.from({ length: 12 }, (_, i) => ({
  month: new Date(2026, i, 1).toLocaleDateString("en-US", { month: "short" }),
  budget: 40000 + Math.random() * 10000,
  actual: i < new Date().getMonth() ? 35000 + Math.random() * 12000 : 0,
}))


function BudgetManagerInner() {
  const { totalBudget, totalSpent, channelBudgets, transactions, topUpBudget } = useDashboard()
  const { t, locale } = useLanguage()
  const [showAddFunds, setShowAddFunds] = useState(false)
  const [addAmount, setAddAmount] = useState(10000)

  const remaining = totalBudget - totalSpent
  const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
  const projectedPercentage = 97 // Simulated projection

  const handleAddFunds = async () => {
    try {
      await topUpBudget(addAmount)
      setShowAddFunds(false)
      setAddAmount(10000)
    } catch {
      /* notification-оор харагдана */
    }
  }

  return (
      <div className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 md:mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="w-4 h-4 text-lime" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                {t.budget.badge}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{t.budget.title}</h1>
            <p className="text-muted-foreground mt-1">
              {t.budget.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">{t.budget.forecast}</span>
            </Button>
            <Button 
              size="sm" 
              className="gap-2 bg-lime text-background hover:bg-lime/90"
              onClick={() => setShowAddFunds(true)}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t.budget.addFunds}</span>
            </Button>
          </div>
        </div>

        {/* Add Funds Modal */}
        {showAddFunds && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">{t.budget.modal.title}</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowAddFunds(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">{t.budget.modal.amountLabel}</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={addAmount}
                    onChange={(e) => setAddAmount(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  {[5000, 10000, 25000, 50000].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAddAmount(preset)}
                      className={`flex-1 py-2 text-sm border transition-colors ${
                        addAmount === preset ? "bg-lime text-background border-lime" : "border-border hover:bg-surface-hover"
                      }`}
                    >
                      ${(preset / 1000)}K
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 bg-transparent"
                    onClick={() => setShowAddFunds(false)}
                  >
                    {t.budget.modal.cancel}
                  </Button>
                  <Button 
                    className="flex-1 bg-lime text-background hover:bg-lime/90"
                    onClick={handleAddFunds}
                  >
                    {t.budget.modal.submit}${addAmount.toLocaleString()}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Budget Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="sm:col-span-2 bg-card border border-border p-4 md:p-6">
            <h2 className="text-sm font-medium mb-4">{t.budget.overview.annual}</h2>
            <div className="flex items-baseline gap-2 mb-4 flex-wrap">
              <span className="text-2xl md:text-4xl font-mono font-semibold">
                ${(totalSpent / 1000).toFixed(0)}K
              </span>
              <span className="text-muted-foreground">
                / ${(totalBudget / 1000).toFixed(0)}K
              </span>
            </div>
            
            {/* Progress bars */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{t.budget.overview.spent}</span>
                  <span className="font-mono">{spentPercentage.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-muted overflow-hidden">
                  <div
                    className="h-full bg-lime transition-all duration-1000"
                    style={{ width: `${spentPercentage}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{t.budget.overview.projected}</span>
                  <span className="font-mono">{projectedPercentage.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-muted overflow-hidden">
                  <div
                    className="h-full bg-foreground/30 transition-all duration-1000"
                    style={{ width: `${projectedPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border p-4 md:p-6">
            <p className="text-xs text-muted-foreground mb-1">{t.budget.overview.remaining}</p>
            <p className="text-2xl md:text-3xl font-mono font-semibold text-lime">
              ${(remaining / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-muted-foreground mt-2">{t.budget.overview.untilEOY}</p>
          </div>

          <div className="bg-card border border-border p-4 md:p-6">
            <p className="text-xs text-muted-foreground mb-1">{t.budget.overview.monthlyAvg}</p>
            <p className="text-2xl md:text-3xl font-mono font-semibold">
              ${((totalSpent / Math.max(new Date().getMonth(), 1)) / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-lime mt-2">{t.budget.overview.underTarget}</p>
          </div>
        </div>

        {/* Spend Chart */}
        <div className="bg-card border border-border p-4 md:p-6 mb-6 md:mb-8">
          <h2 className="text-sm font-medium mb-4">{t.budget.spendChart}</h2>
          <div className="h-48 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySpend}>
                <defs>
                  <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--muted-foreground)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--lime)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--lime)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 0,
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                />
                <Area
                  type="monotone"
                  dataKey="budget"
                  stroke="var(--muted-foreground)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fill="url(#budgetGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--lime)"
                  strokeWidth={2}
                  fill="url(#actualGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Budgets & Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Channel Budgets */}
          <div className="bg-card border border-border">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-medium">{t.budget.channelBudgets}</h2>
            </div>
            <div className="divide-y divide-border">
              {channelBudgets.map((channel) => {
                const percentage = channel.allocated > 0 ? (channel.spent / channel.allocated) * 100 : 0
                const status = percentage > 90 ? "over" : percentage > 70 ? "on-track" : "under"
                return (
                  <div key={channel.channel} className="p-4 hover:bg-surface-hover transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{channel.channel}</span>
                        {status === "on-track" && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-lime" />
                        )}
                        {status === "under" && (
                          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                        )}
                      </div>
                      <span className="text-sm font-mono">
                        ${(channel.spent / 1000).toFixed(0)}K / ${(channel.allocated / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          percentage > 90 ? "bg-destructive" : percentage > 70 ? "bg-yellow-400" : "bg-lime"
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-card border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-medium">{t.budget.transactions.title}</h2>
              <Button variant="ghost" size="sm" className="text-xs">
                {t.budget.transactions.viewAll}
              </Button>
            </div>
            <div className="divide-y divide-border">
              {transactions.map((txn) => (
                <div key={txn.id} className="p-4 flex items-center justify-between hover:bg-surface-hover transition-colors">
                  <div>
                    <p className="text-sm">{txn.description}</p>
                    <p className="text-xs text-muted-foreground">{relativeTime(txn.occurredAt, locale)}</p>
                  </div>
                  <span className={`text-sm font-mono ${txn.amount > 0 ? "text-lime" : ""}`}>
                    {txn.amount > 0 ? "+" : ""}${Math.abs(txn.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
  )
}

export default function BudgetManager() {
  return (
    <DashboardLayout>
      <BudgetManagerInner />
    </DashboardLayout>
  )
}
