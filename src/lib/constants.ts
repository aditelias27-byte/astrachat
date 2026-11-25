export const DEFAULT_GATEWAY_BASE_URL = 'https://router.clouvia.id/v1'

export const DEFAULT_MODELS = [
  { model_id: 'gpt-5.6', display_name: 'GPT-5.6', provider: 'openai', is_free: false, is_vision: true, is_reasoning: true },
  { model_id: 'claude-sonnet-4.6', display_name: 'Claude Sonnet 4.6', provider: 'anthropic', is_free: false, is_vision: true, is_reasoning: false },
  { model_id: 'claude-opus-4.6', display_name: 'Claude Opus 4.6', provider: 'anthropic', is_free: false, is_vision: true, is_reasoning: true },
  { model_id: 'gemini-3.8-pro', display_name: 'Gemini 3.8 Pro', provider: 'google', is_free: false, is_vision: true, is_reasoning: true },
  { model_id: 'deepseek-v3', display_name: 'DeepSeek V3', provider: 'deepseek', is_free: true, is_vision: false, is_reasoning: false },
  { model_id: 'qwen-max', display_name: 'Qwen Max', provider: 'alibaba', is_free: false, is_vision: false, is_reasoning: false },
  { model_id: 'kimi-k2', display_name: 'Kimi K2', provider: 'moonshot', is_free: true, is_vision: false, is_reasoning: false },
]

export const GUEST_DAILY_LIMIT = 5
export const GUEST_STORAGE_KEY = 'astrachat_guest_chats'
export const GUEST_COUNT_KEY = 'astrachat_guest_count'
export const GUEST_COUNT_DATE = 'astrachat_guest_date'

export const PROMPT_SUGGESTIONS = [
  { icon: 'Sparkles', title: 'Jelaskan konsep', prompt: 'Jelaskan apa itu quantum computing dengan bahasa yang sederhana untuk pemula.' },
  { icon: 'Code2', title: 'Bantu coding', prompt: 'Buatkan fungsi JavaScript untuk validasi email dengan penjelasan langkah demi langkah.' },
  { icon: 'PenLine', title: 'Tulis konten', prompt: 'Buatkan caption Instagram menarik untuk jualan kopi kekinian, 3 variasi.' },
  { icon: 'Lightbulb', title: 'Brainstorming', prompt: 'Beri 10 ide nama brand untuk startup teknologi pendidikan di Indonesia.' },
]
