import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CalendarPlus,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Edit3,
  MoreHorizontal,
  Plus,
  Search,
  Square,
  Trash2,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import type { MasteryLevel, StudyStatus, Subject, Subtopic } from '../types';
import {
  computeSubjectStats,
  computeSubtopicStats,
  formatPercent,
  MASTERY_META,
  STUDY_STATUS_META,
} from '../utils/mastery';
import { SubjectModal } from '../components/SubjectModal';
import { SubtopicModal } from '../components/SubtopicModal';

export const SubjectsPage: React.FC = () => {
  const {
    subjects,
    subtopics,
    batches,
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
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  const [expandedSubtopicId, setExpandedSubtopicId] = useState<string | null>(null);
  const [openMenuSubjectId, setOpenMenuSubjectId] = useState<string | null>(null);

  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  // Modals state
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [subtopicModalOpen, setSubtopicModalOpen] = useState(false);
  const [editingSubtopic, setEditingSubtopic] = useState<Subtopic | null>(null);
  const [defaultSubtopicSubjectId, setDefaultSubtopicSubjectId] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    if (!openMenuSubjectId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuSubjectId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuSubjectId]);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandSubtopic = (id: string) => {
    setExpandedSubtopicId((prev) => (prev === id ? null : id));
  };

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();

    return subjects
      .map((subject) => {
        const subjectMatches =
          !q ||
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

        const hasActiveSubFilters =
          masteryFilter !== 'all' || practicedFilter !== 'all' || Boolean(q);
        const visible =
          !hasActiveSubFilters || subjectMatches || subjectSubtopics.length > 0;

        return {
          subject,
          stats: computeSubjectStats(subject.id, subtopics, batches),
          items: subjectSubtopics,
          visible,
        };
      })
      .filter((entry) => entry.visible);
  }, [subjects, subtopics, batches, search, masteryFilter, practicedFilter]);

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
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Matérias & Subtópicos
        </h2>

        <div className="flex items-center gap-2">
          {subjects.length > 0 && (
            <button
              onClick={() => {
                setEditingSubtopic(null);
                setDefaultSubtopicSubjectId(subjects[0]?.id);
                setSubtopicModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Subtópico
            </button>
          )}
          <button
            onClick={() => {
              setEditingSubject(null);
              setSubjectModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova matéria
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar matéria ou subtópico..."
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

      {/* Subjects List */}
      {subjects.length === 0 ? (
        <div className="py-16 px-6 text-center rounded-xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Nenhuma matéria cadastrada
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            Adicione as disciplinas do seu edital para organizar subtópicos e acompanhar sua compreensão.
          </p>
          <button
            onClick={() => {
              setEditingSubject(null);
              setSubjectModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Cadastrar matéria
          </button>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="py-12 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-sm text-slate-500">
          Nenhum resultado encontrado com os filtros aplicados.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredData.map(({ subject, stats, items }) => {
            const isCollapsed = Boolean(collapsedIds[subject.id]);
            const subjectMastery = MASTERY_META[stats.mastery];
            const isMenuOpen = openMenuSubjectId === subject.id;

            return (
              <div
                key={subject.id}
                className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 overflow-visible"
              >
                {/* Subject Header */}
                <div className="px-4 py-3.5 sm:px-5 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(subject.id)}
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
                      <h3 className="text-sm sm:text-[15px] font-semibold text-slate-900 dark:text-white truncate">
                        {subject.name}
                      </h3>
                      <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                        {stats.subtopicCount}{' '}
                        {stats.subtopicCount === 1 ? 'tópico' : 'tópicos'}
                      </span>
                    </div>
                  </button>

                  {/* Subject Right Summary & Compact Menu */}
                  <div className="flex items-center gap-2 shrink-0">
                    {stats.accuracy !== null && (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums mr-1"
                        title={`Compreensão média: ${subjectMastery.label} (${stats.correctAnswers}/${stats.totalQuestions})`}
                      >
                        <span className={`w-2 h-2 rounded-full ${subjectMastery.dotClass}`} />
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
                      ref={isMenuOpen ? menuContainerRef : undefined}
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
                            {/* Compact Subtopic Row — ONLY Title, Andamento, Taxa de Compreensão */}
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
                                {/* Andamento */}
                                <span
                                  className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${statusMeta.badgeClass}`}
                                >
                                  {statusMeta.label}
                                </span>

                                {/* Taxa de compreensão */}
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
                                    <span className="text-slate-400 font-normal">—</span>
                                  )}
                                </span>

                                {/* Expand chevron */}
                                <ChevronDown
                                  className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
                                    isExpanded ? 'rotate-180 text-slate-600 dark:text-slate-300' : ''
                                  }`}
                                />
                              </div>
                            </button>

                            {/* Expanded Subtopic Details */}
                            {isExpanded && (
                              <div className="px-4 sm:px-6 py-4 bg-slate-50/70 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/70 space-y-4">
                                {/* Comprehension + Progress Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Comprehension breakdown */}
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
                                        {subStats.correctAnswers}/{subStats.totalQuestions} acertos
                                      </span>
                                      <span>•</span>
                                      <span>
                                        {subStats.batchCount}{' '}
                                        {subStats.batchCount === 1 ? 'bateria' : 'baterias'}
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

                                  {/* Quick Status & Practiced toggle */}
                                  <div className="space-y-2.5">
                                    <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">
                                      Andamento
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {(Object.keys(STUDY_STATUS_META) as StudyStatus[]).map(
                                        (st) => {
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
                                        }
                                      )}
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

                                {/* Notes (only if present) */}
                                {subtopic.notes && (
                                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                      {subtopic.notes}
                                    </p>
                                  </div>
                                )}

                                {/* Actions */}
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
          })}
        </div>
      )}

      {/* Modals */}
      <SubjectModal
        isOpen={subjectModalOpen}
        editingSubject={editingSubject}
        onClose={() => setSubjectModalOpen(false)}
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
        subjects={subjects}
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
