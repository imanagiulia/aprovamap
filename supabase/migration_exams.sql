-- ============================================================================
-- AprovaMap — Migração: Cadastro de Concursos (exams) e vínculo com Matérias
-- Execute este script no SQL Editor do seu projeto Supabase existente:
-- Dashboard > SQL Editor > New query > Cole e clique em Run
-- ============================================================================

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. Criar tabela de Concursos (exams)
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  board text,
  exam_date date,
  description text,
  color text not null default '#4F46E5',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exams_user_id on public.exams(user_id);

drop trigger if exists trg_exams_updated_at on public.exams;
create trigger trg_exams_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();

-- 2. Vincular Matérias (subjects) ao Concurso (exam_id)
alter table public.subjects
  add column if not exists exam_id uuid references public.exams(id) on delete cascade;

create index if not exists idx_subjects_exam_id on public.subjects(exam_id);

-- 3. Permissões e Row Level Security (RLS) para Concursos
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.exams to authenticated;

alter table public.exams enable row level security;

drop policy if exists "exams_owner_all" on public.exams;
create policy "exams_owner_all" on public.exams
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Recarregar cache de schema do PostgREST
notify pgrst, 'reload schema';
