'use client';

import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, X, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';

export interface EditFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'diameters';
  placeholder?: string;
  required?: boolean;
  uppercase?: boolean;
  step?: string;
  colSpan?: 1 | 2;
}

interface MasterActionButtonsProps {
  onEdit: () => void;
  onDelete: () => void;
  editTitle?: string;
  deleteTitle?: string;
}

/**
 * Tombol aksi Edit & Hapus yang sejajar rapi di tengah (konsisten dengan kolom Aksi Form Input).
 */
export function MasterActionButtons({
  onEdit,
  onDelete,
  editTitle = 'Edit Data',
  deleteTitle = 'Hapus Data',
}: MasterActionButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-500/10 cursor-pointer transition-colors"
        title={editTitle}
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer transition-colors"
        title={deleteTitle}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface MasterEditModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  fields: EditFieldConfig[];
  initialValues: Record<string, any> | null;
  onClose: () => void;
  onSave: (values: Record<string, any>) => Promise<string | null>;
  isSaving: boolean;
}

/**
 * Helper format Date/ISO menjadi YYYY-MM-DD untuk input type="date".
 */
export function toDateInputValue(val: any): string {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

/**
 * Modal Edit Terpusat dengan tata letak simetris dan alignment rata tengah yang rapi.
 */
export default function MasterEditModal({
  isOpen,
  title,
  subtitle,
  fields,
  initialValues,
  onClose,
  onSave,
  isSaving,
}: MasterEditModalProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialValues) {
      setFormValues({ ...initialValues });
      setErrorMsg(null);
    }
  }, [isOpen, initialValues]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen || !initialValues) return null;

  const handleChange = (key: string, val: any, uppercase?: boolean) => {
    const finalVal = uppercase && typeof val === 'string' ? val.toUpperCase() : val;
    setFormValues((prev) => ({ ...prev, [key]: finalVal }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const err = await onSave(formValues);
    if (err) {
      setErrorMsg(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/75 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
              {subtitle && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {fields.map((field) => {
              if (field.type === 'diameters') {
                const diaCards = [
                  {
                    key: 'diameter40',
                    label: 'Ø40',
                    boxClass: 'bg-emerald-500/10 border-emerald-500/20',
                    labelClass: 'text-emerald-700 dark:text-emerald-400',
                    inputClass: 'border-emerald-300 dark:border-emerald-700 focus:ring-emerald-500',
                  },
                  {
                    key: 'diameter60',
                    label: 'Ø60',
                    boxClass: 'bg-blue-500/10 border-blue-500/20',
                    labelClass: 'text-blue-700 dark:text-blue-400',
                    inputClass: 'border-blue-300 dark:border-blue-700 focus:ring-blue-500',
                  },
                  {
                    key: 'diameter80',
                    label: 'Ø80',
                    boxClass: 'bg-amber-500/10 border-amber-500/20',
                    labelClass: 'text-amber-700 dark:text-amber-400',
                    inputClass: 'border-amber-300 dark:border-amber-700 focus:ring-amber-500',
                  },
                  {
                    key: 'diameter100',
                    label: 'Ø100',
                    boxClass: 'bg-purple-500/10 border-purple-500/20',
                    labelClass: 'text-purple-700 dark:text-purple-400',
                    inputClass: 'border-purple-300 dark:border-purple-700 focus:ring-purple-500',
                  },
                ];

                return (
                  <div key={field.key} className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 text-center">
                      {field.label}
                    </label>
                    <div className="grid grid-cols-4 gap-2.5">
                      {diaCards.map((dc) => (
                        <div key={dc.key} className={`p-2.5 rounded-xl border text-center ${dc.boxClass}`}>
                          <span className={`block text-[11px] font-extrabold mb-1.5 ${dc.labelClass}`}>
                            {dc.label}
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={formValues[dc.key] ?? 0}
                            onChange={(e) =>
                              handleChange(dc.key, e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))
                            }
                            className={`w-full text-center font-mono font-bold text-sm bg-white dark:bg-slate-900 border rounded-lg py-1.5 px-1.5 focus:ring-2 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${dc.inputClass}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              const spanClass = field.colSpan === 2 ? 'sm:col-span-2' : '';

              return (
                <div key={field.key} className={spanClass}>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5 text-center">
                    {field.label}
                    {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      rows={2}
                      value={formValues[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value, field.uppercase)}
                      placeholder={field.placeholder || '-'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  ) : (
                    <input
                      type={field.type}
                      step={field.step}
                      required={field.required}
                      value={formValues[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value, field.uppercase)}
                      placeholder={field.placeholder || '-'}
                      className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                        field.type === 'number' || field.type === 'date' ? 'font-mono' : ''
                      } ${field.uppercase ? 'uppercase font-mono' : ''}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Tombol Aksi */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
