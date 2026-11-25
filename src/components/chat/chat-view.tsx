'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, PanelLeft, Plus, Code2, PenLine, Lightbulb, X, LogIn } from 'lucide-react'
import { useChatStore } from '@/store/chat'
import { Sidebar } from './sidebar'
import { ModelPicker } from './model-picker'
import { Chatbox } from './chatbox'
import { MessageList } from './message-list'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/store/toast'
import { uid, cn } from '@/lib/utils'
import { PROMPT_SUGGESTIONS, GUEST_DAILY_LIMIT, GUEST_STORAGE_KEY, GUEST_COUNT_KEY, GUEST_COUNT_DATE } from '@/lib/constants'
import type { ChatMessage } from '@/types'

const icons: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="h-4 w-4" />,
  Code2: <Code2 className="h-4 w-4" />,
  PenLine: <PenLine className="h-4 w-4" />,
  Lightbulb: <Lightbulb className="h-4 w-4" />,
}

interface Me { user: { id: string; email?: string } | null; profile: { role: string; is_banned: boolean } | null }

export function ChatView() {
  const {
    messages, setMessages, appendMessage, updateMessage, models, setModels,
    selectedModel, setSelectedModel, streaming, setStreaming, sidebarOpen, setSidebarOpen,
    activeId, setActive, focusMode, setFocusMode, conversations, setConversations,
  } = useChatStore()

  const [me, setMe] = useState<Me | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [limitOpen, setLimitOpen] = useState(false)
  const [limitMsg, setLimitMsg] = useState('')
  const [guestCount, setGuestCount] = useState(0)
  const [welcome, setWelcome] = useState('Halo! Ada yang bisa aku bantu hari ini?')
  const abortRef = useRef<AbortController | null>(null)

  const isGuest = !me?.user

  // ---- boot ----
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false)
    fetch('/api/auth/me').then((r) => r.json()).then(setMe).catch(() => setMe({ user: null, profile: null }))
    fetch('/api/settings').then((r) => r.json()).then((d) => d.settings && setWelcome(d.settings.welcome_message)).catch(() => {})
    fetch('/api/models').then((r) => r.json()).then((d) => {
      setModels(d.models ?? [])
      if (d.models?.length && !selectedModel) setSelectedModel(d.models[0].model_id)
    }).catch(() => {})
    // guest state
    const today = new Date().toISOString().slice(0, 10)
    if (localStorage.getItem(GUEST_COUNT_DATE) !== today) {
      localStorage.setItem(GUEST_COUNT_DATE, today)
      localStorage.setItem(GUEST_COUNT_KEY, '0')
    } else {
      setGuestCount(Number(localStorage.getItem(GUEST_COUNT_KEY) ?? 0))
    }
    try {
      const saved = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) ?? '[]')
      if (Array.isArray(saved) && saved.length) setMessages(saved)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isGuest) localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(messages.slice(-40)))
  }, [messages, isGuest])

  const refreshConversations = useCallback(() => {
    if (isGuest) return
    fetch('/api/conversations').then((r) => r.json()).then((d) => setConversations(d.conversations ?? [])).catch(() => {})
  }, [isGuest, setConversations])

  // ---- streaming send ----
  const send = useCallback(
    async (text: string, attachments: { name: string; type: string; dataUrl?: string }[] = [], historyOverride?: ChatMessage[]) => {
      if (!selectedModel) {
        toast({ title: 'Pilih model dulu', variant: 'error' })
        return
      }
      const userMsg: ChatMessage = { id: uid(), role: 'user', content: text, attachments }
      const aiId = uid()
      const baseHistory = historyOverride ?? [...useChatStore.getState().messages.filter((m) => !m.error)]
      const aiMsg: ChatMessage = { id: aiId, role: 'assistant', content: '', model_used: selectedModel, pending: true }
      setMessages([...baseHistory, userMsg, aiMsg])
      setStreaming(true)
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: isGuest ? null : activeId,
            message: text,
            modelId: selectedModel,
            attachments,
            guestHistory: baseHistory.slice(-20).map((m) => ({ id: m.id, role: m.role, content: m.content })),
            guestCount,
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Gagal menghubungi server' }))
          if (err.error === 'limit') {
            setLimitMsg(err.message ?? 'Limit harian tercapai.')
            setLimitOpen(true)
          } else {
            toast({ title: 'Gagal', description: err.error, variant: 'error' })
          }
          updateMessage(aiId, { pending: false, error: true, content: err.error ?? 'Terjadi kesalahan.' })
          setStreaming(false)
          return
        }

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let newConvId: string | null = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''
          for (const part of parts) {
            const evLine = part.split('\n').find((l) => l.startsWith('event:'))
            const dataLine = part.split('\n').find((l) => l.startsWith('data:'))
            if (!evLine || !dataLine) continue
            const event = evLine.slice(6).trim()
            const data = JSON.parse(dataLine.slice(5).trim())
            if (event === 'meta' && data.conversationId) {
              newConvId = data.conversationId
              if (!activeId) setActive(data.conversationId)
            } else if (event === 'delta' && data.content) {
              const cur = useChatStore.getState().messages
              setMessages(cur.map((m) => (m.id === aiId ? { ...m, content: m.content + data.content, pending: false } : m)))
            } else if (event === 'done') {
              updateMessage(aiId, { pending: false })
            } else if (event === 'error') {
              updateMessage(aiId, { pending: false, error: true, content: data.message })
              toast({ title: 'Error streaming', description: data.message, variant: 'error' })
            }
          }
        }
        updateMessage(aiId, { pending: false })
        if (newConvId) refreshConversations()
        if (isGuest) {
          const c = guestCount + 1
          localStorage.setItem(GUEST_COUNT_KEY, String(c))
          setGuestCount(c)
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          updateMessage(aiId, { pending: false, error: true, content: (e as Error).message })
        } else {
          updateMessage(aiId, { pending: false })
        }
      } finally {
        setStreaming(false)
        abortRef.current = null
      }
    },
    [selectedModel, activeId, isGuest, guestCount, setMessages, updateMessage, setStreaming, setActive, refreshConversations, toast]
  )

  const stop = () => abortRef.current?.abort()

  const regenerate = () => {
    const msgs = useChatStore.getState().messages
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user')
    if (!lastUser) return
    const idx = msgs.findIndex((m) => m.id === lastUser.id)
    send(lastUser.content, lastUser.attachments ?? [], msgs.slice(0, idx))
  }

  const editAndResend = (id: string, content: string) => {
    const msgs = useChatStore.getState().messages
    const idx = msgs.findIndex((m) => m.id === id)
    if (idx === -1) return
    send(content, msgs[idx].attachments ?? [], msgs.slice(0, idx))
  }

  const newChat = () => {
    setActive(null)
    setMessages([])
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  const selectChat = async (id: string) => {
    setActive(id)
    setMessages([])
    if (window.innerWidth < 768) setSidebarOpen(false)
    const r = await fetch(`/api/messages?conversationId=${id}`)
    const d = await r.json()
    setMessages(
      (d.messages ?? []).map((m: { id: string; role: string; content: string; model_used?: string }) => ({
        id: m.id, role: m.role, content: m.content, model_used: m.model_used,
      }))
    )
  }

  const exportChat = (format: 'md' | 'txt') => {
    if (messages.length === 0) {
      toast({ title: 'Belum ada chat untuk diexport', variant: 'info' })
      return
    }
    const content =
      format === 'md'
        ? messages.map((m) => `## ${m.role === 'user' ? 'You' : 'AstraChat'}\n\n${m.content}\n`).join('\n---\n\n')
        : messages.map((m) => `[${m.role === 'user' ? 'YOU' : 'AI'}] ${m.content}`).join('\n\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `astrachat-export.${format}`
    a.click()
    URL.revokeObjectURL(a.href)
    toast({ title: 'Chat diexport', variant: 'success' })
  }

  const toggleTheme = () => {
    const el = document.documentElement
    const dark = el.classList.toggle('dark')
    localStorage.setItem('astrachat_theme', dark ? 'dark' : 'light')
  }

  const logout = async () => {
    const { getSupabaseBrowser } = await import('@/lib/supabase/client')
    getSupabaseBrowser()?.auth.signOut()
    setMe({ user: null, profile: null })
    setMessages([])
    setActive(null)
    setConversations([])
    toast({ title: 'Berhasil keluar', variant: 'info' })
  }

  const emptyState = (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Sparkles className="h-7 w-7" />
      </motion.div>
      <h1 className="text-2xl font-bold mb-1">{welcome}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {isGuest ? `Mode Guest — sisa ${Math.max(0, GUEST_DAILY_LIMIT - guestCount)} chat gratis hari ini` : 'Pilih model, lalu mulai bertanya.'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
        {PROMPT_SUGGESTIONS.map((s) => (
          <button
            key={s.title}
            onClick={() => send(s.prompt)}
            className="group rounded-xl border bg-card p-3.5 text-left transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-primary mb-1">
              {icons[s.icon]} {s.title}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{s.prompt}</p>
          </button>
        ))}
      </div>
    </div>
  )

  const remaining = GUEST_DAILY_LIMIT - guestCount

  return (
    <div className="flex h-dvh overflow-hidden">
      {!focusMode && (
        <Sidebar
          onNewChat={newChat}
          onSelect={selectChat}
          user={me?.user ? { email: me.user.email, role: me.profile?.role } : null}
          onLogin={() => setAuthOpen(true)}
          onLogout={logout}
          onExport={exportChat}
          onToggleTheme={toggleTheme}
        />
      )}

      <main className="flex-1 flex flex-col min-w-0">
        {/* topbar */}
        <header className="flex items-center gap-2 border-b px-3 py-2 bg-background/80 backdrop-blur sticky top-0 z-20">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} title="Sidebar">
            <PanelLeft className="h-4 w-4" />
          </Button>
          <ModelPicker disabled={streaming} />
          <div className="flex-1" />
          {isGuest && (
            <span className="hidden sm:inline text-xs text-muted-foreground">
              Guest: <span className={cn('font-semibold', remaining <= 1 && 'text-destructive')}>{Math.max(0, remaining)}</span> chat tersisa
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={newChat} title="Chat baru" className="md:hidden">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setFocusMode(!focusMode)} className="hidden md:inline-flex text-xs">
            {focusMode ? 'Tampilkan sidebar' : 'Mode Fokus'}
          </Button>
        </header>

        {/* messages */}
        <div className="flex-1 overflow-y-auto">
          <MessageList onRegenerate={regenerate} onEdit={editAndResend} emptyState={emptyState} />
        </div>

        {/* chatbox */}
        <div className="px-3 pb-3 md:px-6 md:pb-5 pt-1">
          <div className="mx-auto max-w-3xl">
            <Chatbox onSend={(t, a) => send(t, a)} onStop={stop} streaming={streaming} disabled={isGuest && remaining <= 0} />
          </div>
        </div>
      </main>

      {/* auth dialog */}
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} onDone={(u) => { setMe(u); setAuthOpen(false); refreshConversations() }} />

      {/* limit modal */}
      <Dialog open={limitOpen} onOpenChange={setLimitOpen}>
        <DialogContent className="max-w-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary mb-2">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogHeader className="items-center">
            <DialogTitle>Limit harian tercapai</DialogTitle>
            <DialogDescription>{limitMsg}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button onClick={() => (window.location.href = '/pricing')}>Upgrade ke Pro</Button>
            {isGuest && <Button variant="outline" onClick={() => { setLimitOpen(false); setAuthOpen(true) }}>
              <LogIn className="h-4 w-4" /> Daftar akun gratis
            </Button>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ================= AUTH DIALOG =================
function AuthDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: (me: Me) => void }) {
  const [oauth, setOauth] = useState<{ google: boolean; github: boolean; configured: boolean }>({ google: false, github: false, configured: false })
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const submit = async () => {
    setLoading(true)
    setMsg('')
    try {
      const { getSupabaseBrowser } = await import('@/lib/supabase/client')
      const supabase = getSupabaseBrowser()
      if (!supabase) {
        setMsg('Supabase belum dikonfigurasi. Isi file .env (lihat README) lalu restart.')
        return
      }
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setMsg(error.message); return }
        const me = await fetch('/api/auth/me').then((r) => r.json())
        onDone(me)
        toast({ title: 'Selamat datang kembali!', variant: 'success' })
      } else if (mode === 'register') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, full_name: name }),
        })
        const d = await res.json()
        if (!res.ok) { setMsg(d.error ?? 'Gagal daftar'); return }
        if (d.needsConfirmation) {
          setMsg('Registrasi berhasil! Cek email untuk verifikasi, lalu login.')
          setMode('login')
          return
        }
        const me = await fetch('/api/auth/me').then((r) => r.json())
        onDone(me)
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) { setMsg(error.message); return }
        setMsg('Link reset password sudah dikirim ke email kamu.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    fetch('/api/auth/oauth-status').then((r) => r.json()).then(setOauth).catch(() => {})
  }, [open])

  const loginOAuth = async (provider: 'google' | 'github') => {
    const { getSupabaseBrowser } = await import('@/lib/supabase/client')
    const supabase = getSupabaseBrowser()
    if (!supabase) { setMsg('Supabase belum dikonfigurasi. Isi .env.local lalu restart.'); return }
    setMsg('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setMsg(error.message)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === 'login' ? 'Masuk ke AstraChat' : mode === 'register' ? 'Daftar Akun Baru' : 'Reset Password'}</DialogTitle>
          <DialogDescription>
            {mode === 'forgot' ? 'Kami akan kirim link reset ke email kamu.' : 'Chat tanpa batas, riwayat tersimpan, dan akses model Pro.'}
          </DialogDescription>
        </DialogHeader>

        {!oauth.configured && (
          <p className="text-xs text-amber-500 bg-amber-500/10 rounded-lg p-2">
            Login sosial belum aktif — Owner perlu mengaktifkan provider Google/GitHub di Supabase (lihat README bagian 6).
          </p>
        )}
        {oauth.configured && !oauth.google && !oauth.github && (
          <p className="text-xs text-amber-500 bg-amber-500/10 rounded-lg p-2">
            Belum ada provider sosial yang aktif. Aktifkan di Supabase → Authentication → Providers.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => loginOAuth('google')} className="w-full" title={oauth.google ? 'Google aktif' : 'Google belum diaktifkan di Supabase'}>
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81"/></svg>
            Google
          </Button>
          <Button variant="outline" onClick={() => loginOAuth('github')} className="w-full">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.16 1.18a11 11 0 0 1 5.76 0c2.19-1.49 3.15-1.18 3.15-1.18.63 1.58.24 2.75.12 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.26 5.66.41.35.77 1.05.77 2.12v3.14c0 .3.2.67.8.55A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>
            GitHub
          </Button>
        </div>
        {(oauth.google || oauth.github) && (
          <p className="text-[11px] text-muted-foreground text-center">
            {oauth.google && oauth.github ? 'Google & GitHub siap' : oauth.google ? 'Google siap' : 'GitHub siap'} — klik tombol untuk login.
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> atau email <div className="h-px flex-1 bg-border" />
        </div>

        {mode === 'register' && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm" />
        )}
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@contoh.com" className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm" />
        {mode !== 'forgot' && (
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password (min. 6 karakter)" className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm" onKeyDown={(e) => e.key === 'Enter' && submit()} />
        )}
        {msg && <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2">{msg}</p>}
        <Button onClick={submit} disabled={loading} className="w-full">
          {loading ? 'Memproses…' : mode === 'login' ? 'Masuk' : mode === 'register' ? 'Daftar' : 'Kirim Link Reset'}
        </Button>
        <div className="flex justify-between text-xs text-muted-foreground">
          <button onClick={() => setMode(mode === 'login' ? 'forgot' : 'login')} className="hover:text-foreground">
            {mode === 'login' ? 'Lupa password?' : '← Kembali login'}
          </button>
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="hover:text-foreground">
            {mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
