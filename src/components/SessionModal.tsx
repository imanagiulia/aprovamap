import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import type { SessionType, StudySession, Subject, Subtopic } from '../types';
import { SESSION_TYPE_META, todayISO } from '../utils/mastery';

interface SessionModalProps {
  isOpen: boolean;
  subjects: Subject[];
  subtopics: Subtopic[];
  editingSession: StudySession | null;
  defaultDate?: string;
  defaultSubjectId?: string;
  defaultSubtopicId?: string | null;
  defaultSessionType?: SessionType;
  defaultNotes?: string;
  onClose: () => void;
  onSave: (input: {
    subject_id: string;
    subtopic_id: string | null;
    scheduled_date: string;
    start_time: string;
    duration_minutes: number;
    session_type: SessionType;
    completed: boolean;
    notes: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const SessionModal: React.FC<SessionModalProps> = ({
  isOpen,
  subjects,
  subtopics,
  editingSession,
  defaultDate,
  defaultSubjectId,
  defaultSubtopicId,
  defaultSessionType,
  defaultNotes,
  onClose,
  onSave,
  onDelete,
}) => {
  const [subjectId, setSubjectId] = useState('');
  const [subtopicId, setSubtopicId] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState(todayISO());
  const [startTime, setStartTime] = useState('19:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [sessionType, setSessionType] = useState<SessionType>('theory');
  const [completed, setCompleted] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingSession) {
        setSubjectId(editingSession.subject_id);
        setSubtopicId(editingSession.subtopic_id ?? '');
        setScheduledDate(editingSession.scheduled_date);
        setStartTime(editingSession.start_time || '');
        setDurationMinutes(editingSession.duration_minutes);
        setSessionType(editingSession.session_type);
        setCompleted(editingSession.completed);
        setNotes(editingSession.notes);
      } else {
        setSubjectId(defaultSubjectId || subjects[0]?.id || '');
        setSubtopicId(defaultSubtopicId ?? '');
        setScheduledDate(defaultDate || todayISO());
        setStartTime('19:00');
        setDurationMinutes(60);
        setSessionType(defaultSessionType || 'theory');
        setCompleted(false);
        setNotes(defaultNotes || '');
      }
    }
  }, [
    isOpen,
    editingSession,
    defaultDate,
    defaultSubjectId,
    defaultSubtopicId,
    defaultSessionType,
    defaultNotes,
    subjects,
  ]);

  const filteredSubtopics = useMemo(
    () => subtopics.filter((t) => t.subject_id === subjectId),
    [subtopics, subjectId]
  );

  // Limpa subtópico se trocar para uma matéria que não o contém
  useEffect(() => {
    if (subtopicId && !filteredSubtopics.some((t) => t.id === subtopicId)) {
      setSubtopicId('');
    }
  }, [subjectId, filteredSubtopics, subtopicId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !scheduledDate) return;
    setSaving(true);
    try {
      await onSave({
        subject_id: subjectId,
        subtopic_id: subtopicId || null,
        scheduled_date: scheduledDate,
        start_time: startTime,
        duration_minutes: Math.max(10, Number(durationMinutes) || 60),
        session_type: sessionType,
        completed,
        notes: notes.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {editingSession ? 'Editar Sessão de Estudo' : 'Agendar Estudo no Calendário'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {subjects.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
              Cadastre ao menos uma matéria primeiro na aba <strong>Matérias</strong> para montar seu cronograma.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Matéria *
                  </label>
                  <select
                    required
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Subtópico (opcional)
                  </label>
                  <select
                    value={subtopicId}
                    onChange={(e) => setSubtopicId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Matéria geral (sem subtópico)</option>
                    {filteredSubtopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Tipo de Sessão
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(SESSION_TYPE_META) as SessionType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSessionType(type)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        sessionType === type
                          ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {SESSION_TYPE_META[type].shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Duração (min)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={480}
                    step={15}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Objetivo / Observações
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex.: Fazer 30 questões no QConcursos e anotar erros..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={(e) => setCompleted(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  Marcar esta sessão como concluída
                </span>
              </label>
            </>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              {editingSession && onDelete && (
                <button
                  type="button"
                  onClick={async () => {
                    await onDelete(editingSession.id);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || subjects.length === 0}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm"
              >
                {saving ? 'Salvando...' : editingSession ? 'Salvar alterações' : 'Agendar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
