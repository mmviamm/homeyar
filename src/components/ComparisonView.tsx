import React from 'react';
import { 
  X, 
  Sparkles, 
  Award,
  ExternalLink,
  Phone,
  Check,
  Building
} from 'lucide-react';
import { DivarHouseVisit } from '../types/house';
import { 
  toPersianDigits, 
  formatNumberFa, 
  formatVerbalPriceMillion, 
  calculatePricePerMeter 
} from '../utils/persianUtils';

interface ComparisonViewProps {
  houses: DivarHouseVisit[];
  onRemoveFromCompare: (house: DivarHouseVisit) => void;
  onClearCompare: () => void;
  onClose: () => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  houses,
  onRemoveFromCompare,
  onClearCompare,
  onClose,
}) => {
  if (houses.length === 0) return null;

  const highestScore = Math.max(...houses.map(h => h.score || 0));
  const lowestPrice = Math.min(...houses.map(h => h.totalPriceMillion || Infinity));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto text-right">
      <div className="bg-white rounded-3xl w-full max-w-6xl my-4 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* هدر */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">مقایسه رو در رو گزینه‌های خرید</h2>
              <p className="text-xs text-slate-400">مقایسه {toPersianDigits(houses.length)} ملک انتخاب شده</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClearCompare}
              className="text-xs text-slate-400 hover:text-white px-3 py-1 rounded-xl bg-slate-800"
            >
              پاک کردن انتخاب‌ها
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* جدول مقایسه */}
        <div className="p-6 overflow-x-auto overflow-y-auto flex-1">
          <div className="min-w-[640px]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider w-48 bg-slate-50 border-b border-slate-200">
                    ویژگی
                  </th>
                  {houses.map(house => (
                    <th key={house.id} className="p-3 text-right bg-slate-50 border-b border-slate-200 relative">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-extrabold text-slate-900 text-sm block truncate max-w-[200px]">
                            {house.title || house.address}
                          </span>
                          <span className="text-xs text-slate-500 font-normal truncate block max-w-[200px]">
                            {house.address}
                          </span>
                        </div>
                        <button
                          onClick={() => onRemoveFromCompare(house)}
                          className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
                          title="حذف از مقایسه"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {/* امتیاز */}
                <tr className="bg-emerald-50/50">
                  <td className="p-3 font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    امتیاز از ۱۰
                  </td>
                  {houses.map(house => {
                    const isWinner = house.score === highestScore && houses.length > 1;
                    return (
                      <td key={house.id} className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-black px-2.5 py-0.5 rounded-lg ${
                            isWinner ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-800'
                          }`}>
                            {toPersianDigits(house.score)} از ۱۰
                          </span>
                          {isWinner && (
                            <span className="text-3xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                              بالاترین امتیاز
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* قیمت کل */}
                <tr>
                  <td className="p-3 font-bold text-slate-600">قیمت کل (میلیون تومان)</td>
                  {houses.map(house => {
                    const isLowest = house.totalPriceMillion === lowestPrice && houses.length > 1;
                    return (
                      <td key={house.id} className="p-3">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-black text-emerald-950">
                            {formatNumberFa(house.totalPriceMillion)} م.ت
                          </span>
                          {isLowest && (
                            <span className="text-3xs font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                              مناسب‌ترین قیمت
                            </span>
                          )}
                        </div>
                        <p className="text-2xs text-emerald-700 font-normal mt-0.5">
                          {formatVerbalPriceMillion(house.totalPriceMillion)}
                        </p>
                      </td>
                    );
                  })}
                </tr>

                {/* قیمت هر متر */}
                <tr>
                  <td className="p-3 font-semibold text-slate-600">قیمت هر متر مربع</td>
                  {houses.map(house => (
                    <td key={house.id} className="p-3 text-slate-800 font-bold">
                      {calculatePricePerMeter(house.totalPriceMillion, house.areaSqm)}
                    </td>
                  ))}
                </tr>

                {/* متراژ و خواب */}
                <tr>
                  <td className="p-3 font-semibold text-slate-600">متراژ و تعداد خواب</td>
                  {houses.map(house => (
                    <td key={house.id} className="p-3 text-slate-800">
                      {toPersianDigits(house.areaSqm)} متر • {house.roomsCount ? `${toPersianDigits(house.roomsCount)} خواب` : 'بدون خواب'}
                    </td>
                  ))}
                </tr>

                {/* طبقه و سال ساخت */}
                <tr>
                  <td className="p-3 font-semibold text-slate-600">طبقه و سال ساخت</td>
                  {houses.map(house => (
                    <td key={house.id} className="p-3 text-slate-800">
                      طبقه {toPersianDigits(house.floor)} از {toPersianDigits(house.totalFloors)} • ساخت {toPersianDigits(house.yearBuilt)}
                    </td>
                  ))}
                </tr>

                {/* امکانات کلیدی */}
                <tr>
                  <td className="p-3 font-semibold text-slate-600">امکانات اصلی</td>
                  {houses.map(house => (
                    <td key={house.id} className="p-3">
                      <div className="flex flex-wrap gap-1 text-3xs font-bold">
                        <span className={`px-2 py-0.5 rounded ${house.hasParking ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                          {house.hasParking ? '✓ پارکینگ' : '✕ پارکینگ'}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${house.hasElevator ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                          {house.hasElevator ? '✓ آسانسور' : '✕ آسانسور'}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${house.hasStorage ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                          {house.hasStorage ? '✓ انباری' : '✕ انباری'}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${house.hasBalcony ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                          {house.hasBalcony ? '✓ تراس' : '✕ تراس'}
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* وضعیت سند */}
                <tr>
                  <td className="p-3 font-semibold text-slate-600">وضعیت سند</td>
                  {houses.map(house => (
                    <td key={house.id} className="p-3 font-bold text-slate-900">
                      {house.deedStatus}
                    </td>
                  ))}
                </tr>

                {/* وام مسکن */}
                <tr>
                  <td className="p-3 font-semibold text-slate-600">پذیرش وام مسکن</td>
                  {houses.map(house => (
                    <td key={house.id} className="p-3 font-bold text-slate-800">
                      {house.waitsForMortgageLoan}
                    </td>
                  ))}
                </tr>

                {/* وضعیت فرآیند خرید */}
                <tr>
                  <td className="p-3 font-semibold text-slate-600">وضعیت فرآیند خرید</td>
                  {houses.map(house => (
                    <td key={house.id} className="p-3">
                      <span className={`px-2.5 py-1 rounded-lg text-2xs font-extrabold border inline-block ${
                        house.visitStatus === 'تایید شده'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : house.visitStatus === 'رد شده'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : house.visitStatus === 'بازدید شده'
                          ? 'bg-purple-50 text-purple-800 border-purple-300'
                          : house.visitStatus === 'هماهنگ شده'
                          ? 'bg-blue-50 text-blue-800 border-blue-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}>
                        {house.visitStatus || 'در انتظار تماس'}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* وضعیت تماس و قرار */}
                <tr>
                  <td className="p-3 font-semibold text-slate-600">تماس با املاک و قرار</td>
                  {houses.map(house => (
                    <td key={house.id} className="p-3 text-slate-800">
                      <div>{house.agentCallStatus}</div>
                      {house.appointmentDateTime && (
                        <div className="text-2xs text-blue-700 font-bold mt-0.5">
                          {house.appointmentDateTime} ({house.appointmentLocation || 'جلوی ملک'})
                        </div>
                      )}
                    </td>
                  ))}
                </tr>

                {/* مشاور املاک */}
                <tr>
                  <td className="p-3 font-semibold text-slate-600">مشاور املاک</td>
                  {houses.map(house => (
                    <td key={house.id} className="p-3 text-slate-700 text-2xs">
                      <div>{house.realEstateAgentAddress || '-'}</div>
                      {house.realEstateAgentPhone && (
                        <a href={`tel:${house.realEstateAgentPhone}`} className="text-emerald-700 font-bold font-mono" dir="ltr">
                          {house.realEstateAgentPhone}
                        </a>
                      )}
                    </td>
                  ))}
                </tr>

                {/* نظر و ارزیابی */}
                <tr>
                  <td className="p-3 font-semibold text-slate-600">نظر و ارزیابی</td>
                  {houses.map(house => (
                    <td key={house.id} className="p-3 text-slate-700 text-2xs italic leading-relaxed">
                      {house.reviewText ? `"${house.reviewText}"` : 'نظری ثبت نشده'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
