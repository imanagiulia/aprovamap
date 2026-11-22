import type {
  MasteryLevel,
  QuestionBatch,
  ReviewAlertItem,
  SessionType,
  StudyStatus,
  Subject,
  SubjectStats,
  Subtopic,
  SubtopicStats,
} from '../types';

export const SUBJECT_COLORS = [
  '#4F46E5', // Indigo
  '#0284C7', // Sky
  '#059669', // Emerald
  '#D97706', // Amber
  '#E11D48', // Rose
  '#7C3AED', // Violet
  '#0D9488', // Teal
  '#EA580C', // Orange
  '#2563EB', // Blue
  '#DB2777', // Pink
];

export interface MasteryMeta {
  level: MasteryLevel;
  label: string;
  shortLabel: string;
  rangeText: string;
  description: string;
  badgeClass: string;
  barClass: string;
  dotClass: string;
  hex: string;
}

export const MASTERY_META: Record<MasteryLevel, MasteryMeta> = {
  unrated: {
    level: 'unrated',
    label: 'Não avaliado',
    shortLabel: 'Sem questões',
    rangeText: 'Sem questões',
    description: 'Registre uma bateria de questões para medir seu domínio.',
    badgeClass:
      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    barClass: 'bg-slate-300 dark:bg-slate-600',
    dotClass: 'bg-slate-400',
    hex: '#94A3B8',
  },
  critical: {
    level: 'critical',
    label: 'Crítico',
    shortLabel: 'Crítico',
    rangeText: '< 50%',
    description: 'Revisão urgente recomendada: revise a teoria e refaça questões.',
    badgeClass:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    barClass: 'bg-rose-500',
    dotClass: 'bg-rose-500',
    hex: '#E11D48',
  },
  basic: {
    level: 'basic',
    label: 'Básico',
    shortLabel: 'Básico',
    rangeText: '50% – 69%',
    description: 'Em evolução: reforce pontos de erro com novas baterias.',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    barClass: 'bg-amber-500',
    dotClass: 'bg-amber-500',
    hex: '#D97706',
  },
  good: {
    level: 'good',
    label: 'Bom',
    shortLabel: 'Bom',
    rangeText: '70% – 84%',
    description: 'Bom nível de compreensão. Faça revisões periódicas para consolidar.',
    badgeClass:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    barClass: 'bg-sky-500',
    dotClass: 'bg-sky-500',
    hex: '#0284C7',
  },
  mastered: {
    level: 'mastered',
    label: 'Dominado',
    shortLabel: 'Dominado',
    rangeText: '≥ 85%',
    description: 'Excelente desempenho! Mantenha revisões espaçadas.',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    barClass: 'bg-emerald-500',
    dotClass: 'bg-emerald-500',
    hex: '#059669',
  },
};

export const STUDY_STATUS_META: Record<
  StudyStatus,
  { label: string; badgeClass: string }
> = {
  not_started: {
    label: 'Não iniciado',
    badgeClass:
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
  in_progress: {
    label: 'Em andamento',
    badgeClass:
      'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
  },
  reviewing: {
    label: 'Em revisão',
    badgeClass:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  },
  completed: {
    label: 'Concluído',
    badgeClass:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
};

export const SESSION_TYPE_META: Record<
  SessionType,
  { label: string; shortLabel: string; badgeClass: string }
> = {
  theory: {
    label: 'Teoria / Lei Seca',
    shortLabel: 'Teoria',
    badgeClass:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
  },
  questions: {
    label: 'Resolução de Questões',
    shortLabel: 'Questões',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  },
  review: {
    label: 'Revisão',
    shortLabel: 'Revisão',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  },
  exam: {
    label: 'Simulado',
    shortLabel: 'Simulado',
    badgeClass:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
  },
};

export function getMasteryLevel(accuracy: number | null): MasteryLevel {
  if (accuracy === null || Number.isNaN(accuracy)) return 'unrated';
  if (accuracy < 50) return 'critical';
  if (accuracy < 70) return 'basic';
  if (accuracy < 85) return 'good';
  return 'mastered';
}

export function computeSubtopicStats(
  subtopicId: string,
  batches: QuestionBatch[]
): SubtopicStats {
  const mine = batches.filter((b) => b.subtopic_id === subtopicId);
  if (mine.length === 0) {
    return {
      totalQuestions: 0,
      correctAnswers: 0,
      accuracy: null,
      mastery: 'unrated',
      batchCount: 0,
      lastPracticedAt: null,
    };
  }

  let totalQuestions = 0;
  let correctAnswers = 0;
  let lastPracticedAt = mine[0].practiced_at;

  for (const b of mine) {
    totalQuestions += b.total_questions;
    correctAnswers += b.correct_answers;
    if (b.practiced_at > lastPracticedAt) {
      lastPracticedAt = b.practiced_at;
    }
  }

  const accuracy =
    totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 1000) / 10 : null;

  return {
    totalQuestions,
    correctAnswers,
    accuracy,
    mastery: getMasteryLevel(accuracy),
    batchCount: mine.length,
    lastPracticedAt,
  };
}

export function computeSubjectStats(
  subjectId: string,
  subtopics: Subtopic[],
  batches: QuestionBatch[]
): SubjectStats {
  const subs = subtopics.filter((s) => s.subject_id === subjectId);
  let totalQuestions = 0;
  let correctAnswers = 0;
  let practicedSubtopicCount = 0;
  let completedSubtopicCount = 0;
  let criticalCount = 0;
  let basicCount = 0;

  for (const sub of subs) {
    const stats = computeSubtopicStats(sub.id, batches);
    totalQuestions += stats.totalQuestions;
    correctAnswers += stats.correctAnswers;
    if (sub.practiced_questions || stats.batchCount > 0) practicedSubtopicCount++;
    if (sub.study_status === 'completed') completedSubtopicCount++;
    if (stats.mastery === 'critical') criticalCount++;
    if (stats.mastery === 'basic') basicCount++;
  }

  const accuracy =
    totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 1000) / 10 : null;

  return {
    subtopicCount: subs.length,
    practicedSubtopicCount,
    completedSubtopicCount,
    totalQuestions,
    correctAnswers,
    accuracy,
    mastery: getMasteryLevel(accuracy),
    criticalCount,
    basicCount,
  };
}

export function computeReviewAlerts(
  subjects: Subject[],
  subtopics: Subtopic[],
  batches: QuestionBatch[]
): ReviewAlertItem[] {
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const alerts: ReviewAlertItem[] = [];

  for (const sub of subtopics) {
    const subject = subjectMap.get(sub.subject_id);
    if (!subject) continue;

    const stats = computeSubtopicStats(sub.id, batches);

    if (stats.mastery === 'critical') {
      alerts.push({
        subtopic: sub,
        subject,
        stats,
        priority: 'high',
        reason: `Taxa crítica de ${stats.accuracy?.toFixed(1)}% (${stats.correctAnswers}/${stats.totalQuestions} acertos) — abaixo de 50%.`,
      });
    } else if (stats.mastery === 'basic') {
      alerts.push({
        subtopic: sub,
        subject,
        stats,
        priority: 'medium',
        reason: `Desempenho básico de ${stats.accuracy?.toFixed(1)}% (${stats.correctAnswers}/${stats.totalQuestions}) — meta da matéria: ${subject.target_accuracy}%.`,
      });
    } else if (
      stats.batchCount === 0 &&
      !sub.practiced_questions &&
      sub.study_status !== 'not_started'
    ) {
      alerts.push({
        subtopic: sub,
        subject,
        stats,
        priority: 'unpracticed',
        reason: 'Conteúdo já iniciado, mas ainda sem resolução de questões registrada.',
      });
    }
  }

  const priorityRank: Record<ReviewAlertItem['priority'], number> = {
    high: 0,
    medium: 1,
    unpracticed: 2,
  };

  return alerts.sort((a, b) => {
    if (priorityRank[a.priority] !== priorityRank[b.priority]) {
      return priorityRank[a.priority] - priorityRank[b.priority];
    }
    const accA = a.stats.accuracy ?? 999;
    const accB = b.stats.accuracy ?? 999;
    return accA - accB;
  });
}

export function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value)}%`;
}

export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(baseIso: string, days: number): string {
  const [y, m, d] = baseIso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
