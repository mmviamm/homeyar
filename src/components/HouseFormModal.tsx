import React, { useState, useEffect } from 'react';
import { 
  X, 
  Home, 
  MapPin, 
  Phone, 
  Check, 
  Zap, 
  FileSpreadsheet, 
  AlertCircle, 
  Sparkles,
  Link as LinkIcon,
  Calendar,
  Clock,
  Building,
  Layers,
  FileCheck,
  CreditCard,
  PhoneCall
} from 'lucide-react';
import { 
  DivarHouseVisit, 
  HouseVisitStatus, 
  AgentCallStatus, 
  DeedStatus, 
  MortgageWaitingStatus 
} from '../types/house';
import { 
  toPersianDigits, 
  formatNumberFa, 
  formatVerbalPriceMillion, 
  calculatePricePerMeter 
} from '../utils/persianUtils';

interface HouseFormModalProps {
  isOpen: boolean;
  initialHouse?: DivarHouseVisit | null;
  onClose: () => void;
  onSubmit: (house: DivarHouseVisit) => Promise<void>;
  isLoading?: boolean;
}

const DEFAULT_HOUSE: Omit<DivarHouseVisit, 'id'> = {
  title: '',
  divarUrl: '',
  address: '',
  realEstateAgentAddress: '',
  realEstateAgentPhone: '',
  hasParking: false,
  hasElevator: false,
  hasStorage: false,
  hasBalcony: false,
  totalPriceMillion: 0,
  areaSqm: 0,
  floor: 1,
  totalFloors: 1,
  yearBuilt: '',
  roomsCount: 1,
  deedStatus: 'سند تک‌برگ ملکی',
  waitsForMortgageLoan: 'نامشخص / باید سوال شود',
  agentCallStatus: 'تماس گرفته نشده',
  appointmentLocation: '',
  appointmentDateTime: '',
  score: 7,
  reviewText: '',
  visitStatus: 'در انتظار تماس',
};

export const HouseFormModal: React.FC<HouseFormModalProps> = ({
  isOpen,
  initialHouse,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<DivarHouseVisit>({
    id: `house-${Date.now()}`,
    ...DEFAULT_HOUSE,
  });

  const [entryMode, setEntryMode] = useState<'quick' | 'full'>('quick');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialHouse) {
      setFormData(initialHouse);
    } else {
      setFormData({
        id: `house-${Date.now()}`,
        ...DEFAULT_HOUSE,
        title: '',
        address: '',
        reviewText: '',
      });
    }
    setError(null);
  }, [initialHouse, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.address.trim() && !formData.title.trim()) {
      setError('لطفاً حداقل آدرس یا عنوان ملک را وارد کنید.');
      return;
    }

    // Auto-generate title if user only typed address in quick mode
    let finalTitle = formData.title.trim();
    if (!finalTitle) {
      finalTitle = `${formData.areaSqm} متری در ${formData.address.split('،')[0] || formData.address}`;
    }

    setError(null);
    try {
      await onSubmit({
        ...formData,
        title: finalTitle,
      });
    } catch (err: any) {
      setError(err.message || 'خطا در ذخیره ملک در گوگل شیت');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto text-right">
      <div className="bg-white rounded-3xl w-full max-w-2xl my-4 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* هدر فرم */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {initialHouse ? 'ویرایش مشخصات ملک' : 'ثبت گزینه جدید برای بازدید'}
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>همگام‌سازی مستقیم با گوگل شیت</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* انتخاب حالت ثبت: سریع یا کامل */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setEntryMode('quick')}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                  entryMode === 'quick'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>ثبت فوری در محل</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('full')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  entryMode === 'full'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>فرم کامل</span>
              </button>
            </div>

            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* بدنه فرم */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* بخش اول: آدرس و عنوان */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                آدرس ملک (خیابان / محله / پلاک) *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="مثلاً: خیابان سهروردی شمالی، کوچه نسترن، پلاک ۱۲"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full pr-9 pl-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {entryMode === 'full' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    عنوان آگهی (اختیاری)
                  </label>
                  <input
                    type="text"
                    placeholder="مثلاً: ۸۵ متری خوش نقشه نوساز"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>لینک آگهی دیوار (اختیاری)</span>
                    <span className="text-3xs text-emerald-600 font-normal">اگر از دیوار است</span>
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="url"
                      dir="ltr"
                      placeholder="https://divar.ir/v/..."
                      value={formData.divarUrl}
                      onChange={e => setFormData({ ...formData, divarUrl: e.target.value })}
                      className="w-full pr-9 pl-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* بخش دوم: قیمت و متراژ با بازخوانی کلامی */}
          <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  قیمت کل (به میلیون تومان) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="50"
                    min="0"
                    required
                    placeholder="مثلاً 4500"
                    value={formData.totalPriceMillion || ''}
                    onChange={e => setFormData({ ...formData, totalPriceMillion: Number(e.target.value) })}
                    className="w-full pr-3 pl-12 py-2 text-sm font-bold border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <span className="absolute left-3 top-2 text-2xs font-semibold text-slate-500">
                    م.تومان
                  </span>
                </div>
                {/* بازخوانی کلامی به میلیارد و میلیون */}
                <p className="mt-1 text-xs font-bold text-emerald-800">
                  معادل: {formatVerbalPriceMillion(formData.totalPriceMillion)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  متراژ خانه (متر مربع) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="مثلاً 85"
                    value={formData.areaSqm || ''}
                    onChange={e => setFormData({ ...formData, areaSqm: Number(e.target.value) })}
                    className="w-full pr-3 pl-12 py-2 text-sm font-bold border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <span className="absolute left-3 top-2 text-2xs font-semibold text-slate-500">
                    مترمربع
                  </span>
                </div>
                {/* قیمت هر متر */}
                <p className="mt-1 text-xs font-bold text-slate-700">
                  قیمت هر متر: {calculatePricePerMeter(formData.totalPriceMillion, formData.areaSqm)}
                </p>
              </div>
            </div>
          </div>

          {/* بخش سوم: امکانات کلیدی با دکمه‌های تاچ سریع (پارکینگ، آسانسور، انباری، تراس) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              امکانات کلیدی ملک (کلیک سریع برای تغییر)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* پارکینگ */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, hasParking: !formData.hasParking })}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  formData.hasParking
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">🚗</span>
                <span className="text-xs font-bold">پارکینگ</span>
                <span className="text-2xs font-semibold opacity-90">
                  {formData.hasParking ? 'دارد (تأیید)' : 'ندارد'}
                </span>
              </button>

              {/* آسانسور */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, hasElevator: !formData.hasElevator })}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  formData.hasElevator
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">🛗</span>
                <span className="text-xs font-bold">آسانسور</span>
                <span className="text-2xs font-semibold opacity-90">
                  {formData.hasElevator ? 'دارد (تأیید)' : 'ندارد'}
                </span>
              </button>

              {/* انباری */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, hasStorage: !formData.hasStorage })}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  formData.hasStorage
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">📦</span>
                <span className="text-xs font-bold">انباری</span>
                <span className="text-2xs font-semibold opacity-90">
                  {formData.hasStorage ? 'دارد (تأیید)' : 'ندارد'}
                </span>
              </button>

              {/* تراس */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, hasBalcony: !formData.hasBalcony })}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  formData.hasBalcony
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">🌿</span>
                <span className="text-xs font-bold">تراس / بالکن</span>
                <span className="text-2xs font-semibold opacity-90">
                  {formData.hasBalcony ? 'دارد (تأیید)' : 'ندارد'}
                </span>
              </button>
            </div>
          </div>

          {/* بخش چهارم: طبقه، سال ساخت، تعداد اتاق */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                طبقه
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={formData.floor}
                onChange={e => setFormData({ ...formData, floor: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                از کل طبقات
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.totalFloors}
                onChange={e => setFormData({ ...formData, totalFloors: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تعداد اتاق
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={formData.roomsCount}
                onChange={e => setFormData({ ...formData, roomsCount: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                سال ساخت
              </label>
              <input
                type="text"
                placeholder="مثلاً ۱۴۰۰ یا نوساز"
                value={formData.yearBuilt}
                onChange={e => setFormData({ ...formData, yearBuilt: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          {/* بخش پنجم: سند و وام مسکن */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                وضعیت سند
              </label>
              <select
                value={formData.deedStatus}
                onChange={e => setFormData({ ...formData, deedStatus: e.target.value as DeedStatus })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
              >
                <option value="سند تک‌برگ ملکی">سند تک‌برگ ملکی (معتبرترین)</option>
                <option value="سند شش‌دانگ منگوله‌دار">سند شش‌دانگ منگوله‌دار</option>
                <option value="قولنامه‌ای با کد رهگیری">قولنامه‌ای با کد رهگیری</option>
                <option value="وکالتی">وکالتی</option>
                <option value="سند تعاونی">سند تعاونی</option>
                <option value="سند در دست اقدام">سند در دست اقدام</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                صاحب‌خانه برای گرفتن وام مسکن منتظر می‌ماند؟
              </label>
              <select
                value={formData.waitsForMortgageLoan}
                onChange={e => setFormData({ ...formData, waitsForMortgageLoan: e.target.value as MortgageWaitingStatus })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium"
              >
                <option value="بله، منتظر وام مسکن می‌ماند">بله، منتظر وام مسکن می‌ماند</option>
                <option value="خیر، فقط تسویه نقدی فوری">خیر، فقط تسویه نقدی فوری</option>
                <option value="نیاز به مذاکره / با پرداخت بیعانه بیشتر">نیاز به مذاکره / با پرداخت بیعانه بیشتر</option>
                <option value="نامشخص / باید سوال شود">نامشخص / باید سوال شود</option>
              </select>
            </div>
          </div>

          {/* بخش ششم: مشاور املاک، تماس و قرار بازدید */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              <span>اطلاعات مشاور املاک و قرار بازدید</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-semibold text-slate-700 mb-1">
                  شماره تماس مشاور املاک
                </label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="0912..."
                  value={formData.realEstateAgentPhone}
                  onChange={e => setFormData({ ...formData, realEstateAgentPhone: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl font-mono text-right"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-700 mb-1">
                  آدرس دفتر مشاور املاک
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: املاک کاخ، نبش کوچه دهم"
                  value={formData.realEstateAgentAddress}
                  onChange={e => setFormData({ ...formData, realEstateAgentAddress: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-2xs font-semibold text-slate-700 mb-1">
                  تماس گرفتیم جواب داد؟
                </label>
                <select
                  value={formData.agentCallStatus}
                  onChange={e => setFormData({ ...formData, agentCallStatus: e.target.value as AgentCallStatus })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  <option value="تماس گرفته نشده">تماس گرفته نشده</option>
                  <option value="پاسخ داد و قرار هماهنگ شد">پاسخ داد و قرار هماهنگ شد</option>
                  <option value="پاسخ داد ولی مناسب نبود">پاسخ داد ولی مناسب نبود</option>
                  <option value="پاسخ نداد">پاسخ نداد</option>
                  <option value="خاموش یا اشغال بود">خاموش یا اشغال بود</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-700 mb-1">
                  اگر قرار گذاشتیم کجا؟
                </label>
                <input
                  type="text"
                  placeholder="جلوی ملک یا دفتر املاک"
                  value={formData.appointmentLocation}
                  onChange={e => setFormData({ ...formData, appointmentLocation: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-700 mb-1">
                  چه زمانی؟
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: فردا ساعت ۱۸"
                  value={formData.appointmentDateTime}
                  onChange={e => setFormData({ ...formData, appointmentDateTime: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* بخش هفتم: امتیاز از ۱۰ و نظر و ارزیابی */}
          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-800">
                  امتیاز کلی شما به این ملک (از ۱۰)
                </label>
                <span className="text-sm font-extrabold text-emerald-700 px-2 py-0.5 bg-emerald-100 rounded-lg">
                  {toPersianDigits(formData.score)} از ۱۰
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.score}
                onChange={e => setFormData({ ...formData, score: Number(e.target.value) })}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-3xs text-slate-400 font-mono mt-1">
                <span>۱ (خیلی بد)</span>
                <span>۵ (معمولی)</span>
                <span>۱۰ (عالی و ایده‌آل)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                متن بررسی و نظر شما درباره این خانه *
              </label>
              <textarea
                rows={3}
                placeholder="نقشه چطور بود؟ نورگیر، ساکت بودن کوچه، مشاعات، تمیزی، وضعیت بازسازی و احساس کلی شما..."
                value={formData.reviewText}
                onChange={e => setFormData({ ...formData, reviewText: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* دکمه‌های اقدام و ذخیره */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-2xs text-slate-500 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>مستقیماً در ردیف فایل گوگل شیت شما درج می‌شود.</span>
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isLoading && (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                <span>{initialHouse ? 'بروزرسانی در گوگل شیت' : 'ذخیره در گوگل شیت'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
