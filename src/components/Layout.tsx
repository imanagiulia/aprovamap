import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  Check,
  Cloud,
  Copy,
  Database,
  LayoutDashboard,
  LogOut,
  Moon,
  RefreshCw,
  Settings,
  Sun,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import type { ActiveTab } from '../types';

const MIGRATION_SQL = `create table if not exists public.exams (
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

alter table public.subjects
  add column if not exists exam_id uuid references public.exams(id) on delete cascade;

create index if not exists idx_subjects_exam_id on public.subjects(exam_id);

grant select, insert, update, delete on table public.exams to authenticated;
alter table public.exams enable row level security;

drop policy if exists "exams_owner_all" on public.exams;
create policy "exams_owner_all" on public.exams
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';`;

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const {
    user,
    isSupabaseMode,
    schemaNeedsMigration,
    refreshData,
    activeTab,
    setActiveTab,
    reviewAlerts,
    darkMode,
    toggleDarkMode,
    signOut,
    toast,
  } = useStudy();

  const [copiedSql, setCopiedSql] = useState(false);

  const urgentAlertCount = reviewAlerts.filter(
    (a) => a.priority === 'high' || a.priority === 'medium'
  ).length;

  const navItems: {
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Início', icon: LayoutDashboard },
    { id: 'subjects', label: 'Concursos & Matérias', shortLabel: 'Matérias', icon: BookOpen },
    { id: 'calendar', label: 'Calendário', shortLabel: 'Agenda', icon: CalendarDays },
    {
      id: 'reviews',
      label: 'Alertas',
      shortLabel: 'Alertas',
      icon: AlertTriangle,
      badge: urgentAlertCount,
    },
    { id: 'settings', label: 'Configurações', shortLabel: 'Config', icon: Settings },
  ];

  const handleCopySql = async () => {
    await navigator.clipboard.writeText(MIGRATION_SQL);
    setCopiedSql(true);
    window.setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="min-h-screen flex bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200/70 dark:border-slate-800/80 z-30">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-16">
          <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center">
            <BookOpenCheck className="w-4 h-4" />
          </div>
          <h1 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
            AprovaMap
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-colors ${
                  active
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'
                    }`}
                  />
                  {item.label}
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/70 dark:text-rose-300 tabular-nums">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="px-2.5 py-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {isSupabaseMode ? (
              <Cloud className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className="truncate">{user?.email}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleDarkMode}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Alternar tema claro/escuro"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {darkMode ? 'Claro' : 'Escuro'}
            </button>
            <button
              onClick={signOut}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 transition-colors"
              title="Bloquear / Sair"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:pl-60 min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/70 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center">
              <BookOpenCheck className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-sm">AprovaMap</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Alternar tema"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={signOut}
              className="p-2 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
              aria-label="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8 pb-24 lg:pb-10 max-w-6xl w-full mx-auto space-y-6">
          {isSupabaseMode && schemaNeedsMigration && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Atualização de banco necessária no Supabase (Concursos)
                </p>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
                  Copie o script de migração (<code className="font-mono">supabase/migration_exams.sql</code>), cole no{' '}
                  <strong>SQL Editor</strong> do seu Supabase e clique em <strong>Run</strong> para ativar os concursos.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'SQL copiado!' : 'Copiar SQL'}
                </button>
                <button
                  type="button"
                  onClick={refreshData}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-medium hover:bg-amber-100/50 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Já executei
                </button>
              </div>
            </div>
          )}

          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200/70 dark:border-slate-800/80 px-2 py-1.5 flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center px-3 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  active
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4.5 h-4.5 mb-0.5" />
                <span>{item.shortLabel}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-0.5 right-1.5 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-md text-sm font-medium ${
              toast.type === 'error'
                ? 'bg-rose-600 text-white'
                : toast.type === 'info'
                  ? 'bg-slate-900 text-white dark:bg-slate-800'
                  : 'bg-emerald-600 text-white'
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
};
