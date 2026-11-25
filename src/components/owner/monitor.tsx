'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatNumber, formatCost, formatDate } from '@/lib/utils'
import type { UsageLog } from '@/types'

export function MonitorPanel() {
  const [logs, setLogs] = useState<UsageLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/owner/logs?type=usage').then((r) => r.json()).then((d) => setLogs(d.logs ?? [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>

  return (
    <div className="rounded-2xl border bg-card overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="text-left text-xs text-muted-foreground border-b">
            <th className="px-4 py-2">Waktu</th><th className="px-4 py-2">Model</th><th className="px-4 py-2">Token in/out</th>
            <th className="px-4 py-2">Biaya</th><th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-b last:border-0">
              <td className="px-4 py-2.5 text-muted-foreground">{formatDate(l.created_at)}</td>
              <td className="px-4 py-2.5"><span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">{l.model_id ?? '—'}</span></td>
              <td className="px-4 py-2.5">{formatNumber(l.token_input)} / {formatNumber(l.token_output)}</td>
              <td className="px-4 py-2.5">{formatCost(l.cost)}</td>
              <td className="px-4 py-2.5">{l.status === 'success' ? <Badge variant="success">Sukses</Badge> : <Badge variant="destructive">Gagal</Badge>}</td>
            </tr>
          ))}
          {logs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Belum ada request AI.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
