'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, KeyRound, Bot, Users, Monitor, Settings, ScrollText, ShieldAlert, Sparkles, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { OwnerDashboard } from '@/components/owner/dashboard'
import { KeysManager } from '@/components/owner/keys'
import { ModelsManager } from '@/components/owner/models'
import { UsersManager } from '@/components/owner/users'
import { MonitorPanel } from '@/components/owner/monitor'
import { SettingsPanel } from '@/components/owner/settings'
import { LogsPanel } from '@/components/owner/logs'

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'keys', label: 'API & Model', icon: KeyRound },
  { id: 'models', label: 'Manajemen Model', icon: Bot },
  { id: 'users', label: 'User', icon: Users },
  { id: 'monitor', label: 'Chat Monitor', icon: Monitor },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'logs', label: 'Logs', icon: ScrollText },
] as const

type TabId = (typeof tabs)[number]['id']

export default function OwnerPage() {
  const router = useRouter()
  const [tab, setTab] = useState<TabId>('dashboard')
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        const role = d.profile?.role
        if (role === 'owner' || role === 'admin') setAllowed(true)
        else router.replace('/chat')
      })
      .catch(() => router.replace('/chat'))
      .finally(() => setChecking(false))
  }, [router])

  if (checking) {
    return (
      <div className="min-h-dvh p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 text-center p-4">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <p className="font-semibold">Akses ditolak</p>
        <p className="text-sm text-muted-foreground">Halaman ini hanya untuk role Owner/Admin. Mengalihkan ke /chat…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh bg-background">
      {/* sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card">
        <div className="flex items-center gap-2 p-4 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          Panel Owner
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                tab === t.id ? 'bg-primary/15 text-primary font-medium' : 'hover:bg-accent text-foreground/75'
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>
        <a href="/chat" className="flex items-center gap-2 m-2 rounded-lg px-3 py-2 text-sm hover:bg-accent text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Chat
        </a>
      </aside>

      <div className="flex-1 min-w-0">
        {/* mobile tab bar */}
        <div className="md:hidden sticky top-0 z-20 flex gap-1 overflow-x-auto border-b bg-background/90 backdrop-blur px-2 py-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn('flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs', tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted')}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <main className="p-4 md:p-6 max-w-6xl">
          <h1 className="text-xl font-bold mb-4">{tabs.find((t) => t.id === tab)?.label}</h1>
          {tab === 'dashboard' && <OwnerDashboard />}
          {tab === 'keys' && <KeysManager />}
          {tab === 'models' && <ModelsManager />}
          {tab === 'users' && <UsersManager />}
          {tab === 'monitor' && <MonitorPanel />}
          {tab === 'settings' && <SettingsPanel />}
          {tab === 'logs' && <LogsPanel />}
        </main>
      </div>
    </div>
  )
}
