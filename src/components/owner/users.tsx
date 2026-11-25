'use client'

import { useEffect, useState } from 'react'
import { Search, Ban, RotateCcw, Trash2, ShieldCheck, Coins, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from '@/store/toast'
import { formatNumber, formatDate } from '@/lib/utils'
import type { AiModel, Profile } from '@/types'

export function UsersManager() {
  const [users, setUsers] = useState<Profile[]>([])
  const [models, setModels] = useState<AiModel[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [tokenDialog, setTokenDialog] = useState<Profile | null>(null)
  const [tokenVal, setTokenVal] = useState('')
  const [lockDialog, setLockDialog] = useState<Profile | null>(null)
  const [locked, setLocked] = useState<Set<string>>(new Set())

  const load = (search = '') =>
    fetch(`/api/owner/users?q=${encodeURIComponent(search)}`).then((r) => r.json()).then((d) => { setUsers(d.users ?? []) }).finally(() => setLoading(false))
  useEffect(() => {
    load()
    fetch('/api/owner/models').then((r) => r.json()).then((d) => setModels(d.models ?? [])).catch(() => {})
  }, [])

  const act = async (id: string, action: string, value?: unknown) => {
    const r = await fetch(`/api/owner/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, value }) })
    const d = await r.json()
    if (d.error) toast({ title: 'Gagal', description: d.error, variant: 'error' })
    else toast({ title: 'Berhasil', description: d.message ?? 'Aksi dilakukan', variant: 'success' })
    load(q)
  }

  const openToken = (u: Profile) => { setTokenVal(u.token_limit_daily != null ? String(u.token_limit_daily) : ''); setTokenDialog(u) }
  const saveToken = async () => {
    if (!tokenDialog) return
    await act(tokenDialog.id, 'set_token_limit', tokenVal.trim() === '' ? null : Number(tokenVal))
    setTokenDialog(null)
  }

  const openLock = (u: Profile) => { setLocked(new Set(u.locked_models ?? [])); setLockDialog(u) }
  const saveLock = async () => {
    if (!lockDialog) return
    await act(lockDialog.id, 'lock_models', Array.from(locked))
    setLockDialog(null)
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
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b">
              <th className="px-4 py-2">User</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Token Terpakai</th>
              <th className="px-4 py-2">Limit Token/Hari</th><th className="px-4 py-2">Model Terkunci</th>
              <th className="px-4 py-2">Status</th><th className="px-4 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Memuat…</td></tr>}
            {!loading && users.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Tidak ada user.</td></tr>}
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
                <td className="px-4 py-2.5">
                  <button onClick={() => openToken(u)} className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors" title="Atur token limit">
                    <Coins className="h-3.5 w-3.5 text-primary" />
                    {u.token_limit_daily != null ? formatNumber(u.token_limit_daily) : <span className="text-muted-foreground">default</span>}
                  </button>
                </td>
                <td className="px-4 py-2.5">
                  <button onClick={() => openLock(u)} className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors" title="Atur lock model">
                    <Lock className={`h-3.5 w-3.5 ${u.locked_models?.length ? 'text-destructive' : 'text-muted-foreground'}`} />
                    {u.locked_models?.length ? `${u.locked_models.length} model` : <span className="text-muted-foreground">tidak ada</span>}
                  </button>
                </td>
                <td className="px-4 py-2.5">{u.is_banned ? <Badge variant="destructive">Banned</Badge> : <Badge variant="success">Aktif</Badge>}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="Atur token limit" onClick={() => openToken(u)}><Coins className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" title="Lock/unlock model" onClick={() => openLock(u)}><Lock className="h-3.5 w-3.5" /></Button>
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

      {/* Dialog Token Limit */}
      <Dialog open={!!tokenDialog} onOpenChange={(v) => !v && setTokenDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Coins className="h-4 w-4 text-primary" /> Token Limit Harian</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Atur jumlah token maksimal yang boleh dipakai <b>{tokenDialog?.email}</b> per hari. Kosongkan untuk memakai default global.
          </p>
          <Input type="number" min="0" value={tokenVal} onChange={(e) => setTokenVal(e.target.value)} placeholder="mis. 50000 (kosong = default)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTokenDialog(null)}>Batal</Button>
            <Button onClick={saveToken}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Lock Model */}
      <Dialog open={!!lockDialog} onOpenChange={(v) => !v && setLockDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Lock Model untuk {lockDialog?.email}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Centang model yang <b>dikunci</b> (tidak bisa dipakai) oleh user ini. Kosongkan semua = semua model terbuka.</p>
          <div className="max-h-72 overflow-y-auto space-y-1.5 rounded-xl border p-3">
            {models.map((m) => (
              <label key={m.id} className="flex items-center gap-2.5 text-sm rounded-lg px-2 py-1.5 hover:bg-accent cursor-pointer">
                <input
                  type="checkbox"
                  checked={locked.has(m.model_id)}
                  onChange={(e) => {
                    const next = new Set(locked)
                    if (e.target.checked) next.add(m.model_id)
                    else next.delete(m.model_id)
                    setLocked(next)
                  }}
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
                <span className="flex-1">{m.display_name}</span>
                <span className="text-xs text-muted-foreground font-mono">{m.model_id}</span>
              </label>
            ))}
            {models.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Belum ada model.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockDialog(null)}>Batal</Button>
            <Button onClick={saveLock}>Simpan Lock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Semua aksi owner tercatat di Audit Log (tab Logs).</p>
    </div>
  )
}
