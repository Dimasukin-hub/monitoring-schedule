'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Info,
  Trash2,
} from 'lucide-react';

interface UploadLandExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadLandExcelModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadLandExcelModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ message: string; count: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setIsLoading(false);
      setErrorMessage(null);
      setSuccessResult(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);
    const validExtensions = ['.xlsx', '.xls'];
    const isExtensionValid = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!isExtensionValid) {
      setErrorMessage('Format file tidak didukung! Mohon pilih file Excel berekstensi .xlsx atau .xls.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Silakan pilih file Excel terlebih dahulu');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/lands/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memproses file Excel.');
      }

      setSuccessResult({
        message: json.message || 'Data lahan berhasil di-replace!',
        count: json.count || 0,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat mengunggah file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        ref={modalRef}
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-50 via-emerald-50/50 to-transparent dark:from-teal-950/40 dark:via-emerald-950/20 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Upload & Replace Data Lahan</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                  Master Schedule
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pembaruan data dari Sheet &quot;Master&quot; (Schedule 2026 Update)
              </p>
            </div>
          </div>
          {!isLoading && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Success State View */}
          {successResult ? (
            <div className="py-6 space-y-4 text-center animate-in zoom-in-95 duration-150">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Data Lahan Berhasil Di-Replace!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {successResult.message}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 max-w-sm mx-auto text-left text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Jadwal Rencana Berantai (Cascade) Dihitung</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Stok Pengolahan & Grafik Dashboard Diperbarui</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Aktivitas Terakhir & Progress Tanam Sinkron</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all duration-150 active:scale-95 cursor-pointer"
                >
                  Selesai & Muat Ulang Tampilan
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Alert / Warning Info */}
              <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">Mekanisme Replace All:</span>
                  <p className="leading-relaxed opacity-90">
                    Seluruh baris data lahan di database akan diganti dengan data terbaru dari Sheet <span className="font-bold">&quot;Master&quot;</span>. Rumus jadwal rencana, penyesuaian realisasi, stok tahapan, dan grafik dashboard akan otomatis dihitung ulang.
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* Drag & Drop Upload Zone */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
                disabled={isLoading}
              />

              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 scale-[0.99]'
                      : 'border-slate-300 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-600 bg-slate-50/60 dark:bg-slate-950/50 hover:bg-slate-50 dark:hover:bg-slate-950'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Klik untuk memilih file atau seret file Excel ke sini
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Mendukung file Excel format <span className="font-semibold text-slate-700 dark:text-slate-300">.xlsx</span> atau <span className="font-semibold text-slate-700 dark:text-slate-300">.xls</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-teal-500/30 bg-teal-50/40 dark:bg-teal-950/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={selectedFile.name}>
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formatFileSize(selectedFile.size)} • Terpilih
                      </p>
                    </div>
                  </div>

                  {!isLoading && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Ganti / Hapus File"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* File Format Checklist Reference */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Ketentuan File Master Schedule (Multi-Sheet Adaptif):
                </span>
                <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
                  <li>Harus memiliki Sheet bernama <span className="font-semibold text-slate-700 dark:text-slate-200">&quot;Master&quot;</span> untuk data petak lahan & 20 aktivitas.</li>
                  <li>Jika terdapat Sheet <span className="font-semibold text-slate-700 dark:text-slate-200">&quot;Stok Lahan&quot;</span>, angka resmi kartu stok & grafik bulanan otomatis disinkronkan tanpa selisih.</li>
                  <li>Sheet lain di dalam workbook tidak akan mengganggu dan diabaikan secara otomatis.</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses & Menghitung Rumus...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload & Replace Data</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
