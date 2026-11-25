'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { UsageLog, AuditLog } from '@/types'

export function LogsPanel() {
  const [tab, setTab] = useState<'usage' | 'error' | 'audit'>('usage')
  const [usage, setUsage] = useState<UsageLog[]>([])
  const [audit, setAudit] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const load = (t: typeof tab) => {
    setLoading(true)
    fetch(`/api/owner/logs?type=${t}`).then((r) => r.json()).then((d) => {
      if (t === 'audit') setAudit(d.logs ?? [])
      else setUsage(d.logs ?? [])
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load('usage') }, [])

  const tabs = [
    { id: 'usage' as const, label: 'Request AI' },
    { id: 'error' as const, label: 'Error Logs' },
    { id: 'audit' as const, label: 'Audit Log' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); load(t.id) }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : tab === 'audit' ? (
        <div className="rounded-2xl border bg-card divide-y">
          {audit.map((a) => (
            <div key={a.id} className="p-3.5 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">{a.action}</Badge>
              <span className="font-medium">{a.actor_email}</span>
              <span className="text-muted-foreground flex-1 min-w-48">{a.detail}</span>
              <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
            </div>
          ))}
          {audit.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Belum ada aktivitas owner.</p>}
        </div>
      ) : (
        <div className="rounded-2xl border bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="px-4 py-2">Waktu</th><th className="px-4 py-2">Model</th><th className="px-4 py-2">Token</th>
                <th className="px-4 py-2">Biaya</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Pesan Error</th>
              </tr>
            </thead>
            <tbody>
              {usage
                .filter((l) => (tab === 'error' ? l.status === 'error' : true))
                .map((l) => (
                  <tr key={l.id} className="border-b last:border-0 align-top">
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(l.created_at)}</td>
                    <td className="px-4 py-2.5"><span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">{l.model_id ?? '—'}</span></td>
                    <td className="px-4 py-2.5">{l.token_input}/{l.token_output}</td>
                    <td className="px-4 py-2.5">${l.cost.toFixed(4)}</td>
                    <td className="px-4 py-2.5">{l.status === 'success' ? <Badge variant="success">Sukses</Badge> : <Badge variant="destructive">Gagal</Badge>}</td>
                    <td className="px-4 py-2.5 text-xs text-destructive max-w-72 break-words">{l.error_message ?? '—'}</td>
                  </tr>
                ))}
              {usage.filter((l) => (tab === 'error' ? l.status === 'error' : true)).length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{tab === 'error' ? 'Tidak ada error. 🎉' : 'Belum ada log.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
