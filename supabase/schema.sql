-- ============================================================================
-- AprovaMap — Schema PostgreSQL para Supabase
-- Execute este script no SQL Editor do seu projeto Supabase:
-- Dashboard > SQL Editor > New query > Cole e clique em Run
-- ============================================================================

-- Extensão para UUIDs (já habilitada por padrão no Supabase)
create extension if not exists "pgcrypto";

-- Função auxiliar para atualizar updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. Tabela de Matérias (subjects)
-- ----------------------------------------------------------------------------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  color text not null default '#4F46E5',
  target_accuracy integer not null default 80 check (target_accuracy between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subjects_user_id on public.subjects(user_id);

drop trigger if exists trg_subjects_updated_at on public.subjects;
create trigger trg_subjects_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. Tabela de Subtópicos (subtopics)
-- ----------------------------------------------------------------------------
create table if not exists public.subtopics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  notes text,
  study_status text not null default 'not_started'
    check (study_status in ('not_started', 'in_progress', 'reviewing', 'completed')),
  practiced_questions boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subtopics_user_id on public.subtopics(user_id);
create index if not exists idx_subtopics_subject_id on public.subtopics(subject_id);

drop trigger if exists trg_subtopics_updated_at on public.subtopics;
create trigger trg_subtopics_updated_at
  before update on public.subtopics
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Tabela de Baterias de Questões (question_batches)
-- Histórico de resolução por subtópico para cálculo automático de compreensão
-- ----------------------------------------------------------------------------
create table if not exists public.question_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subtopic_id uuid not null references public.subtopics(id) on delete cascade,
  total_questions integer not null check (total_questions > 0),
  correct_answers integer not null check (correct_answers >= 0 and correct_answers <= total_questions),
  source text,
  notes text,
  practiced_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_question_batches_user_id on public.question_batches(user_id);
create index if not exists idx_question_batches_subtopic_id on public.question_batches(subtopic_id);
create index if not exists idx_question_batches_practiced_at on public.question_batches(practiced_at desc);

-- Marca automaticamente o subtópico como "questões resolvidas = true" ao inserir uma bateria
create or replace function public.mark_subtopic_practiced()
returns trigger
language plpgsql
as $$
begin
  update public.subtopics
  set practiced_questions = true,
      updated_at = now()
  where id = new.subtopic_id and user_id = new.user_id;
  return new;
end;
$$;

drop trigger if exists trg_batches_mark_practiced on public.question_batches;
create trigger trg_batches_mark_practiced
  after insert on public.question_batches
  for each row execute function public.mark_subtopic_practiced();

-- ----------------------------------------------------------------------------
-- 4. Tabela de Sessões de Estudo / Calendário (study_sessions)
-- ----------------------------------------------------------------------------
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  subtopic_id uuid references public.subtopics(id) on delete set null,
  scheduled_date date not null,
  start_time text,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  session_type text not null default 'theory'
    check (session_type in ('theory', 'questions', 'review', 'exam')),
  completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_study_sessions_user_date on public.study_sessions(user_id, scheduled_date);
create index if not exists idx_study_sessions_subject_id on public.study_sessions(subject_id);

drop trigger if exists trg_study_sessions_updated_at on public.study_sessions;
create trigger trg_study_sessions_updated_at
  before update on public.study_sessions
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security (RLS): somente o usuário autenticado acessa seus dados
-- ============================================================================
alter table public.subjects enable row level security;
alter table public.subtopics enable row level security;
alter table public.question_batches enable row level security;
alter table public.study_sessions enable row level security;

-- Subjects policies
drop policy if exists "subjects_owner_all" on public.subjects;
create policy "subjects_owner_all" on public.subjects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Subtopics policies
drop policy if exists "subtopics_owner_all" on public.subtopics;
create policy "subtopics_owner_all" on public.subtopics
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Question batches policies
drop policy if exists "question_batches_owner_all" on public.question_batches;
create policy "question_batches_owner_all" on public.question_batches
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Study sessions policies
drop policy if exists "study_sessions_owner_all" on public.study_sessions;
create policy "study_sessions_owner_all" on public.study_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
