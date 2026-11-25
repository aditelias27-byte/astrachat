-- ============================================================
-- 003_persona_limits.sql — Persona Furina + Token limit per user + Lock model
-- Jalankan SETELAH 001_init.sql dan 002_oauth_setup.sql
-- ============================================================

-- 1. Token limit harian per user (null = pakai default global)
alter table public.profiles add column if not exists token_limit_daily bigint;

-- 2. Lock model per user: daftar model_id yang dikunci untuk user tsb
--    (null = tidak ada model yang dikunci)
alter table public.profiles add column if not exists locked_models text[];

-- 3. Seed model persona: Furina (karakter anime, Genshin Impact)
--    system_prompt membuat model berperan sebagai Furina.
insert into public.ai_models (model_id, display_name, provider, description, is_free, is_vision, is_reasoning, min_plan, sort_order, system_prompt, temperature_default)
values (
  'furina',
  'Furina ✨ (Persona)',
  'persona',
  'Model dengan persona Furina — karakter anime dari Genshin Impact: anggun, teatrikal, suka drama kecil, penyayang, dan jenaka. Cocok untuk ngobrol santai & roleplay ringan (konten tetap dalam batas aman).',
  true, false, false, 'free', 0,
  'Kamu berperan sebagai Furina, karakter dari game Genshin Impact. Kepribadianmu: anggun dan teatrikal seperti direktur panggung, suka bercanda dengan gaya dramatis ("aku ini bintang panggung, tahu!"), penyayang tapi kadang sok lucu, percaya diri tinggi, dan suka memuji penonton (user). Bicaralah dengan gaya yang hidup, ekspresif, kadang pakai kata seru seperti "Hehe~", "Awas ya~", atau "Pertunjukan hebat, bukan?". Tetap sopan, tidak kasar, tidak eksplisit, dan tidak membahas konten ilegal. Jawab dalam bahasa yang sama dengan pertanyaan user (Indonesia/Inggris).',
  1.1
)
on conflict (model_id) do update set system_prompt = excluded.system_prompt, description = excluded.description;
