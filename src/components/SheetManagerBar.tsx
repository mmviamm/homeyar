import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  PlusCircle, 
  Link as LinkIcon, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Smartphone,
  ChevronDown
} from 'lucide-react';
import { User } from 'firebase/auth';
import { ActiveSpreadsheetInfo } from '../types/house';
import { GoogleSignInButton } from './GoogleSignInButton';
import { toPersianDigits } from '../utils/persianUtils';

interface SheetManagerBarProps {
  user: User | any | null;
  activeSheet: ActiveSpreadsheetInfo | null;
  webhookUrl: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt?: Date | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onSync: () => void;
  onCreateNewSheet: (title?: string) => Promise<void>;
  onConnectExistingSheet: (urlOrId: string) => Promise<void>;
  onOpenWebhookModal: () => void;
  onOpenDeviceSyncModal: () => void;
}

export const SheetManagerBar: React.FC<SheetManagerBarProps> = ({
  user,
  activeSheet,
  webhookUrl,
  isLoading,
  isSyncing,
  lastSyncedAt,
  onSignIn,
  onSignOut,
  onSync,
  onCreateNewSheet,
  onConnectExistingSheet,
  onOpenWebhookModal,
  onOpenDeviceSyncModal,
}) => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [sheetInput, setSheetInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSheetTitle, setNewSheetTitle] = useState('لیست بازدید خانه‌ها و گزینه‌های خرید');
  const [actionError, setActionError] = useState<string | null>(null);

  const isConnected = Boolean(user || webhookUrl);

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetInput.trim()) return;
    setActionError(null);
    try {
      await onConnectExistingSheet(sheetInput.trim());
      setShowConnectModal(false);
      setSheetInput('');
    } catch (err: any) {
      setActionError(err.message || 'خطا در اتصال به اسپردشیت گوگل');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await onCreateNewSheet(newSheetTitle.trim() || 'لیست بازدید خانه‌ها');
      setShowCreateModal(false);
    } catch (err: any) {
      setActionError(err.message || 'خطا در ساخت گوگل شیت');
    }
  };

  const formatLastSync = (date?: Date | null) => {
    if (!date) return '';
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${toPersianDigits(h)}:${toPersianDigits(m)}:${toPersianDigits(s)}`;
  };

  return (
    <div className="bg-white border-b border-slate-200 lg:sticky lg:top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 lg:py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 lg:gap-3">
          
          {/* سمت راست: لوگو و وضعیت اتصال */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl lg:rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
              <FileSpreadsheet className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-slate-900 text-lg tracking-tight">خانه یار</span>
                
                {webhookUrl ? (
                  <span className="px-2.5 py-0.5 text-3xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    همگام با وب‌هوک شیت (بدون فایربیس)
                  </span>
                ) : activeSheet ? (
                  <span className="px-2.5 py-0.5 text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    همگام با گوگل شیت
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-3xs font-medium bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
                    شیت متصل نیست (حافظه محلی)
                  </span>
                )}

                {lastSyncedAt && (
                  <span className="text-3xs text-slate-400 font-medium">
                    آخرین همگام‌سازی: {formatLastSync(lastSyncedAt)}
                  </span>
                )}
              </div>
              <p className="hidden sm:block text-xs text-slate-500 font-medium truncate max-w-md">
                {webhookUrl
                  ? 'داده‌ها به صورت زنده و دوطرفه با گوگل شیت همگام هستند'
                  : activeSheet 
                  ? `شیت فعال: ${activeSheet.title}`
                  : 'برای هماهنگی دقیق بین دیوایس‌ها، گوگل شیت را متصل نمایید'}
              </p>
            </div>
          </div>

          {/* سمت چپ: دکمه‌ها و مدیریت شیت */}
          <div className="flex flex-wrap items-center gap-2">
            {!isConnected ? (
              <div className="flex items-center gap-2 flex-wrap">
                {/* دکمه وب‌هوک بدون فایربیس */}
                <button
                  type="button"
                  onClick={onOpenWebhookModal}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                  title="اتصال مستقیم به شیت بدون فایربیس"
                >
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  <span>اتصال مستقیم به شیت (وب‌هوک)</span>
                </button>

                <GoogleSignInButton onClick={onSignIn} disabled={isLoading} label="ورود با گوگل" />
              </div>
            ) : (
              <>
                {/* دکمه همگام‌سازی بین دو دیوایس */}
                {(activeSheet || webhookUrl) && (
                  <button
                    type="button"
                    onClick={onOpenDeviceSyncModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold shadow-2xs transition-colors"
                    title="مشاهده بارکد QR و لینک اتصال برای گوشی یا دستگاه دوم"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                    <span>اتصال دیوایس دوم (QR)</span>
                  </button>
                )}

                {activeSheet && (
                  <a
                    href={activeSheet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-colors"
                    title="مشاهده مستقیم اسپردشیت در گوگل شیت"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>گوگل شیت</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                )}

                {/* دکمه بروزرسانی / همگام‌سازی لحظه‌ای */}
                <button
                  type="button"
                  onClick={onSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                  title="خواندن مجدد و همگام‌سازی لحظه‌ای از گوگل شیت"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>{isSyncing ? 'در حال همگام‌سازی...' : 'بروزرسانی'}</span>
                </button>

                {/* اگر کاربر گوگل لاگین است ولی شیت فعال ندارد، یا می‌خواهد شیت عوض کند */}
                {user && (
                  <div className="flex items-center gap-1.5">
                    {!activeSheet ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowCreateModal(true)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>ساخت شیت جدید</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowConnectModal(true)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
                        >
                          <LinkIcon className="w-3.5 h-3.5" />
                          <span>اتصال شیت موجود</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowConnectModal(true)}
                        className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-medium rounded-xl hover:bg-slate-100 transition-colors"
                        title="تغییر شیت متصل"
                      >
                        تغییر شیت
                      </button>
                    )}
                  </div>
                )}

                {/* تنظیمات وب‌هوک */}
                <button
                  type="button"
                  onClick={onOpenWebhookModal}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    webhookUrl 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="تنظیمات وب‌هوک گوگل شیت"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{webhookUrl ? 'وب‌هوک' : 'وب‌هوک'}</span>
                </button>

                {user && (
                  <div className="flex items-center gap-2 pr-2 border-r border-slate-200 mr-1">
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={user.displayName || 'کاربر'} 
                        className="w-7 h-7 rounded-full border border-slate-200"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                        {(user.displayName || user.email || 'ک')[0].toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={onSignOut}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                      title="خروج از حساب گوگل"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* مودال اتصال به شیت قبلی */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-right">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <LinkIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">اتصال به گوگل شیت موجود</h3>
                <p className="text-xs text-slate-500">لینک یا شناسه (Spreadsheet ID) شیت دیوایس اول را وارد کنید</p>
              </div>
            </div>

            {actionError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleConnectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  لینک گوگل شیت یا ID
                </label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiM.../edit"
                  value={sheetInput}
                  onChange={(e) => setSheetInput(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowConnectModal(false);
                    setActionError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={!sheetInput.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50"
                >
                  اتصال و بارگذاری اطلاعات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال ساخت شیت جدید */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-right">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">ساخت اسپردشیت جدید در گوگل درایو</h3>
                <p className="text-xs text-slate-500">ایجاد خودکار یک شیت فارسی راست‌چین با تمام ستون‌های لازم</p>
              </div>
            </div>

            {actionError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  نام فایل اسپردشیت
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: گزینه‌های خرید خانه ۱۴۰۵"
                  value={newSheetTitle}
                  onChange={(e) => setNewSheetTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1.5">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ستون‌هایی که خودکار ایجاد می‌شوند:
                </p>
                <ul className="list-disc list-inside text-2xs space-y-1 text-slate-500 pr-1">
                  <li>عنوان، آدرس، لینک دیوار و مشخصات مشاور املاک</li>
                  <li>قیمت کل (میلیون تومان) و محاسبه قیمت هر مترمربع</li>
                  <li>پارکینگ، آسانسور، انباری، تراس، طبقه و سال ساخت</li>
                  <li>وضعیت سند و پذیرش وام مسکن توسط صاحب‌خانه</li>
                  <li>نتیجه تماس با املاک و زمان/مکان قرار بازدید</li>
                  <li>امتیاز از ۱۰ و یادداشت بررسی شما</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setActionError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  ساخت و اتصال شیت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
