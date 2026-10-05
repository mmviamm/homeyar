import React from 'react';
import { AlertTriangle, Trash2, Edit3, X } from 'lucide-react';

export type ConfirmationType = 'update' | 'delete' | 'create_sheet' | 'generic';

interface ConfirmationModalProps {
  isOpen: boolean;
  type: ConfirmationType;
  title: string;
  description: string;
  details?: { label: string; value: string }[];
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  type,
  title,
  description,
  details = [],
  confirmLabel = 'تأیید و اعمال',
  cancelLabel = 'انصراف',
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-right"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div 
              className={`p-3 rounded-2xl flex-shrink-0 ${
                isDangerous 
                  ? 'bg-rose-100 text-rose-600' 
                  : type === 'update' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              {isDangerous ? (
                <Trash2 className="w-6 h-6" />
              ) : type === 'update' ? (
                <Edit3 className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>

            <div className="flex-1">
              <h3 id="modal-title" className="text-base font-bold text-slate-900 leading-snug">
                {title}
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                {description}
              </p>

              {details.length > 0 && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  {details.map((d, i) => (
                    <div key={i} className="flex justify-between items-center text-slate-700">
                      <span className="font-medium text-slate-500">{d.label}:</span>
                      <span className="font-bold text-slate-900 truncate max-w-[200px]">{d.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-2 text-2xs text-slate-400">
                {isDangerous 
                  ? '⚠️ این تغییر بلافاصله در فایل گوگل شیت شما اعمال شده و سطر مربوطه حذف می‌گردد.'
                  : 'این تغییر به صورت مستقیم با سطر مربوطه در گوگل شیت همگام می‌شود.'}
              </p>
            </div>

            <button
              onClick={onCancel}
              disabled={isLoading}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all flex items-center gap-2 ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-700 focus:ring-2 focus:ring-rose-500'
                : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500'
            } disabled:opacity-50`}
          >
            {isLoading && (
              <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
