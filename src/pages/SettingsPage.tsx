import React, { useRef, useState } from 'react';
import {
  Check,
  Cloud,
  Copy,
  Database,
  Download,
  KeyRound,
  Moon,
  Sparkles,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { localAuthService } from '../services/dataService';
import type { AppDataSnapshot } from '../types';

const ENV_SNIPPET = `VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica`;

export const SettingsPage: React.FC = () => {
  const {
    user,
    isSupabaseMode,
    darkMode,
    toggleDarkMode,
    subjects,
    subtopics,
    batches,
    sessions,
    loadSampleData,
    clearAllLocalData,
    importData,
    showToast,
  } = useStudy();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [copiedEnv, setCopiedEnv] = useState(false);

  // Local password change state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMessage, setPwdMessage] = useState<string | null>(null);

  const handleExportBackup = () => {
    const payload: AppDataSnapshot = { subjects, subtopics, batches, sessions };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aprovamap-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON exportado!');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as AppDataSnapshot;
      if (!Array.isArray(parsed.subjects) || !Array.isArray(parsed.subtopics)) {
        throw new Error('Arquivo de backup inválido.');
      }
      await importData({
        subjects: parsed.subjects ?? [],
        subtopics: parsed.subtopics ?? [],
        batches: parsed.batches ?? [],
        sessions: parsed.sessions ?? [],
      });
    } catch {
      showToast('Não foi possível importar o arquivo JSON.', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCopyEnv = async () => {
    await navigator.clipboard.writeText(ENV_SNIPPET);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const handleChangeLocalPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage(null);
    if (newPwd.length < 4) {
      setPwdMessage('A nova senha precisa ter pelo menos 4 caracteres.');
      return;
    }
    const ok = await localAuthService.changePassword(currentPwd, newPwd);
    if (!ok) {
      setPwdMessage('Senha atual incorreta.');
      return;
    }
    setCurrentPwd('');
    setNewPwd('');
    showToast('Senha local atualizada com sucesso!');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
        Configurações
      </h2>

      {/* Status do Banco de Dados */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isSupabaseMode
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
              }`}
            >
              {isSupabaseMode ? <Cloud className="w-5 h-5" /> : <Database className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isSupabaseMode
                  ? 'Conectado ao Supabase (PostgreSQL na Nuvem)'
                  : 'Rodando em Modo Local (Navegador)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Usuário atual: <strong>{user?.email}</strong> • {subjects.length} matérias,{' '}
                {subtopics.length} subtópicos, {batches.length} baterias e {sessions.length}{' '}
                sessões.
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              isSupabaseMode
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            {isSupabaseMode ? 'Sincronizado na Nuvem' : 'Aguardando credenciais .env'}
          </span>
        </div>

        {!isSupabaseMode && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Como conectar ao Supabase (PostgreSQL gratuito) quando quiser publicar
            </h4>
            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>
                Crie um projeto gratuito em <strong>supabase.com</strong>.
              </li>
              <li>
                Abra o <strong>SQL Editor</strong> do Supabase e execute o arquivo{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                  supabase/schema.sql
                </code>{' '}
                deste projeto (ele cria todas as tabelas, índices e segurança RLS).
              </li>
              <li>
                Crie um arquivo{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">.env</code>{' '}
                na raiz (ou nas variáveis de ambiente da Vercel) com suas chaves:
              </li>
            </ol>

            <div className="relative">
              <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 text-xs overflow-x-auto">
                {ENV_SNIPPET}
              </pre>
              <button
                onClick={handleCopyEnv}
                className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedEnv ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dica: antes de migrar do Modo Local para o Supabase, clique em{' '}
              <strong>Exportar Backup JSON</strong> abaixo e importe-o já logado na sua conta Supabase!
            </p>
          </div>
        )}
      </div>

      {/* Backup & Dados */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Backup e Dados
        </h3>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleExportBackup}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Exportar Backup JSON
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            <Upload className="w-4 h-4" />
            Importar Backup JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />

          <button
            onClick={async () => {
              if (
                window.confirm(
                  'Carregar matérias, baterias e sessões de exemplo de concurso?'
                )
              ) {
                await loadSampleData();
              }
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            <Sparkles className="w-4 h-4 text-brand-500" />
            Carregar exemplo
          </button>

          {!isSupabaseMode && (
            <button
              onClick={async () => {
                if (
                  window.confirm(
                    'Tem certeza que deseja apagar todos os dados locais? (Faça um backup antes se precisar.)'
                  )
                ) {
                  await clearAllLocalData();
                }
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-rose-200/80 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs sm:text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Limpar dados
            </button>
          )}
        </div>
      </div>

      {/* Aparência + Senha Local */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Aparência</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Alterne entre modo claro e escuro.
            </p>
          </div>
          <button
            onClick={toggleDarkMode}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs sm:text-sm font-medium"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            {darkMode ? 'Modo Claro' : 'Modo Escuro'}
          </button>
        </div>

        {!isSupabaseMode && (
          <form
            onSubmit={handleChangeLocalPassword}
            className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 space-y-3"
          >
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-400" />
              Alterar Senha Local
            </h3>
            {pwdMessage && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{pwdMessage}</p>
            )}
            <input
              type="password"
              required
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder="Senha atual"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
            <input
              type="password"
              required
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Nova senha"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-slate-900 dark:bg-brand-600 text-white text-sm font-semibold hover:opacity-90"
            >
              Atualizar senha
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
