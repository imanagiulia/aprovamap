export type StudyStatus = 'not_started' | 'in_progress' | 'reviewing' | 'completed';

export type SessionType = 'theory' | 'questions' | 'review' | 'exam';

export type MasteryLevel = 'unrated' | 'critical' | 'basic' | 'good' | 'mastered';

export type ActiveTab = 'dashboard' | 'subjects' | 'calendar' | 'reviews' | 'settings';

export interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;
  target_accuracy: number;
  created_at: string;
  updated_at: string;
}

export interface Subtopic {
  id: string;
  subject_id: string;
  title: string;
  notes: string;
  study_status: StudyStatus;
  practiced_questions: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionBatch {
  id: string;
  subtopic_id: string;
  total_questions: number;
  correct_answers: number;
  source: string;
  notes: string;
  practiced_at: string; // YYYY-MM-DD
  created_at: string;
}

export interface StudySession {
  id: string;
  subject_id: string;
  subtopic_id: string | null;
  scheduled_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm or ''
  duration_minutes: number;
  session_type: SessionType;
  completed: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SubtopicStats {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number | null; // 0-100 or null when no questions
  mastery: MasteryLevel;
  batchCount: number;
  lastPracticedAt: string | null;
}

export interface SubjectStats {
  subtopicCount: number;
  practicedSubtopicCount: number;
  completedSubtopicCount: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number | null;
  mastery: MasteryLevel;
  criticalCount: number;
  basicCount: number;
}

export interface ReviewAlertItem {
  subtopic: Subtopic;
  subject: Subject;
  stats: SubtopicStats;
  priority: 'high' | 'medium' | 'unpracticed';
  reason: string;
}

export interface AppDataSnapshot {
  subjects: Subject[];
  subtopics: Subtopic[];
  batches: QuestionBatch[];
  sessions: StudySession[];
}

export interface AuthUser {
  id: string;
  email: string;
  mode: 'supabase' | 'local';
}
