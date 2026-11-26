import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  ActiveTab,
  AppDataSnapshot,
  AuthUser,
  QuestionBatch,
  ReviewAlertItem,
  StudySession,
  Subject,
  Subtopic,
} from '../types';
import { dataService, localAuthService } from '../services/dataService';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';
import { computeReviewAlerts } from '../utils/mastery';
import { createSampleData } from '../utils/sampleData';

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface QuickSchedulePayload {
  subjectId: string;
  subtopicId?: string | null;
  sessionType?: StudySession['session_type'];
  date?: string;
  notes?: string;
}

interface StudyContextValue {
  user: AuthUser | null;
  authLoading: boolean;
  dataLoading: boolean;
  isSupabaseMode: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;

  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  subjects: Subject[];
  subtopics: Subtopic[];
  batches: QuestionBatch[];
  sessions: StudySession[];
  reviewAlerts: ReviewAlertItem[];

  toast: ToastMessage | null;
  showToast: (text: string, type?: ToastMessage['type']) => void;

  // Auth actions
  signInSupabase: (email: string, password: string) => Promise<void>;
  signUpSupabase: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  setupLocalAccess: (email: string, password: string, loadSample: boolean) => Promise<void>;
  unlockLocalAccess: (password: string) => Promise<boolean>;
  signOut: () => Promise<void>;

  // CRUD actions
  refreshData: () => Promise<void>;
  createSubject: (
    input: Pick<Subject, 'name' | 'description' | 'color' | 'target_accuracy'>
  ) => Promise<Subject>;
  updateSubject: (
    id: string,
    patch: Partial<Pick<Subject, 'name' | 'description' | 'color' | 'target_accuracy'>>
  ) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;

  createSubtopic: (
    input: Pick<Subtopic, 'subject_id' | 'title' | 'notes' | 'study_status' | 'practiced_questions'>
  ) => Promise<Subtopic>;
  updateSubtopic: (
    id: string,
    patch: Partial<
      Pick<Subtopic, 'subject_id' | 'title' | 'notes' | 'study_status' | 'practiced_questions'>
    >
  ) => Promise<void>;
  deleteSubtopic: (id: string) => Promise<void>;

  createBatch: (
    input: Pick<
      QuestionBatch,
      'subtopic_id' | 'total_questions' | 'correct_answers' | 'source' | 'notes' | 'practiced_at'
    >
  ) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;

  createSession: (
    input: Pick<
      StudySession,
      | 'subject_id'
      | 'subtopic_id'
      | 'scheduled_date'
      | 'start_time'
      | 'duration_minutes'
      | 'session_type'
      | 'completed'
      | 'notes'
    >
  ) => Promise<void>;
  updateSession: (
    id: string,
    patch: Partial<
      Pick<
        StudySession,
        | 'subject_id'
        | 'subtopic_id'
        | 'scheduled_date'
        | 'start_time'
        | 'duration_minutes'
        | 'session_type'
        | 'completed'
        | 'notes'
      >
    >
  ) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;

  loadSampleData: () => Promise<void>;
  clearAllLocalData: () => Promise<void>;
  importData: (snapshot: AppDataSnapshot) => Promise<void>;

  // Cross-screen quick modal triggers
  batchModalSubtopicId: string | null;
  openBatchModal: (subtopicId: string) => void;
  closeBatchModal: () => void;

  quickSchedule: QuickSchedulePayload | null;
  openQuickSchedule: (payload: QuickSchedulePayload) => void;
  clearQuickSchedule: () => void;
}

const StudyContext = createContext<StudyContextValue | null>(null);

const THEME_KEY = 'aprovamap_theme_v1';

export function formatDatabaseError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const code = 'code' in err ? String((err as { code?: unknown }).code ?? '') : '';
    const message = 'message' in err ? String((err as { message?: unknown }).message ?? '') : '';

    if (code === '42501' || message.toLowerCase().includes('permission denied')) {
      return 'Permissão negada no Supabase (erro 42501). Execute os comandos GRANT do supabase/schema.sql no SQL Editor.';
    }
    if (code === '42P01' || code === 'PGRST205' || message.toLowerCase().includes('could not find the table')) {
      return 'Tabelas não encontradas no Supabase. Execute o arquivo supabase/schema.sql no SQL Editor.';
    }
    if (message.toLowerCase().includes('row-level security')) {
      return 'Acesso bloqueado pelas políticas RLS do Supabase. Faça login novamente ou revise o schema.sql.';
    }
    if (message) {
      return `${fallback} (${message})`;
    }
  }
  return fallback;
}

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [batches, setBatches] = useState<QuestionBatch[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [batchModalSubtopicId, setBatchModalSubtopicId] = useState<string | null>(null);
  const [quickSchedule, setQuickSchedule] = useState<QuickSchedulePayload | null>(null);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const showToast = useCallback(
    (text: string, type: ToastMessage['type'] = 'success') => {
      const id = String(Date.now());
      setToast({ id, text, type });
      window.setTimeout(() => {
        setToast((curr) => (curr?.id === id ? null : curr));
      }, 3600);
    },
    []
  );

  // Inicialização de autenticação
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data.session?.user) {
          setUser({
            id: data.session.user.id,
            email: data.session.user.email ?? 'usuario@supabase',
            mode: 'supabase',
          });
        } else {
          setUser(null);
        }
        setAuthLoading(false);

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return;
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email ?? 'usuario@supabase',
              mode: 'supabase',
            });
          } else {
            setUser(null);
          }
        });

        return () => {
          listener.subscription.unsubscribe();
        };
      } else {
        // Modo Local com bloqueio por senha
        if (localAuthService.isUnlocked()) {
          setUser({
            id: 'local-user',
            email: localAuthService.getSavedEmail() ?? 'estudante@local',
            mode: 'local',
          });
        } else {
          setUser(null);
        }
        setAuthLoading(false);
      }
    }

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const data = await dataService.loadAll(user.mode === 'supabase' ? user.id : undefined);
      setSubjects(data.subjects);
      setSubtopics(data.subtopics);
      setBatches(data.batches);
      setSessions(data.sessions);
    } catch (err) {
      console.error(err);
      showToast(
        formatDatabaseError(err, 'Erro ao carregar os dados. Verifique a conexão.'),
        'error'
      );
    } finally {
      setDataLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      setSubjects([]);
      setSubtopics([]);
      setBatches([]);
      setSessions([]);
    }
  }, [user, refreshData]);

  // Auth actions
  const signInSupabase = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpSupabase = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return { needsConfirmation: !data.session };
  }, []);

  const setupLocalAccess = useCallback(
    async (email: string, password: string, loadSample: boolean) => {
      await localAuthService.setupPassword(email, password);
      if (loadSample) {
        await dataService.replaceLocalSnapshot(createSampleData());
      }
      setUser({
        id: 'local-user',
        email: email.trim() || 'estudante@local',
        mode: 'local',
      });
      showToast('Acesso local configurado com sucesso!');
    },
    [showToast]
  );

  const unlockLocalAccess = useCallback(async (password: string): Promise<boolean> => {
    const ok = await localAuthService.unlock(password);
    if (ok) {
      setUser({
        id: 'local-user',
        email: localAuthService.getSavedEmail() ?? 'estudante@local',
        mode: 'local',
      });
    }
    return ok;
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    } else {
      localAuthService.lock();
    }
    setUser(null);
    setActiveTab('dashboard');
  }, []);

  // CRUD actions
  const createSubject = useCallback(
    async (input: Pick<Subject, 'name' | 'description' | 'color' | 'target_accuracy'>) => {
      try {
        const created = await dataService.createSubject(
          input,
          user?.mode === 'supabase' ? user.id : undefined
        );
        setSubjects((prev) => [...prev, created]);
        showToast(`Matéria "${created.name}" cadastrada!`);
        return created;
      } catch (err) {
        showToast(formatDatabaseError(err, 'Erro ao cadastrar matéria.'), 'error');
        throw err;
      }
    },
    [user, showToast]
  );

  const updateSubject = useCallback(
    async (
      id: string,
      patch: Partial<Pick<Subject, 'name' | 'description' | 'color' | 'target_accuracy'>>
    ) => {
      try {
        const updated = await dataService.updateSubject(id, patch);
        setSubjects((prev) => prev.map((s) => (s.id === id ? updated : s)));
        showToast('Matéria atualizada.');
      } catch (err) {
        showToast(formatDatabaseError(err, 'Erro ao atualizar matéria.'), 'error');
        throw err;
      }
    },
    [showToast]
  );

  const deleteSubject = useCallback(
    async (id: string) => {
      try {
        await dataService.deleteSubject(id);
        const removedSubtopicIds = new Set(
          subtopics.filter((t) => t.subject_id === id).map((t) => t.id)
        );
        setSubjects((prev) => prev.filter((s) => s.id !== id));
        setSubtopics((prev) => prev.filter((t) => t.subject_id !== id));
        setBatches((prev) => prev.filter((b) => !removedSubtopicIds.has(b.subtopic_id)));
        setSessions((prev) => prev.filter((s) => s.subject_id !== id));
        showToast('Matéria excluída.', 'info');
      } catch (err) {
        showToast(formatDatabaseError(err, 'Erro ao excluir matéria.'), 'error');
        throw err;
      }
    },
    [subtopics, showToast]
  );

  const createSubtopic = useCallback(
    async (
      input: Pick<Subtopic, 'subject_id' | 'title' | 'notes' | 'study_status' | 'practiced_questions'>
    ) => {
      try {
        const created = await dataService.createSubtopic(
          input,
          user?.mode === 'supabase' ? user.id : undefined
        );
        setSubtopics((prev) => [...prev, created]);
        showToast(`Subtópico "${created.title}" adicionado!`);
        return created;
      } catch (err) {
        showToast(formatDatabaseError(err, 'Erro ao adicionar subtópico.'), 'error');
        throw err;
      }
    },
    [user, showToast]
  );

  const updateSubtopic = useCallback(
    async (
      id: string,
      patch: Partial<
        Pick<Subtopic, 'subject_id' | 'title' | 'notes' | 'study_status' | 'practiced_questions'>
      >
    ) => {
      try {
        const updated = await dataService.updateSubtopic(id, patch);
        setSubtopics((prev) => prev.map((t) => (t.id === id ? updated : t)));
      } catch (err) {
        showToast(formatDatabaseError(err, 'Erro ao atualizar subtópico.'), 'error');
        throw err;
      }
    },
    [showToast]
  );

  const deleteSubtopic = useCallback(
    async (id: string) => {
      try {
        await dataService.deleteSubtopic(id);
        setSubtopics((prev) => prev.filter((t) => t.id !== id));
        setBatches((prev) => prev.filter((b) => b.subtopic_id !== id));
        setSessions((prev) =>
          prev.map((s) => (s.subtopic_id === id ? { ...s, subtopic_id: null } : s))
        );
        showToast('Subtópico excluído.', 'info');
      } catch (err) {
        showToast(formatDatabaseError(err, 'Erro ao excluir subtópico.'), 'error');
        throw err;
      }
    },
    [showToast]
  );

  const createBatch = useCallback(
    async (
      input: Pick<
        QuestionBatch,
        'subtopic_id' | 'total_questions' | 'correct_answers' | 'source' | 'notes' | 'practiced_at'
      >
    ) => {
      try {
        const created = await dataService.createBatch(
          input,
          user?.mode === 'supabase' ? user.id : undefined
        );
        setBatches((prev) => [created, ...prev]);
        setSubtopics((prev) =>
          prev.map((t) =>
            t.id === input.subtopic_id ? { ...t, practiced_questions: true } : t
          )
        );
        const pct = Math.round((input.correct_answers / input.total_questions) * 100);
        showToast(`Bateria registrada: ${input.correct_answers}/${input.total_questions} (${pct}%)!`);
      } catch (err) {
        showToast(formatDatabaseError(err, 'Erro ao registrar bateria.'), 'error');
        throw err;
      }
    },
    [user, showToast]
  );

  const deleteBatch = useCallback(
    async (id: string) => {
      try {
        await dataService.deleteBatch(id);
        setBatches((prev) => prev.filter((b) => b.id !== id));
        showToast('Bateria removida do histórico.', 'info');
      } catch (err) {
        showToast(formatDatabaseError(err, 'Erro ao remover bateria.'), 'error');
        throw err;
      }
    },
    [showToast]
  );

  const createSession = useCallback(
    async (
      input: Pick<
        StudySession,
        | 'subject_id'
        | 'subtopic_id'
        | 'scheduled_date'
        | 'start_time'
        | 'duration_minutes'
        | 'session_type'
        | 'completed'
        | 'notes'
      >
    ) => {
      try {
        const created = await dataService.createSession(
          input,
          user?.mode === 'supabase' ? user.id : undefined
        );
        setSessions((prev) => [...prev, created]);
        showToast('Sessão agendada no calendário!');
      } catch (err) {
        showToast(formatDatabaseError(err, 'Erro ao agendar sessão.'), 'error');
        throw err;
      }
    },
    [user, showToast]
  );

  const updateSession = useCallback(
    async (
      id: string,
      patch: Partial<
        Pick<
          StudySession,
          | 'subject_id'
          | 'subtopic_id'
          | 'scheduled_date'
          | 'start_time'
          | 'duration_minutes'
          | 'session_type'
          | 'completed'
          | 'notes'
        >
      >
    ) => {
      try {
        const updated = await dataService.updateSession(id, patch);
        setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      } catch (err) {
        showToast(formatDatabaseError(err, 'Erro ao atualizar sessão.'), 'error');
        throw err;
      }
    },
    [showToast]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      try {
        await dataService.deleteSession(id);
        setSessions((prev) => prev.filter((s) => s.id !== id));
        showToast('Sessão removida do calendário.', 'info');
      } catch (err) {
        showToast(formatDatabaseError(err, 'Erro ao remover sessão.'), 'error');
        throw err;
      }
    },
    [showToast]
  );

  const loadSampleData = useCallback(async () => {
    try {
      const sample = createSampleData();
      await dataService.importSnapshot(sample, user?.mode === 'supabase' ? user.id : undefined);
      await refreshData();
      showToast('Dados de exemplo carregados com sucesso!');
    } catch (err) {
      showToast(formatDatabaseError(err, 'Erro ao carregar dados de exemplo.'), 'error');
    }
  }, [user, refreshData, showToast]);

  const clearAllLocalData = useCallback(async () => {
    if (isSupabaseConfigured) return;
    await dataService.replaceLocalSnapshot({
      subjects: [],
      subtopics: [],
      batches: [],
      sessions: [],
    });
    await refreshData();
    showToast('Dados locais limpos.', 'info');
  }, [refreshData, showToast]);

  const importData = useCallback(
    async (snapshot: AppDataSnapshot) => {
      try {
        await dataService.importSnapshot(snapshot, user?.mode === 'supabase' ? user.id : undefined);
        await refreshData();
        showToast('Backup importado com sucesso!');
      } catch (err) {
        showToast(formatDatabaseError(err, 'Erro ao importar backup.'), 'error');
        throw err;
      }
    },
    [user, refreshData, showToast]
  );

  const reviewAlerts = useMemo(
    () => computeReviewAlerts(subjects, subtopics, batches),
    [subjects, subtopics, batches]
  );

  const openBatchModal = useCallback((subtopicId: string) => {
    setBatchModalSubtopicId(subtopicId);
  }, []);

  const closeBatchModal = useCallback(() => {
    setBatchModalSubtopicId(null);
  }, []);

  const openQuickSchedule = useCallback((payload: QuickSchedulePayload) => {
    setQuickSchedule(payload);
    setActiveTab('calendar');
  }, []);

  const clearQuickSchedule = useCallback(() => {
    setQuickSchedule(null);
  }, []);

  const value: StudyContextValue = {
    user,
    authLoading,
    dataLoading,
    isSupabaseMode: isSupabaseConfigured,
    darkMode,
    toggleDarkMode,
    activeTab,
    setActiveTab,
    subjects,
    subtopics,
    batches,
    sessions,
    reviewAlerts,
    toast,
    showToast,
    signInSupabase,
    signUpSupabase,
    setupLocalAccess,
    unlockLocalAccess,
    signOut,
    refreshData,
    createSubject,
    updateSubject,
    deleteSubject,
    createSubtopic,
    updateSubtopic,
    deleteSubtopic,
    createBatch,
    deleteBatch,
    createSession,
    updateSession,
    deleteSession,
    loadSampleData,
    clearAllLocalData,
    importData,
    batchModalSubtopicId,
    openBatchModal,
    closeBatchModal,
    quickSchedule,
    openQuickSchedule,
    clearQuickSchedule,
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
};

export function useStudy(): StudyContextValue {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy deve ser usado dentro de StudyProvider.');
  return ctx;
}
