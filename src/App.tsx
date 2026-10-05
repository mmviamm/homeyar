import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  Plus, 
  Search, 
  FileSpreadsheet, 
  LayoutGrid, 
  Table as TableIcon, 
  Layers, 
  Zap, 
  Home as HomeIcon, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Sparkles, 
  PhoneCall, 
  Building, 
  Check,
  Download,
  ShieldAlert
} from 'lucide-react';

import { DivarHouseVisit, ActiveSpreadsheetInfo } from './types/house';
import { SAMPLE_HOUSES } from './data/sampleHouses';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken 
} from './services/firebaseAuth';
import { 
  createHouseHuntingSpreadsheet, 
  getSpreadsheetDetails, 
  readHouseVisits, 
  addHouseVisit, 
  updateHouseVisit, 
  deleteHouseVisit, 
  parseSpreadsheetId,
} from './services/sheetsService';
import { 
  toPersianDigits, 
  formatNumberFa, 
  formatVerbalPriceMillion 
} from './utils/persianUtils';
import { exportHousesToCsv } from './utils/exportCsv';

import { SheetManagerBar } from './components/SheetManagerBar';
import { HouseCard } from './components/HouseCard';
import { HouseFormModal } from './components/HouseFormModal';
import { ComparisonView } from './components/ComparisonView';
import { SheetTableView } from './components/SheetTableView';
import { ConfirmationModal, ConfirmationType } from './components/ConfirmationModal';
import { AuthorizedDomainModal } from './components/AuthorizedDomainModal';
import { AppsScriptWebhookModal } from './components/AppsScriptWebhookModal';
import { 
  appendViaWebhook, 
  updateViaWebhook, 
  deleteViaWebhook, 
  fetchViaWebhook 
} from './services/webhookService';

export default function App() {
  // اطلاعات ورود و گوگل شیت
  const [user, setUser] = useState<User | any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [activeSheet, setActiveSheet] = useState<ActiveSpreadsheetInfo | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAuthorizedDomainModal, setShowAuthorizedDomainModal] = useState(false);

  // وب‌هوک گوگل شیت بدون فایربیس (Google Apps Script Web App)
  const [webhookUrl, setWebhookUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('househunt_webhook_url');
    }
    return null;
  });
  const [showWebhookModal, setShowWebhookModal] = useState(false);

  // داده‌های خانه‌ها با ذخیره‌سازی محلی خودکار جهت جلوگیری از هرگونه از دست رفتن اطلاعات
  const [houses, setHouses] = useState<DivarHouseVisit[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('househunt_persian_houses');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.warn('Failed to load local houses:', e);
      }
    }
    return SAMPLE_HOUSES;
  });
  const [filteredHouses, setFilteredHouses] = useState<DivarHouseVisit[]>(SAMPLE_HOUSES);

  useEffect(() => {
    if (typeof window !== 'undefined' && houses.length > 0) {
      try {
        localStorage.setItem('househunt_persian_houses', JSON.stringify(houses));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
    }
  }, [houses]);

  // وضعیت‌های نمایش و فیلتر
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'score' | 'price_asc' | 'price_desc' | 'area'>('score');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForCompare, setSelectedForCompare] = useState<DivarHouseVisit[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // مودال‌های ثبت و ویرایش
  const [editingHouse, setEditingHouse] = useState<DivarHouseVisit | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // مودال تأییدیه کاربر (اجباری طبق دستورالعمل گوگل ورک‌اسپیس برای ویرایش و حذف در شیت)
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    type: ConfirmationType;
    title: string;
    description: string;
    details: { label: string; value: string }[];
    confirmLabel: string;
    isDangerous: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    type: 'generic',
    title: '',
    description: '',
    details: [],
    confirmLabel: 'تأیید',
    isDangerous: false,
    onConfirm: async () => {},
  });

  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // ۱. بررسی ورود کاربر در شروع برنامه
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // ۲. همگام‌سازی و خواندن سطرها از گوگل شیت
  const syncFromSheet = useCallback(async (accessToken: string, spreadsheetId: string) => {
    setIsSyncing(true);
    try {
      const remoteHouses = await readHouseVisits(accessToken, spreadsheetId);
      if (remoteHouses.length > 0) {
        setHouses(remoteHouses);
        showNotification(`${toPersianDigits(remoteHouses.length)} ملک با موفقیت از گوگل شیت بارگذاری شد.`);
      } else {
        showNotification('اسپردشیت متصل شد. آماده برای ثبت موارد جدید!');
      }
    } catch (err: any) {
      console.error('خطا در بارگذاری از شیت:', err);
      showNotification(err.message || 'خطا در دریافت اطلاعات از گوگل شیت', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ۳. مدیریت ورود با گوگل
  const handleSignIn = async () => {
    setIsAuthLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        showNotification(`خوش آمدید ${result.user.displayName || ''}! حساب گوگل متصل شد.`);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err?.code === 'auth/unauthorized-domain' || String(err?.message || '').includes('unauthorized-domain')) {
        setShowAuthorizedDomainModal(true);
        showNotification('دامنه اختصاصی شما هنوز در فایربیس مجاز نشده است. راهنمای حل مشکل باز شد.', 'error');
      } else {
        showNotification(err?.message || 'ورود با حساب گوگل لغو شد یا با خطا مواجه گردید.', 'error');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setActiveSheet(null);
    showNotification('از حساب کاربری گوگل خارج شدید.', 'info');
  };

  // ۴. ساخت اسپردشیت جدید در گوگل شیت
  const handleCreateNewSheet = async (title: string = 'مدیریت و بازدید خانه‌های دیوار ۱۴۰۵') => {
    let currentToken = token || (await getAccessToken());
    if (!currentToken) {
      await handleSignIn();
      currentToken = await getAccessToken();
      if (!currentToken) return;
    }

    setIsSyncing(true);
    try {
      const res = await createHouseHuntingSpreadsheet(currentToken, title);
      const newSheetInfo: ActiveSpreadsheetInfo = {
        id: res.spreadsheetId,
        title: res.title,
        url: res.url,
        sheetName: 'لیست بازدید خانه‌های دیوار',
        sheetId: res.sheetId,
        lastSyncedAt: new Date(),
      };
      setActiveSheet(newSheetInfo);

      // انتقال ردیف‌های فعلی به فایل جدید گوگل شیت
      if (houses.length > 0) {
        for (const house of houses) {
          try {
            await addHouseVisit(currentToken, res.spreadsheetId, house);
          } catch (e) {
            console.warn('Initial row append error:', e);
          }
        }
        await syncFromSheet(currentToken, res.spreadsheetId);
      }

      showNotification(`اسپردشیت جدید "${title}" در گوگل درایو شما ساخته و متصل شد.`);
    } catch (err: any) {
      console.error('Failed to create sheet:', err);
      showNotification(err.message || 'خطا در ایجاد گوگل شیت', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // ۵. اتصال به اسپردشیت قبلی
  const handleConnectExistingSheet = async (urlOrId: string) => {
    let currentToken = token || (await getAccessToken());
    if (!currentToken) {
      await handleSignIn();
      currentToken = await getAccessToken();
      if (!currentToken) return;
    }

    const cleanId = parseSpreadsheetId(urlOrId);
    if (!cleanId) {
      throw new Error('شناسه یا آدرس گوگل شیت نامعتبر است.');
    }

    setIsSyncing(true);
    try {
      const details = await getSpreadsheetDetails(currentToken, cleanId);
      const connected: ActiveSpreadsheetInfo = {
        id: cleanId,
        title: details.title,
        url: details.url,
        sheetName: details.sheetName,
        sheetId: details.sheetId,
        lastSyncedAt: new Date(),
      };
      setActiveSheet(connected);
      await syncFromSheet(currentToken, cleanId);
      showNotification(`اتصال به فایل "${details.title}" با موفقیت برقرار شد.`);
    } catch (err: any) {
      console.error('Failed to connect sheet:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // ۶. همگام‌سازی دستی با دکمه رفرش
  const handleManualSync = async () => {
    // اگر از وب‌هوک استفاده می‌شود (بدون فایربیس)
    if (webhookUrl) {
      setIsSyncing(true);
      try {
        const remoteHouses = await fetchViaWebhook(webhookUrl);
        if (remoteHouses.length > 0) {
          setHouses(remoteHouses);
          showNotification(`${toPersianDigits(remoteHouses.length)} ملک از گوگل شیت همگام شد.`);
        } else {
          showNotification('شیت خالی است یا آماده دریافت اطلاعات می‌باشد.');
        }
      } catch (err: any) {
        showNotification('خطا در همگام‌سازی از وب‌هوک گوگل شیت', 'error');
      } finally {
        setIsSyncing(false);
      }
      return;
    }

    if (!activeSheet) {
      showNotification('هنوز هیچ اسپردشیتی متصل نشده است. از نوار بالا شیت بسازید یا وب‌هوک را وصل کنید.', 'info');
      return;
    }
    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      await handleSignIn();
      return;
    }
    await syncFromSheet(currentToken, activeSheet.id);
  };

  // ۷. ذخیره ملک (افزودن جدید یا ویرایش با تأییدیه کاربر)
  const handleSaveHouseForm = async (houseData: DivarHouseVisit) => {
    const currentToken = token || (await getAccessToken());
    const isUpdating = Boolean(editingHouse && editingHouse.rowIndex);

    // الف) اگر اتصال از طریق وب‌هوک گوگل اپ اسکریپت باشد (بدون نیاز به فایربیس و بدون لاگین)
    if (webhookUrl) {
      if (isUpdating) {
        setIsFormOpen(false);
        setConfirmationState({
          isOpen: true,
          type: 'update',
          title: `آیا از ویرایش اطلاعات در گوگل شیت مطمئن هستید؟`,
          description: `اطلاعات ردیف ${toPersianDigits(editingHouse?.rowIndex)} در فایل گوگل شیت شما از طریق وب‌هوک ویرایش خواهد شد.`,
          details: [
            { label: 'ملک', value: houseData.title || houseData.address },
            { label: 'قیمت کل', value: `${formatNumberFa(houseData.totalPriceMillion)} میلیون تومان` },
            { label: 'متراژ', value: `${toPersianDigits(houseData.areaSqm)} متر` },
            { label: 'امتیاز', value: `${toPersianDigits(houseData.score)} از ۱۰` },
          ],
          confirmLabel: 'تأیید و ویرایش در گوگل شیت',
          isDangerous: false,
          onConfirm: async () => {
            try {
              await updateViaWebhook(webhookUrl, editingHouse!.rowIndex!, houseData);
              setHouses(prev => prev.map(h => (h.id === houseData.id ? houseData : h)));
              setConfirmationState(prev => ({ ...prev, isOpen: false }));
              setEditingHouse(null);
              showNotification(`اطلاعات ملک با موفقیت در گوگل شیت ویرایش شد.`);
            } catch (err: any) {
              showNotification('خطا در ارتباط با وب‌هوک گوگل شیت', 'error');
            }
          },
        });
        return;
      }

      // درج سطر جدید از طریق وب‌هوک
      try {
        const nextRow = houses.length + 2;
        const newHouse = { ...houseData, rowIndex: nextRow };
        await appendViaWebhook(webhookUrl, newHouse);
        setHouses(prev => [newHouse, ...prev]);
        setIsFormOpen(false);
        setEditingHouse(null);
        showNotification(`ملک "${houseData.title || houseData.address}" مستقیماً به گوگل شیت ارسال شد.`);
        return;
      } catch (err: any) {
        console.error('Webhook append error:', err);
      }
    }

    // ب) اگر اتصال از طریق گوگل شیت API و احراز هویت باشد
    if (isUpdating && activeSheet && currentToken) {
      setIsFormOpen(false);
      setConfirmationState({
        isOpen: true,
        type: 'update',
        title: `آیا از ویرایش اطلاعات در گوگل شیت مطمئن هستید؟`,
        description: `این کار اطلاعات ردیف ${toPersianDigits(editingHouse?.rowIndex)} در فایل "${activeSheet.title}" را بروزرسانی می‌کند.`,
        details: [
          { label: 'ملک', value: houseData.title || houseData.address },
          { label: 'قیمت کل', value: `${formatNumberFa(houseData.totalPriceMillion)} میلیون تومان` },
          { label: 'متراژ', value: `${toPersianDigits(houseData.areaSqm)} متر` },
          { label: 'امتیاز', value: `${toPersianDigits(houseData.score)} از ۱۰` },
        ],
        confirmLabel: 'تأیید و ویرایش در گوگل شیت',
        isDangerous: false,
        onConfirm: async () => {
          try {
            await updateHouseVisit(
              currentToken,
              activeSheet.id,
              editingHouse!.rowIndex!,
              houseData,
              activeSheet.sheetName
            );
            await syncFromSheet(currentToken, activeSheet.id);
            setConfirmationState(prev => ({ ...prev, isOpen: false }));
            setEditingHouse(null);
            showNotification(`اطلاعات ملک با موفقیت در گوگل شیت ویرایش شد.`);
          } catch (err: any) {
            console.error('Update error:', err);
            showNotification(err.message || 'خطا در ویرایش گوگل شیت', 'error');
          }
        },
      });
      return;
    }

    // در غیر این صورت، ثبت مورد جدید در گوگل شیت
    if (activeSheet && currentToken) {
      try {
        await addHouseVisit(currentToken, activeSheet.id, houseData, activeSheet.sheetName);
        await syncFromSheet(currentToken, activeSheet.id);
        setIsFormOpen(false);
        setEditingHouse(null);
        showNotification(`ملک "${houseData.title || houseData.address}" به گوگل شیت اضافه شد.`);
      } catch (err: any) {
        console.error('Append error:', err);
        showNotification(err.message || 'خطا در افزودن به گوگل شیت', 'error');
      }
    } else {
      // ذخیره محلی موقت در صورت عدم اتصال
      if (isUpdating) {
        setHouses(prev => prev.map(h => (h.id === houseData.id ? houseData : h)));
      } else {
        setHouses(prev => [houseData, ...prev]);
      }
      setIsFormOpen(false);
      setEditingHouse(null);
      showNotification(`اطلاعات در حافظه دستگاه ذخیره شد.`, 'info');
    }
  };

  // ۸. حذف مورد با تأییدیه الزامی کاربر
  const handleDeleteRequest = (house: DivarHouseVisit) => {
    setConfirmationState({
      isOpen: true,
      type: 'delete',
      title: `آیا از حذف این ملک مطمئن هستید؟`,
      description: webhookUrl
        ? `ردیف ${toPersianDigits(house.rowIndex || 'مربوطه')} از فایل گوگل شیت شما حذف خواهد شد.`
        : activeSheet
        ? `ردیف ${toPersianDigits(house.rowIndex || 'مربوطه')} از فایل "${activeSheet.title}" حذف خواهد شد.`
        : `ملک "${house.title || house.address}" حذف خواهد شد.`,
      details: [
        { label: 'عنوان', value: house.title || house.address },
        { label: 'قیمت', value: `${formatNumberFa(house.totalPriceMillion)} میلیون تومان` },
        { label: 'آدرس', value: house.address },
      ],
      confirmLabel: 'حذف دائمی ملک',
      isDangerous: true,
      onConfirm: async () => {
        // حذف با وب‌هوک بدون فایربیس
        if (webhookUrl && house.rowIndex) {
          try {
            await deleteViaWebhook(webhookUrl, house.rowIndex);
            setHouses(prev => prev.filter(h => h.id !== house.id));
            setConfirmationState(prev => ({ ...prev, isOpen: false }));
            showNotification(`ملک از گوگل شیت حذف شد.`);
            return;
          } catch (err: any) {
            console.error('Webhook delete error:', err);
          }
        }

        const currentToken = token || (await getAccessToken());
        if (activeSheet && currentToken && house.rowIndex) {
          try {
            await deleteHouseVisit(
              currentToken,
              activeSheet.id,
              house.rowIndex,
              activeSheet.sheetId || 0
            );
            await syncFromSheet(currentToken, activeSheet.id);
            setConfirmationState(prev => ({ ...prev, isOpen: false }));
            showNotification(`ملک از گوگل شیت حذف شد.`);
          } catch (err: any) {
            console.error('Delete error:', err);
            showNotification(err.message || 'خطا در حذف از گوگل شیت', 'error');
          }
        } else {
          setHouses(prev => prev.filter(h => h.id !== house.id));
          setConfirmationState(prev => ({ ...prev, isOpen: false }));
          showNotification(`ملک حذف شد.`);
        }
      },
    });
  };

  // ۹. منطق جستجو و فیلترها
  useEffect(() => {
    let result = [...houses];

    // فیلتر دسته‌بندی
    if (filterType === 'SCHEDULED') {
      result = result.filter(h => h.appointmentDateTime && h.appointmentDateTime !== '-' && h.appointmentDateTime.trim() !== '');
    } else if (filterType === 'CALLED_OK') {
      result = result.filter(h => h.agentCallStatus.includes('هماهنگ شد'));
    } else if (filterType === 'LOAN_OK') {
      result = result.filter(h => h.waitsForMortgageLoan.includes('بله'));
    } else if (filterType === 'PARKING_ELEVATOR') {
      result = result.filter(h => h.hasParking && h.hasElevator);
    } else if (filterType === 'SANAD_TAKBARG') {
      result = result.filter(h => h.deedStatus === 'سند تک‌برگ ملکی');
    }

    // جستجوی متنی
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        h =>
          (h.title && h.title.toLowerCase().includes(q)) ||
          (h.address && h.address.toLowerCase().includes(q)) ||
          (h.realEstateAgentAddress && h.realEstateAgentAddress.toLowerCase().includes(q)) ||
          (h.realEstateAgentPhone && h.realEstateAgentPhone.includes(q)) ||
          (h.reviewText && h.reviewText.toLowerCase().includes(q))
      );
    }

    // مرتب‌سازی
    result.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return (b.score || 0) - (a.score || 0);
        case 'price_asc':
          return a.totalPriceMillion - b.totalPriceMillion;
        case 'price_desc':
          return b.totalPriceMillion - a.totalPriceMillion;
        case 'area':
          return b.areaSqm - a.areaSqm;
        default:
          return 0;
      }
    });

    setFilteredHouses(result);
  }, [houses, filterType, sortBy, searchQuery]);

  // مقایسه خانه‌ها
  const toggleCompare = (house: DivarHouseVisit) => {
    setSelectedForCompare(prev => {
      const exists = prev.some(h => h.id === house.id);
      if (exists) {
        return prev.filter(h => h.id !== house.id);
      }
      if (prev.length >= 4) {
        showNotification('حداکثر تا ۴ ملک را می‌توانید همزمان مقایسه کنید.', 'info');
        return prev;
      }
      return [...prev, house];
    });
  };

  // آمارهای کلیدی
  const totalCount = houses.length;
  const avgPriceMillion = totalCount > 0 
    ? Math.round(houses.reduce((acc, h) => acc + h.totalPriceMillion, 0) / totalCount) 
    : 0;
  const mortgageCount = houses.filter(h => h.waitsForMortgageLoan.includes('بله')).length;
  const bestScoring = houses.length > 0
    ? [...houses].sort((a, b) => (b.score || 0) - (a.score || 0))[0]
    : null;

  const handleSaveWebhook = async (url: string) => {
    setWebhookUrl(url);
    if (typeof window !== 'undefined') {
      localStorage.setItem('househunt_webhook_url', url);
    }
    showNotification('اتصال وب‌هوک گوگل شیت با موفقیت برقرار شد!');
    try {
      setIsSyncing(true);
      const remote = await fetchViaWebhook(url);
      if (remote.length > 0) {
        setHouses(remote);
      }
    } catch (e) {
      // Ignored if newly created
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col text-right">
      {/* نوار مدیریت گوگل شیت */}
      <SheetManagerBar
        user={user}
        activeSheet={activeSheet}
        webhookUrl={webhookUrl}
        isLoading={isAuthLoading}
        isSyncing={isSyncing}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onSync={handleManualSync}
        onCreateNewSheet={handleCreateNewSheet}
        onConnectExistingSheet={handleConnectExistingSheet}
        onOpenWebhookModal={() => setShowWebhookModal(true)}
      />

      {/* پیام تست شناور */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={`px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2.5 ${
            notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : notification.type === 'info'
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* بدنه اصلی */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 flex-1">
        
        {/* بنر آمار و عنوان سامانه */}
        <div className="bg-gradient-to-l from-slate-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-2xs font-bold mb-2.5 border border-emerald-500/30">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>سامانه مدیریت بازدید خانه و آگهی‌های دیوار در گوگل شیت</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-snug">
                دفترچه هوشمند بازدید و خرید مسکن
              </h1>
              <p className="mt-1.5 text-xs text-slate-300 max-w-xl leading-relaxed">
                ثبت فوری امکانات در حضور مشاور املاک (پارکینگ، آسانسور، انباری، تراس، سند و وام مسکن) و ثبت سطر به سطر در گوگل شیت شما.
              </p>
            </div>

            {/* کارت‌های خلاصه وضعیت */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white/5 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 text-center">
              <div className="p-1.5">
                <span className="text-3xs text-slate-400 block font-medium">خانه‌های ثبت شده</span>
                <span className="text-xl font-black text-white">{toPersianDigits(totalCount)}</span>
              </div>

              <div className="p-1.5">
                <span className="text-3xs text-slate-400 block font-medium">پذیرش وام مسکن</span>
                <span className="text-xl font-black text-emerald-400">{toPersianDigits(mortgageCount)}</span>
              </div>

              <div className="p-1.5">
                <span className="text-3xs text-slate-400 block font-medium">میانگین قیمت</span>
                <span className="text-sm font-bold text-white block mt-1">
                  {formatNumberFa(avgPriceMillion)} م.ت
                </span>
              </div>

              <div className="p-1.5">
                <span className="text-3xs text-slate-400 block font-medium">بهترین گزینه</span>
                <span className="text-sm font-black text-emerald-400 block mt-1">
                  {bestScoring ? `${toPersianDigits(bestScoring.score)} از ۱۰` : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* نوار اکشن‌ها، ثبت سریع و جستجو */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            
            {/* جستجو */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="جستجو در آدرس، نام مشاور املاک یا یادداشت‌ها..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>

            {/* دکمه‌های عملیات اصلی */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* دکمه مقایسه */}
              {selectedForCompare.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCompareModal(true)}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all animate-pulse"
                >
                  <Layers className="w-4 h-4" />
                  <span>مقایسه ({toPersianDigits(selectedForCompare.length)})</span>
                </button>
              )}

              {/* سوئیچر حالت نمایش (کارت / جدول شیت) */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    viewMode === 'cards'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>کارت‌ها</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>سطرهای شیت</span>
                </button>
              </div>

              {/* دکمه دانلود فایل اکسل (CSV) */}
              <button
                type="button"
                onClick={() => {
                  exportHousesToCsv(houses);
                  showNotification('فایل اکسل با موفقیت دانلود شد.');
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-200"
                title="دانلود فایل اکسل CSV از تمام خانه‌های ثبت شده"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>خروجی اکسل</span>
              </button>

              {/* راهنمای دامنه در صورت عدم اتصال */}
              {!user && (
                <button
                  type="button"
                  onClick={() => setShowAuthorizedDomainModal(true)}
                  className="px-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border border-amber-200"
                  title="راهنمای اتصال دامنه به فایربیس"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">تنظیم دامنه</span>
                </button>
              )}

              {/* دکمه طلایی: ثبت سریع در حضور مشاور املاک */}
              <button
                type="button"
                onClick={() => {
                  setEditingHouse(null);
                  setIsFormOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>ثبت سریع در حضور املاک</span>
              </button>
            </div>
          </div>

          {/* فیلترها و مرتب‌سازی */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* تب‌های فیلتر سریع */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'ALL', label: 'همه خانه‌ها' },
                { id: 'SCHEDULED', label: 'قرار بازدید هماهنگ شده' },
                { id: 'LOAN_OK', label: 'پذیرش وام مسکن' },
                { id: 'PARKING_ELEVATOR', label: 'پارکینگ و آسانسور دار' },
                { id: 'SANAD_TAKBARG', label: 'سند تک‌برگ' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilterType(item.id)}
                  className={`px-3 py-1 rounded-xl text-2xs font-bold transition-all whitespace-nowrap ${
                    filterType === item.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* انتخاب مرتب‌سازی */}
            <div className="flex items-center gap-2 mr-auto">
              <span className="text-2xs text-slate-400 font-semibold">مرتب‌سازی:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-2.5 py-1 text-2xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="score">بیشترین امتیاز (از ۱۰)</option>
                <option value="price_asc">قیمت: ارزان‌ترین</option>
                <option value="price_desc">قیمت: بالاترین</option>
                <option value="area">بیشترین متراژ</option>
              </select>
            </div>
          </div>
        </div>

        {/* بخش نمایش محتوا: کارت‌ها یا جدول */}
        {viewMode === 'cards' ? (
          <div>
            {filteredHouses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredHouses.map(house => (
                  <HouseCard
                    key={house.id}
                    house={house}
                    onEdit={h => {
                      setEditingHouse(h);
                      setIsFormOpen(true);
                    }}
                    onDeleteRequest={handleDeleteRequest}
                    isComparing={selectedForCompare.some(c => c.id === house.id)}
                    onToggleCompare={toggleCompare}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-2xs space-y-3">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                  <HomeIcon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">هیچ ملکی یافت نشد</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  موردی مطابق با فیلترها پیدا نشد. برای ثبت اولین خانه بازدید شده روی دکمه زیر کلیک کنید.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingHouse(null);
                    setIsFormOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white rounded-2xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>ثبت اولین مورد بازدید</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <SheetTableView
            houses={filteredHouses}
            spreadsheetUrl={activeSheet?.url}
            onEdit={h => {
              setEditingHouse(h);
              setIsFormOpen(true);
            }}
            onDelete={handleDeleteRequest}
          />
        )}
      </main>

      {/* پاورقی */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">خانه یار</span>
            <span>•</span>
            <span>مدیریت و ثبت بازدید خانه در گوگل شیت</span>
          </div>

          <div className="flex items-center gap-4 text-2xs">
            {activeSheet ? (
              <a
                href={activeSheet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>فایل گوگل شیت: {activeSheet.title}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-slate-400">گوگل شیت هنوز متصل نشده است</span>
            )}
          </div>
        </div>
      </footer>

      {/* مودال‌های فعال */}
      {/* ۱. مودال ثبت سریع و فرم کامل */}
      <HouseFormModal
        isOpen={isFormOpen}
        initialHouse={editingHouse}
        onClose={() => {
          setIsFormOpen(false);
          setEditingHouse(null);
        }}
        onSubmit={handleSaveHouseForm}
        isLoading={isSyncing}
      />

      {/* ۲. مودال مقایسه گزینه‌ها */}
      {showCompareModal && (
        <ComparisonView
          houses={selectedForCompare}
          onRemoveFromCompare={toggleCompare}
          onClearCompare={() => setSelectedForCompare([])}
          onClose={() => setShowCompareModal(false)}
        />
      )}

      {/* ۳. مودال تأییدیه الزامی طبق اصول گوگل ورک‌اسپیس برای عملیات حذفی یا تغییرات شیت */}
      <ConfirmationModal
        isOpen={confirmationState.isOpen}
        type={confirmationState.type}
        title={confirmationState.title}
        description={confirmationState.description}
        details={confirmationState.details}
        confirmLabel={confirmationState.confirmLabel}
        isDangerous={confirmationState.isDangerous}
        isLoading={isSyncing}
        onConfirm={confirmationState.onConfirm}
        onCancel={() => setConfirmationState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* ۴. راهنمای حل مشکل دامنه غیرمجاز فایربیس */}
      <AuthorizedDomainModal
        isOpen={showAuthorizedDomainModal}
        onClose={() => setShowAuthorizedDomainModal(false)}
      />

      {/* ۵. مودال اتصال مستقیم وب‌هوک به گوگل شیت بدون فایربیس و بدون لاگین */}
      <AppsScriptWebhookModal
        isOpen={showWebhookModal}
        currentWebhookUrl={webhookUrl || ''}
        onClose={() => setShowWebhookModal(false)}
        onSave={handleSaveWebhook}
      />
    </div>
  );
}
