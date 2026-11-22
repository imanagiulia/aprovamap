import React, { useMemo } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarPlus,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStudy } from '../context/StudyContext';
import {
  addDaysISO,
  computeSubjectStats,
  formatPercent,
  getMasteryLevel,
  MASTERY_META,
  SESSION_TYPE_META,
  todayISO,
} from '../utils/mastery';

export const DashboardPage: React.FC = () => {
  const {
    subjects,
    subtopics,
    batches,
    sessions,
    reviewAlerts,
    setActiveTab,
    openQuickSchedule,
    updateSession,
    showToast,
  } = useStudy();

  const today = todayISO();

  const globalStats = useMemo(() => {
    const totalQuestions = batches.reduce((acc, b) => acc + b.total_questions, 0);
    const totalCorrect = batches.reduce((acc, b) => acc + b.correct_answers, 0);
    const globalAccuracy =
      totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 1000) / 10 : null;

    const practicedSubtopics = subtopics.filter((t) => {
      if (t.practiced_questions) return true;
      return batches.some((b) => b.subtopic_id === t.id);
    }).length;

    const weekAgo = addDaysISO(today, -6);
    const completedLast7Days = sessions.filter(
      (s) => s.completed && s.scheduled_date >= weekAgo && s.scheduled_date <= today
    ).length;
    const plannedToday = sessions.filter((s) => s.scheduled_date === today);

    return {
      totalQuestions,
      totalCorrect,
      globalAccuracy,
      globalMastery: getMasteryLevel(globalAccuracy),
      practicedSubtopics,
      practicedPct:
        subtopics.length > 0 ? Math.round((practicedSubtopics / subtopics.length) * 100) : 0,
      completedLast7Days,
      plannedTodayCount: plannedToday.length,
      completedTodayCount: plannedToday.filter((s) => s.completed).length,
    };
  }, [subtopics, batches, sessions, today]);

  const subjectChartData = useMemo(() => {
    return subjects.map((subject) => {
      const stats = computeSubjectStats(subject.id, subtopics, batches);
      return {
        id: subject.id,
        name: subject.name.length > 18 ? `${subject.name.slice(0, 16)}…` : subject.name,
        fullName: subject.name,
        taxa: stats.accuracy !== null ? Math.round(stats.accuracy) : 0,
        hasQuestions: stats.totalQuestions > 0,
        meta: subject.target_accuracy,
        color: subject.color,
        questoes: stats.totalQuestions,
        acertos: stats.correctAnswers,
      };
    });
  }, [subjects, subtopics, batches]);

  const upcomingSessions = useMemo(() => {
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    const subtopicMap = new Map(subtopics.map((t) => [t.id, t]));
    return sessions
      .filter((s) => s.scheduled_date >= today)
      .sort((a, b) => {
        const cmp = a.scheduled_date.localeCompare(b.scheduled_date);
        if (cmp !== 0) return cmp;
        return (a.start_time || '99:99').localeCompare(b.start_time || '99:99');
      })
      .slice(0, 5)
      .map((s) => ({
        session: s,
        subject: subjectMap.get(s.subject_id),
        subtopic: s.subtopic_id ? subtopicMap.get(s.subtopic_id) : undefined,
      }));
  }, [sessions, subjects, subtopics, today]);

  const topAlerts = useMemo(
    () => reviewAlerts.filter((a) => a.priority !== 'unpracticed').slice(0, 4),
    [reviewAlerts]
  );

  const urgentCount = reviewAlerts.filter((a) => a.priority !== 'unpracticed').length;

  const handleToggleSession = async (id: string, current: boolean) => {
    await updateSession(id, { completed: !current });
    showToast(!current ? 'Sessão marcada como concluída!' : 'Sessão reaberta.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Dashboard
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('subjects')}
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors"
          >
            Matérias
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-medium transition-colors"
          >
            <CalendarPlus className="w-4 h-4" />
            Calendário
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Compreensão global
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
              {formatPercent(globalStats.globalAccuracy)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span
                className={`w-2 h-2 rounded-full ${MASTERY_META[globalStats.globalMastery].dotClass}`}
              />
              {MASTERY_META[globalStats.globalMastery].label}
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 tabular-nums">
            {globalStats.totalCorrect}/{globalStats.totalQuestions} questões
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Tópicos praticados
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
              {globalStats.practicedPct}%
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
              {globalStats.practicedSubtopics}/{subtopics.length}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-2.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${globalStats.practicedPct}%` }}
            />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Alertas de revisão
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
              {urgentCount}
            </span>
            <span className="text-xs text-rose-500 font-medium">abaixo de 70%</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 tabular-nums">
            {reviewAlerts.filter((a) => a.priority === 'high').length} críticos •{' '}
            {reviewAlerts.filter((a) => a.priority === 'medium').length} básicos
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Ritmo (7 dias)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
              {globalStats.completedLast7Days}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">sessões</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 tabular-nums">
            Hoje: {globalStats.completedTodayCount}/{globalStats.plannedTodayCount}
          </p>
        </div>
      </div>

      {/* Main Grid: Chart + Review Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Desempenho por Matéria */}
        <div className="xl:col-span-2 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Taxa de acerto por matéria
            </h3>
            <button
              onClick={() => setActiveTab('subjects')}
              className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
            >
              Ver matérias <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {subjects.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-center px-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
              <BookOpen className="w-6 h-6 text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Nenhuma matéria cadastrada
              </p>
              <button
                onClick={() => setActiveTab('subjects')}
                className="mt-3 px-3.5 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium"
              >
                Cadastrar matéria
              </button>
            </div>
          ) : (
            <div className="h-68 w-full" style={{ height: '272px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectChartData} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.18} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={subjectChartData.length > 4 ? -15 : 0}
                    textAnchor={subjectChartData.length > 4 ? 'end' : 'middle'}
                    height={46}
                  />
                  <YAxis
                    domain={[0, 100]}
                    unit="%"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number, _name, item) => {
                      const p = item.payload as (typeof subjectChartData)[number];
                      if (!p.hasQuestions) return ['Sem questões', p.fullName];
                      return [`${value}% (${p.acertos}/${p.questoes})`, p.fullName];
                    }}
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.7} />
                  <Bar dataKey="taxa" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {subjectChartData.map((entry) => (
                      <Cell
                        key={entry.id}
                        fill={entry.hasQuestions ? entry.color : '#cbd5e1'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Revisão Prioritária */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Revisão prioritária
            </h3>
            <button
              onClick={() => setActiveTab('reviews')}
              className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
            >
              Ver todos ({reviewAlerts.length})
            </button>
          </div>

          {topAlerts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-500 mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Sem alertas críticos
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 flex-1">
              {topAlerts.map((alert) => {
                const meta = MASTERY_META[alert.stats.mastery];
                return (
                  <div
                    key={alert.subtopic.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: alert.subject.color }}
                        />
                        <span className="truncate">{alert.subject.name}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate mt-0.5">
                        {alert.subtopic.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                        {formatPercent(alert.stats.accuracy)}
                      </span>
                      <button
                        onClick={() =>
                          openQuickSchedule({
                            subjectId: alert.subject.id,
                            subtopicId: alert.subtopic.id,
                            sessionType: 'review',
                            date: today,
                            notes: `Revisão de alerta (${formatPercent(alert.stats.accuracy)} de acertos)`,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-brand-600 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
                      >
                        Agendar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Próximas Sessões do Cronograma */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Próximos estudos
          </h3>
          <button
            onClick={() => setActiveTab('calendar')}
            className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
          >
            Calendário <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {upcomingSessions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Nenhuma sessão agendada a partir de hoje.
            </p>
            <button
              onClick={() => setActiveTab('calendar')}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              Agendar estudo
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {upcomingSessions.map(({ session, subject, subtopic }) => {
              const typeMeta = SESSION_TYPE_META[session.session_type];
              const isToday = session.scheduled_date === today;
              return (
                <div
                  key={session.id}
                  className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleSession(session.id, session.completed)}
                      className="text-slate-300 hover:text-emerald-600 transition-colors shrink-0"
                      title="Alternar conclusão"
                    >
                      {session.completed ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                      ) : (
                        <Circle className="w-4.5 h-4.5" />
                      )}
                    </button>
                    <div className="min-w-0 flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: subject?.color ?? '#4F46E5' }}
                      />
                      <span
                        className={`text-sm font-medium truncate ${
                          session.completed
                            ? 'line-through text-slate-400'
                            : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {subject?.name ?? 'Matéria'}
                      </span>
                      {subtopic && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 truncate hidden sm:inline">
                          • {subtopic.title}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs tabular-nums">
                    <span className="hidden sm:inline text-slate-400 dark:text-slate-500">
                      {typeMeta.shortLabel}
                    </span>
                    <span
                      className={`font-medium ${
                        isToday
                          ? 'text-brand-600 dark:text-brand-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isToday
                        ? 'Hoje'
                        : session.scheduled_date.slice(5).split('-').reverse().join('/')}
                      {session.start_time ? ` • ${session.start_time}` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
