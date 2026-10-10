import React from 'react';
import { AlertTriangle, Trash2, Edit3, X, RefreshCw, ExternalLink } from 'lucide-react';

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
  onCloseBackground?: () => void;
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
  onCloseBackground,
}) => {
  // اگر در حال پردازش است، بستن پنجره عملیات را در پس‌زمینه ادامه می‌دهد؛ در غیر این صورت انصراف داده می‌شود.
  const handleDismiss = () => {
    if (isLoading) {
      if (onCloseBackground) {
        onCloseBackground();
      } else {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel, onCloseBackground]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
      onClick={handleDismiss}
    >
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-right cursor-default"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={e => e.stopPropagation()}
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

              {/* وضعیت در حال انجام در پس‌زمینه */}
              {isLoading && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 flex-shrink-0" />
                    <span className="font-bold">درخواست به گوگل شیت ارسال شده است...</span>
                  </div>
                  <span className="text-3xs text-emerald-700 bg-white/80 px-2 py-0.5 rounded-md font-semibold">
                    ادامه در پس‌زمینه
                  </span>
                </div>
              )}

              <p className="mt-2 text-2xs text-slate-400">
                {isLoading 
                  ? '💡 می‌توانید بدون نگرانی این پنجره را ببندید؛ درخواست تا ذخیره‌سازی کامل در گوگل شیت در پس‌زمینه اجرا خواهد شد.'
                  : isDangerous 
                  ? '⚠️ این تغییر بلافاصله در فایل گوگل شیت شما اعمال شده و سطر مربوطه حذف می‌گردد.'
                  : 'این تغییر به صورت مستقیم با سطر مربوطه در گوگل شیت همگام می‌شود.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              title={isLoading ? 'بستن پنجره و ادامه در پس‌زمینه' : 'بستن پنجره'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2.5">
          {isLoading ? (
            <>
              <span className="text-2xs text-slate-500 flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                <span>در حال ارسال تغییرات...</span>
              </span>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                بستن و ادامه در پس‌زمینه
              </button>
            </>
          ) : (
            <>
              <div />
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
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
                  } disabled:opacity-50 cursor-pointer`}
                >
                  <span>{confirmLabel}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
