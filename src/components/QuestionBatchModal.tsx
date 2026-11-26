import React, { useMemo, useState } from 'react';
import {
  CalendarPlus,
  CheckCircle2,
  History,
  Plus,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStudy, formatDatabaseError } from '../context/StudyContext';
import {
  computeSubtopicStats,
  getMasteryLevel,
  MASTERY_META,
  todayISO,
} from '../utils/mastery';

export const QuestionBatchModal: React.FC = () => {
  const {
    batchModalSubtopicId,
    closeBatchModal,
    subtopics,
    subjects,
    batches,
    createBatch,
    deleteBatch,
    openQuickSchedule,
  } = useStudy();

  const [totalQuestions, setTotalQuestions] = useState('20');
  const [correctAnswers, setCorrectAnswers] = useState('16');
  const [source, setSource] = useState('');
  const [practicedAt, setPracticedAt] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtopic = useMemo(
    () => subtopics.find((t) => t.id === batchModalSubtopicId) ?? null,
    [subtopics, batchModalSubtopicId]
  );

  const subject = useMemo(
    () => (subtopic ? subjects.find((s) => s.id === subtopic.subject_id) ?? null : null),
    [subjects, subtopic]
  );

  const subtopicBatches = useMemo(() => {
    if (!subtopic) return [];
    return batches
      .filter((b) => b.subtopic_id === subtopic.id)
      .sort((a, b) => b.practiced_at.localeCompare(a.practiced_at));
  }, [batches, subtopic]);

  const stats = useMemo(
    () => (subtopic ? computeSubtopicStats(subtopic.id, batches) : null),
    [subtopic, batches]
  );

  const chartData = useMemo(() => {
    return [...subtopicBatches]
      .reverse()
      .map((b, idx) => ({
        label: `#${idx + 1} (${b.practiced_at.slice(5).split('-').reverse().join('/')})`,
        taxa: Math.round((b.correct_answers / b.total_questions) * 100),
        detalhe: `${b.correct_answers}/${b.total_questions}`,
      }));
  }, [subtopicBatches]);

  if (!batchModalSubtopicId || !subtopic || !subject || !stats) return null;

  const parsedTotal = Number(totalQuestions);
  const parsedCorrect = Number(correctAnswers);
  const previewAccuracy =
    parsedTotal > 0 && parsedCorrect >= 0 && parsedCorrect <= parsedTotal
      ? Math.round((parsedCorrect / parsedTotal) * 1000) / 10
      : null;
  const previewMastery = getMasteryLevel(previewAccuracy);
  const currentMasteryMeta = MASTERY_META[stats.mastery];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!Number.isInteger(parsedTotal) || parsedTotal <= 0) {
      setError('Informe uma quantidade válida de questões respondidas (maior que 0).');
      return;
    }
    if (!Number.isInteger(parsedCorrect) || parsedCorrect < 0 || parsedCorrect > parsedTotal) {
      setError('A quantidade de acertos deve estar entre 0 e o total de questões respondidas.');
      return;
    }

    setSaving(true);
    try {
      await createBatch({
        subtopic_id: subtopic.id,
        total_questions: parsedTotal,
        correct_answers: parsedCorrect,
        source: source.trim(),
        notes: notes.trim(),
        practiced_at: practicedAt || todayISO(),
      });
      setSource('');
      setNotes('');
    } catch (err) {
      console.error(err);
      setError(formatDatabaseError(err, 'Não foi possível salvar a bateria de questões.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: subject.color }}
              />
              {subject.name}
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {subtopic.title}
            </h3>
          </div>
          <button
            onClick={closeBatchModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Resumo acumulado do subtópico */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Desempenho Acumulado
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {stats.accuracy !== null ? `${stats.accuracy.toFixed(1)}%` : '—'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {stats.correctAnswers} acertos de {stats.totalQuestions} questões
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Nível de Compreensão
              </p>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentMasteryMeta.badgeClass}`}
                >
                  <span className={`w-2 h-2 rounded-full ${currentMasteryMeta.dotClass}`} />
                  {currentMasteryMeta.label} ({currentMasteryMeta.rangeText})
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                {stats.batchCount} {stats.batchCount === 1 ? 'bateria registrada' : 'baterias registradas'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Ação recomendada
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {currentMasteryMeta.description}
              </p>
              {(stats.mastery === 'critical' || stats.mastery === 'basic') && (
                <button
                  type="button"
                  onClick={() => {
                    closeBatchModal();
                    openQuickSchedule({
                      subjectId: subject.id,
                      subtopicId: subtopic.id,
                      sessionType: 'review',
                      notes: `Revisão focada (${stats.accuracy?.toFixed(0)}% de acertos em ${subtopic.title})`,
                    });
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  Agendar revisão no calendário
                </button>
              )}
            </div>
          </div>

          {/* Formulário nova bateria */}
          <form
            onSubmit={handleSubmit}
            className="p-5 rounded-2xl border border-brand-200/80 dark:border-brand-900 bg-brand-50/40 dark:bg-brand-950/20 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-600" />
                Registrar nova bateria de questões
              </h4>
              {previewAccuracy !== null && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border tabular-nums ${MASTERY_META[previewMastery].badgeClass}`}
                >
                  Prévia desta bateria: {previewAccuracy.toFixed(1)}% ({MASTERY_META[previewMastery].label})
                </span>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Respondidas *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Acertos *
                </label>
                <input
                  type="number"
                  min={0}
                  max={parsedTotal || undefined}
                  required
                  value={correctAnswers}
                  onChange={(e) => setCorrectAnswers(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={practicedAt}
                  onChange={(e) => setPracticedAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Banca / Fonte
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Ex.: Cebraspe, FGV..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observação rápida (opcional): o que mais errei nesta bateria?"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar bateria'}
              </button>
            </div>
          </form>

          {/* Gráfico de evolução */}
          {chartData.length >= 2 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-brand-500" />
                Evolução de acertos por bateria (%)
              </h4>
              <div className="h-44 w-full bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#64748b" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#64748b" unit="%" />
                    <Tooltip
                      formatter={(val: number) => [`${val}%`, 'Taxa de acerto']}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="taxa"
                      stroke={subject.color}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Histórico */}
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-slate-500" />
              Histórico de baterias ({subtopicBatches.length})
            </h4>

            {subtopicBatches.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
                Nenhuma bateria registrada ainda para este subtópico. Lance sua primeira bateria acima!
              </div>
            ) : (
              <div className="space-y-2">
                {subtopicBatches.map((batch) => {
                  const pct = Math.round((batch.correct_answers / batch.total_questions) * 1000) / 10;
                  const meta = MASTERY_META[getMasteryLevel(pct)];
                  return (
                    <div
                      key={batch.id}
                      className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border tabular-nums ${meta.badgeClass}`}
                          >
                            {pct.toFixed(0)}% ({batch.correct_answers}/{batch.total_questions})
                          </span>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                            {batch.practiced_at.split('-').reverse().join('/')}
                          </span>
                          {batch.source && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {batch.source}
                            </span>
                          )}
                        </div>
                        {batch.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">
                            {batch.notes}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteBatch(batch.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 shrink-0"
                        title="Excluir bateria"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
