import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Exam } from '../types';
import { SUBJECT_COLORS } from '../utils/mastery';
import { formatDatabaseError } from '../context/StudyContext';

interface ExamModalProps {
  isOpen: boolean;
  editingExam: Exam | null;
  onClose: () => void;
  onSave: (input: {
    name: string;
    board: string;
    exam_date: string;
    description: string;
    color: string;
  }) => Promise<void>;
}

export const ExamModal: React.FC<ExamModalProps> = ({
  isOpen,
  editingExam,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [board, setBoard] = useState('');
  const [examDate, setExamDate] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (editingExam) {
        setName(editingExam.name);
        setBoard(editingExam.board);
        setExamDate(editingExam.exam_date || '');
        setDescription(editingExam.description);
        setColor(editingExam.color);
      } else {
        setName('');
        setBoard('');
        setExamDate('');
        setDescription('');
        setColor(SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)]);
      }
    }
  }, [isOpen, editingExam]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        board: board.trim(),
        exam_date: examDate,
        description: description.trim(),
        color,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError(formatDatabaseError(err, 'Não foi possível salvar o concurso.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {editingExam ? 'Editar Concurso' : 'Novo Concurso'}
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
              Nome do Concurso *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Polícia Federal, TJ-SP Escrevente, CNU..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Banca / Órgão (opcional)
              </label>
              <input
                type="text"
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                placeholder="Ex.: Cebraspe, FGV, Vunesp..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Data da Prova (opcional)
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Cargo / Observações
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Cargo pretendido, status do edital ou foco principal..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Cor de destaque do concurso
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
              disabled={saving || !name.trim()}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm"
            >
              {saving ? 'Salvando...' : editingExam ? 'Salvar alterações' : 'Cadastrar concurso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
