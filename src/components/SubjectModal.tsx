import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Exam, Subject } from '../types';
import { SUBJECT_COLORS } from '../utils/mastery';
import { formatDatabaseError } from '../context/StudyContext';

interface SubjectModalProps {
  isOpen: boolean;
  exams: Exam[];
  defaultExamId?: string | null;
  editingSubject: Subject | null;
  onClose: () => void;
  onCreateExamInline: (input: {
    name: string;
    board: string;
    exam_date: string;
    description: string;
    color: string;
  }) => Promise<Exam>;
  onSave: (input: {
    exam_id: string;
    name: string;
    description: string;
    color: string;
    target_accuracy: number;
  }) => Promise<void>;
}

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  exams,
  defaultExamId,
  editingSubject,
  onClose,
  onCreateExamInline,
  onSave,
}) => {
  const [examId, setExamId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [targetAccuracy, setTargetAccuracy] = useState(80);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick inline exam creation state
  const [showQuickExam, setShowQuickExam] = useState(false);
  const [quickExamName, setQuickExamName] = useState('');
  const [quickExamBoard, setQuickExamBoard] = useState('');
  const [creatingExam, setCreatingExam] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setQuickExamName('');
      setQuickExamBoard('');

      if (editingSubject) {
        setExamId(editingSubject.exam_id ?? (exams.length === 1 ? exams[0].id : ''));
        setName(editingSubject.name);
        setDescription(editingSubject.description);
        setColor(editingSubject.color);
        setTargetAccuracy(editingSubject.target_accuracy);
        setShowQuickExam(exams.length === 0);
      } else {
        const initialExam =
          defaultExamId && exams.some((e) => e.id === defaultExamId)
            ? defaultExamId
            : exams.length === 1
              ? exams[0].id
              : '';
        setExamId(initialExam);
        setName('');
        setDescription('');
        setColor(SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)]);
        setTargetAccuracy(80);
        setShowQuickExam(exams.length === 0);
      }
    }
  }, [isOpen, editingSubject, defaultExamId, exams.length]);

  if (!isOpen) return null;

  const handleQuickCreateExam = async () => {
    if (!quickExamName.trim()) return;
    setError(null);
    setCreatingExam(true);
    try {
      const created = await onCreateExamInline({
        name: quickExamName.trim(),
        board: quickExamBoard.trim(),
        exam_date: '',
        description: '',
        color: SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)],
      });
      setExamId(created.id);
      setQuickExamName('');
      setQuickExamBoard('');
      setShowQuickExam(false);
    } catch (err) {
      console.error(err);
      setError(formatDatabaseError(err, 'Não foi possível cadastrar o concurso.'));
    } finally {
      setCreatingExam(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examId) {
      setError('Selecione a qual concurso esta matéria pertence.');
      return;
    }
    if (!name.trim()) return;

    setError(null);
    setSaving(true);
    try {
      await onSave({
        exam_id: examId,
        name: name.trim(),
        description: description.trim(),
        color,
        target_accuracy: Math.min(100, Math.max(1, Number(targetAccuracy) || 80)),
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError(formatDatabaseError(err, 'Não foi possível salvar a matéria.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {editingSubject ? 'Editar Matéria' : 'Nova Matéria'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Seleção / Criação de Concurso */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Concurso referente *
              </label>
              {exams.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowQuickExam((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showQuickExam ? 'Selecionar existente' : 'Novo concurso'}
                </button>
              )}
            </div>

            {showQuickExam || exams.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-brand-50/50 dark:bg-brand-950/25 border border-brand-200/80 dark:border-brand-900 space-y-3">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  {exams.length === 0
                    ? 'Cadastre um concurso para agrupar suas matérias:'
                    : 'Cadastro rápido de novo concurso:'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={quickExamName}
                    onChange={(e) => setQuickExamName(e.target.value)}
                    placeholder="Nome do concurso *"
                    className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    type="text"
                    value={quickExamBoard}
                    onChange={(e) => setQuickExamBoard(e.target.value)}
                    placeholder="Banca (opc.)"
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  {exams.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowQuickExam(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={creatingExam || !quickExamName.trim()}
                    onClick={handleQuickCreateExam}
                    className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-semibold"
                  >
                    {creatingExam ? 'Criando...' : 'Criar e selecionar'}
                  </button>
                </div>
              </div>
            ) : (
              <select
                required
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="" disabled>
                  Selecione o concurso...
                </option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}
                    {exam.board ? ` (${exam.board})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Nome da Matéria *
            </label>
            <input
              type="text"
              required
              autoFocus={exams.length > 0}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Direito Constitucional, Português, Informática..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Descrição / Ementa resumida
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Peso 2 na prova, foco em jurisprudência..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Cor identificadora (usada nos gráficos e calendário)
            </label>
            <div className="flex flex-wrap gap-2.5">
              {SUBJECT_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === swatch
                      ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: swatch }}
                  aria-label={`Selecionar cor ${swatch}`}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Meta de acertos nesta matéria
              </label>
              <span className="text-sm font-bold text-brand-600 dark:text-brand-400 tabular-nums">
                {targetAccuracy}%
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={targetAccuracy}
              onChange={(e) => setTargetAccuracy(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-0.5">
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
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
              disabled={saving || !name.trim() || !examId}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm"
            >
              {saving ? 'Salvando...' : editingSubject ? 'Salvar alterações' : 'Cadastrar matéria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
