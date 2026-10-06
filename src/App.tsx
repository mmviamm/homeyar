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
  PhoneCall, 
  Building, 
  Check,
  Download,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  X
} from 'lucide-react';

import { DivarHouseVisit, ActiveSpreadsheetInfo } from './types/house';
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
  generateUid,
  houseContentKey,
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
import { DeviceSyncModal } from './components/DeviceSyncModal';
import { 
  appendViaWebhook, 
  updateViaWebhookVerified, 
  deleteViaWebhookVerified, 
  fetchViaWebhook 
} from './services/webhookService';

export default function App() {
  // ۱. اطلاعات ورود و گوگل شیت
  const [user, setUser] = useState<User | any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  // اسپردشیت فعال با ذخیره‌سازی محلی جهت پایداری اتصال در بارگذاری مجدد و دستگاه‌ها
  const [activeSheet, setActiveSheet] = useState<ActiveSpreadsheetInfo | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('househunt_active_sheet');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse activeSheet from storage:', e);
      }
    }
    return null;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(null);
  const [showAuthorizedDomainModal, setShowAuthorizedDomainModal] = useState(false);
  const [showDeviceSyncModal, setShowDeviceSyncModal] = useState(false);

  // وب‌هوک گوگل شیت بدون فایربیس (Google Apps Script Web App)
  const [webhookUrl, setWebhookUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('househunt_webhook_url');
    }
    return null;
  });
  const [showWebhookModal, setShowWebhookModal] = useState(false);

  // ۲. داده‌های خانه‌ها - بدون هیچ داده تستی یا فرضی (پایگاه داده اصلی: گوگل شیت)
  const [houses, setHouses] = useState<DivarHouseVisit[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('househunt_persian_houses');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // حذف کامل و پاکسازی هرگونه داده تستی باقی‌مانده از قبل
            const realHouses = parsed.filter((h: any) => 
              h && 
              !String(h.id || '').startsWith('sample-') && 
              h.rowIndex !== 1 &&
              !String(h.id || '').startsWith('divar-1') && 
              !String(h.id || '').startsWith('divar-2') && 
              !String(h.id || '').startsWith('divar-3')
            );
            return realHouses;
          }
        }
      } catch (e) {
        console.warn('Failed to load local houses:', e);
      }
    }
    return [];
  });

  const [filteredHouses, setFilteredHouses] = useState<DivarHouseVisit[]>([]);

  // ذخیره پشتیبان محلی از داده‌های واقعی (برای حفاظت در برابر قطعی اتصال)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('househunt_persian_houses', JSON.stringify(houses));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
    }
  }, [houses]);

  // پایداری اطلاعات شیت متصل در مرورگر
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (activeSheet) {
        localStorage.setItem('househunt_active_sheet', JSON.stringify(activeSheet));
        localStorage.setItem('househunt_spreadsheet_id', activeSheet.id);
      } else {
        localStorage.removeItem('househunt_active_sheet');
      }
    }
  }, [activeSheet]);

  // ۳. بررسی پارامترهای لینک ورودی (?sheet=... یا ?webhook=...) برای اتصال فوری در دیوایس دوم
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sheetParam = params.get('sheet');
      const webhookParam = params.get('webhook');
      
      if (sheetParam) {
        localStorage.setItem('househunt_spreadsheet_id', sheetParam);
      }
      if (webhookParam) {
        setWebhookUrl(webhookParam);
        localStorage.setItem('househunt_webhook_url', webhookParam);
      }
    }
  }, []);

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

  // مودال تأییدیه کاربر (طبق الزامات امنیتی گوگل ورک‌اسپیس برای ویرایش و حذف در شیت)
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    type: ConfirmationType;
    title: string;
    description: string;
    details: { label: string; value: string }[];
    confirmLabel: string;
    isDangerous: boolean;
    isLoading: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    type: 'generic',
    title: '',
    description: '',
    details: [],
    confirmLabel: 'تأیید',
    isDangerous: false,
    isLoading: false,
    onConfirm: async () => {},
  });

  const TIMEOUT_ERROR_MESSAGE = 'زمان انتظار ارتباط با گوگل شیت به پایان رسید (کندی یا اختلال اینترنت). لطفاً دوباره امتحان کنید.';

  const getNormalizedErrorMessage = useCallback((err: any): string => {
    const msg = String(err?.message || '');
    if (
      err?.name === 'AbortError' ||
      msg.toLowerCase().includes('abort') ||
      msg.includes('زمان انتظار') ||
      msg.includes('timeout')
    ) {
      return TIMEOUT_ERROR_MESSAGE;
    }
    return err?.message || 'خطا در برقراری ارتباط با گوگل شیت. اتصال اینترنت را بررسی نمایید.';
  }, []);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const notificationTimerRef = React.useRef<any>(null);

  // شمارشگر جهش‌های در حال انجام (ثبت، ویرایش، حذف، تلاش مجدد) برای جلوگیری از تداخل پولینگ خودکار
  const inFlightMutationsRef = React.useRef<number>(0);
  // قفل همزمانی حذف؛ قبل از اولین await تنظیم می‌شود تا double-click یا clickهای سریع
  // هرگز چند عملیات delete با یک rowIndex را به Google Sheets ارسال نکنند.
  const deleteInProgressRef = React.useRef<boolean>(false);
  // قفل همزمانی ویرایش برای جلوگیری از ارسال چند update با یک rowIndex قدیمی.
  const updateInProgressRef = React.useRef<boolean>(false);
  // قفل تلاش مجدد برای هر ملک؛ دوبار کلیک روی «تلاش مجدد» هرگز دو درخواست نمی‌فرستد.
  const retryInProgressRef = React.useRef<Set<string>>(new Set());

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    setNotification({ type, message });
    // پیام‌های خطا زمان طولانی‌تری (۱۰ ثانیه) نمایش داده می‌شوند تا کاربر با دقت پیام را بخواند
    notificationTimerRef.current = setTimeout(() => {
      setNotification(null);
    }, type === 'error' ? 10000 : 5000);
  }, []);

  // تابع یکپارچه‌ساز داده‌های محلی و گوگل شیت (تضمین حفظ موارد در حال ارسال و خطادار)
  const mergeRemoteWithLocal = useCallback((prevHouses: DivarHouseVisit[], remoteHouses: DivarHouseVisit[]): DivarHouseVisit[] => {
    // مواردی که در حال حاضر در حال ارسال هستند یا به دلیل خطای اینترنت ارسال نشده‌اند
    const activeUnsynced = prevHouses.filter(h => h.syncStatus === 'pending' || h.syncStatus === 'failed');

    const remoteSynced = remoteHouses.map(rh => ({
      ...rh,
      syncStatus: 'synced' as const,
      syncError: undefined,
    }));

    const keptUnsynced: DivarHouseVisit[] = [];
    for (const local of activeUnsynced) {
      // اگر ملک هنوز در حال ارسال است (pending)، تحت هیچ شرایطی نباید پاک شود
      if (local.syncStatus === 'pending') {
        keptUnsynced.push(local);
        continue;
      }

      // ویرایشِ ناموفق هنوز روی شیت اعمال نشده؛ باید همراه دکمه تلاش مجدد باقی بماند.
      if (local.pendingOp === 'update') {
        keptUnsynced.push(local);
        continue;
      }

      // برای موارد failed، اگر دقیقاً در شیت آمده باشد یعنی ثبت شده، در غیر این صورت باید باقی بماند
      const foundInRemote = remoteSynced.some(rem => {
        if (local.uid && rem.uid && local.uid === rem.uid) return true;
        if (local.divarUrl && local.divarUrl.trim() && rem.divarUrl && rem.divarUrl.trim()) {
          if (local.divarUrl.trim() === rem.divarUrl.trim()) return true;
        }
        if (
          local.title && local.title.trim() &&
          local.title.trim() === rem.title.trim() &&
          (local.address || '').trim() === (rem.address || '').trim()
        ) {
          return true;
        }
        return false;
      });

      if (!foundInRemote) {
        keptUnsynced.push(local);
      }
    }

    const seenIds = new Set<string>();
    const result: DivarHouseVisit[] = [];

    // ابتدا موارد محلی (در حال ارسال یا ناموفق) در بالای لیست قرار می‌گیرند
    for (const h of keptUnsynced) {
      seenIds.add(h.id);
      result.push(h);
    }

    for (const h of remoteSynced) {
      // نسخه‌ی قدیمیِ ردیفی که ویرایش ناموفقش محلی نگه داشته شده، دوباره نمایش داده نمی‌شود.
      const replacedByFailedEdit = keptUnsynced.some(k => {
        if (k.pendingOp !== 'update') return false;
        if (k.uid && h.uid) return k.uid === h.uid;
        const base = k.retryBase || k;
        return !h.uid && getHouseIdentityKey(base) === getHouseIdentityKey(h);
      });
      if (replacedByFailedEdit) continue;

      const hasPendingMatch = keptUnsynced.some(k => 
        k.syncStatus === 'pending' && (
          (k.uid && h.uid && k.uid === h.uid) ||
          (k.divarUrl && k.divarUrl.trim() === h.divarUrl.trim()) ||
          (k.title.trim() === h.title.trim() && (k.address || '').trim() === (h.address || '').trim())
        )
      );

      if (!hasPendingMatch && !seenIds.has(h.id)) {
        seenIds.add(h.id);
        result.push(h);
      }
    }

    return result;
  }, []);

  // ۴. خواندن و همگام‌سازی مستقیم از گوگل شیت
  const syncFromSheet = useCallback(async (accessToken: string, spreadsheetId: string, sheetName?: string) => {
    setIsSyncing(true);
    try {
      const remoteHouses = await readHouseVisits(accessToken, spreadsheetId, sheetName);
      setLastSyncedTime(new Date());

      // ادغام ایمن: داده‌های در حال ارسال و خطادار کاربر هرگز غیب نمی‌شوند
      setHouses(prev => mergeRemoteWithLocal(prev, remoteHouses));

      showNotification(`${toPersianDigits(remoteHouses.length)} ملک با موفقیت از گوگل شیت همگام‌سازی شد.`);
    } catch (err: any) {
      console.error('خطا در بارگذاری از شیت:', err);
      const errorMsg = getNormalizedErrorMessage(err);
      showNotification(errorMsg, 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [mergeRemoteWithLocal, getNormalizedErrorMessage, showNotification]);

  // ۵. بررسی ورود کاربر در شروع برنامه و اتصال به اسپردشیت ذخیره شده
  useEffect(() => {
    const unsubscribe = initAuth(
      async (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);

        // اگر کاربر قبلاً شیت داشته یا لینکی با پارامتر ?sheet باز شده، خودکار وصل شو
        if (accessToken) {
          const targetId = activeSheet?.id || localStorage.getItem('househunt_spreadsheet_id');
          if (targetId) {
            try {
              const details = await getSpreadsheetDetails(accessToken, targetId);
              const connected: ActiveSpreadsheetInfo = {
                id: targetId,
                title: details.title,
                url: details.url,
                sheetName: details.sheetName,
                sheetId: details.sheetId,
                lastSyncedAt: new Date(),
              };
              setActiveSheet(connected);
              await syncFromSheet(accessToken, targetId, details.sheetName);
            } catch (err) {
              console.warn('اتصال خودکار به شیت با خطا مواجه شد:', err);
            }
          }
        }
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, [syncFromSheet]);

  // ۶. همگام‌سازی اولیه از طریق وب‌هوک (در صورت فعال بودن وب‌هوک)
  useEffect(() => {
    if (webhookUrl) {
      setIsSyncing(true);
      fetchViaWebhook(webhookUrl)
        .then(remote => {
          setLastSyncedTime(new Date());
          setHouses(prev => mergeRemoteWithLocal(prev, remote));
        })
        .catch(err => {
          console.warn('همگام‌سازی اولیه وب‌هوک با خطا مواجه شد:', err);
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, [webhookUrl, mergeRemoteWithLocal]);

  // ۷. همگام‌سازی خودکار در هنگام بازگشت به تب برنامه (Window Focus) و پولینگ دوره‌ای (تضمین یکسانی در دو دیوایس)
  useEffect(() => {
    const handleAutoRefresh = () => {
      // اگر کاربر در همان لحظه در حال ارسال، ویرایش یا حذف ملکی است، پولینگ را به تعویق بینداز
      if (inFlightMutationsRef.current > 0) return;

      if (token && activeSheet) {
        syncFromSheet(token, activeSheet.id, activeSheet.sheetName);
      } else if (webhookUrl) {
        fetchViaWebhook(webhookUrl)
          .then(remote => {
            setLastSyncedTime(new Date());
            setHouses(prev => mergeRemoteWithLocal(prev, remote));
          })
          .catch(e => console.warn('Focus sync error:', e));
      }
    };

    window.addEventListener('focus', handleAutoRefresh);

    // بررسی دوره‌ای هر ۴۵ ثانیه در صورت باز بودن تب
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        handleAutoRefresh();
      }
    }, 45000);

    return () => {
      window.removeEventListener('focus', handleAutoRefresh);
      clearInterval(timer);
    };
  }, [token, activeSheet, webhookUrl, syncFromSheet, mergeRemoteWithLocal]);

  // ۸. مدیریت ورود با گوگل
  const handleSignIn = async () => {
    setIsAuthLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        showNotification(`خوش آمدید ${result.user.displayName || ''}! حساب گوگل متصل شد.`);

        // پس از ورود، اگر شیت قبلی وجود دارد همگام کن
        const targetId = activeSheet?.id || localStorage.getItem('househunt_spreadsheet_id');
        if (targetId) {
          await handleConnectExistingSheet(targetId);
        }
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err?.code === 'auth/unauthorized-domain' || String(err?.message || '').includes('unauthorized-domain')) {
        setShowAuthorizedDomainModal(true);
        showNotification('دامنه شما هنوز در فایربیس مجاز نشده است. راهنمای حل مشکل باز شد.', 'error');
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
    localStorage.removeItem('househunt_active_sheet');
    showNotification('از حساب کاربری گوگل خارج شدید.', 'info');
  };

  // ۹. ساخت اسپردشیت جدید در گوگل شیت
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

      // اگر خانه‌ای به صورت آفلاین ثبت شده بود، به شیت جدید بفرست
      if (houses.length > 0) {
        for (const house of houses) {
          try {
            await addHouseVisit(currentToken, res.spreadsheetId, house, newSheetInfo.sheetName);
          } catch (e) {
            console.warn('Initial row append error:', e);
          }
        }
        await syncFromSheet(currentToken, res.spreadsheetId, newSheetInfo.sheetName);
      }

      showNotification(`اسپردشیت جدید "${title}" در گوگل درایو شما ساخته و متصل شد.`);
    } catch (err: any) {
      console.error('Failed to create sheet:', err);
      showNotification(err.message || 'خطا در ایجاد گوگل شیت', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // ۱۰. اتصال به اسپردشیت قبلی
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
      await syncFromSheet(currentToken, cleanId, details.sheetName);
      showNotification(`اتصال به فایل "${details.title}" با موفقیت برقرار شد.`);
    } catch (err: any) {
      console.error('Failed to connect sheet:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // ۱۱. همگام‌سازی دستی با دکمه رفرش
  const handleManualSync = async () => {
    if (webhookUrl) {
      setIsSyncing(true);
      try {
        const remoteHouses = await fetchViaWebhook(webhookUrl);
        setLastSyncedTime(new Date());
        setHouses(prev => mergeRemoteWithLocal(prev, remoteHouses));
        showNotification(`${toPersianDigits(remoteHouses.length)} ملک با موفقیت از گوگل شیت همگام‌سازی شد.`);
      } catch (err: any) {
        const errorMsg = getNormalizedErrorMessage(err);
        showNotification(errorMsg, 'error');
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
    await syncFromSheet(currentToken, activeSheet.id, activeSheet.sheetName);
  };

  // ۱۲. ذخیره ملک با پیگیری دقیق وضعیت همگام‌سازی و خطایابی اینترنت
  const handleSaveHouseForm = async (houseData: DivarHouseVisit) => {
    const currentToken = token || (await getAccessToken());
    const isUpdating = Boolean(editingHouse && editingHouse.rowIndex && editingHouse.pendingOp !== 'create');

    setIsFormOpen(false);
    setEditingHouse(null);

    // حالت الف: ویرایش ملک موجود
    if (isUpdating && editingHouse) {
      // اگر در حال ویرایش یک ویرایشِ ناموفق هستیم، ردیف اصلی با نسخه‌ی قبل از ویرایش پیدا می‌شود.
      const originalHouse = editingHouse.retryBase || editingHouse;

      setConfirmationState({
        isOpen: true,
        type: 'update',
        title: `آیا از ویرایش اطلاعات در گوگل شیت مطمئن هستید؟`,
        description: activeSheet
          ? `ردیف فعلی ملک در فایل "${activeSheet.title}" قبل از ویرایش دوباره بررسی خواهد شد.`
          : webhookUrl
          ? `ردیف فعلی ملک در فایل گوگل شیت قبل از ویرایش دوباره بررسی خواهد شد.`
          : `اطلاعات ملک "${houseData.title || houseData.address}" ویرایش خواهد شد.`,
        details: [
          { label: 'ملک', value: houseData.title || houseData.address },
          { label: 'قیمت کل', value: `${formatNumberFa(houseData.totalPriceMillion)} میلیون تومان` },
          { label: 'متراژ', value: `${toPersianDigits(houseData.areaSqm)} متر` },
          { label: 'امتیاز', value: `${toPersianDigits(houseData.score)} از ۱۰` },
        ],
        confirmLabel: 'تأیید و ویرایش در گوگل شیت',
        isDangerous: false,
        isLoading: false,
        onConfirm: async () => {
          // قبل از اولین await قفل می‌کنیم تا چند کلیک سریع چند update ارسال نکند.
          if (updateInProgressRef.current) return;
          updateInProgressRef.current = true;
          setConfirmationState(prev => ({ ...prev, isLoading: true }));
          inFlightMutationsRef.current += 1;
          // uid یک بار ساخته می‌شود تا حتی اگر تلاش اول ناموفق شد، تلاش مجدد همان شناسه را بنویسد.
          const stableUid = houseData.uid || originalHouse.uid || generateUid();

          try {
            const updateToken = currentToken;

            if (activeSheet && updateToken) {
              // rowIndex ممکن است از زمان باز شدن فرم تغییر کرده باشد؛ رکورد واقعی را دوباره پیدا کن.
              const remoteHouses = await readHouseVisits(
                updateToken,
                activeSheet.id,
                activeSheet.sheetName
              );
              const currentRowIndex = await resolveCurrentRowIndex(
                remoteHouses,
                { ...originalHouse, uid: originalHouse.uid || houseData.uid },
                originalHouse
              );
              const updatedHouse = { ...houseData, uid: stableUid, rowIndex: currentRowIndex };

              await updateHouseVisit(
                updateToken,
                activeSheet.id,
                currentRowIndex,
                updatedHouse,
                activeSheet.sheetName
              );

              setHouses(prev => prev.map(h =>
                h.id === houseData.id
                  ? { ...updatedHouse, syncStatus: 'synced' as const, syncError: undefined, pendingOp: undefined, retryBase: undefined }
                  : h
              ));
              setConfirmationState(prev => ({ ...prev, isOpen: false, isLoading: false }));
              showNotification(`اطلاعات ملک با موفقیت در گوگل شیت ویرایش شد.`);
              await syncFromSheet(updateToken, activeSheet.id, activeSheet.sheetName);
            } else if (webhookUrl) {
              const remoteHouses = await fetchViaWebhook(webhookUrl);
              const currentRowIndex = await resolveCurrentRowIndex(
                remoteHouses,
                { ...originalHouse, uid: originalHouse.uid || houseData.uid },
                originalHouse
              );
              const updatedHouse = { ...houseData, uid: stableUid, rowIndex: currentRowIndex };

              await updateViaWebhookVerified(webhookUrl, currentRowIndex, updatedHouse);

              setHouses(prev => prev.map(h =>
                h.id === houseData.id
                  ? { ...updatedHouse, syncStatus: 'synced' as const, syncError: undefined, pendingOp: undefined, retryBase: undefined }
                  : h
              ));
              setConfirmationState(prev => ({ ...prev, isOpen: false, isLoading: false }));
              showNotification(`اطلاعات ملک با موفقیت در گوگل شیت ویرایش شد.`);
              try {
                const fresh = await fetchViaWebhook(webhookUrl);
                setHouses(prev => mergeRemoteWithLocal(prev, fresh));
              } catch (e) {
                console.warn('Post-update webhook sync failed:', e);
              }
            } else {
              // بدون شیت، فقط نسخه محلی را ویرایش کن.
              setHouses(prev => prev.map(h =>
                h.id === houseData.id
                  ? { ...houseData, syncStatus: 'synced' as const, syncError: undefined }
                  : h
              ));
              setConfirmationState(prev => ({ ...prev, isOpen: false, isLoading: false }));
              showNotification(`اطلاعات ملک در لیست محلی ویرایش شد.`, 'info');
            }
          } catch (err: any) {
            const errorMsg = getNormalizedErrorMessage(err);
            console.error('Update error:', err);
            setHouses(prev => prev.map(h =>
              h.id === houseData.id
                ? { ...houseData, uid: stableUid, pendingOp: 'update' as const, retryBase: originalHouse, syncStatus: 'failed' as const, syncError: errorMsg }
                : h
            ));
            setConfirmationState(prev => ({ ...prev, isOpen: false, isLoading: false }));
            showNotification(errorMsg, 'error');

            // در صورت stale شدن rowIndex، وضعیت واقعی شیت را دوباره دریافت کن.
            try {
              if (currentToken && activeSheet) {
                await syncFromSheet(currentToken, activeSheet.id, activeSheet.sheetName);
              } else if (webhookUrl) {
                const fresh = await fetchViaWebhook(webhookUrl);
                setHouses(prev => mergeRemoteWithLocal(prev, fresh));
              }
            } catch (syncErr) {
              console.warn('Update recovery sync failed:', syncErr);
            }
          } finally {
            updateInProgressRef.current = false;
            inFlightMutationsRef.current = Math.max(0, inFlightMutationsRef.current - 1);
          }
        },
      });
      return;
    }

    // حالت ب: ثبت ملک جدید
    const newUid = houseData.uid || generateUid();
    const tempId = houseData.id || newUid;
    const nextRow = (houses.length > 0 ? Math.max(...houses.map(h => h.rowIndex || 0)) : 0) + 1;
    const pendingHouse: DivarHouseVisit = {
      ...houseData,
      id: tempId,
      uid: newUid,
      rowIndex: nextRow,
      pendingOp: 'create',
      retryBase: undefined,
      syncStatus: 'pending',
    };

    // فوراً در رابط کاربری نمایش بده تا کاربر معطل نشود - هرگز غیب نمی‌شود
    setHouses(prev => [pendingHouse, ...prev.filter(h => h.id !== tempId)]);
    inFlightMutationsRef.current += 1;

    try {
      // اولویت اول: ارسال مستقیم از طریق Google Sheets API
      if (activeSheet && currentToken) {
        const res = await addHouseVisit(currentToken, activeSheet.id, pendingHouse, activeSheet.sheetName);
        const assignedRow = res.rowIndex || nextRow;
        setHouses(prev =>
          prev.map(h =>
            h.id === tempId ? { ...h, syncStatus: 'synced', rowIndex: assignedRow, syncError: undefined, pendingOp: undefined } : h
          )
        );
        showNotification(`ملک "${houseData.title || houseData.address}" با موفقیت در گوگل شیت ثبت شد.`);
        await syncFromSheet(currentToken, activeSheet.id, activeSheet.sheetName);
        return;
      }

      // اولویت دوم: ارسال از طریق وب‌هوک
      if (webhookUrl) {
        const res = await appendViaWebhook(webhookUrl, pendingHouse);
        setHouses(prev =>
          prev.map(h =>
            h.id === tempId ? { ...h, syncStatus: 'synced', rowIndex: res.rowIndex || h.rowIndex, syncError: undefined, pendingOp: undefined } : h
          )
        );
        showNotification(`ملک "${houseData.title || houseData.address}" با موفقیت در گوگل شیت ثبت شد.`);
        try {
          const fresh = await fetchViaWebhook(webhookUrl);
          setHouses(prev => mergeRemoteWithLocal(prev, fresh));
        } catch (e) {}
        return;
      }

      // در صورت عدم اتصال شیت
      setHouses(prev =>
        prev.map(h =>
          h.id === tempId
            ? { ...h, syncStatus: 'failed', syncError: 'گوگل شیت هنوز متصل نشده است' }
            : h
        )
      );
      showNotification('ملک در حافظه محلی ذخیره شد. برای ارسال به گوگل شیت، از نوار بالا شیت را متصل کنید.', 'info');
    } catch (err: any) {
      const errorMsg = getNormalizedErrorMessage(err);
      console.error('Append error:', err);
      // ملک در رابط کاربری باقی می‌ماند و دکمه تلاش مجدد فعال می‌شود
      setHouses(prev =>
        prev.map(h => (h.id === tempId ? { ...h, syncStatus: 'failed', syncError: errorMsg, pendingOp: 'create' } : h))
      );
      showNotification(errorMsg, 'error');
    } finally {
      inFlightMutationsRef.current = Math.max(0, inFlightMutationsRef.current - 1);
    }
  };

  // ۱۳. تلاش مجدد برای ملکی که با خطا مواجه شده بود.
  // نکته مهم: تصمیم «ویرایش یا ردیف جدید» از روی house.pendingOp گرفته می‌شود (نه از روی id)،
  // و قبل از هر نوشتن، شیت خوانده می‌شود تا تلاش مجدد هرگز ردیف تکراری نسازد.
  const handleRetrySync = async (
    house: DivarHouseVisit,
    options?: { quiet?: boolean; successMessage?: string }
  ) => {
    if (retryInProgressRef.current.has(house.id)) return;
    retryInProgressRef.current.add(house.id);

    setHouses(prev => prev.map(h => (h.id === house.id ? { ...h, syncStatus: 'pending' as const, syncError: undefined } : h)));
    if (!options?.quiet) {
      showNotification(`در حال تلاش مجدد برای ارسال ملک "${house.title || house.address}" به گوگل شیت...`, 'info');
    }

    inFlightMutationsRef.current += 1;
    const op: 'create' | 'update' = house.pendingOp ?? (house.id.startsWith('house-row-') ? 'update' : 'create');
    const uid = house.uid || house.retryBase?.uid || generateUid();
    const toWrite: DivarHouseVisit = { ...house, uid };

    try {
      const currentToken = token || (await getAccessToken());
      const useApi = Boolean(activeSheet && currentToken);

      if (!useApi && !webhookUrl) {
        setHouses(prev =>
          prev.map(h => (h.id === house.id ? { ...h, syncStatus: 'failed' as const, syncError: 'گوگل شیت متصل نیست' } : h))
        );
        showNotification('برای ارسال به گوگل شیت، ابتدا از نوار بالا شیت را متصل نمایید.', 'error');
        return;
      }

      // وضعیت واقعی شیت؛ تصمیم‌گیری فقط بر اساس همین است
      const remote = useApi
        ? await readHouseVisits(currentToken as string, activeSheet!.id, activeSheet!.sheetName)
        : await fetchViaWebhook(webhookUrl as string);

      let savedRow: number | undefined;

      if (op === 'update') {
        const rowIndex = await resolveCurrentRowIndex(
          remote,
          { ...toWrite, uid: house.uid || house.retryBase?.uid },
          house.retryBase || house
        );
        const current = remote.find(r => r.rowIndex === rowIndex);
        const alreadyApplied = Boolean(
          current && current.uid === uid && houseContentKey(current) === houseContentKey(toWrite)
        );
        if (!alreadyApplied) {
          const updated = { ...toWrite, rowIndex };
          if (useApi) {
            await updateHouseVisit(currentToken as string, activeSheet!.id, rowIndex, updated, activeSheet!.sheetName);
          } else {
            await updateViaWebhookVerified(webhookUrl as string, rowIndex, updated);
          }
        }
        savedRow = rowIndex;
      } else {
        // ثبت جدید: اگر تلاش قبلی در واقع انجام شده بود (مثلاً تایم‌اوت بعد از ثبت)، ردیف با همین uid در شیت هست.
        const existing = remote.find(r => r.uid === uid);
        if (existing) {
          savedRow = existing.rowIndex;
        } else if (useApi) {
          const res = await addHouseVisit(currentToken as string, activeSheet!.id, toWrite, activeSheet!.sheetName);
          savedRow = res.rowIndex;
        } else {
          const res = await appendViaWebhook(webhookUrl as string, toWrite);
          savedRow = res.rowIndex;
        }
      }

      setHouses(prev =>
        prev.map(h =>
          h.id === house.id
            ? {
                ...toWrite,
                rowIndex: savedRow ?? toWrite.rowIndex,
                syncStatus: 'synced' as const,
                syncError: undefined,
                pendingOp: undefined,
                retryBase: undefined,
              }
            : h
        )
      );
      showNotification(options?.successMessage ?? `ملک "${house.title || house.address}" با موفقیت در گوگل شیت ذخیره شد.`);

      if (useApi) {
        await syncFromSheet(currentToken as string, activeSheet!.id, activeSheet!.sheetName);
      } else {
        try {
          const fresh = await fetchViaWebhook(webhookUrl as string);
          setHouses(prev => mergeRemoteWithLocal(prev, fresh));
        } catch (e) {}
      }
    } catch (err: any) {
      const errorMsg = getNormalizedErrorMessage(err);
      setHouses(prev =>
        prev.map(h =>
          h.id === house.id
            ? { ...h, uid, pendingOp: op, syncStatus: 'failed' as const, syncError: errorMsg }
            : h
        )
      );
      showNotification(errorMsg, 'error');
    } finally {
      retryInProgressRef.current.delete(house.id);
      inFlightMutationsRef.current = Math.max(0, inFlightMutationsRef.current - 1);
    }
  };

  // آرشیو / خروج از آرشیو: وضعیت آرشیو در ستون Z شیت ذخیره می‌شود و روی همه دیوایس‌ها همگام می‌شود.
  // از همان مسیر امن و idempotent «ویرایش» استفاده می‌کنیم (یافتن ردیف با uid، بدون ردیف تکراری).
  const handleToggleArchive = async (house: DivarHouseVisit) => {
    if (house.syncStatus === 'pending' || retryInProgressRef.current.has(house.id)) return;
    const nextArchived = !house.isArchived;
    const name = house.title || house.address;

    // حالت آفلاین (بدون شیت): فقط محلی
    if (!activeSheet && !webhookUrl) {
      setHouses(prev => prev.map(h => (h.id === house.id ? { ...h, isArchived: nextArchived } : h)));
      showNotification(nextArchived ? `«${name}» به آرشیو منتقل شد.` : `«${name}» از آرشیو خارج شد.`, 'info');
      return;
    }

    const updated: DivarHouseVisit = {
      ...house,
      isArchived: nextArchived,
      pendingOp: house.pendingOp === 'create' ? 'create' : 'update',
      retryBase:
        house.pendingOp === 'create'
          ? undefined
          : house.retryBase || { ...house, retryBase: undefined, pendingOp: undefined },
    };
    setHouses(prev => prev.map(h => (h.id === house.id ? updated : h)));
    await handleRetrySync(updated, {
      quiet: true,
      successMessage: nextArchived ? `«${name}» به آرشیو منتقل شد.` : `«${name}» از آرشیو خارج شد.`,
    });
  };

  // ارسال مجدد تمام موارد ناموفق
  const handleRetryAllFailed = async () => {
    const failedList = houses.filter(h => h.syncStatus === 'failed');
    if (failedList.length === 0) return;
    showNotification(`شروع ارسال مجدد ${toPersianDigits(failedList.length)} ملک به گوگل شیت...`, 'info');
    for (const house of failedList) {
      await handleRetrySync(house);
    }
  };

  // هویت پایدار ملک برای جلوگیری از اتکا به rowIndex که با حذف/جابجایی سطرها تغییر می‌کند
  const getHouseIdentityKey = (house: DivarHouseVisit): string => {
    const url = (house.divarUrl || '').trim();
    if (url) return `url:${url}`;
    return `title-address:${(house.title || '').trim()}|${(house.address || '').trim()}`;
  };

  // rowIndex فعلی را از روی محتوای واقعی شیت پیدا می‌کنیم (نه از روی شماره‌ای که ممکن است کهنه باشد).
  // اولویت با شناسه یکتا (uid) است. فقط رکوردهای قدیمی بدون uid با عنوان/آدرس/لینک پیدا می‌شوند.
  const resolveCurrentRowIndex = async (
    remoteHouses: DivarHouseVisit[],
    house: DivarHouseVisit,
    legacyBase: DivarHouseVisit = house
  ): Promise<number> => {
    // ۱) تطبیق دقیق با uid
    if (house.uid) {
      const byUid = remoteHouses.filter(remote => remote.uid === house.uid && remote.rowIndex);
      if (byUid.length > 0) {
        const atExpected = byUid.find(remote => remote.rowIndex === house.rowIndex);
        return (atExpected || byUid[0]).rowIndex as number;
      }
    }

    // ملکی که uid دارد و از ابتدا با uid ساخته شده (id همان uid است) هرگز با تطبیق متنی حدس زده نمی‌شود؛
    // وگرنه ممکن است ردیف یک ملک دیگر با عنوان مشابه اشتباهاً ویرایش/حذف شود.
    if (!house.id.startsWith('house-row-')) {
      throw new Error('این ملک دیگر در گوگل شیت پیدا نشد. اطلاعات برنامه با شیت همگام‌سازی می‌شود.');
    }

    // ۲) رکوردهای قدیمی (بدون uid): تطبیق با عنوان/آدرس/لینک فقط بین ردیف‌های بدون uid
    const identity = getHouseIdentityKey(legacyBase);
    const legacy = remoteHouses.filter(remote => !remote.uid && getHouseIdentityKey(remote) === identity);

    if (legacy.length === 0) {
      throw new Error('این ملک دیگر در گوگل شیت پیدا نشد. اطلاعات برنامه با شیت همگام‌سازی می‌شود.');
    }

    const expected = legacyBase.rowIndex ?? house.rowIndex;
    if (expected) {
      const atExpected = legacy.find(remote => remote.rowIndex === expected);
      if (atExpected) return expected;
    }

    if (legacy.length === 1 && legacy[0].rowIndex) {
      return legacy[0].rowIndex;
    }

    // چند ردیف کاملاً یکسان (مثلاً تکراری‌های قبلی): هر کدام معادل دیگری است؛ نزدیک‌ترین ردیف را انتخاب می‌کنیم.
    const sameContent = new Set(legacy.map(houseContentKey)).size === 1;
    if (sameContent) {
      const target = expected ?? legacy[0].rowIndex ?? 0;
      const closest = [...legacy].sort(
        (a, b) => Math.abs((a.rowIndex || 0) - target) - Math.abs((b.rowIndex || 0) - target)
      )[0];
      if (closest.rowIndex) return closest.rowIndex;
    }

    throw new Error('چند رکورد مشابه در گوگل شیت پیدا شد؛ برای جلوگیری از اشتباه، عملیات متوقف شد.');
  };

  // ۱۴. حذف مورد با تأییدیه الزامی کاربر و اجرای دقیق روی گوگل شیت
  const handleDeleteRequest = (house: DivarHouseVisit) => {
    setConfirmationState({
      isOpen: true,
      type: 'delete',
      title: `آیا از حذف این ملک مطمئن هستید؟`,
      description: activeSheet
        ? `ردیف فعلی ملک در فایل "${activeSheet.title}" قبل از حذف دوباره بررسی خواهد شد.`
        : webhookUrl
        ? `ردیف فعلی ملک در فایل گوگل شیت قبل از حذف دوباره بررسی خواهد شد.`
        : `ملک "${house.title || house.address}" حذف خواهد شد.`,
      details: [
        { label: 'عنوان', value: house.title || house.address },
        { label: 'قیمت', value: `${formatNumberFa(house.totalPriceMillion)} میلیون تومان` },
        { label: 'آدرس', value: house.address },
      ],
      confirmLabel: 'حذف دائمی از گوگل شیت',
      isDangerous: true,
      isLoading: false,
      onConfirm: async () => {
        // این guard عمداً قبل از هر await است؛ بنابراین حتی چند کلیک خیلی سریع
        // نمی‌تواند چند درخواست حذف را برای یک rowIndex قدیمی ارسال کند.
        if (deleteInProgressRef.current) return;
        deleteInProgressRef.current = true;
        setConfirmationState(prev => ({ ...prev, isLoading: true }));
        inFlightMutationsRef.current += 1;
        let currentToken: string | null = token;

        try {
          currentToken = currentToken || (await getAccessToken());

          // اولویت اول: حذف مستقیم از طریق Google Sheets API
          if (activeSheet && currentToken) {
            const remoteHouses = await readHouseVisits(
              currentToken,
              activeSheet.id,
              activeSheet.sheetName
            );
            const currentRowIndex = await resolveCurrentRowIndex(remoteHouses, house);

            await deleteHouseVisit(
              currentToken,
              activeSheet.id,
              currentRowIndex,
              activeSheet.sheetId,
              activeSheet.sheetName
            );

            // فقط بعد از موفقیت سرور، نسخه محلی همان رکورد را حذف کن.
            setHouses(prev => prev.filter(h =>
              h.id !== house.id &&
              h.rowIndex !== currentRowIndex
            ));
            setConfirmationState(prev => ({ ...prev, isOpen: false, isLoading: false }));
            showNotification(`ملک "${house.title || house.address}" با موفقیت از گوگل شیت حذف شد.`);
            await syncFromSheet(currentToken, activeSheet.id, activeSheet.sheetName);
            return;
          }

          // اولویت دوم: حذف از طریق وب‌هوک
          if (webhookUrl) {
            const remoteHouses = await fetchViaWebhook(webhookUrl);
            const currentRowIndex = await resolveCurrentRowIndex(remoteHouses, house);

            await deleteViaWebhookVerified(webhookUrl, currentRowIndex, remoteHouses);

            setHouses(prev => prev.filter(h =>
              h.id !== house.id &&
              h.rowIndex !== currentRowIndex
            ));
            setConfirmationState(prev => ({ ...prev, isOpen: false, isLoading: false }));
            showNotification(`ملک با موفقیت از گوگل شیت حذف شد.`);
            try {
              const fresh = await fetchViaWebhook(webhookUrl);
              setHouses(prev => mergeRemoteWithLocal(prev, fresh));
            } catch (e) {
              console.warn('Post-delete webhook sync failed:', e);
            }
            return;
          }

          // حالت آفلاین
          setHouses(prev => prev.filter(h => h.id !== house.id));
          setConfirmationState(prev => ({ ...prev, isOpen: false, isLoading: false }));
          showNotification(`ملک از لیست محلی حذف شد.`);
        } catch (err: any) {
          const errorMsg = getNormalizedErrorMessage(err);
          console.error('Delete error:', err);
          setConfirmationState(prev => ({ ...prev, isOpen: false, isLoading: false }));
          showNotification(errorMsg, 'error');

          // اگر رکورد دیگر در شیت وجود ندارد، یعنی حذف قبلاً انجام شده یا رکورد stale بوده.
          // در این حالت نباید نسخه محلی failed آن دوباره توسط merge به UI برگردد.
          if (errorMsg.includes('این ملک دیگر در گوگل شیت پیدا نشد')) {
            setHouses(prev => prev.filter(h => h.id !== house.id));
          }

          // بعد از هر خطای حذف، شیت را دوباره بخوان تا UI با وضعیت واقعی هماهنگ شود.
          try {
            if (currentToken && activeSheet) {
              await syncFromSheet(currentToken, activeSheet.id, activeSheet.sheetName);
            } else if (webhookUrl) {
              const fresh = await fetchViaWebhook(webhookUrl);
              setHouses(prev => mergeRemoteWithLocal(prev, fresh));
            }
          } catch (syncErr) {
            console.warn('Delete recovery sync failed:', syncErr);
          }
        } finally {
          deleteInProgressRef.current = false;
          inFlightMutationsRef.current = Math.max(0, inFlightMutationsRef.current - 1);
        }
      },
    });
  };
  // ۱۵. منطق جستجو و فیلترها
  useEffect(() => {
    let result = [...houses];

    // آرشیو: به‌صورت پیش‌فرض مخفی است (مگر ملکی که ارسالش ناموفق بوده تا دکمه تلاش مجدد دیده شود)
    if (filterType === 'ARCHIVED') {
      result = result.filter(h => h.isArchived);
    } else {
      result = result.filter(h => !h.isArchived || h.syncStatus === 'failed');
    }

    // فیلتر دسته‌بندی
    if (filterType === 'SCHEDULED') {
      result = result.filter(h => h.appointmentDateTime && h.appointmentDateTime !== '-' && h.appointmentDateTime.trim() !== '');
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
  const activeHouses = houses.filter(h => !h.isArchived);
  const archivedCount = houses.length - activeHouses.length;
  const totalCount = activeHouses.length;
  const avgPriceMillion = totalCount > 0 
    ? Math.round(activeHouses.reduce((acc, h) => acc + h.totalPriceMillion, 0) / totalCount) 
    : 0;
  const mortgageCount = activeHouses.filter(h => h.waitsForMortgageLoan.includes('بله')).length;
  const bestScoring = activeHouses.length > 0
    ? [...activeHouses].sort((a, b) => (b.score || 0) - (a.score || 0))[0]
    : null;

  // تعداد مواردی که با خطای ارسال به شیت مواجه شده‌اند
  const failedHousesCount = houses.filter(h => h.syncStatus === 'failed').length;

  const handleSaveWebhook = async (url: string) => {
    setWebhookUrl(url);
    if (typeof window !== 'undefined') {
      localStorage.setItem('househunt_webhook_url', url);
    }
    showNotification('اتصال وب‌هوک گوگل شیت با موفقیت برقرار شد!');
    try {
      setIsSyncing(true);
      const remote = await fetchViaWebhook(url);
      setLastSyncedTime(new Date());
      setHouses(prev => {
        const failed = prev.filter(h => h.syncStatus === 'failed');
        return [...failed, ...remote];
      });
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
        lastSyncedAt={lastSyncedTime}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onSync={handleManualSync}
        onCreateNewSheet={handleCreateNewSheet}
        onConnectExistingSheet={handleConnectExistingSheet}
        onOpenWebhookModal={() => setShowWebhookModal(true)}
        onOpenDeviceSyncModal={() => setShowDeviceSyncModal(true)}
      />

      {/* پیام نوتیفیکیشن شناور در بالای صفحه */}
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[94%] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`px-4 sm:px-5 py-3.5 rounded-2xl shadow-2xl border text-xs sm:text-sm font-bold flex items-center justify-between gap-3 text-right ${
              notification.type === 'error'
                ? 'bg-rose-700 text-white border-rose-500 ring-4 ring-rose-600/20'
                : notification.type === 'info'
                ? 'bg-slate-900 text-white border-slate-700 ring-4 ring-slate-800/20'
                : 'bg-emerald-700 text-white border-emerald-500 ring-4 ring-emerald-600/20'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {notification.type === 'error' ? (
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
              ) : notification.type === 'info' ? (
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="leading-snug">{notification.message}</span>
            </div>

            <button
              type="button"
              onClick={() => setNotification(null)}
              className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 mr-1"
              title="بستن اعلان"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* بدنه اصلی */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 flex-1">
        
        {/* بنر اعلام خطای ارسال اینترنتی (در صورت وجود موارد ناموفق) */}
        {failedHousesCount > 0 && (
          <div className="p-4 sm:p-5 bg-rose-50 border-2 border-rose-300 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-rose-900 text-sm">
                  {toPersianDigits(failedHousesCount)} مورد به دلیل قطعی یا کندی اینترنت به گوگل شیت ارسال نشد
                </h4>
                <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                  اطلاعات روی این دستگاه در حافظه امن است. برای ارسال نهایی به فایل گوگل شیت، دکمه تلاش مجدد را بزنید.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRetryAllFailed}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all flex-shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              <span>ارسال مجدد تمام موارد ({toPersianDigits(failedHousesCount)})</span>
            </button>
          </div>
        )}

        {/* بنر آمار و راهنمای دو دیوایس */}
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
                همگام‌سازی لحظه‌ای با گوگل شیت روی موبایل و لپ‌تاپ. ثبت سریع مشخصات در حضور مشاور املاک (پارکینگ، آسانسور، انباری، تراس، سند و وام).
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
              {/* دکمه اتصال دیوایس دوم */}
              {(activeSheet || webhookUrl) && (
                <button
                  type="button"
                  onClick={() => setShowDeviceSyncModal(true)}
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 border border-blue-200 transition-all"
                  title="اتصال گوشی دوم با QR Code یا لینک اشتراک"
                >
                  <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                  <span>اتصال به گوشی دوم (QR)</span>
                </button>
              )}

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

              {/* دکمه اصلی: ثبت سریع در حضور مشاور املاک */}
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
                { id: 'ARCHIVED', label: `آرشیو (${toPersianDigits(archivedCount)})` },
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
                    onToggleArchive={handleToggleArchive}
                    onRetrySync={handleRetrySync}
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
                <h3 className="text-base font-bold text-slate-800">{filterType === 'ARCHIVED' ? 'آرشیو خالی است' : 'هیچ ملکی ثبت نشده است'}</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  لیست شما خالی است. با اتصال به گوگل شیت اطلاعات شما بارگذاری می‌شود، یا با زدن دکمه زیر اولین مورد بازدید را ثبت نمایید.
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
            onToggleArchive={handleToggleArchive}
            onRetrySync={handleRetrySync}
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
            ) : webhookUrl ? (
              <span className="text-emerald-700 font-medium">متصل به وب‌هوک گوگل شیت</span>
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

      {/* ۳. مودال تأییدیه الزامی طبق الزامات گوگل ورک‌اسپیس برای عملیات ویرایش یا حذف */}
      <ConfirmationModal
        isOpen={confirmationState.isOpen}
        type={confirmationState.type}
        title={confirmationState.title}
        description={confirmationState.description}
        details={confirmationState.details}
        confirmLabel={confirmationState.confirmLabel}
        isDangerous={confirmationState.isDangerous}
        isLoading={confirmationState.isLoading ?? isSyncing}
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

      {/* ۶. مودال اتصال و همگام‌سازی همزمان در چند دیوایس با QR Code و لینک اختصاصی */}
      <DeviceSyncModal
        isOpen={showDeviceSyncModal}
        onClose={() => setShowDeviceSyncModal(false)}
        spreadsheetId={activeSheet?.id}
        spreadsheetTitle={activeSheet?.title}
        spreadsheetUrl={activeSheet?.url}
        webhookUrl={webhookUrl}
      />
    </div>
  );
}
