import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CalendarPlus,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Edit3,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Search,
  Square,
  Trash2,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import type { Exam, MasteryLevel, StudyStatus, Subject, Subtopic } from '../types';
import {
  computeExamStats,
  computeSubjectStats,
  computeSubtopicStats,
  daysUntilISO,
  formatDateBR,
  formatPercent,
  MASTERY_META,
  STUDY_STATUS_META,
} from '../utils/mastery';
import { ExamModal } from '../components/ExamModal';
import { SubjectModal } from '../components/SubjectModal';
import { SubtopicModal } from '../components/SubtopicModal';

export const SubjectsPage: React.FC = () => {
  const {
    exams,
    subjects,
    subtopics,
    batches,
    selectedExamId,
    setSelectedExamId,
    createExam,
    updateExam,
    deleteExam,
    createSubject,
    updateSubject,
    deleteSubject,
    createSubtopic,
    updateSubtopic,
    deleteSubtopic,
    openBatchModal,
    openQuickSchedule,
    showToast,
  } = useStudy();

  const [search, setSearch] = useState('');
  const [masteryFilter, setMasteryFilter] = useState<MasteryLevel | 'all'>('all');
  const [practicedFilter, setPracticedFilter] = useState<'all' | 'yes' | 'no'>('all');

  const [collapsedExamIds, setCollapsedExamIds] = useState<Record<string, boolean>>({});
  const [collapsedSubjectIds, setCollapsedSubjectIds] = useState<Record<string, boolean>>({});
  const [expandedSubtopicId, setExpandedSubtopicId] = useState<string | null>(null);

  const [openMenuExamId, setOpenMenuExamId] = useState<string | null>(null);
  const [openMenuSubjectId, setOpenMenuSubjectId] = useState<string | null>(null);

  const examMenuRef = useRef<HTMLDivElement | null>(null);
  const subjectMenuRef = useRef<HTMLDivElement | null>(null);

  // Modals state
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [defaultSubjectExamId, setDefaultSubjectExamId] = useState<string | null>(null);

  const [subtopicModalOpen, setSubtopicModalOpen] = useState(false);
  const [editingSubtopic, setEditingSubtopic] = useState<Subtopic | null>(null);
  const [defaultSubtopicSubjectId, setDefaultSubtopicSubjectId] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    if (!openMenuExamId && !openMenuSubjectId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        openMenuExamId &&
        examMenuRef.current &&
        !examMenuRef.current.contains(e.target as Node)
      ) {
        setOpenMenuExamId(null);
      }
      if (
        openMenuSubjectId &&
        subjectMenuRef.current &&
        !subjectMenuRef.current.contains(e.target as Node)
      ) {
        setOpenMenuSubjectId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuExamId, openMenuSubjectId]);

  const toggleExamCollapse = (id: string) => {
    setCollapsedExamIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSubjectCollapse = (id: string) => {
    setCollapsedSubjectIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandSubtopic = (id: string) => {
    setExpandedSubtopicId((prev) => (prev === id ? null : id));
  };

  const examIdsSet = useMemo(() => new Set(exams.map((e) => e.id)), [exams]);

  const unassignedSubjectsCount = useMemo(
    () => subjects.filter((s) => !s.exam_id || !examIdsSet.has(s.exam_id)).length,
    [subjects, examIdsSet]
  );

  const visibleSubjectsForSubtopicModal = useMemo(() => {
    if (selectedExamId === 'all') return subjects;
    if (selectedExamId === 'unassigned') {
      return subjects.filter((s) => !s.exam_id || !examIdsSet.has(s.exam_id));
    }
    const inSelected = subjects.filter((s) => s.exam_id === selectedExamId);
    return inSelected.length > 0 ? inSelected : subjects;
  }, [subjects, selectedExamId, examIdsSet]);

  const groupedData = useMemo(() => {
    const q = search.trim().toLowerCase();
    const hasActiveSubFilters =
      masteryFilter !== 'all' || practicedFilter !== 'all' || Boolean(q);

    const buildSubjectEntries = (examSubjects: Subject[], examMatchesSearch: boolean) => {
      return examSubjects
        .map((subject) => {
          const subjectMatches =
            !q ||
            examMatchesSearch ||
            subject.name.toLowerCase().includes(q) ||
            subject.description.toLowerCase().includes(q);

          const subjectSubtopics = subtopics
            .filter((t) => t.subject_id === subject.id)
            .map((t) => ({
              subtopic: t,
              stats: computeSubtopicStats(t.id, batches),
            }))
            .filter(({ subtopic, stats }) => {
              const textMatch =
                subjectMatches ||
                subtopic.title.toLowerCase().includes(q) ||
                subtopic.notes.toLowerCase().includes(q);
              const masteryMatch =
                masteryFilter === 'all' || stats.mastery === masteryFilter;
              const hasPracticed = subtopic.practiced_questions || stats.batchCount > 0;
              const practicedMatch =
                practicedFilter === 'all' ||
                (practicedFilter === 'yes' && hasPracticed) ||
                (practicedFilter === 'no' && !hasPracticed);

              return textMatch && masteryMatch && practicedMatch;
            });

          const visible =
            !hasActiveSubFilters ||
            (subjectMatches && masteryFilter === 'all' && practicedFilter === 'all') ||
            subjectSubtopics.length > 0;

          return {
            subject,
            stats: computeSubjectStats(subject.id, subtopics, batches),
            items: subjectSubtopics,
            visible,
          };
        })
        .filter((entry) => entry.visible);
    };

    const groups: {
      groupKey: string;
      exam: Exam | null;
      examStats: ReturnType<typeof computeExamStats>;
      subjects: ReturnType<typeof buildSubjectEntries>;
    }[] = [];

    for (const exam of exams) {
      if (selectedExamId !== 'all' && selectedExamId !== exam.id) continue;

      const examMatchesSearch =
        Boolean(q) &&
        (exam.name.toLowerCase().includes(q) ||
          exam.board.toLowerCase().includes(q) ||
          exam.description.toLowerCase().includes(q));

      const rawExamSubjects = subjects.filter((s) => s.exam_id === exam.id);
      const filteredSubjects = buildSubjectEntries(rawExamSubjects, examMatchesSearch);

      const groupVisible =
        !hasActiveSubFilters ||
        (examMatchesSearch && masteryFilter === 'all' && practicedFilter === 'all') ||
        filteredSubjects.length > 0;

      if (groupVisible) {
        groups.push({
          groupKey: exam.id,
          exam,
          examStats: computeExamStats(exam.id, subjects, subtopics, batches),
          subjects: filteredSubjects,
        });
      }
    }

    const rawUnassigned = subjects.filter((s) => !s.exam_id || !examIdsSet.has(s.exam_id));
    if (
      rawUnassigned.length > 0 &&
      (selectedExamId === 'all' || selectedExamId === 'unassigned')
    ) {
      const filteredUnassigned = buildSubjectEntries(rawUnassigned, false);
      if (!hasActiveSubFilters || filteredUnassigned.length > 0) {
        groups.push({
          groupKey: 'unassigned',
          exam: null,
          examStats: computeExamStats(null, rawUnassigned, subtopics, batches),
          subjects: filteredUnassigned,
        });
      }
    }

    return groups;
  }, [
    exams,
    subjects,
    subtopics,
    batches,
    selectedExamId,
    search,
    masteryFilter,
    practicedFilter,
    examIdsSet,
  ]);

  const handleOpenNewSubject = (examId?: string | null) => {
    setEditingSubject(null);
    const resolvedExam =
      examId ??
      (selectedExamId !== 'all' && selectedExamId !== 'unassigned' ? selectedExamId : null);
    setDefaultSubjectExamId(resolvedExam);
    setSubjectModalOpen(true);
  };

  const handleDeleteExam = async (exam: Exam) => {
    const subjectCount = subjects.filter((s) => s.exam_id === exam.id).length;
    const confirmed = window.confirm(
      `Excluir o concurso "${exam.name}"${
        subjectCount > 0
          ? ` e suas ${subjectCount} ${subjectCount === 1 ? 'matéria vinculada' : 'matérias vinculadas'} (incluindo subtópicos, questões e sessões)`
          : ''
      }? Essa ação não pode ser desfeita.`
    );
    if (!confirmed) return;
    await deleteExam(exam.id);
  };

  const handleDeleteSubject = async (subject: Subject) => {
    const count = subtopics.filter((t) => t.subject_id === subject.id).length;
    const confirmed = window.confirm(
      `Excluir a matéria "${subject.name}"${count > 0 ? ` e seus ${count} subtópicos` : ''}? Essa ação não pode ser desfeita.`
    );
    if (!confirmed) return;
    await deleteSubject(subject.id);
  };

  const handleDeleteSubtopic = async (subtopic: Subtopic) => {
    const confirmed = window.confirm(
      `Excluir o subtópico "${subtopic.title}" e seu histórico de questões?`
    );
    if (!confirmed) return;
    if (expandedSubtopicId === subtopic.id) {
      setExpandedSubtopicId(null);
    }
    await deleteSubtopic(subtopic.id);
  };

  const handleTogglePracticed = async (subtopic: Subtopic) => {
    const next = !subtopic.practiced_questions;
    await updateSubtopic(subtopic.id, { practiced_questions: next });
    showToast(
      next ? 'Marcado como questões resolvidas.' : 'Desmarcado resolução de questões.',
      'info'
    );
  };

  const handleQuickStatusChange = async (subtopic: Subtopic, nextStatus: StudyStatus) => {
    await updateSubtopic(subtopic.id, { study_status: nextStatus });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Concursos & Matérias
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Agrupe suas matérias e subtópicos por edital para acompanhar múltiplos concursos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {subjects.length > 0 && (
            <button
              onClick={() => {
                setEditingSubtopic(null);
                setDefaultSubtopicSubjectId(visibleSubjectsForSubtopicModal[0]?.id);
                setSubtopicModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Subtópico
            </button>
          )}
          <button
            onClick={() => {
              setEditingExam(null);
              setExamModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50/70 dark:bg-brand-950/40 hover:bg-brand-100/80 dark:hover:bg-brand-950/70 text-xs sm:text-sm font-medium text-brand-700 dark:text-brand-300 transition-colors"
          >
            <Award className="w-4 h-4" />
            Novo concurso
          </button>
          <button
            onClick={() => handleOpenNewSubject(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova matéria
          </button>
        </div>
      </div>

      {/* Exam Filter Pills */}
      {(exams.length > 0 || unassignedSubjectsCount > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedExamId('all')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedExamId === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>Todos os concursos</span>
            <span
              className={`text-[11px] tabular-nums ${
                selectedExamId === 'all'
                  ? 'text-white/75 dark:text-slate-600'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {exams.length}
            </span>
          </button>

          {exams.map((exam) => {
            const count = subjects.filter((s) => s.exam_id === exam.id).length;
            const active = selectedExamId === exam.id;
            return (
              <button
                key={exam.id}
                type="button"
                onClick={() => setSelectedExamId(exam.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: exam.color }}
                />
                <span className="truncate max-w-[180px]">{exam.name}</span>
                <span
                  className={`text-[11px] tabular-nums ${
                    active
                      ? 'text-white/75 dark:text-slate-600'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {unassignedSubjectsCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedExamId('unassigned')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedExamId === 'unassigned'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70 hover:bg-amber-100/70'
              }`}
            >
              <span>Sem concurso</span>
              <span className="text-[11px] tabular-nums opacity-80">
                {unassignedSubjectsCount}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Search & Filters bar */}
      {(exams.length > 0 || subjects.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar concurso, matéria ou subtópico..."
              className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={masteryFilter}
              onChange={(e) => setMasteryFilter(e.target.value as MasteryLevel | 'all')}
              className="px-3 py-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="all">Compreensão: Todos</option>
              <option value="critical">Crítico (&lt; 50%)</option>
              <option value="basic">Básico (50% – 69%)</option>
              <option value="good">Bom (70% – 84%)</option>
              <option value="mastered">Dominado (≥ 85%)</option>
              <option value="unrated">Não avaliado</option>
            </select>

            <select
              value={practicedFilter}
              onChange={(e) => setPracticedFilter(e.target.value as 'all' | 'yes' | 'no')}
              className="px-3 py-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="all">Questões: Todos</option>
              <option value="yes">Com questões</option>
              <option value="no">Sem questões</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {exams.length === 0 && subjects.length === 0 ? (
        <div className="py-16 px-6 text-center rounded-xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-3">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Nenhum concurso cadastrado
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
            Cadastre o concurso para o qual está estudando e adicione as matérias do edital para organizar seus tópicos separadamente.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={() => {
                setEditingExam(null);
                setExamModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Cadastrar concurso
            </button>
          </div>
        </div>
      ) : groupedData.length === 0 ? (
        <div className="py-12 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-sm text-slate-500">
          Nenhum resultado encontrado com os filtros aplicados.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedData.map(({ groupKey, exam, examStats, subjects: groupSubjects }) => {
            const isExamCollapsed = Boolean(collapsedExamIds[groupKey]);
            const examMastery = MASTERY_META[examStats.mastery];
            const isExamMenuOpen = exam ? openMenuExamId === exam.id : false;
            const daysLeft = exam?.exam_date ? daysUntilISO(exam.exam_date) : null;

            return (
              <section
                key={groupKey}
                className="rounded-2xl bg-slate-100/75 dark:bg-slate-900/55 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-5 space-y-3.5"
              >
                {/* Concurso Group Header */}
                <div className="flex items-start sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleExamCollapse(groupKey)}
                    className="flex items-start sm:items-center gap-3 min-w-0 flex-1 text-left group"
                  >
                    <span className="mt-1 sm:mt-0 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                      {isExamCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </span>

                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: exam?.color ?? '#64748B' }}
                    >
                      {exam ? (
                        <Award className="w-4 h-4" />
                      ) : (
                        <FolderOpen className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                          {exam ? exam.name : 'Matérias sem concurso vinculado'}
                        </h3>

                        {exam?.board && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                            {exam.board}
                          </span>
                        )}

                        {exam?.exam_date && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 tabular-nums">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatDateBR(exam.exam_date)}
                            {daysLeft !== null && (
                              <span
                                className={
                                  daysLeft > 0
                                    ? 'text-brand-600 dark:text-brand-400 font-semibold'
                                    : daysLeft === 0
                                      ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                      : 'text-slate-400'
                                }
                              >
                                {daysLeft > 0
                                  ? `• ${daysLeft}d`
                                  : daysLeft === 0
                                    ? '• Hoje!'
                                    : ''}
                              </span>
                            )}
                          </span>
                        )}

                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {examStats.subjectCount}{' '}
                          {examStats.subjectCount === 1 ? 'matéria' : 'matérias'} •{' '}
                          {examStats.subtopicCount}{' '}
                          {examStats.subtopicCount === 1 ? 'tópico' : 'tópicos'}
                        </span>
                      </div>

                      {exam?.description ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {exam.description}
                        </p>
                      ) : !exam ? (
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                          Edite estas matérias para atribuí-las ao concurso correspondente.
                        </p>
                      ) : null}
                    </div>
                  </button>

                  {/* Concurso Right Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {examStats.accuracy !== null && (
                      <span
                        className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums"
                        title={`Média geral do concurso: ${examMastery.label} (${examStats.correctAnswers}/${examStats.totalQuestions})`}
                      >
                        <span className={`w-2 h-2 rounded-full ${examMastery.dotClass}`} />
                        {Math.round(examStats.accuracy)}%
                      </span>
                    )}

                    {exam && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenNewSubject(exam.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950/40 border border-slate-200/80 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                          title="Nova matéria neste concurso"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Matéria</span>
                        </button>

                        <div
                          className="relative"
                          ref={isExamMenuOpen ? examMenuRef : undefined}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuExamId(isExamMenuOpen ? null : exam.id)
                            }
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                            title="Opções do concurso"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {isExamMenuOpen && (
                            <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg py-1 z-20">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuExamId(null);
                                  handleOpenNewSubject(exam.id);
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                              >
                                <Plus className="w-3.5 h-3.5 text-slate-400" />
                                Nova matéria
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuExamId(null);
                                  setEditingExam(exam);
                                  setExamModalOpen(true);
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                Editar concurso
                              </button>
                              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuExamId(null);
                                  handleDeleteExam(exam);
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Excluir concurso
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Subjects inside this Concurso */}
                {!isExamCollapsed && (
                  <div className="space-y-3">
                    {groupSubjects.length === 0 ? (
                      <div className="py-8 px-4 text-center rounded-xl bg-white/80 dark:bg-slate-900/80 border border-dashed border-slate-200 dark:border-slate-800">
                        <BookOpen className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                          Nenhuma matéria cadastrada neste concurso ainda.
                        </p>
                        {exam && (
                          <button
                            type="button"
                            onClick={() => handleOpenNewSubject(exam.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Adicionar matéria
                          </button>
                        )}
                      </div>
                    ) : (
                      groupSubjects.map(({ subject, stats, items }) => {
                        const isCollapsed = Boolean(collapsedSubjectIds[subject.id]);
                        const subjectMastery = MASTERY_META[stats.mastery];
                        const isMenuOpen = openMenuSubjectId === subject.id;

                        return (
                          <div
                            key={subject.id}
                            className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 overflow-visible shadow-2xs"
                          >
                            {/* Subject Header */}
                            <div className="px-4 py-3.5 sm:px-5 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80">
                              <button
                                type="button"
                                onClick={() => toggleSubjectCollapse(subject.id)}
                                className="flex items-center gap-3 min-w-0 flex-1 text-left group"
                              >
                                <span className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                                  {isCollapsed ? (
                                    <ChevronRight className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </span>

                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: subject.color }}
                                />

                                <div className="min-w-0 flex items-center gap-2.5 flex-wrap">
                                  <h4 className="text-sm sm:text-[15px] font-semibold text-slate-900 dark:text-white truncate">
                                    {subject.name}
                                  </h4>
                                  <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                                    {stats.subtopicCount}{' '}
                                    {stats.subtopicCount === 1 ? 'tópico' : 'tópicos'}
                                  </span>
                                </div>
                              </button>

                              {/* Subject Right Summary & Compact Menu */}
                              <div className="flex items-center gap-2 shrink-0">
                                {!exam && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSubject(subject);
                                      setSubjectModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100"
                                  >
                                    Vincular concurso
                                  </button>
                                )}

                                {stats.accuracy !== null && (
                                  <span
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums mr-1"
                                    title={`Compreensão média: ${subjectMastery.label} (${stats.correctAnswers}/${stats.totalQuestions})`}
                                  >
                                    <span
                                      className={`w-2 h-2 rounded-full ${subjectMastery.dotClass}`}
                                    />
                                    {Math.round(stats.accuracy)}%
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSubtopic(null);
                                    setDefaultSubtopicSubjectId(subject.id);
                                    setSubtopicModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Adicionar subtópico"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>

                                <div
                                  className="relative"
                                  ref={isMenuOpen ? subjectMenuRef : undefined}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenMenuSubjectId(isMenuOpen ? null : subject.id)
                                    }
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Opções da matéria"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>

                                  {isMenuOpen && (
                                    <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg py-1 z-20">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuSubjectId(null);
                                          openQuickSchedule({
                                            subjectId: subject.id,
                                            sessionType: 'theory',
                                          });
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                      >
                                        <CalendarPlus className="w-3.5 h-3.5 text-slate-400" />
                                        Agendar matéria
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuSubjectId(null);
                                          setEditingSubject(subject);
                                          setSubjectModalOpen(true);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                      >
                                        <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                        Editar matéria
                                      </button>
                                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuSubjectId(null);
                                          handleDeleteSubject(subject);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Excluir matéria
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Subtopics List */}
                            {!isCollapsed && (
                              <div className="divide-y divide-slate-100/90 dark:divide-slate-800/70">
                                {items.length === 0 ? (
                                  <div className="px-5 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                                    Nenhum subtópico encontrado.{' '}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingSubtopic(null);
                                        setDefaultSubtopicSubjectId(subject.id);
                                        setSubtopicModalOpen(true);
                                      }}
                                      className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
                                    >
                                      Adicionar
                                    </button>
                                  </div>
                                ) : (
                                  items.map(({ subtopic, stats: subStats }) => {
                                    const masteryMeta = MASTERY_META[subStats.mastery];
                                    const statusMeta = STUDY_STATUS_META[subtopic.study_status];
                                    const hasPracticed =
                                      subtopic.practiced_questions || subStats.batchCount > 0;
                                    const isExpanded = expandedSubtopicId === subtopic.id;

                                    return (
                                      <div key={subtopic.id}>
                                        <button
                                          type="button"
                                          onClick={() => toggleExpandSubtopic(subtopic.id)}
                                          className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4 text-left transition-colors ${
                                            isExpanded
                                              ? 'bg-slate-50/90 dark:bg-slate-800/40'
                                              : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/25'
                                          }`}
                                        >
                                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate min-w-0">
                                            {subtopic.title}
                                          </span>

                                          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                                            <span
                                              className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${statusMeta.badgeClass}`}
                                            >
                                              {statusMeta.label}
                                            </span>

                                            <span
                                              className="inline-flex items-center justify-end gap-1.5 w-14 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200"
                                              title={
                                                subStats.accuracy !== null
                                                  ? `${formatPercent(subStats.accuracy)} — ${masteryMeta.label}`
                                                  : 'Não avaliado'
                                              }
                                            >
                                              <span
                                                className={`w-2 h-2 rounded-full shrink-0 ${masteryMeta.dotClass}`}
                                              />
                                              {subStats.accuracy !== null ? (
                                                formatPercent(subStats.accuracy)
                                              ) : (
                                                <span className="text-slate-400 font-normal">
                                                  —
                                                </span>
                                              )}
                                            </span>

                                            <ChevronDown
                                              className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
                                                isExpanded
                                                  ? 'rotate-180 text-slate-600 dark:text-slate-300'
                                                  : ''
                                              }`}
                                            />
                                          </div>
                                        </button>

                                        {isExpanded && (
                                          <div className="px-4 sm:px-6 py-4 bg-slate-50/70 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/70 space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                                                    Compreensão
                                                  </span>
                                                  <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                                                    {subStats.accuracy !== null
                                                      ? `${formatPercent(subStats.accuracy)} • ${masteryMeta.label}`
                                                      : 'Não avaliado'}
                                                  </span>
                                                </div>
                                                <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700/80 overflow-hidden">
                                                  <div
                                                    className={`h-full rounded-full transition-all ${masteryMeta.barClass}`}
                                                    style={{
                                                      width: `${subStats.accuracy !== null ? Math.min(100, subStats.accuracy) : 0}%`,
                                                    }}
                                                  />
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                                                  <span>
                                                    {subStats.correctAnswers}/
                                                    {subStats.totalQuestions} acertos
                                                  </span>
                                                  <span>•</span>
                                                  <span>
                                                    {subStats.batchCount}{' '}
                                                    {subStats.batchCount === 1
                                                      ? 'bateria'
                                                      : 'baterias'}
                                                  </span>
                                                  {subStats.lastPracticedAt && (
                                                    <>
                                                      <span>•</span>
                                                      <span>
                                                        Última:{' '}
                                                        {subStats.lastPracticedAt
                                                          .split('-')
                                                          .reverse()
                                                          .join('/')}
                                                      </span>
                                                    </>
                                                  )}
                                                </div>
                                              </div>

                                              <div className="space-y-2.5">
                                                <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                  Andamento
                                                </span>
                                                <div className="flex flex-wrap gap-1.5">
                                                  {(
                                                    Object.keys(STUDY_STATUS_META) as StudyStatus[]
                                                  ).map((st) => {
                                                    const active = subtopic.study_status === st;
                                                    return (
                                                      <button
                                                        key={st}
                                                        type="button"
                                                        onClick={() =>
                                                          handleQuickStatusChange(subtopic, st)
                                                        }
                                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                                          active
                                                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                        }`}
                                                      >
                                                        {STUDY_STATUS_META[st].label}
                                                      </button>
                                                    );
                                                  })}
                                                </div>

                                                <button
                                                  type="button"
                                                  onClick={() => handleTogglePracticed(subtopic)}
                                                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white pt-0.5"
                                                >
                                                  {hasPracticed ? (
                                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                  ) : (
                                                    <Square className="w-3.5 h-3.5 text-slate-400" />
                                                  )}
                                                  <span>
                                                    {hasPracticed
                                                      ? 'Questões resolvidas'
                                                      : 'Marcar questões como resolvidas'}
                                                  </span>
                                                </button>
                                              </div>
                                            </div>

                                            {subtopic.notes && (
                                              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                                  {subtopic.notes}
                                                </p>
                                              </div>
                                            )}

                                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                              <button
                                                type="button"
                                                onClick={() => openBatchModal(subtopic.id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors"
                                              >
                                                <ClipboardList className="w-3.5 h-3.5" />
                                                Registrar questões
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  openQuickSchedule({
                                                    subjectId: subject.id,
                                                    subtopicId: subtopic.id,
                                                    sessionType:
                                                      subStats.mastery === 'critical' ||
                                                      subStats.mastery === 'basic'
                                                        ? 'review'
                                                        : 'questions',
                                                  })
                                                }
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                                              >
                                                <CalendarPlus className="w-3.5 h-3.5" />
                                                Agendar
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditingSubtopic(subtopic);
                                                  setSubtopicModalOpen(true);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                                              >
                                                <Edit3 className="w-3.5 h-3.5" />
                                                Editar
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteSubtopic(subtopic)}
                                                className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Excluir
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <ExamModal
        isOpen={examModalOpen}
        editingExam={editingExam}
        onClose={() => setExamModalOpen(false)}
        onSave={async (input) => {
          if (editingExam) {
            await updateExam(editingExam.id, input);
          } else {
            await createExam(input);
          }
        }}
      />

      <SubjectModal
        isOpen={subjectModalOpen}
        exams={exams}
        defaultExamId={defaultSubjectExamId}
        editingSubject={editingSubject}
        onClose={() => setSubjectModalOpen(false)}
        onCreateExamInline={createExam}
        onSave={async (input) => {
          if (editingSubject) {
            await updateSubject(editingSubject.id, input);
          } else {
            await createSubject(input);
          }
        }}
      />

      <SubtopicModal
        isOpen={subtopicModalOpen}
        subjects={visibleSubjectsForSubtopicModal}
        defaultSubjectId={defaultSubtopicSubjectId}
        editingSubtopic={editingSubtopic}
        onClose={() => setSubtopicModalOpen(false)}
        onSave={async (input) => {
          if (editingSubtopic) {
            await updateSubtopic(editingSubtopic.id, input);
            showToast('Subtópico atualizado.');
          } else {
            await createSubtopic(input);
          }
        }}
      />
    </div>
  );
};
