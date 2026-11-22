import React, { useEffect, useMemo, useState } from 'react';
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Plus,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import type { SessionType, StudySession } from '../types';
import { SESSION_TYPE_META, todayISO } from '../utils/mastery';
import { SessionModal } from '../components/SessionModal';

type CalendarView = 'month' | 'week';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const CalendarPage: React.FC = () => {
  const {
    subjects,
    subtopics,
    sessions,
    createSession,
    updateSession,
    deleteSession,
    quickSchedule,
    clearQuickSchedule,
    showToast,
  } = useStudy();

  const [view, setView] = useState<CalendarView>('month');
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date());
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string>(todayISO());
  const [modalDefaultSubjectId, setModalDefaultSubjectId] = useState<string | undefined>(
    undefined
  );
  const [modalDefaultSubtopicId, setModalDefaultSubtopicId] = useState<string | null | undefined>(
    undefined
  );
  const [modalDefaultType, setModalDefaultType] = useState<SessionType | undefined>(undefined);
  const [modalDefaultNotes, setModalDefaultNotes] = useState<string | undefined>(undefined);

  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const today = todayISO();

  // Abre modal automaticamente quando vem de um alerta de revisão ou atalho de matéria
  useEffect(() => {
    if (quickSchedule) {
      setEditingSession(null);
      setModalDefaultDate(quickSchedule.date || todayISO());
      setModalDefaultSubjectId(quickSchedule.subjectId);
      setModalDefaultSubtopicId(quickSchedule.subtopicId ?? null);
      setModalDefaultType(quickSchedule.sessionType ?? 'review');
      setModalDefaultNotes(quickSchedule.notes ?? '');
      setModalOpen(true);
      clearQuickSchedule();
    }
  }, [quickSchedule, clearQuickSchedule]);

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const subtopicMap = useMemo(() => new Map(subtopics.map((t) => [t.id, t])), [subtopics]);

  const days = useMemo(() => {
    if (view === 'month') {
      const start = startOfWeek(startOfMonth(cursorDate), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(cursorDate), { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end });
    }
    const start = startOfWeek(cursorDate, { weekStartsOn: 0 });
    const end = endOfWeek(cursorDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursorDate, view]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, StudySession[]>();
    const filtered =
      subjectFilter === 'all'
        ? sessions
        : sessions.filter((s) => s.subject_id === subjectFilter);

    for (const ses of filtered) {
      const list = map.get(ses.scheduled_date) ?? [];
      list.push(ses);
      map.set(ses.scheduled_date, list);
    }

    for (const list of map.values()) {
      list.sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99'));
    }

    return map;
  }, [sessions, subjectFilter]);

  const periodSummary = useMemo(() => {
    const dateSet = new Set(days.map((d) => format(d, 'yyyy-MM-dd')));
    const inPeriod = sessions.filter(
      (s) =>
        dateSet.has(s.scheduled_date) &&
        (subjectFilter === 'all' || s.subject_id === subjectFilter)
    );
    const totalMinutes = inPeriod.reduce((acc, s) => acc + s.duration_minutes, 0);
    const completedCount = inPeriod.filter((s) => s.completed).length;
    return {
      totalSessions: inPeriod.length,
      completedCount,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    };
  }, [days, sessions, subjectFilter]);

  const handlePrev = () => {
    setCursorDate((prev) => (view === 'month' ? subMonths(prev, 1) : subWeeks(prev, 1)));
  };

  const handleNext = () => {
    setCursorDate((prev) => (view === 'month' ? addMonths(prev, 1) : addWeeks(prev, 1)));
  };

  const handleOpenNewForDate = (dateIso: string) => {
    setEditingSession(null);
    setModalDefaultDate(dateIso);
    setModalDefaultSubjectId(subjectFilter !== 'all' ? subjectFilter : subjects[0]?.id);
    setModalDefaultSubtopicId(null);
    setModalDefaultType('theory');
    setModalDefaultNotes('');
    setModalOpen(true);
  };

  const handleOpenEdit = (session: StudySession) => {
    setEditingSession(session);
    setModalOpen(true);
  };

  const handleToggleCompleted = async (e: React.MouseEvent, session: StudySession) => {
    e.stopPropagation();
    await updateSession(session.id, { completed: !session.completed });
    showToast(
      !session.completed ? 'Sessão marcada como concluída!' : 'Sessão marcada como pendente.',
      'info'
    );
  };

  const handleDropOnDate = async (targetDateIso: string) => {
    setDragOverDate(null);
    if (!draggedSessionId) return;
    const session = sessions.find((s) => s.id === draggedSessionId);
    setDraggedSessionId(null);
    if (!session || session.scheduled_date === targetDateIso) return;

    await updateSession(session.id, { scheduled_date: targetDateIso });
    showToast(
      `Sessão movida para ${targetDateIso.split('-').reverse().join('/')}.`,
      'info'
    );
  };

  const headerTitle =
    view === 'month'
      ? format(cursorDate, "MMMM 'de' yyyy", { locale: ptBR })
      : `Semana de ${format(days[0], 'dd/MM', { locale: ptBR })} a ${format(
          days[days.length - 1],
          'dd/MM/yyyy',
          { locale: ptBR }
        )}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Calendário
        </h2>

        <button
          onClick={() => handleOpenNewForDate(today)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agendar estudo
        </button>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Date Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            aria-label="Período anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCursorDate(new Date())}
            className="px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Hoje
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            aria-label="Próximo período"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <h3 className="text-sm sm:text-base font-semibold capitalize text-slate-900 dark:text-white ml-2">
            {headerTitle}
          </h3>
        </div>

        {/* Right Controls: Summary + Subject filter + View switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span>
              <strong className="font-semibold text-slate-700 dark:text-slate-200">
                {periodSummary.completedCount}
              </strong>
              /{periodSummary.totalSessions} concluídas
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {periodSummary.totalHours}h
            </span>
          </div>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="all">Todas as matérias</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <div className="inline-flex p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800">
            <button
              onClick={() => setView('month')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                view === 'month'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                view === 'week'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Semanal
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[740px]">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
              {WEEKDAYS.map((wd) => (
                <div
                  key={wd}
                  className="py-2.5 px-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
              {days.map((day) => {
                const dateIso = format(day, 'yyyy-MM-dd');
                const daySessions = sessionsByDate.get(dateIso) ?? [];
                const isToday = dateIso === today;
                const inCurrentMonth = view === 'week' || isSameMonth(day, cursorDate);
                const isDropTarget = dragOverDate === dateIso;

                return (
                  <div
                    key={dateIso}
                    onClick={() => handleOpenNewForDate(dateIso)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverDate !== dateIso) setDragOverDate(dateIso);
                    }}
                    onDragLeave={() => {
                      if (dragOverDate === dateIso) setDragOverDate(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnDate(dateIso);
                    }}
                    className={`group cursor-pointer p-2 transition-colors flex flex-col ${
                      view === 'week' ? 'min-h-[300px]' : 'min-h-[120px]'
                    } ${
                      !inCurrentMonth
                        ? 'bg-slate-50/60 dark:bg-slate-950/40 text-slate-400'
                        : 'bg-white dark:bg-slate-900'
                    } ${
                      isDropTarget
                        ? 'ring-2 ring-inset ring-brand-500 bg-brand-50/40 dark:bg-brand-950/30'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/25'
                    }`}
                  >
                    {/* Cell header */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold tabular-nums ${
                          isToday
                            ? 'bg-brand-600 text-white'
                            : inCurrentMonth
                              ? 'text-slate-700 dark:text-slate-200'
                              : 'text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>

                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-500">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {/* Sessions inside day */}
                    <div className="space-y-1 flex-1">
                      {daySessions.map((ses) => {
                        const subject = subjectMap.get(ses.subject_id);
                        const subtopic = ses.subtopic_id
                          ? subtopicMap.get(ses.subtopic_id)
                          : undefined;
                        const color = subject?.color ?? '#4F46E5';
                        const typeMeta = SESSION_TYPE_META[ses.session_type];

                        return (
                          <div
                            key={ses.id}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              setDraggedSessionId(ses.id);
                            }}
                            onDragEnd={() => {
                              setDraggedSessionId(null);
                              setDragOverDate(null);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(ses);
                            }}
                            className={`rounded-md px-2 py-1.5 border text-left transition-colors cursor-grab active:cursor-grabbing ${
                              ses.completed
                                ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 opacity-65'
                                : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                            style={{ borderLeftWidth: '3px', borderLeftColor: color }}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0 flex-1">
                                <span
                                  className={`block text-[11px] font-semibold truncate ${
                                    ses.completed
                                      ? 'line-through text-slate-400'
                                      : 'text-slate-800 dark:text-slate-100'
                                  }`}
                                >
                                  {subject?.name ?? 'Matéria'}
                                </span>
                                {subtopic && (
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {subtopic.title}
                                  </p>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => handleToggleCompleted(e, ses)}
                                className="text-slate-300 hover:text-emerald-600 shrink-0 mt-0.5"
                                title={ses.completed ? 'Desmarcar' : 'Concluir sessão'}
                              >
                                {ses.completed ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Circle className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            <div className="flex items-center justify-between gap-1 mt-1 text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                              <span>
                                {ses.start_time ? `${ses.start_time} • ` : ''}
                                {ses.duration_minutes}m
                              </span>
                              <span>{typeMeta.shortLabel}</span>
                            </div>

                            {view === 'week' && ses.notes && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 border-t border-slate-100 dark:border-slate-700 pt-1">
                                {ses.notes}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Session Modal */}
      <SessionModal
        isOpen={modalOpen}
        subjects={subjects}
        subtopics={subtopics}
        editingSession={editingSession}
        defaultDate={modalDefaultDate}
        defaultSubjectId={modalDefaultSubjectId}
        defaultSubtopicId={modalDefaultSubtopicId}
        defaultSessionType={modalDefaultType}
        defaultNotes={modalDefaultNotes}
        onClose={() => setModalOpen(false)}
        onSave={async (input) => {
          if (editingSession) {
            await updateSession(editingSession.id, input);
            showToast('Sessão atualizada.');
          } else {
            await createSession(input);
          }
        }}
        onDelete={deleteSession}
      />
    </div>
  );
};
