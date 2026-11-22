import type {
  AppDataSnapshot,
  QuestionBatch,
  StudySession,
  Subject,
  Subtopic,
} from '../types';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const STORAGE_DATA_KEY = 'aprovamap_local_data_v1';
const STORAGE_AUTH_KEY = 'aprovamap_local_auth_v1';

interface LocalAuthStore {
  passwordHash: string;
  email: string;
  unlocked: boolean;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function sha256(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simples para ambientes sem SubtleCrypto
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return `fallback-${hash}`;
}

function readLocalData(): AppDataSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_DATA_KEY);
    if (!raw) return { subjects: [], subtopics: [], batches: [], sessions: [] };
    const parsed = JSON.parse(raw) as Partial<AppDataSnapshot>;
    return {
      subjects: parsed.subjects ?? [],
      subtopics: parsed.subtopics ?? [],
      batches: parsed.batches ?? [],
      sessions: parsed.sessions ?? [],
    };
  } catch {
    return { subjects: [], subtopics: [], batches: [], sessions: [] };
  }
}

function writeLocalData(data: AppDataSnapshot): void {
  localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(data));
}

// ============================================================================
// Autenticação Local (usada apenas quando Supabase .env ainda não foi configurado)
// ============================================================================
export const localAuthService = {
  hasConfiguredPassword(): boolean {
    return Boolean(localStorage.getItem(STORAGE_AUTH_KEY));
  },

  getSavedEmail(): string | null {
    try {
      const raw = localStorage.getItem(STORAGE_AUTH_KEY);
      if (!raw) return null;
      return (JSON.parse(raw) as LocalAuthStore).email;
    } catch {
      return null;
    }
  },

  isUnlocked(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_AUTH_KEY);
      if (!raw) return false;
      return Boolean((JSON.parse(raw) as LocalAuthStore).unlocked);
    } catch {
      return false;
    }
  },

  async setupPassword(email: string, password: string): Promise<void> {
    const passwordHash = await sha256(password);
    const payload: LocalAuthStore = {
      email: email.trim() || 'estudante@local',
      passwordHash,
      unlocked: true,
    };
    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(payload));
  },

  async unlock(password: string): Promise<boolean> {
    const raw = localStorage.getItem(STORAGE_AUTH_KEY);
    if (!raw) return false;
    const store = JSON.parse(raw) as LocalAuthStore;
    const candidate = await sha256(password);
    if (candidate !== store.passwordHash) return false;
    store.unlocked = true;
    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(store));
    return true;
  },

  lock(): void {
    const raw = localStorage.getItem(STORAGE_AUTH_KEY);
    if (!raw) return;
    const store = JSON.parse(raw) as LocalAuthStore;
    store.unlocked = false;
    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(store));
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const raw = localStorage.getItem(STORAGE_AUTH_KEY);
    if (!raw) return false;
    const store = JSON.parse(raw) as LocalAuthStore;
    const currentHash = await sha256(currentPassword);
    if (currentHash !== store.passwordHash) return false;
    store.passwordHash = await sha256(newPassword);
    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(store));
    return true;
  },
};

// ============================================================================
// Repositório de Dados Unificado (Supabase PostgreSQL OU Modo Local)
// ============================================================================
export const dataService = {
  async loadAll(userId?: string): Promise<AppDataSnapshot> {
    if (isSupabaseConfigured && supabase && userId) {
      const [subRes, topRes, batRes, sesRes] = await Promise.all([
        supabase.from('subjects').select('*').order('created_at', { ascending: true }),
        supabase.from('subtopics').select('*').order('created_at', { ascending: true }),
        supabase
          .from('question_batches')
          .select('*')
          .order('practiced_at', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('study_sessions')
          .select('*')
          .order('scheduled_date', { ascending: true })
          .order('start_time', { ascending: true }),
      ]);

      if (subRes.error) throw subRes.error;
      if (topRes.error) throw topRes.error;
      if (batRes.error) throw batRes.error;
      if (sesRes.error) throw sesRes.error;

      return {
        subjects: (subRes.data ?? []).map((r) => ({
          ...r,
          description: r.description ?? '',
        })) as Subject[],
        subtopics: (topRes.data ?? []).map((r) => ({
          ...r,
          notes: r.notes ?? '',
        })) as Subtopic[],
        batches: (batRes.data ?? []).map((r) => ({
          ...r,
          source: r.source ?? '',
          notes: r.notes ?? '',
        })) as QuestionBatch[],
        sessions: (sesRes.data ?? []).map((r) => ({
          ...r,
          start_time: r.start_time ?? '',
          notes: r.notes ?? '',
        })) as StudySession[],
      };
    }

    return readLocalData();
  },

  async replaceLocalSnapshot(snapshot: AppDataSnapshot): Promise<void> {
    writeLocalData(snapshot);
  },

  // --- SUBJECTS ---
  async createSubject(
    input: Pick<Subject, 'name' | 'description' | 'color' | 'target_accuracy'>,
    userId?: string
  ): Promise<Subject> {
    if (isSupabaseConfigured && supabase && userId) {
      const { data, error } = await supabase
        .from('subjects')
        .insert({ ...input, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return { ...data, description: data.description ?? '' } as Subject;
    }

    const now = new Date().toISOString();
    const created: Subject = {
      id: generateId(),
      ...input,
      created_at: now,
      updated_at: now,
    };
    const db = readLocalData();
    db.subjects.push(created);
    writeLocalData(db);
    return created;
  },

  async updateSubject(
    id: string,
    patch: Partial<Pick<Subject, 'name' | 'description' | 'color' | 'target_accuracy'>>
  ): Promise<Subject> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('subjects')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, description: data.description ?? '' } as Subject;
    }

    const db = readLocalData();
    const idx = db.subjects.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Matéria não encontrada.');
    db.subjects[idx] = {
      ...db.subjects[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    writeLocalData(db);
    return db.subjects[idx];
  },

  async deleteSubject(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
      return;
    }

    const db = readLocalData();
    const subtopicIds = new Set(db.subtopics.filter((t) => t.subject_id === id).map((t) => t.id));
    db.subjects = db.subjects.filter((s) => s.id !== id);
    db.subtopics = db.subtopics.filter((t) => t.subject_id !== id);
    db.batches = db.batches.filter((b) => !subtopicIds.has(b.subtopic_id));
    db.sessions = db.sessions.filter((s) => s.subject_id !== id);
    writeLocalData(db);
  },

  // --- SUBTOPICS ---
  async createSubtopic(
    input: Pick<Subtopic, 'subject_id' | 'title' | 'notes' | 'study_status' | 'practiced_questions'>,
    userId?: string
  ): Promise<Subtopic> {
    if (isSupabaseConfigured && supabase && userId) {
      const { data, error } = await supabase
        .from('subtopics')
        .insert({ ...input, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return { ...data, notes: data.notes ?? '' } as Subtopic;
    }

    const now = new Date().toISOString();
    const created: Subtopic = {
      id: generateId(),
      ...input,
      created_at: now,
      updated_at: now,
    };
    const db = readLocalData();
    db.subtopics.push(created);
    writeLocalData(db);
    return created;
  },

  async updateSubtopic(
    id: string,
    patch: Partial<
      Pick<Subtopic, 'subject_id' | 'title' | 'notes' | 'study_status' | 'practiced_questions'>
    >
  ): Promise<Subtopic> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('subtopics')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, notes: data.notes ?? '' } as Subtopic;
    }

    const db = readLocalData();
    const idx = db.subtopics.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Subtópico não encontrado.');
    db.subtopics[idx] = {
      ...db.subtopics[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    writeLocalData(db);
    return db.subtopics[idx];
  },

  async deleteSubtopic(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('subtopics').delete().eq('id', id);
      if (error) throw error;
      return;
    }

    const db = readLocalData();
    db.subtopics = db.subtopics.filter((t) => t.id !== id);
    db.batches = db.batches.filter((b) => b.subtopic_id !== id);
    db.sessions = db.sessions.map((s) =>
      s.subtopic_id === id ? { ...s, subtopic_id: null } : s
    );
    writeLocalData(db);
  },

  // --- QUESTION BATCHES ---
  async createBatch(
    input: Pick<
      QuestionBatch,
      'subtopic_id' | 'total_questions' | 'correct_answers' | 'source' | 'notes' | 'practiced_at'
    >,
    userId?: string
  ): Promise<QuestionBatch> {
    if (isSupabaseConfigured && supabase && userId) {
      const { data, error } = await supabase
        .from('question_batches')
        .insert({ ...input, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        source: data.source ?? '',
        notes: data.notes ?? '',
      } as QuestionBatch;
    }

    const now = new Date().toISOString();
    const created: QuestionBatch = {
      id: generateId(),
      ...input,
      created_at: now,
    };
    const db = readLocalData();
    db.batches.unshift(created);
    const subIdx = db.subtopics.findIndex((t) => t.id === input.subtopic_id);
    if (subIdx !== -1) {
      db.subtopics[subIdx] = {
        ...db.subtopics[subIdx],
        practiced_questions: true,
        updated_at: now,
      };
    }
    writeLocalData(db);
    return created;
  },

  async deleteBatch(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('question_batches').delete().eq('id', id);
      if (error) throw error;
      return;
    }

    const db = readLocalData();
    db.batches = db.batches.filter((b) => b.id !== id);
    writeLocalData(db);
  },

  // --- STUDY SESSIONS ---
  async createSession(
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
    >,
    userId?: string
  ): Promise<StudySession> {
    if (isSupabaseConfigured && supabase && userId) {
      const { data, error } = await supabase
        .from('study_sessions')
        .insert({
          ...input,
          start_time: input.start_time || null,
          user_id: userId,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        start_time: data.start_time ?? '',
        notes: data.notes ?? '',
      } as StudySession;
    }

    const now = new Date().toISOString();
    const created: StudySession = {
      id: generateId(),
      ...input,
      created_at: now,
      updated_at: now,
    };
    const db = readLocalData();
    db.sessions.push(created);
    writeLocalData(db);
    return created;
  },

  async updateSession(
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
  ): Promise<StudySession> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('study_sessions')
        .update({
          ...patch,
          ...(patch.start_time !== undefined ? { start_time: patch.start_time || null } : {}),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        start_time: data.start_time ?? '',
        notes: data.notes ?? '',
      } as StudySession;
    }

    const db = readLocalData();
    const idx = db.sessions.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Sessão não encontrada.');
    db.sessions[idx] = {
      ...db.sessions[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    writeLocalData(db);
    return db.sessions[idx];
  },

  async deleteSession(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('study_sessions').delete().eq('id', id);
      if (error) throw error;
      return;
    }

    const db = readLocalData();
    db.sessions = db.sessions.filter((s) => s.id !== id);
    writeLocalData(db);
  },

  async importSnapshot(snapshot: AppDataSnapshot, userId?: string): Promise<void> {
    if (isSupabaseConfigured && supabase && userId) {
      // Importa em ordem de dependência (mapeando IDs antigos para novos UUIDs do PostgreSQL)
      const subjectIdMap = new Map<string, string>();
      for (const s of snapshot.subjects) {
        const created = await this.createSubject(
          {
            name: s.name,
            description: s.description || '',
            color: s.color || '#4F46E5',
            target_accuracy: s.target_accuracy || 80,
          },
          userId
        );
        subjectIdMap.set(s.id, created.id);
      }

      const subtopicIdMap = new Map<string, string>();
      for (const t of snapshot.subtopics) {
        const mappedSubject = subjectIdMap.get(t.subject_id);
        if (!mappedSubject) continue;
        const created = await this.createSubtopic(
          {
            subject_id: mappedSubject,
            title: t.title,
            notes: t.notes || '',
            study_status: t.study_status || 'not_started',
            practiced_questions: Boolean(t.practiced_questions),
          },
          userId
        );
        subtopicIdMap.set(t.id, created.id);
      }

      for (const b of snapshot.batches) {
        const mappedSubtopic = subtopicIdMap.get(b.subtopic_id);
        if (!mappedSubtopic) continue;
        await this.createBatch(
          {
            subtopic_id: mappedSubtopic,
            total_questions: b.total_questions,
            correct_answers: b.correct_answers,
            source: b.source || '',
            notes: b.notes || '',
            practiced_at: b.practiced_at,
          },
          userId
        );
      }

      for (const ses of snapshot.sessions) {
        const mappedSubject = subjectIdMap.get(ses.subject_id);
        if (!mappedSubject) continue;
        await this.createSession(
          {
            subject_id: mappedSubject,
            subtopic_id: ses.subtopic_id ? (subtopicIdMap.get(ses.subtopic_id) ?? null) : null,
            scheduled_date: ses.scheduled_date,
            start_time: ses.start_time || '',
            duration_minutes: ses.duration_minutes || 60,
            session_type: ses.session_type || 'theory',
            completed: Boolean(ses.completed),
            notes: ses.notes || '',
          },
          userId
        );
      }
      return;
    }

    writeLocalData(snapshot);
  },
};
