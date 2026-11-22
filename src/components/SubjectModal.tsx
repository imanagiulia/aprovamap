import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Subject } from '../types';
import { SUBJECT_COLORS } from '../utils/mastery';

interface SubjectModalProps {
  isOpen: boolean;
  editingSubject: Subject | null;
  onClose: () => void;
  onSave: (input: {
    name: string;
    description: string;
    color: string;
    target_accuracy: number;
  }) => Promise<void>;
}

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  editingSubject,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [targetAccuracy, setTargetAccuracy] = useState(80);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingSubject) {
        setName(editingSubject.name);
        setDescription(editingSubject.description);
        setColor(editingSubject.color);
        setTargetAccuracy(editingSubject.target_accuracy);
      } else {
        setName('');
        setDescription('');
        setColor(SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)]);
        setTargetAccuracy(80);
      }
    }
  }, [isOpen, editingSubject]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        color,
        target_accuracy: Math.min(100, Math.max(1, Number(targetAccuracy) || 80)),
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
            {editingSubject ? 'Editar Matéria' : 'Nova Matéria'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Nome da Matéria *
            </label>
            <input
              type="text"
              required
              autoFocus
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
              placeholder="Ex.: Peso 2 na prova, banca Cebraspe, foco em jurisprudência..."
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
              disabled={saving || !name.trim()}
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
