export type Role = 'user' | 'assistant' | 'system'
export type UserRole = 'user' | 'owner' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  is_banned: boolean
  daily_limit: number | null
  total_token_used: number
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  model_used: string | null
  is_pinned: boolean
  folder: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: Role
  content: string
  model_used: string | null
  token_input: number | null
  token_output: number | null
  created_at: string
  liked?: boolean | null
}

export interface AiModel {
  id: string
  provider: string
  model_id: string
  display_name: string
  description: string | null
  icon_url: string | null
  is_active: boolean
  is_free: boolean
  is_vision: boolean
  is_reasoning: boolean
  min_plan: 'free' | 'pro' | 'unlimited' | 'owner'
  price_input_per_1m: number
  price_output_per_1m: number
  max_tokens: number
  temperature_default: number
  sort_order: number
  system_prompt: string | null
}

export interface ApiKeyConfig {
  id: string
  provider_name: string
  base_url: string
  api_key_encrypted: string
  api_key_masked?: string
  model_id: string | null
  is_active: boolean
  is_fallback: boolean
  created_at: string
  updated_at: string
}

export interface SiteSettings {
  id: number
  site_name: string
  site_logo: string | null
  welcome_message: string
  system_prompt_global: string
  maintenance_mode: boolean
  registration_enabled: boolean
  max_free_chat_per_day: number
  max_token_per_day: number
  max_token_per_message: number
  primary_color: string
  default_dark: boolean
  landing_text: string | null
  footer_text: string | null
  social_links: string | null
}

export interface UsageLog {
  id: string
  user_id: string | null
  model_id: string | null
  token_input: number
  token_output: number
  cost: number
  status: 'success' | 'error'
  error_message: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  actor_email: string
  action: string
  detail: string
  created_at: string
}

export interface ChatMessage {
  id: string
  role: Role
  content: string
  model_used?: string | null
  attachments?: { name: string; type: string; dataUrl?: string }[]
  pending?: boolean
  error?: boolean
}

export interface OwnerStats {
  total_users: number
  chats_today: number
  tokens_today: number
  cost_today: number
  online_users: number
  tokens_7d: { date: string; tokens: number }[]
  popular_models: { model: string; count: number }[]
  recent_chats: { id: string; title: string; email: string; model: string | null; created_at: string }[]
}
