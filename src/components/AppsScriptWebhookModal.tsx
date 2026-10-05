import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  Zap, 
  ShieldCheck, 
  HelpCircle,
  Code
} from 'lucide-react';
import { APPS_SCRIPT_TEMPLATE } from '../services/webhookService';

interface AppsScriptWebhookModalProps {
  isOpen: boolean;
  currentWebhookUrl?: string;
  onClose: () => void;
  onSave: (url: string) => Promise<void>;
}

export const AppsScriptWebhookModal: React.FC<AppsScriptWebhookModalProps> = ({
  isOpen,
  currentWebhookUrl = '',
  onClose,
  onSave,
}) => {
  const [webhookInput, setWebhookInput] = useState(currentWebhookUrl);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookInput.trim()) return;

    if (!webhookInput.includes('script.google.com')) {
      setError('لینک وارد شده باید با script.google.com شروع شود.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave(webhookInput.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'خطا در اتصال به وب‌هوک');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs text-right animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-4 max-h-[92vh]">
        {/* هدر */}
        <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-emerald-300 border border-white/20 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                اتصال مستقیم به گوگل شیت (بدون فایربیس و بدون لاگین)
              </h3>
              <p className="text-2xs text-emerald-200 mt-0.5">
                با وب‌هوک گوگل اپ اسکریپت (۱۰۰٪ بدون فیلتر و بدون خطای دامنه)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* محتوا */}
        <div className="p-6 space-y-4 text-xs text-slate-700 leading-relaxed overflow-y-auto flex-1">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs">
            🎉 <strong>بهترین و پایدارترین روش:</strong> در این روش اصلاً به حساب فایربیس یا لاگین‌های پیچیده گوگل نیازی نیست. شما یک اسکریپت ساده در گوگل شیت خود قرار می‌دهید و برنامه مستقیماً اطلاعات را برای آن ارسال می‌کند.
          </div>

          {/* مراحل ۳ گانه */}
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-2xs flex-shrink-0 mt-0.5">
                ۱
              </span>
              <div>
                <span className="font-bold text-slate-900 block">فایل گوگل شیت خود را باز کنید:</span>
                <p className="text-2xs text-slate-500 mt-0.5">
                  یک گوگل شیت خالی بسازید یا فایل قبلی خود را در{' '}
                  <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5">
                    sheets.new <ExternalLink className="w-2.5 h-2.5" />
                  </a>{' '}
                  باز کنید.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-2xs flex-shrink-0 mt-0.5">
                ۲
              </span>
              <div className="w-full">
                <span className="font-bold text-slate-900 block">
                  به منوی Extensions (افزونه‌ها) &gt; Apps Script بروید و این کد را جایگزین کنید:
                </span>
                
                <div className="mt-2 relative">
                  <div className="bg-slate-900 text-emerald-400 p-3 rounded-2xl font-mono text-2xs overflow-x-auto max-h-36 border border-slate-800" dir="ltr">
                    <pre>{APPS_SCRIPT_TEMPLATE}</pre>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="absolute top-2 right-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-2xs font-bold flex items-center gap-1 shadow-md transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'کد کپی شد!' : 'کپی کل کد'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-2xs flex-shrink-0 mt-0.5">
                ۳
              </span>
              <div>
                <span className="font-bold text-slate-900 block">انتشار به عنوان Web App:</span>
                <p className="text-2xs text-slate-500 mt-0.5">
                  دکمه آبی <strong>Deploy</strong> (بالا سمت راست) &gt; <strong>New deployment</strong> را بزنید.
                  نوع آن را <strong>Web app</strong> انتخاب کرده و دسترسی (Who has access) را روی <strong>Anyone</strong> (همه) قرار دهید.
                </p>
              </div>
            </div>
          </div>

          {/* فرم ورودی لینک */}
          <form onSubmit={handleSubmit} className="pt-2 border-t border-slate-200 space-y-3">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                آدرس Web App دریافت شده را اینجا وارد کنید:
              </label>
              <input
                type="url"
                dir="ltr"
                required
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={webhookInput}
                onChange={e => setWebhookInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={loading || !webhookInput.trim()}
                className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50"
              >
                {loading ? 'در حال ثبت...' : 'ذخیره و اتصال مستقیم به شیت'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
