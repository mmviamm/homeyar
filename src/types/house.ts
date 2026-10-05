export type AgentCallStatus = 
  | 'تماس گرفته نشده'
  | 'پاسخ داد و قرار هماهنگ شد'
  | 'پاسخ داد ولی مناسب نبود'
  | 'پاسخ نداد'
  | 'خاموش یا اشغال بود';

export type HouseVisitStatus = 
  | 'در انتظار تماس'
  | 'قرار بازدید گذاشته شد'
  | 'بازدید شده'
  | 'پسندیده شد (گزینه اصلی)'
  | 'رد شد'
  | 'در حال مذاکره / بیعانه';

export type DeedStatus = 
  | 'سند تک‌برگ ملکی'
  | 'سند شش‌دانگ منگوله‌دار'
  | 'قولنامه‌ای با کد رهگیری'
  | 'وکالتی'
  | 'سند تعاونی'
  | 'سند در دست اقدام';

export type MortgageWaitingStatus = 
  | 'بله، منتظر وام مسکن می‌ماند'
  | 'خیر، فقط تسویه نقدی فوری'
  | 'نیاز به مذاکره / با پرداخت بیعانه بیشتر'
  | 'نامشخص / باید سوال شود';

export interface DivarHouseVisit {
  id: string;
  rowIndex?: number; // 1-based row index in Google Sheet
  title: string; // عنوان آگهی دیوار
  divarUrl: string; // لینک آگهی در دیوار
  address: string; // آدرس ملک
  realEstateAgentAddress: string; // آدرس مشاور املاک
  realEstateAgentPhone: string; // شماره تماس مشاور املاک
  
  // امکانات کلیدی
  hasParking: boolean; // پارکینگ
  parkingDetails?: string; // سندی، مشاع، مزاحم
  hasElevator: boolean; // آسانسور
  hasStorage: boolean; // انباری
  hasBalcony: boolean; // تراس / بالکن
  
  // ارقام و مشخصات
  totalPriceMillion: number; // قیمت کل به میلیون تومان (مثلاً ۴۵۰۰)
  areaSqm: number; // متراژ خانه به متر مربع (مثلاً ۸۵)
  floor: number; // طبقه چند؟ (مثلاً ۳)
  totalFloors: number; // از چند طبقه؟ (مثلاً ۵)
  yearBuilt: string; // سال ساخت (مثلاً ۱۴۰۰ یا ۱۳۹۵ یا نوساز)
  roomsCount: number; // تعداد اتاق (مثلاً ۲)
  
  // حقوقی و مالی
  deedStatus: DeedStatus; // وضعیت سند
  waitsForMortgageLoan: MortgageWaitingStatus; // آیا صاحب خانه برای وام مسکن منتظر می‌ماند؟
  
  // ارتباط با مشاور املاک و قرار
  agentCallStatus: AgentCallStatus; // آیا با مشاور املاک تماس گرفتیم جواب داد؟
  appointmentLocation: string; // مکان قرار بازدید (مثلاً جلوی در ساختمان یا دفتر املاک)
  appointmentDateTime: string; // زمان قرار بازدید (تاریخ و ساعت)
  
  // ارزیابی و امتیاز
  score: number; // امتیاز از ۱۰ (مثلا ۸ از ۱۰)
  reviewText: string; // یک نظر با متن کامل درباره خانه
  visitStatus: HouseVisitStatus; // وضعیت نهایی در فرآیند خرید
  
  // وضعیت همگام‌سازی با گوگل شیت
  syncStatus?: 'synced' | 'pending' | 'failed';
  syncError?: string;
  
  updatedAt?: string;
}

export interface ActiveSpreadsheetInfo {
  id: string;
  title: string;
  url: string;
  sheetName: string;
  sheetId?: number;
  lastSyncedAt?: Date;
}
