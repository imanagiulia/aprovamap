import React, { useMemo, useState } from 'react';
import { CalendarPlus, CheckCircle2 } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { formatPercent, MASTERY_META } from '../utils/mastery';

type AlertFilter = 'all' | 'high' | 'medium' | 'unpracticed';

export const ReviewsPage: React.FC = () => {
  const { reviewAlerts, openQuickSchedule } = useStudy();
  const [filter, setFilter] = useState<AlertFilter>('all');

  const counts = useMemo(
    () => ({
      all: reviewAlerts.length,
      high: reviewAlerts.filter((a) => a.priority === 'high').length,
      medium: reviewAlerts.filter((a) => a.priority === 'medium').length,
      unpracticed: reviewAlerts.filter((a) => a.priority === 'unpracticed').length,
    }),
    [reviewAlerts]
  );

  const visibleAlerts = useMemo(() => {
    if (filter === 'all') return reviewAlerts;
    return reviewAlerts.filter((a) => a.priority === filter);
  }, [reviewAlerts, filter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
        Alertas de Revisão
      </h2>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { id: 'all' as const, label: 'Todos', count: counts.all },
          { id: 'high' as const, label: 'Crítico (< 50%)', count: counts.high },
          { id: 'medium' as const, label: 'Básico (50–69%)', count: counts.medium },
          { id: 'unpracticed' as const, label: 'Sem questões', count: counts.unpracticed },
        ].map((pill) => (
          <button
            key={pill.id}
            onClick={() => setFilter(pill.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === pill.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>{pill.label}</span>
            <span
              className={`text-[11px] tabular-nums ${
                filter === pill.id
                  ? 'text-white/75 dark:text-slate-600'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {pill.count}
            </span>
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {visibleAlerts.length === 0 ? (
        <div className="py-16 px-6 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Nenhum alerta nesta categoria
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tudo sob controle por aqui.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 divide-y divide-slate-100 dark:divide-slate-800/80">
          {visibleAlerts.map((item) => {
            const masteryMeta = MASTERY_META[item.stats.mastery];

            return (
              <div
                key={item.subtopic.id}
                className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.subject.color }}
                    />
                    <span className="truncate">{item.subject.name}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.subtopic.title}
                    </h3>

                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                      <span className={`w-2 h-2 rounded-full ${masteryMeta.dotClass}`} />
                      {item.stats.accuracy !== null
                        ? `${formatPercent(item.stats.accuracy)} • ${masteryMeta.label}`
                        : 'Sem questões'}
                    </span>
                  </div>

                  {item.stats.accuracy !== null ? (
                    <div className="flex items-center gap-3 max-w-md pt-0.5">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${masteryMeta.barClass}`}
                          style={{ width: `${Math.min(100, item.stats.accuracy)}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                        {item.stats.correctAnswers}/{item.stats.totalQuestions} • Meta{' '}
                        {item.subject.target_accuracy}%
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Conteúdo iniciado sem bateria de questões registrada.
                    </p>
                  )}
                </div>

                {/* Single Schedule Button */}
                <button
                  type="button"
                  onClick={() =>
                    openQuickSchedule({
                      subjectId: item.subject.id,
                      subtopicId: item.subtopic.id,
                      sessionType: item.stats.accuracy === null ? 'questions' : 'review',
                      notes: item.reason,
                    })
                  }
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors shrink-0 self-start sm:self-center"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  Agendar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
