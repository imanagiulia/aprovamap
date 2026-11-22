import React, { useState } from 'react';
import {
  BookOpenCheck,
  Cloud,
  Database,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { localAuthService } from '../services/dataService';

export const AuthScreen: React.FC = () => {
  const { isSupabaseMode, signInSupabase, signUpSupabase, setupLocalAccess, unlockLocalAccess } =
    useStudy();

  const hasLocalPassword = !isSupabaseMode && localAuthService.hasConfiguredPassword();
  const savedLocalEmail = !isSupabaseMode ? localAuthService.getSavedEmail() : null;

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState(savedLocalEmail ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadSample, setLoadSample] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 4) {
      setError('Use uma senha com pelo menos 4 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSupabaseMode) {
        if (!email.trim()) {
          setError('Informe seu e-mail.');
          return;
        }
        if (isRegisterMode) {
          if (password.length < 6) {
            setError('No Supabase, a senha precisa ter pelo menos 6 caracteres.');
            return;
          }
          if (password !== confirmPassword) {
            setError('As senhas não conferem.');
            return;
          }
          const res = await signUpSupabase(email.trim(), password);
          if (res.needsConfirmation) {
            setInfo(
              'Conta criada! Verifique seu e-mail para confirmar o cadastro e depois faça login.'
            );
            setIsRegisterMode(false);
          }
        } else {
          await signInSupabase(email.trim(), password);
        }
      } else {
        // Modo Local com bloqueio por senha
        if (!hasLocalPassword) {
          if (password !== confirmPassword) {
            setError('As senhas não conferem.');
            return;
          }
          await setupLocalAccess(email.trim() || 'meu-estudo@local', password, loadSample);
        } else {
          const ok = await unlockLocalAccess(password);
          if (!ok) {
            setError('Senha incorreta. Tente novamente.');
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível autenticar.';
      setError(
        message.includes('Invalid login credentials')
          ? 'E-mail ou senha inválidos.'
          : message
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50/40 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25 mb-3">
            <BookOpenCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            AprovaMap
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Mapeamento inteligente de estudos para concursos
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-900/5 p-6 sm:p-8">
          {/* Status badge */}
          <div className="flex items-center justify-between gap-2 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-medium">
              {isSupabaseMode ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Cloud className="w-3.5 h-3.5" />
                  Supabase PostgreSQL conectado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <Database className="w-3.5 h-3.5" />
                  Modo Local (pronto para Supabase)
                </span>
              )}
            </div>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>

          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {isSupabaseMode
              ? isRegisterMode
                ? 'Criar sua conta pessoal'
                : 'Entrar na sua área de estudos'
              : hasLocalPassword
                ? 'Desbloquear painel de estudos'
                : 'Definir sua senha de acesso'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">
            {isSupabaseMode
              ? isRegisterMode
                ? 'Seus dados ficam protegidos por autenticação e RLS no PostgreSQL.'
                : 'Acesse suas matérias, questões e cronograma de qualquer lugar.'
              : hasLocalPassword
                ? `Bem-vindo de volta${savedLocalEmail ? ` (${savedLocalEmail})` : ''}. Digite sua senha para continuar.`
                : 'Crie uma senha simples para proteger seu painel local. Quando conectar o Supabase, você usará seu e-mail e senha na nuvem.'}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
              {error}
            </div>
          )}

          {info && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {(isSupabaseMode || !hasLocalPassword) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {isSupabaseMode ? 'E-mail' : 'Seu nome ou e-mail (opcional)'}
                </label>
                <input
                  type={isSupabaseMode ? 'email' : 'text'}
                  required={isSupabaseMode}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isSupabaseMode ? 'voce@exemplo.com' : 'Ex.: Meu Plano de Concurso'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Mostrar ou ocultar senha"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {((isSupabaseMode && isRegisterMode) || (!isSupabaseMode && !hasLocalPassword)) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirmar senha
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            {!isSupabaseMode && !hasLocalPassword && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loadSample}
                  onChange={(e) => setLoadSample(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong className="text-slate-800 dark:text-slate-100 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                    Carregar matérias de exemplo para testar
                  </strong>
                  Inclui Direito Constitucional, Administrativo, Português e RLM com baterias, alertas e calendário (você pode limpar depois em Configurações).
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm shadow-sm shadow-brand-600/20 transition-colors"
            >
              {submitting
                ? 'Autenticando...'
                : isSupabaseMode
                  ? isRegisterMode
                    ? 'Criar conta'
                    : 'Entrar'
                  : hasLocalPassword
                    ? 'Desbloquear'
                    : 'Criar senha e entrar'}
            </button>
          </form>

          {isSupabaseMode && (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode((prev) => !prev);
                  setError(null);
                  setInfo(null);
                }}
                className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                {isRegisterMode ? 'Já tenho conta — fazer login' : 'Primeiro acesso? Criar conta'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
