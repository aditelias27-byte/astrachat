'use client'

import { useEffect, useState } from 'react'
import { Users, MessageSquare, Coins, DollarSign, Wifi, Bot } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis as BX } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber, formatCost, formatDate } from '@/lib/utils'
import type { OwnerStats } from '@/types'

export function OwnerDashboard() {
  const [stats, setStats] = useState<OwnerStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/owner/stats').then(async (r) => {
      const d = await r.json()
      if (d.stats) setStats(d.stats)
      else setError(d.error ?? 'Gagal memuat statistik')
    }).catch(() => setError('Gagal memuat statistik'))
  }, [])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!stats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <div className="grid md:grid-cols-2 gap-4"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      </div>
    )
  }

  const cards = [
    { label: 'Total User', value: formatNumber(stats.total_users), icon: Users },
    { label: 'Chat Hari Ini', value: formatNumber(stats.chats_today), icon: MessageSquare },
    { label: 'Token Hari Ini', value: formatNumber(stats.tokens_today), icon: Coins },
    { label: 'Biaya Hari Ini', value: formatCost(stats.cost_today), icon: DollarSign },
    { label: 'User Online (24j)', value: formatNumber(stats.online_users), icon: Wifi },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <c.icon className="h-3.5 w-3.5 text-primary" /> {c.label}
            </div>
            <p className="text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-medium mb-3">Token Usage 7 Hari Terakhir</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.tokens_7d}>
                <defs>
                  <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" fontSize={11} stroke="currentColor" opacity={0.5} />
                <YAxis fontSize={11} stroke="currentColor" opacity={0.5} tickFormatter={(v: number) => formatNumber(v)} />
                <Tooltip formatter={(v) => [formatNumber(Number(v)), 'Token']} />
                <Area type="monotone" dataKey="tokens" stroke="#a855f7" fill="url(#tg)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-medium mb-3 flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> Model Paling Populer</p>
          {stats.popular_models.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Belum ada penggunaan model.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.popular_models} layout="vertical">
                  <XAxis type="number" fontSize={11} stroke="currentColor" opacity={0.5} />
                  <YAxis type="category" dataKey="model" width={130} fontSize={11} stroke="currentColor" opacity={0.7} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#a855f7" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <p className="text-sm font-medium p-4 pb-2">10 Chat Terakhir</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="px-4 py-2">Judul</th><th className="px-4 py-2">User</th><th className="px-4 py-2">Model</th><th className="px-4 py-2">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_chats.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 max-w-64 truncate">{c.title}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.email}</td>
                  <td className="px-4 py-2.5"><span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">{c.model ?? '—'}</span></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(c.created_at)}</td>
                </tr>
              ))}
              {stats.recent_chats.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Belum ada chat.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
