-- ============================================================
-- AstraChat — Skema Database Supabase (jalankan di SQL Editor)
-- ============================================================

-- 1. PROFILES -------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user','owner','admin')),
  is_banned boolean not null default false,
  daily_limit int,
  total_token_used bigint not null default 0,
  created_at timestamptz not null default now()
);

-- 2. CONVERSATIONS --------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Chat baru',
  model_used text,
  is_pinned boolean not null default false,
  folder text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_conversations_user on public.conversations(user_id, updated_at desc);

-- 3. MESSAGES -------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  model_used text,
  token_input int,
  token_output int,
  liked boolean,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_conv on public.messages(conversation_id, created_at);

-- 4. AI MODELS ------------------------------------------------
create table if not exists public.ai_models (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'custom',
  model_id text not null unique,
  display_name text not null,
  description text,
  icon_url text,
  is_active boolean not null default true,
  is_free boolean not null default false,
  is_vision boolean not null default false,
  is_reasoning boolean not null default false,
  min_plan text not null default 'free' check (min_plan in ('free','pro','unlimited','owner')),
  price_input_per_1m numeric not null default 0,
  price_output_per_1m numeric not null default 0,
  max_tokens int not null default 4096,
  temperature_default numeric not null default 0.7,
  sort_order int not null default 0,
  system_prompt text
);

-- 5. API KEYS CONFIG ------------------------------------------
create table if not exists public.api_keys_config (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null,
  base_url text not null default 'https://router.clouvia.id/v1',
  api_key_encrypted text not null,
  model_id text,
  is_active boolean not null default true,
  is_fallback boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. SITE SETTINGS --------------------------------------------
create table if not exists public.site_settings (
  id int primary key default 1,
  site_name text not null default 'AstraChat',
  site_logo text,
  welcome_message text not null default 'Halo! Ada yang bisa aku bantu hari ini?',
  system_prompt_global text not null default 'Kamu adalah AstraChat, asisten AI yang ramah, akurat, dan menjawab dalam bahasa pengguna.',
  maintenance_mode boolean not null default false,
  registration_enabled boolean not null default true,
  max_free_chat_per_day int not null default 20,
  max_token_per_day int not null default 200000,
  max_token_per_message int not null default 8000,
  primary_color text not null default '#a855f7',
  default_dark boolean not null default true,
  landing_text text,
  footer_text text,
  social_links text,
  constraint site_settings_singleton check (id = 1)
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- 7. USAGE LOGS -----------------------------------------------
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  model_id text,
  token_input int not null default 0,
  token_output int not null default 0,
  cost numeric not null default 0,
  status text not null default 'success' check (status in ('success','error')),
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists idx_usage_user_date on public.usage_logs(user_id, created_at desc);

-- 8. AUDIT LOGS ------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- FUNGSI & TRIGGER
-- ============================================================

-- Auto-create profile saat user register
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Increment total token user
create or replace function public.increment_token_used(p_user_id uuid, p_tokens bigint)
returns void language sql as $$
  update public.profiles set total_token_used = total_token_used + p_tokens where id = p_user_id;
$$;

-- Update updated_at conversations
create or replace function public.touch_conversation()
returns trigger language plpgsql as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.ai_models enable row level security;
alter table public.api_keys_config enable row level security;
alter table public.site_settings enable row level security;
alter table public.usage_logs enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: user lihat & edit dirinya; owner/admin lihat semua
drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select" on public.profiles for select to authenticated using (id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('owner','admin')));
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()) and role = (select role from public.profiles where id = (select auth.uid())));

-- conversations & messages: milik user
drop policy if exists "conv owner all" on public.conversations;
create policy "conv owner all" on public.conversations for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "msg owner all" on public.messages;
create policy "msg owner all" on public.messages for all to authenticated using (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = (select auth.uid()))) with check (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = (select auth.uid())));

-- ai_models: semua user (anon juga) bisa baca model aktif; tulis hanya service_role
drop policy if exists "models public read" on public.ai_models;
create policy "models public read" on public.ai_models for select using (true);

-- site_settings: publik baca; tulis hanya service_role
drop policy if exists "settings public read" on public.site_settings;
create policy "settings public read" on public.site_settings for select using (true);

-- api_keys_config, usage_logs, audit_logs: TIDAK ada policy untuk anon/authenticated
-- (hanya service_role yang bisa akses — aman untuk API key terenkripsi)

-- ============================================================
-- SEED 7 MODEL AWAL
-- ============================================================
insert into public.ai_models (model_id, display_name, provider, description, is_free, is_vision, is_reasoning, min_plan, sort_order) values
  ('gpt-5.6', 'GPT-5.6', 'openai', 'Model flagship OpenAI — paling pintar untuk reasoning & coding.', false, true, true, 'free', 1),
  ('claude-sonnet-4.6', 'Claude Sonnet 4.6', 'anthropic', 'Anthropic seimbang: cepat, cerdas, tulisan mengalir.', false, true, false, 'free', 2),
  ('claude-opus-4.6', 'Claude Opus 4.6', 'anthropic', 'Claude terkuat untuk tugas kompleks & analisis panjang.', false, true, true, 'pro', 3),
  ('gemini-3.8-pro', 'Gemini 3.8 Pro', 'google', 'Model multimodal Google dengan konteks super panjang.', false, true, true, 'free', 4),
  ('deepseek-v3', 'DeepSeek V3', 'deepseek', 'Open-source powerful, gratis, bagus untuk coding.', true, false, false, 'free', 5),
  ('qwen-max', 'Qwen Max', 'alibaba', 'Model terkuat Alibaba, unggul multibahasa.', false, false, false, 'free', 6),
  ('kimi-k2', 'Kimi K2', 'moonshot', 'Spesialis konteks panjang dari Moonshot AI.', true, false, false, 'free', 7)
on conflict (model_id) do nothing;
