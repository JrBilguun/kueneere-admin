"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Package, ShoppingBag, AlertTriangle, Mail } from "lucide-react"
import { gql, formatMNT } from "@/lib/api"
import { useLanguage } from "@/context/language-context"

interface StoreOverview {
  totalOrders: number
  paidOrders: number
  pendingOrders: number
  revenue: number
  averageOrderValue: number
  ordersToday: number
  revenueToday: number
  activeProducts: number
  lowStockVariants: number
  newsletterSubscribers: number
}

const LABELS = {
  en: { title: "KUENEREE store", revenue: "Paid revenue", orders: "Orders", pending: "pending", products: "Live products", lowStock: "low-stock sizes", subscribers: "Newsletter", manage: "Manage products" },
  mn: { title: "KUENEREE дэлгүүр", revenue: "Төлөгдсөн орлого", orders: "Захиалга", pending: "хүлээгдэж буй", products: "Идэвхтэй бараа", lowStock: "үлдэгдэл бага", subscribers: "Newsletter", manage: "Бараа удирдах" },
  ko: { title: "KUENEREE 스토어", revenue: "결제 매출", orders: "주문", pending: "대기", products: "판매 상품", lowStock: "재고 부족", subscribers: "뉴스레터", manage: "상품 관리" },
}

/** Pulse хуудсанд дэлгүүрийн бодит борлуулалт (storeOverview) */
export function StoreSnapshot() {
  const { locale } = useLanguage()
  const l = LABELS[locale]
  const [data, setData] = useState<StoreOverview | null>(null)

  useEffect(() => {
    gql<{ storeOverview: StoreOverview }>(
      `{ storeOverview { totalOrders paidOrders pendingOrders revenue averageOrderValue ordersToday revenueToday activeProducts lowStockVariants newsletterSubscribers } }`,
    )
      .then((d) => setData(d.storeOverview))
      .catch(() => setData(null))
  }, [])

  const items = [
    { icon: ShoppingBag, label: l.revenue, value: data ? formatMNT(data.revenue) : "—", sub: data ? `${formatMNT(data.revenueToday)} · 24h` : "" },
    { icon: Package, label: l.orders, value: data ? data.totalOrders.toLocaleString() : "—", sub: data ? `${data.pendingOrders} ${l.pending}` : "" },
    { icon: AlertTriangle, label: l.products, value: data ? String(data.activeProducts) : "—", sub: data ? `${data.lowStockVariants} ${l.lowStock}` : "", warn: (data?.lowStockVariants ?? 0) > 0 },
    { icon: Mail, label: l.subscribers, value: data ? data.newsletterSubscribers.toLocaleString() : "—", sub: "" },
  ]

  return (
    <div className="bg-card border border-border mb-6 md:mb-8">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-medium">{l.title}</h2>
        <Link href="/products" className="text-xs font-mono text-muted-foreground hover:text-lime flex items-center gap-1">
          {l.manage} <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border">
        {items.map((it) => (
          <div key={it.label} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <it.icon className={`w-3.5 h-3.5 ${it.warn ? "text-yellow-400" : "text-lime"}`} />
              <span className="text-xs text-muted-foreground">{it.label}</span>
            </div>
            <p className="text-xl md:text-2xl font-mono font-semibold tracking-tight">{it.value}</p>
            {it.sub && <p className="text-xs text-muted-foreground font-mono mt-1">{it.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
