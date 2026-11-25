'use client'

import { useEffect, useState } from 'react'
import { Search, Ban, RotateCcw, Trash2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/store/toast'
import { formatNumber, formatDate } from '@/lib/utils'
import type { Profile } from '@/types'

export function UsersManager() {
  const [users, setUsers] = useState<Profile[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  const load = (search = '') =>
    fetch(`/api/owner/users?q=${encodeURIComponent(search)}`).then((r) => r.json()).then((d) => { setUsers(d.users ?? []) }).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const act = async (id: string, action: string, value?: unknown) => {
    const r = await fetch(`/api/owner/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, value }) })
    const d = await r.json()
    if (d.error) toast({ title: 'Gagal', description: d.error, variant: 'error' })
    else toast({ title: 'Berhasil', description: d.message ?? 'Aksi dilakukan', variant: 'success' })
    load(q)
  }

  const roleBadge = (role: string) => (
    <Badge variant={role === 'owner' ? 'default' : role === 'admin' ? 'warning' : 'secondary'} className="capitalize">{role}</Badge>
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / email…" className="pl-9"
            onKeyDown={(e) => e.key === 'Enter' && load(q)} />
        </div>
        <Button variant="outline" onClick={() => load(q)}>Cari</Button>
      </div>

      <div className="rounded-2xl border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b">
              <th className="px-4 py-2">User</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Token</th>
              <th className="px-4 py-2">Status</th><th className="px-4 py-2">Daftar</th><th className="px-4 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Memuat…</td></tr>}
            {!loading && users.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Tidak ada user.</td></tr>}
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-4 py-2.5">
                  <p className="font-medium">{u.full_name ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td className="px-4 py-2.5">
                  <select value={u.role} onChange={(e) => act(u.id, 'set_role', e.target.value)}
                    className="rounded-lg border border-input bg-transparent px-2 py-1 text-xs">
                    <option value="user">user</option><option value="admin">admin</option><option value="owner">owner</option>
                  </select>
                  {roleBadge(u.role)}
                </td>
                <td className="px-4 py-2.5">{formatNumber(u.total_token_used)}</td>
                <td className="px-4 py-2.5">{u.is_banned ? <Badge variant="destructive">Banned</Badge> : <Badge variant="success">Aktif</Badge>}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(u.created_at)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title={u.is_banned ? 'Unban' : 'Ban'} onClick={() => act(u.id, u.is_banned ? 'unban' : 'ban')}>
                      <Ban className={`h-3.5 w-3.5 ${u.is_banned ? 'text-emerald-500' : 'text-destructive'}`} />
                    </Button>
                    <Button variant="ghost" size="icon" title="Reset limit" onClick={() => act(u.id, 'reset_limit')}><RotateCcw className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" title="Hapus user" className="text-destructive" onClick={() => act(u.id, 'delete')}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Semua aksi owner tercatat di Audit Log (tab Logs).</p>
    </div>
  )
}
