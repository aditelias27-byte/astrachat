'use client'

import { create } from 'zustand'
import type { AiModel, ChatMessage, Conversation } from '@/types'

interface ChatState {
  conversations: Conversation[]
  activeId: string | null
  messages: ChatMessage[]
  models: AiModel[]
  selectedModel: string | null
  streaming: boolean
  sidebarOpen: boolean
  focusMode: boolean
  search: string
  setConversations: (c: Conversation[]) => void
  setActive: (id: string | null) => void
  setMessages: (m: ChatMessage[]) => void
  appendMessage: (m: ChatMessage) => void
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void
  setModels: (m: AiModel[]) => void
  setSelectedModel: (id: string | null) => void
  setStreaming: (v: boolean) => void
  setSidebarOpen: (v: boolean) => void
  setFocusMode: (v: boolean) => void
  setSearch: (v: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeId: null,
  messages: [],
  models: [],
  selectedModel: null,
  streaming: false,
  sidebarOpen: true,
  focusMode: false,
  search: '',
  setConversations: (conversations) => set({ conversations }),
  setActive: (activeId) => set({ activeId }),
  setMessages: (messages) => set({ messages }),
  appendMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  updateMessage: (id, patch) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
  setModels: (models) => set({ models }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setStreaming: (streaming) => set({ streaming }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setFocusMode: (focusMode) => set({ focusMode }),
  setSearch: (search) => set({ search }),
}))
