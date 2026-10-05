import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  ShieldAlert,
  Globe
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface AuthorizedDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthorizedDomainModal: React.FC<AuthorizedDomainModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const projectId = firebaseConfig.projectId || 'gen-lang-client-0780993571';
  const consoleUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  if (!isOpen) return null;

  const handleCopy = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(currentHostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-right animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* هدر */}
        <div className="px-6 py-4 bg-amber-500 text-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/30 text-slate-950 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                خطای دامنه مجاز در فایربیس (Unauthorized Domain)
              </h3>
              <p className="text-2xs text-amber-950/80 font-medium mt-0.5">
                راهنمای ۱ دقیقه‌ای فعال‌سازی دامنه دلخواه برای ورود با گوگل
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-950/70 hover:text-slate-950 hover:bg-amber-600/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* محتوا */}
        <div className="p-6 space-y-4 text-xs text-slate-700 leading-relaxed overflow-y-auto max-h-[80vh]">
          <p className="font-medium text-slate-800">
            سیستم امنیتی گوگل ورود از دامنه‌های ثبت‌نشده را مسدود می‌کند. از آنجا که برنامه را روی دامنه اختصاصی خود دیپلوی کرده‌اید، فقط کافیست نام دامنه را در لیست دامنه‌های مجاز پروژه فایربیس خود قرار دهید:
          </p>

          {/* باکس کپی دامنه */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <span className="text-2xs font-bold text-slate-500 block">دامنه فعلی شما جهت کپی:</span>
            <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 overflow-hidden text-slate-900 font-mono text-xs font-bold" dir="ltr">
                <Globe className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="truncate">{currentHostname}</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1 text-2xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1 transition-colors flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'کپی شد' : 'کپی دامنه'}</span>
              </button>
            </div>
          </div>

          {/* مراحل ۳ گانه سریع */}
          <div className="space-y-2.5 pt-1">
            <h4 className="font-bold text-slate-900 text-xs">مراحل حل مشکل (کمتر از ۱ دقیقه):</h4>
            <ol className="list-decimal list-inside space-y-2 text-2xs text-slate-600 pr-1">
              <li>
                روی دکمه سبز رنگ زیر کلیک کنید تا صفحه تنظیمات احراز هویت فایربیس برای پروژه <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">{projectId}</code> باز شود.
              </li>
              <li>
                در برگه <strong>Settings</strong>، به بخش <strong>Authorized domains</strong> بروید.
              </li>
              <li>
                روی <strong>Add domain</strong> کلیک کرده، دامنه <code className="font-mono bg-slate-100 px-1 rounded text-slate-800">{currentHostname}</code> را Paste کنید و دکمه <strong>Save</strong> را بزنید.
              </li>
            </ol>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-2xs text-emerald-800">
            💡 <strong>نکته:</strong> تا زمانی که دامنه را اضافه کنید، تمام اطلاعات وارد شده شما در حافظه مرورگر به صورت خودکار ذخیره می‌شود و می‌توانید فایل اکسل/CSV آن را نیز دریافت کنید.
          </div>
        </div>

        {/* پاورقی */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl"
          >
            متوجه شدم
          </button>

          <a
            href={consoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
          >
            <span>ورود به تنظیمات فایربیس</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
