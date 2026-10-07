import React from 'react';
import { 
  MapPin, 
  Phone, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Sparkles, 
  Check, 
  X, 
  Calendar, 
  Clock, 
  Building2, 
  FileText, 
  Banknote,
  PhoneCall,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Archive,
  ArchiveRestore
} from 'lucide-react';
import { DivarHouseVisit } from '../types/house';
import { 
  toPersianDigits, 
  formatNumberFa, 
  formatVerbalPriceMillion, 
  calculatePricePerMeter 
} from '../utils/persianUtils';

interface HouseCardProps {
  house: DivarHouseVisit;
  onEdit: (house: DivarHouseVisit) => void;
  onDeleteRequest: (house: DivarHouseVisit) => void;
  onToggleArchive?: (house: DivarHouseVisit) => void;
  onRetrySync?: (house: DivarHouseVisit) => void;
  onForgetFailed?: (house: DivarHouseVisit) => void;
  isComparing?: boolean;
  onToggleCompare?: (house: DivarHouseVisit) => void;
}

export const HouseCard: React.FC<HouseCardProps> = ({
  house,
  onEdit,
  onDeleteRequest,
  onToggleArchive,
  onRetrySync,
  onForgetFailed,
  isComparing = false,
  onToggleCompare,
}) => {
  const getCallBadge = (status: string) => {
    if (status.includes('هماهنگ شد')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
    if (status.includes('نداد') || status.includes('خاموش')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 8) return 'bg-emerald-600 text-white';
    if (score >= 6) return 'bg-teal-600 text-white';
    if (score >= 4) return 'bg-amber-500 text-white';
    return 'bg-slate-400 text-white';
  };

  return (
    <div className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md flex flex-col justify-between text-right ${
      house.isArchived ? 'opacity-70' : ''
    } ${
      house.syncStatus === 'failed' 
        ? 'border-rose-300 ring-2 ring-rose-200' 
        : isComparing 
        ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
        : 'border-slate-200 hover:border-slate-300'
    }`}>
      {/* هدر کارت */}
      <div className="p-5 pb-3">
        {house.isArchived && (
          <div className="mb-3 px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-2xl flex items-center gap-1.5 text-xs text-slate-600 font-bold">
            <Archive className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span>آرشیو شده</span>
          </div>
        )}
        {/* نوار خطای همگام‌سازی در صورت عدم ارسال به شیت */}
        {house.syncStatus === 'failed' && (
          <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-900 font-bold">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>
                {house.pendingOp === 'delete'
                  ? 'حذف از شیت انجام نشد (خطای اینترنت)'
                  : house.pendingOp === 'update'
                  ? 'ویرایش در شیت ذخیره نشد (خطای اینترنت)'
                  : 'عدم ارسال به شیت (خطای اینترنت)'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {onRetrySync && (
                <button
                  type="button"
                  onClick={() => onRetrySync(house)}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-3xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                  title="تلاش مجدد برای ارسال به گوگل شیت"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>تلاش مجدد</span>
                </button>
              )}
              {onForgetFailed && (
                <button
                  type="button"
                  onClick={() => onForgetFailed(house)}
                  className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-3xs font-bold flex items-center gap-1 transition-colors"
                  title="فراموش کردن این مورد ناموفق"
                >
                  <X className="w-3 h-3" />
                  <span>فراموش کن</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* وضعیت تماس، آگهی و سینک شیت */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`px-2.5 py-0.5 text-3xs font-bold rounded-full border ${getCallBadge(house.agentCallStatus)}`}>
                {house.agentCallStatus}
              </span>

              {house.syncStatus === 'synced' && (
                <span className="px-2 py-0.5 text-3xs font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>ثبت در شیت</span>
                </span>
              )}

              {house.syncStatus === 'pending' && (
                <span className="px-2 py-0.5 text-3xs font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                  <span>در حال ارسال...</span>
                </span>
              )}

              {house.divarUrl ? (
                <a
                  href={house.divarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 text-3xs font-bold rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1"
                >
                  <span>آگهی دیوار</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ) : (
                <span className="px-2 py-0.5 text-3xs font-medium rounded-md bg-slate-100 text-slate-600">
                  ثبت حضوری
                </span>
              )}

              {house.yearBuilt && (
                <span className="text-3xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                  ساخت {toPersianDigits(house.yearBuilt)}
                </span>
              )}
            </div>

            <h3 className="font-extrabold text-slate-900 text-base leading-snug truncate" title={house.title || house.address}>
              {house.title || house.address}
            </h3>

            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate" title={house.address}>
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>{house.address}</span>
            </p>
          </div>

          {/* نمره از ۱۰ */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center shadow-xs ${getScoreBadgeColor(house.score)}`}>
              <span className="text-sm font-black leading-none">{toPersianDigits(house.score)}</span>
              <span className="text-3xs opacity-80 font-bold mt-0.5">از ۱۰</span>
            </div>
          </div>
        </div>

        {/* بخش قیمت به میلیون تومان و معادل کلامی */}
        <div className="mt-3 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100/90 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-950 tracking-tight">
                {formatNumberFa(house.totalPriceMillion)}
              </span>
              <span className="text-xs font-bold text-emerald-700">میلیون تومان</span>
            </div>
            <p className="text-2xs font-bold text-emerald-800 mt-0.5">
              {formatVerbalPriceMillion(house.totalPriceMillion)}
            </p>
          </div>

          <div className="text-left">
            <span className="text-3xs text-slate-500 block font-medium">قیمت هر متر مربع</span>
            <span className="text-xs font-bold text-slate-800">
              {calculatePricePerMeter(house.totalPriceMillion, house.areaSqm)}
            </span>
          </div>
        </div>

        {/* مشخصات خانه: متراژ، طبقه، خواب */}
        <div className="mt-3 grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-2xl text-center text-xs text-slate-700 border border-slate-100">
          <div>
            <span className="text-3xs text-slate-400 block mb-0.5">متراژ</span>
            <span className="font-extrabold text-slate-900 text-sm">{toPersianDigits(house.areaSqm)}</span>
            <span className="text-3xs text-slate-500 mr-1">متر</span>
          </div>

          <div>
            <span className="text-3xs text-slate-400 block mb-0.5">طبقه</span>
            <span className="font-extrabold text-slate-900 text-sm">
              {toPersianDigits(house.floor)} از {toPersianDigits(house.totalFloors)}
            </span>
          </div>

          <div>
            <span className="text-3xs text-slate-400 block mb-0.5">تعداد اتاق</span>
            <span className="font-extrabold text-slate-900 text-sm">
              {house.roomsCount ? toPersianDigits(house.roomsCount) : 'بدون'}
            </span>
            <span className="text-3xs text-slate-500 mr-1">خواب</span>
          </div>
        </div>

        {/* امکانات ۴ گانه با تیک و ضربدر مشخص */}
        <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-2xs">
          {/* پارکینگ */}
          <div className={`p-1.5 rounded-xl border flex flex-col items-center gap-0.5 ${
            house.hasParking 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' 
              : 'bg-slate-50 border-slate-100 text-slate-400'
          }`}>
            <span>پارکینگ</span>
            <span className="text-3xs font-semibold">
              {house.hasParking ? '✓ دارد' : '✕ ندارد'}
            </span>
          </div>

          {/* آسانسور */}
          <div className={`p-1.5 rounded-xl border flex flex-col items-center gap-0.5 ${
            house.hasElevator 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' 
              : 'bg-slate-50 border-slate-100 text-slate-400'
          }`}>
            <span>آسانسور</span>
            <span className="text-3xs font-semibold">
              {house.hasElevator ? '✓ دارد' : '✕ ندارد'}
            </span>
          </div>

          {/* انباری */}
          <div className={`p-1.5 rounded-xl border flex flex-col items-center gap-0.5 ${
            house.hasStorage 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' 
              : 'bg-slate-50 border-slate-100 text-slate-400'
          }`}>
            <span>انباری</span>
            <span className="text-3xs font-semibold">
              {house.hasStorage ? '✓ دارد' : '✕ ندارد'}
            </span>
          </div>

          {/* تراس */}
          <div className={`p-1.5 rounded-xl border flex flex-col items-center gap-0.5 ${
            house.hasBalcony 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' 
              : 'bg-slate-50 border-slate-100 text-slate-400'
          }`}>
            <span>تراس</span>
            <span className="text-3xs font-semibold">
              {house.hasBalcony ? '✓ دارد' : '✕ ندارد'}
            </span>
          </div>
        </div>

        {/* وضعیت سند و وام مسکن */}
        <div className="mt-3 space-y-1.5 text-2xs">
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-medium">وضعیت سند:</span>
            <span className="font-bold text-slate-800">{house.deedStatus}</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-medium">پذیرش وام مسکن:</span>
            <span className={`font-bold ${
              house.waitsForMortgageLoan.includes('بله') 
                ? 'text-emerald-700' 
                : house.waitsForMortgageLoan.includes('خیر')
                ? 'text-rose-600'
                : 'text-amber-700'
            }`}>
              {house.waitsForMortgageLoan}
            </span>
          </div>
        </div>

        {/* اطلاعات قرار و مشاور املاک */}
        {(house.appointmentDateTime || house.appointmentLocation || house.realEstateAgentPhone) && (
          <div className="mt-3 p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-2xs space-y-1">
            {house.appointmentDateTime && (
              <div className="flex items-center gap-1.5 text-blue-900 font-semibold">
                <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span>قرار: {house.appointmentDateTime}</span>
                {house.appointmentLocation && (
                  <span className="text-blue-700 truncate">({house.appointmentLocation})</span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-blue-200/50">
              <span className="text-blue-800 truncate max-w-[180px]">
                {house.realEstateAgentAddress || 'مشاور املاک'}
              </span>
              {house.realEstateAgentPhone && (
                <a
                  href={`tel:${house.realEstateAgentPhone}`}
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold bg-white px-2 py-0.5 rounded-lg border border-blue-200 shadow-3xs"
                  dir="ltr"
                >
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>{house.realEstateAgentPhone}</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* متن بررسی و نظر کاربر */}
        {house.reviewText && (
          <div className="mt-3 p-3 bg-amber-50/60 border border-amber-200/70 rounded-2xl text-xs text-amber-950 leading-relaxed italic">
            "{house.reviewText}"
          </div>
        )}
      </div>

      {/* پاورقی کارت و دکمه‌های عملیات */}
      <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
        {onToggleCompare && (
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isComparing}
              onChange={() => onToggleCompare(house)}
              className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-slate-300"
            />
            <span>مقایسه</span>
          </label>
        )}

        <div className="flex items-center gap-1.5 mr-auto">
          {house.realEstateAgentPhone && (
            <a
              href={`tel:${house.realEstateAgentPhone}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 transition-colors"
              title="تماس تلفنی با مشاور املاک"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>تماس</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => onEdit(house)}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-colors"
            title="ویرایش و همگام‌سازی با گوگل شیت"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          {onToggleArchive && (
            <button
              type="button"
              onClick={() => onToggleArchive(house)}
              disabled={house.syncStatus === 'pending'}
              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors disabled:opacity-40"
              title={house.isArchived ? 'خارج کردن از آرشیو' : 'انتقال به آرشیو'}
            >
              {house.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => onDeleteRequest(house)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            title="حذف از گوگل شیت (با تأییدیه)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
