'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, MessageSquare, Pin, Trash2, Pencil, X, Sparkles, LogIn, User, Settings2, Download, Sun, Moon } from 'lucide-react'
import { useChatStore } from '@/store/chat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatDate } from '@/lib/utils'
import { toast } from '@/store/toast'
import type { Conversation } from '@/types'

interface Props {
  onNewChat: () => void
  onSelect: (id: string) => void
  user: { email?: string; role?: string } | null
  onLogin: () => void
  onLogout: () => void
  onExport: (format: 'md' | 'txt') => void
  onToggleTheme: () => void
}

export function Sidebar({ onNewChat, onSelect, user, onLogin, onLogout, onExport, onToggleTheme }: Props) {
  const { conversations, activeId, sidebarOpen, setSidebarOpen, search, setSearch, setConversations } = useChatStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    if (!user) return
    fetch('/api/conversations')
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations ?? []))
      .catch(() => {})
  }, [user, setConversations])

  const filtered = conversations.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
  const pinned = filtered.filter((c) => c.is_pinned)
  const rest = filtered.filter((c) => !c.is_pinned)

  const patchConv = async (id: string, patch: Partial<Conversation>) => {
    setConversations(conversations.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    await fetch(`/api/conversations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
  }

  const deleteConv = async (id: string) => {
    setConversations(conversations.filter((c) => c.id !== id))
    if (activeId === id) useChatStore.getState().setActive(null)
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    toast({ title: 'Chat dihapus', variant: 'info' })
  }

  const rename = async (id: string) => {
    if (editTitle.trim()) await patchConv(id, { title: editTitle.trim() })
    setEditingId(null)
  }

  const renderItem = (c: Conversation) => (
    <div
      key={c.id}
      className={cn(
        'group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm cursor-pointer transition-colors',
        activeId === c.id ? 'bg-primary/15 text-primary' : 'hover:bg-accent text-foreground/80'
      )}
      onClick={() => editingId !== c.id && onSelect(c.id)}
    >
      {c.is_pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-primary" /> : <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />}
      {editingId === c.id ? (
        <Input
          autoFocus
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && rename(c.id)}
          onBlur={() => rename(c.id)}
          className="h-6 text-sm"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 truncate">{c.title}</span>
      )}
      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
        <button
          title="Pin"
          onClick={(e) => { e.stopPropagation(); patchConv(c.id, { is_pinned: !c.is_pinned }) }}
          className="p-1 rounded hover:bg-background/60"
        >
          <Pin className={cn('h-3 w-3', c.is_pinned && 'text-primary')} />
        </button>
        <button
          title="Rename"
          onClick={(e) => { e.stopPropagation(); setEditingId(c.id); setEditTitle(c.title) }}
          className="p-1 rounded hover:bg-background/60"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button title="Hapus" onClick={(e) => { e.stopPropagation(); deleteConv(c.id) }} className="p-1 rounded hover:bg-background/60 text-destructive">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* mobile scrim */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
      <aside
        className={cn(
          'fixed md:static z-40 inset-y-0 left-0 w-72 shrink-0 border-r bg-card flex flex-col transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        )}
      >
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            AstraChat
          </div>
          <button className="md:hidden p-1.5" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <Button onClick={onNewChat} className="w-full justify-start gap-2">
            <Plus className="h-4 w-4" /> Chat Baru
          </Button>
        </div>

        <div className="px-3 pb-2 relative">
          <Search className="absolute left-5.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" style={{ left: '1.35rem' }} />
          <Input placeholder="Cari chat..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {pinned.length > 0 && (
            <>
              <p className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Disematkan</p>
              {pinned.map(renderItem)}
            </>
          )}
          {rest.length > 0 && <p className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hari ini & sebelumnya</p>}
          {rest.map(renderItem)}
          {filtered.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">
              {user ? 'Belum ada chat.\nMulai percakapan baru!' : 'Login untuk menyimpan riwayat chat.'}
            </div>
          )}
        </div>

        <div className="border-t p-2 space-y-0.5">
          <button onClick={onToggleTheme} className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-accent">
            <Sun className="h-4 w-4 md:hidden" /><Moon className="h-4 w-4 hidden md:block" />
            <span className="md:hidden">Mode Terang</span><span className="hidden md:inline">Mode Gelap</span>
          </button>
          <button onClick={() => onExport('md')} className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-accent">
            <Download className="h-4 w-4" /> Export chat (Markdown)
          </button>
          {user?.role === 'owner' && (
            <a href="/owner" className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-accent">
              <Settings2 className="h-4 w-4" /> Panel Owner
            </a>
          )}
          {user ? (
            <button onClick={onLogout} className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-accent">
              <User className="h-4 w-4" /> {user.email?.slice(0, 22) ?? 'Akun'} · Keluar
            </button>
          ) : (
            <Button onClick={onLogin} variant="outline" className="w-full justify-start gap-2">
              <LogIn className="h-4 w-4" /> Masuk / Daftar
            </Button>
          )}
        </div>
      </aside>
    </>
  )
}
