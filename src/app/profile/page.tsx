'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, User, Mail, Shield, Coins, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/store/toast'
import { formatNumber } from '@/lib/utils'
import type { Profile } from '@/types'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => {
      if (d.profile) {
        setProfile(d.profile)
        setName(d.profile.full_name ?? '')
      }
    })
  }, [])

  const save = async () => {
    setSaving(true)
    const { getSupabaseBrowser } = await import('@/lib/supabase/client')
    const supabase = getSupabaseBrowser()
    if (!supabase) return
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } })
    if (error) toast({ title: 'Gagal', description: error.message, variant: 'error' })
    else toast({ title: 'Profil disimpan', variant: 'success' })
    setSaving(false)
  }

  if (!profile) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Memuat profil… (login dulu untuk melihat halaman ini)</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b px-4 py-3 flex items-center gap-3">
        <a href="/chat"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></a>
        <h1 className="font-bold">Profil Saya</h1>
      </header>
      <div className="max-w-xl mx-auto p-4 space-y-4">
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary text-xl font-bold">
              {(profile.full_name ?? profile.email)[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{profile.full_name ?? 'Tanpa nama'}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {profile.email}</p>
            </div>
            <div className="ml-auto">
              <Badge variant={profile.role === 'owner' ? 'default' : 'secondary'}>
                <Shield className="h-3 w-3" /> {profile.role}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Coins className="h-3 w-3" /> Total token terpakai</p>
              <p className="text-xl font-bold mt-1">{formatNumber(profile.total_token_used)}</p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">Paket langganan</p>
              <p className="text-xl font-bold mt-1 capitalize">{profile.role === 'user' ? 'Gratis' : profile.role}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <p className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" /> Edit nama</p>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" />
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </div>

        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <p className="text-sm font-medium">Ganti password</p>
          <p className="text-xs text-muted-foreground">Kami akan mengirim link ganti password ke email kamu.</p>
          <Button
            variant="outline"
            onClick={async () => {
              const { getSupabaseBrowser } = await import('@/lib/supabase/client')
              const supabase = getSupabaseBrowser()
              if (!supabase) return
              await supabase.auth.resetPasswordForEmail(profile.email)
              toast({ title: 'Link reset terkirim', description: 'Cek inbox email kamu.', variant: 'success' })
            }}
          >
            Kirim link reset password
          </Button>
        </div>
      </div>
    </div>
  )
}
