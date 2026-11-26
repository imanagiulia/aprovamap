import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { StudyStatus, Subject, Subtopic } from '../types';
import { STUDY_STATUS_META } from '../utils/mastery';
import { formatDatabaseError } from '../context/StudyContext';

interface SubtopicModalProps {
  isOpen: boolean;
  subjects: Subject[];
  defaultSubjectId?: string;
  editingSubtopic: Subtopic | null;
  onClose: () => void;
  onSave: (input: {
    subject_id: string;
    title: string;
    notes: string;
    study_status: StudyStatus;
    practiced_questions: boolean;
  }) => Promise<void>;
}

export const SubtopicModal: React.FC<SubtopicModalProps> = ({
  isOpen,
  subjects,
  defaultSubjectId,
  editingSubtopic,
  onClose,
  onSave,
}) => {
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [studyStatus, setStudyStatus] = useState<StudyStatus>('not_started');
  const [practicedQuestions, setPracticedQuestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (editingSubtopic) {
        setSubjectId(editingSubtopic.subject_id);
        setTitle(editingSubtopic.title);
        setNotes(editingSubtopic.notes);
        setStudyStatus(editingSubtopic.study_status);
        setPracticedQuestions(editingSubtopic.practiced_questions);
      } else {
        setSubjectId(defaultSubjectId || subjects[0]?.id || '');
        setTitle('');
        setNotes('');
        setStudyStatus('not_started');
        setPracticedQuestions(false);
      }
    }
  }, [isOpen, editingSubtopic, defaultSubjectId, subjects]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId) return;
    setError(null);
    setSaving(true);
    try {
      await onSave({
        subject_id: subjectId,
        title: title.trim(),
        notes: notes.trim(),
        study_status: studyStatus,
        practiced_questions: practicedQuestions,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError(formatDatabaseError(err, 'Não foi possível salvar o subtópico.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {editingSubtopic ? 'Editar Subtópico' : 'Novo Subtópico'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}
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
              Título do Subtópico *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Controle de Constitucionalidade, Crase, Licitações..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Status do Estudo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(STUDY_STATUS_META) as StudyStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStudyStatus(status)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    studyStatus === status
                      ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {STUDY_STATUS_META[status].label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={practicedQuestions}
              onChange={(e) => setPracticedQuestions(e.target.checked)}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              Já realizei resolução de perguntas deste subtópico
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Anotações / Pontos de atenção
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Súmulas importantes, pegadinhas de banca, artigos para decorar..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !subjectId}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm"
            >
              {saving ? 'Salvando...' : editingSubtopic ? 'Salvar alterações' : 'Adicionar subtópico'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
