import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  Copy, 
  Check, 
  QrCode, 
  ExternalLink, 
  CheckCircle2, 
  Laptop, 
  RefreshCw,
  FileSpreadsheet,
  Zap,
  Info
} from 'lucide-react';
import QRCode from 'qrcode';

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  spreadsheetId?: string;
  spreadsheetTitle?: string;
  spreadsheetUrl?: string;
  webhookUrl?: string | null;
}

export const DeviceSyncModal: React.FC<DeviceSyncModalProps> = ({
  isOpen,
  onClose,
  spreadsheetId,
  spreadsheetTitle,
  spreadsheetUrl,
  webhookUrl,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // تولید لینک اختصاصی همگام‌سازی برای دیوایس دوم
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  let shareUrl = origin;
  if (webhookUrl) {
    shareUrl = `${origin}/?webhook=${encodeURIComponent(webhookUrl)}`;
  } else if (spreadsheetId) {
    shareUrl = `${origin}/?sheet=${encodeURIComponent(spreadsheetId)}`;
  }

  useEffect(() => {
    if (isOpen && shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Error generating QR code:', err));
    }
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const handleCopyId = async () => {
    if (!spreadsheetId) return;
    try {
      await navigator.clipboard.writeText(spreadsheetId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-right animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        {/* هدر */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                اتصال و همگام‌سازی همزمان در چند دیوایس
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                دسترسی به همین شیت روی گوشی، تبلت یا لپ‌تاپ دیگر
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* توضیح تضمین یکسانی داده‌ها */}
        <div className="my-4 p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">تضمین تطابق ۱۰۰٪ داده‌ها با گوگل شیت:</p>
            <p className="text-2xs text-emerald-800 leading-relaxed">
              تمامی اطلاعات مستقیماً روی گوگل شیت شما ذخیره می‌شوند. هر تغییری که در گوشی یا لپ‌تاپ ثبت شود، فوراً در سایر دستگاه‌ها منعکس خواهد شد.
            </p>
          </div>
        </div>

        {/* بارکد QR برای اسکن سریع با دوربین گوشی */}
        {qrDataUrl && (
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-4">
            <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
              <img src={qrDataUrl} alt="QR Code دیوایس دوم" className="w-44 h-44 object-contain" />
            </div>
            <p className="text-2xs text-slate-600 font-bold mt-2 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>دوربین گوشی را روبه‌روی بارکد بگیرید تا مستقیماً به همین شیت متصل شوید</span>
            </p>
          </div>
        )}

        {/* لینک مستقیم اتصال */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              لینک اختصاصی اتصال برای ارسال به تلگرام / واتساپ / پیامک
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                dir="ltr"
                value={shareUrl}
                className="flex-1 px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-xl text-slate-700 font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'کپی شد!' : 'کپی لینک'}</span>
              </button>
            </div>
          </div>

          {/* شناسه اسپردشیت در صورت استفاده از اکانت گوگل */}
          {spreadsheetId && (
            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">
                شناسه اسپردشیت گوگل (Spreadsheet ID):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  dir="ltr"
                  value={spreadsheetId}
                  className="flex-1 px-2.5 py-1.5 text-2xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-mono select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-2xs font-semibold flex items-center gap-1 border border-slate-200"
                >
                  {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedId ? 'کپی شد' : 'کپی ID'}</span>
                </button>
              </div>
            </div>
          )}

          {/* لینک باز کردن شیت در تب جدید */}
          {spreadsheetUrl && (
            <div className="pt-1 flex items-center justify-between text-xs">
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>مشاهده مستقیم در Google Sheets</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              {spreadsheetTitle && (
                <span className="text-3xs text-slate-400 truncate max-w-[200px]">
                  {spreadsheetTitle}
                </span>
              )}
            </div>
          )}
        </div>

        {/* مراحل کار */}
        <div className="mt-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs text-slate-600 space-y-2">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>نحوه اتصال دیوایس دوم:</span>
          </div>
          <ol className="list-decimal list-inside text-2xs space-y-1 text-slate-500 pr-1 leading-relaxed">
            <li>بارکد بالا را با گوشی دوم اسکن کنید یا لینک را در مرورگر آن باز نمایید.</li>
            <li>اگر از اکانت گوگل استفاده می‌کنید، روی دیوایس دوم دکمه «ورود با گوگل» را بزنید.</li>
            <li>برنامه به طور خودکار به همین فایل وصل شده و تمام موارد فوراً بارگذاری می‌شوند.</li>
          </ol>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            متوجه شدم
          </button>
        </div>
      </div>
    </div>
  );
};
