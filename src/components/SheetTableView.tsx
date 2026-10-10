import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  ArrowUpDown, 
  Search, 
  Edit3, 
  Trash2, 
  Sparkles,
  Phone,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Archive,
  ArchiveRestore,
  X
} from 'lucide-react';
import { DivarHouseVisit, HouseVisitStatus, HOUSE_VISIT_STATUSES } from '../types/house';
import { 
  toPersianDigits, 
  formatNumberFa, 
  formatVerbalPriceMillion, 
  calculatePricePerMeter 
} from '../utils/persianUtils';

interface SheetTableViewProps {
  houses: DivarHouseVisit[];
  spreadsheetUrl?: string;
  onEdit: (house: DivarHouseVisit) => void;
  onDelete: (house: DivarHouseVisit) => void;
  onToggleArchive?: (house: DivarHouseVisit) => void;
  onRetrySync?: (house: DivarHouseVisit) => void;
  onForgetFailed?: (house: DivarHouseVisit) => void;
  onStatusChange?: (house: DivarHouseVisit, newStatus: HouseVisitStatus) => void;
}

export const SheetTableView: React.FC<SheetTableViewProps> = ({
  houses,
  spreadsheetUrl,
  onEdit,
  onDelete,
  onToggleArchive,
  onRetrySync,
  onForgetFailed,
  onStatusChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'rowIndex' | 'totalPriceMillion' | 'score' | 'areaSqm' | 'pricePerMeter' | 'visitStatus'>('rowIndex');
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = houses.filter(h => {
    const q = searchTerm.toLowerCase();
    return (
      (h.title && h.title.toLowerCase().includes(q)) ||
      (h.address && h.address.toLowerCase().includes(q)) ||
      (h.realEstateAgentAddress && h.realEstateAgentAddress.toLowerCase().includes(q)) ||
      (h.reviewText && h.reviewText.toLowerCase().includes(q)) ||
      (h.visitStatus && h.visitStatus.toLowerCase().includes(q))
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal: any = a[sortField as keyof DivarHouseVisit] || 0;
    let bVal: any = b[sortField as keyof DivarHouseVisit] || 0;

    if (sortField === 'pricePerMeter') {
      aVal = a.areaSqm > 0 ? a.totalPriceMillion / a.areaSqm : 0;
      bVal = b.areaSqm > 0 ? b.totalPriceMillion / b.areaSqm : 0;
    } else if (sortField === 'visitStatus') {
      aVal = String(a.visitStatus || '');
      bVal = String(b.visitStatus || '');
    }

    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden text-right">
      {/* نوار بالای جدول */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-slate-800 text-sm">نمایش مستقیم سطرهای گوگل شیت</h3>
          <span className="text-xs text-slate-500">({toPersianDigits(houses.length)} مورد ثبت شده)</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="جستجو در آدرس، نام مشاور املاک یا نظرات..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            />
          </div>

          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline flex-shrink-0"
            >
              <span>مشاهده در گوگل شیت</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* محفظه جدول */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 text-slate-200 border-b border-slate-800 text-3xs font-bold uppercase tracking-wider">
              <th className="p-3 w-12 text-center text-slate-400">ردیف</th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('score')}>
                <div className="flex items-center gap-1">
                  <span>امتیاز</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3">عنوان و آدرس ملک</th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('totalPriceMillion')}>
                <div className="flex items-center gap-1">
                  <span>قیمت کل (م.تومان)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('pricePerMeter')}>
                <div className="flex items-center gap-1">
                  <span>قیمت هر متر (م.تومان)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('areaSqm')}>
                <div className="flex items-center gap-1">
                  <span>متراژ</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3">طبقه</th>
              <th className="p-3">امکانات (پارکینگ/آسانسور/انباری/تراس)</th>
              <th className="p-3">سند و وام</th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('visitStatus')}>
                <div className="flex items-center gap-1">
                  <span>وضعیت فرآیند خرید</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3">وضعیت تماس و قرار</th>
              <th className="p-3">مشاور املاک</th>
              <th className="p-3 max-w-[200px]">نظر و ارزیابی</th>
              <th className="p-3 text-left">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {sorted.map((house, idx) => (
              <tr key={house.id} className={`hover:bg-slate-50/80 transition-colors ${house.isArchived ? 'opacity-60' : ''}`}>
                <td className="p-3 text-center text-2xs font-mono text-slate-400 bg-slate-50/50">
                  {toPersianDigits(house.rowIndex || idx + 2)}
                </td>

                <td className="p-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-black text-xs bg-emerald-100 text-emerald-800">
                    <Sparkles className="w-3 h-3" />
                    {toPersianDigits(house.score)}/۱۰
                  </span>
                </td>

                <td className="p-3 max-w-[220px]">
                  <div className="font-bold text-slate-900 truncate" title={house.title || house.address}>
                    {house.title || house.address}
                  </div>
                  <div className="text-3xs text-slate-500 truncate mt-0.5">
                    {house.address}
                  </div>
                </td>

                <td className="p-3 font-bold text-emerald-900 whitespace-nowrap">
                  <div>{formatNumberFa(house.totalPriceMillion)} م.ت</div>
                  <div className="text-3xs text-emerald-700 font-normal">
                    {formatVerbalPriceMillion(house.totalPriceMillion)}
                  </div>
                </td>

                <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                  <div className="text-2xs font-extrabold">{calculatePricePerMeter(house.totalPriceMillion, house.areaSqm)}</div>
                </td>

                <td className="p-3 whitespace-nowrap">
                  {toPersianDigits(house.areaSqm)} متر
                </td>

                <td className="p-3 whitespace-nowrap text-slate-600">
                  {toPersianDigits(house.floor)} از {toPersianDigits(house.totalFloors)}
                </td>

                <td className="p-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-3xs">
                    <span className={`px-1.5 py-0.5 rounded ${house.hasParking ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                      {house.hasParking ? '✓ پارک' : '✕'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${house.hasElevator ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                      {house.hasElevator ? '✓ آسان' : '✕'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${house.hasStorage ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                      {house.hasStorage ? '✓ انبار' : '✕'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${house.hasBalcony ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                      {house.hasBalcony ? '✓ تراس' : '✕'}
                    </span>
                  </div>
                </td>

                <td className="p-3 max-w-[150px] text-3xs">
                  <div className="font-semibold text-slate-800 truncate">{house.deedStatus}</div>
                  <div className="text-slate-500 truncate">{house.waitsForMortgageLoan}</div>
                </td>

                <td className="p-3 whitespace-nowrap text-3xs">
                  {onStatusChange ? (
                    <select
                      value={house.visitStatus || 'در انتظار تماس'}
                      onChange={e => onStatusChange(house, e.target.value as HouseVisitStatus)}
                      className={`font-extrabold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                        house.visitStatus === 'تایید شده'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : house.visitStatus === 'رد شده'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : house.visitStatus === 'بازدید شده'
                          ? 'bg-purple-50 text-purple-800 border-purple-300'
                          : house.visitStatus === 'هماهنگ شده'
                          ? 'bg-blue-50 text-blue-800 border-blue-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {HOUSE_VISIT_STATUSES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`px-2 py-1 rounded-lg font-bold border inline-block ${
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
                  )}
                </td>

                <td className="p-3 whitespace-nowrap text-3xs">
                  <div className="font-bold text-slate-800">{house.agentCallStatus}</div>
                  {house.appointmentDateTime && (
                    <div className="text-blue-700">{house.appointmentDateTime}</div>
                  )}
                </td>

                <td className="p-3 whitespace-nowrap text-3xs">
                  <div className="truncate max-w-[120px]">{house.realEstateAgentAddress || '-'}</div>
                  {house.realEstateAgentPhone && (
                    <a href={`tel:${house.realEstateAgentPhone}`} className="text-blue-600 font-mono" dir="ltr">
                      {house.realEstateAgentPhone}
                    </a>
                  )}
                </td>

                <td className="p-3 max-w-[200px] text-3xs text-slate-600 truncate" title={house.reviewText}>
                  {house.reviewText || '-'}
                </td>

                <td className="p-3 text-left whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    {house.syncStatus === 'failed' && onRetrySync && (
                      <button
                        type="button"
                        onClick={() => onRetrySync(house)}
                        className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-3xs font-bold flex items-center gap-1 shadow-2xs"
                        title="تلاش مجدد برای ارسال به گوگل شیت"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>ارسال مجدد</span>
                      </button>
                    )}
                    {house.syncStatus === 'failed' && onForgetFailed && (
                      <button
                        type="button"
                        onClick={() => onForgetFailed(house)}
                        className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg text-3xs font-bold flex items-center gap-1"
                        title="فراموش کردن این مورد ناموفق"
                      >
                        <X className="w-3 h-3" />
                        <span>فراموش کن</span>
                      </button>
                    )}
                    {house.syncStatus === 'pending' && (
                      <span className="p-1 text-amber-600 flex items-center gap-1 text-3xs font-bold">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>در حال ارسال</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onEdit(house)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                      title="ویرایش"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {onToggleArchive && (
                      <button
                        type="button"
                        onClick={() => onToggleArchive(house)}
                        disabled={house.syncStatus === 'pending'}
                        className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg disabled:opacity-40"
                        title={house.isArchived ? 'خارج کردن از آرشیو' : 'انتقال به آرشیو'}
                      >
                        {house.isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(house)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="حذف از گوگل شیت"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-xs">
            هیچ موردی مطابق با جستجوی شما یافت نشد.
          </div>
        )}
      </div>
    </div>
  );
};
