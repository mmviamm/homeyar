import React, { useState } from 'react';
import { Key, ExternalLink, X, Check, AlertCircle, Sparkles } from 'lucide-react';
import { setManualAccessToken } from '../services/googleAuth';

interface TokenConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any, token: string) => void;
}

export const TokenConnectModal: React.FC<TokenConnectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const user = await setManualAccessToken(tokenInput.trim());
      onSuccess(user, tokenInput.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'توکن نامعتبر یا منقضی شده است.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-right animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* هدر */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">اتصال مستقیم با توکن گوگل (جایگزین)</h3>
              <p className="text-2xs text-slate-400">بدون نیاز به پاپ‌آپ یا وابستگی به دامنه‌های فایربیس</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* بدنه */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            اگر پاپ‌آپ فایربیس به خاطر اختلال اینترنت یا دامنه در دسترس نیست، می‌توانید مستقیماً توکن گوگل (OAuth Access Token) خود را در اینجا وارد کنید تا دسترسی کامل به گوگل شیت برقرار شود:
          </p>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-2xs font-bold text-slate-700 mb-1">
              Google OAuth Access Token:
            </label>
            <textarea
              dir="ltr"
              rows={3}
              placeholder="ya29.a0AfH6SM..."
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-2xs text-slate-500 space-y-1">
            <span className="font-bold text-slate-700 block">چگونه توکن تستی بگیریم؟</span>
            <p>
              می‌توانید از ابزار رسمی{' '}
              <a
                href="https://developers.google.com/oauthplayground"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5"
              >
                <span>OAuth 2.0 Playground</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>{' '}
              اسکوپ <code className="font-mono bg-white px-1 border rounded">https://www.googleapis.com/auth/spreadsheets</code> را انتخاب کرده و دکمه Authorize را بزنید تا توکن دریافت شود.
            </p>
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
              disabled={loading || !tokenInput.trim()}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50"
            >
              {loading ? 'در حال بررسی...' : 'تأیید و اتصال توکن'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
