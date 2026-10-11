import { DivarHouseVisit } from '../types/house';
import { toPersianDigits } from '../utils/persianUtils';

/**
 * دریافت خودکار اطلاعات آگهی از دیوار.
 *
 * مرورگر به‌خاطر CORS معمولاً اجازه‌ی خواندن مستقیم divar.ir را نمی‌دهد؛ بنابراین ابتدا
 * مستقیم و سپس از طریق چند پراکسی CORS تلاش می‌کنیم. اگر پراکسی اختصاصی دارید،
 * در فایل .env مقدار VITE_DIVAR_PROXY_URL را بگذارید (مثلاً https://my-proxy.example/?url={url}).
 */

export type DivarImportFields = Partial<
  Pick<
    DivarHouseVisit,
    | 'title'
    | 'address'
    | 'areaSqm'
    | 'yearBuilt'
    | 'roomsCount'
    | 'totalPriceMillion'
    | 'floor'
    | 'totalFloors'
    | 'hasElevator'
    | 'hasParking'
    | 'hasStorage'
  >
>;

export interface DivarImportResult {
  data: DivarImportFields;
  /** برچسب فارسی موارد پیدا شده */
  found: string[];
  /** برچسب فارسی موارد پیدا نشده */
  missing: string[];
  /** لینک استاندارد آگهی */
  url: string;
}

interface RawRow {
  label: string;
  value: string;
}
interface RawFeature {
  label: string;
  available: boolean;
}
interface RawPost {
  rows: RawRow[];
  features: RawFeature[];
  title?: string;
  city?: string;
  district?: string;
  locationText?: string;
}

// ---------- ابزارهای عددی ----------

export const toAsciiDigits = (s: string): string =>
  s
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

const cleanText = (s: string): string =>
  s.replace(/[‏‎ ]/g, ' ').replace(/\s+/g, ' ').trim();

/** اولین عدد داخل متن (با حذف جداکننده‌ی هزارگان) */
export const parseFirstNumber = (raw: string): number | null => {
  const s = toAsciiDigits(raw).replace(/[,٬،]/g, '').replace(/٫/g, '.');
  const m = s.match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};

/** قیمت کل را به «میلیون تومان» تبدیل می‌کند: «۳٬۵۰۰٬۰۰۰٬۰۰۰ تومان» ← ۳۵۰۰ */
export const parsePriceMillion = (raw: string): number | null => {
  const s = toAsciiDigits(raw).replace(/[,٬،]/g, '').replace(/٫/g, '.');
  const bil = s.match(/(\d+(?:\.\d+)?)\s*میلیارد/);
  const mil = s.match(/(\d+(?:\.\d+)?)\s*میلیون/);
  if (bil || mil) {
    const total = (bil ? parseFloat(bil[1]) * 1000 : 0) + (mil ? parseFloat(mil[1]) : 0);
    return total > 0 ? Math.round(total * 100) / 100 : null;
  }
  const n = parseFirstNumber(s);
  if (n === null || n <= 0) return null;
  // مقدار خام دیوار به تومان است؛ اعداد خیلی کوچک را همان «میلیون» فرض می‌کنیم
  const million = n >= 1_000_000 ? n / 1_000_000 : n;
  return Math.round(million * 100) / 100;
};

export const parseFloor = (raw: string): { floor: number; totalFloors?: number } | null => {
  const s = toAsciiDigits(cleanText(raw));
  const pair = s.match(/(\d+)\s*از\s*(\d+)/);
  if (pair) return { floor: parseInt(pair[1], 10), totalFloors: parseInt(pair[2], 10) };
  const total = s.match(/(?:همکف|زیرهمکف|زیر همکف)\s*از\s*(\d+)/);
  if (total) return { floor: 0, totalFloors: parseInt(total[1], 10) };
  if (/همکف|زیرهمکف|زیر همکف/.test(s)) return { floor: 0 };
  const single = s.match(/\d+/);
  return single ? { floor: parseInt(single[0], 10) } : null;
};

// ---------- استخراج از JSON (API وب دیوار) ----------

const emptyPost = (): RawPost => ({ rows: [], features: [] });

const FEATURE_RE = /^(آسانسور|پارکینگ|انباری)/;

const collectFromJson = (root: unknown, post: RawPost) => {
  const stack: unknown[] = [root];
  let guard = 0;
  while (stack.length && guard++ < 200000) {
    const node = stack.pop();
    if (Array.isArray(node)) {
      for (const n of node) stack.push(n);
      continue;
    }
    if (!node || typeof node !== 'object') continue;
    const obj = node as Record<string, unknown>;

    const title = typeof obj.title === 'string' ? cleanText(obj.title) : '';
    if (title) {
      if (FEATURE_RE.test(title) && (obj.value === undefined || obj.value === '')) {
        const iconName = JSON.stringify(obj.icon ?? '').toLowerCase();
        const available =
          obj.available !== false &&
          !/ندارد/.test(title) &&
          !iconName.includes('disabled') &&
          !iconName.includes('unavailable');
        post.features.push({ label: title.replace(/\s*ندارد.*$/, ''), available });
      } else if (typeof obj.value === 'string' || typeof obj.value === 'number') {
        post.rows.push({ label: title, value: cleanText(String(obj.value)) });
      }
    }

    // عنوان و مکان
    const seo = obj.seo as any;
    if (seo?.web_info) {
      if (!post.title && typeof seo.web_info.title === 'string') post.title = cleanText(seo.web_info.title);
      if (!post.city && typeof seo.web_info.city_persian === 'string') post.city = cleanText(seo.web_info.city_persian);
      if (!post.district && typeof seo.web_info.district_persian === 'string') {
        post.district = cleanText(seo.web_info.district_persian);
      }
    }
    if (!post.title && obj.share && typeof (obj.share as any).title === 'string') {
      post.title = cleanText((obj.share as any).title);
    }
    if (!post.city && obj.city && typeof (obj.city as any).name === 'string') post.city = cleanText((obj.city as any).name);
    if (!post.district && obj.district && typeof (obj.district as any).name === 'string') {
      post.district = cleanText((obj.district as any).name);
    }
    if (!post.title && obj.widget_type === 'TITLE_ROW' && typeof obj.text === 'string') {
      post.title = cleanText(obj.text);
    }
    if (!post.locationText && typeof obj.subtitle === 'string' && /\sدر\s/.test(obj.subtitle)) {
      post.locationText = cleanText(obj.subtitle);
    }

    for (const v of Object.values(obj)) {
      if (v && typeof v === 'object') stack.push(v);
    }
  }
};

export const parseDivarJson = (json: unknown): RawPost => {
  const post = emptyPost();
  collectFromJson(json, post);
  return post;
};

// ---------- استخراج از HTML (صفحه‌ی آگهی) ----------

const LABELS = ['متراژ', 'ساخت', 'سال ساخت', 'اتاق', 'تعداد اتاق', 'قیمت کل', 'طبقه'];

export const parseDivarHtml = (html: string): RawPost => {
  const post = emptyPost();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // ۱) JSON داخل اسکریپت‌ها (JSON-LD، __NEXT_DATA__ و ...)
  doc.querySelectorAll('script').forEach(sc => {
    const type = sc.getAttribute('type') || '';
    const text = sc.textContent || '';
    if (!text || text.length < 2) return;
    if (type === 'application/ld+json' || type === 'application/json' || sc.id === '__NEXT_DATA__') {
      try {
        collectFromJson(JSON.parse(text), post);
      } catch {
        /* نادیده بگیر */
      }
    }
  });

  // ۲) جدول‌های «متراژ / ساخت / اتاق» (هدر در th و مقدار در td)
  doc.querySelectorAll('table').forEach(table => {
    const heads = Array.from(table.querySelectorAll('th, thead td')).map(h => cleanText(h.textContent || ''));
    const bodyRow = table.querySelector('tbody tr') || table.querySelectorAll('tr')[1];
    if (!heads.length || !bodyRow) return;
    const cells = Array.from(bodyRow.querySelectorAll('td')).map(c => cleanText(c.textContent || ''));
    heads.forEach((label, i) => {
      if (LABELS.includes(label) && cells[i]) post.rows.push({ label, value: cells[i] });
    });
  });

  // ۳) ردیف‌های «برچسب ← مقدار» و امکانات
  doc.querySelectorAll('body *').forEach(el => {
    if (el.children.length > 0) return;
    const text = cleanText(el.textContent || '');
    if (!text) return;

    if (LABELS.includes(text)) {
      const sib = el.nextElementSibling;
      const parentSib = el.parentElement?.nextElementSibling;
      const value =
        cleanText(sib?.textContent || '') ||
        cleanText(parentSib?.textContent || '') ||
        cleanText((el.parentElement?.textContent || '').replace(text, ''));
      if (value) post.rows.push({ label: text, value });
      return;
    }

    if (FEATURE_RE.test(text) && text.length <= 20) {
      const cls = `${el.className || ''} ${el.parentElement?.className || ''}`.toLowerCase();
      const available = !/ندارد/.test(text) && !cls.includes('disabled');
      post.features.push({ label: text.replace(/\s*ندارد.*$/, ''), available });
    }

    if (!post.locationText && /(?:پیش|دیروز|امروز|دقیقه|ساعت|روز)\s+در\s+.+/.test(text) && text.length < 80) {
      post.locationText = text;
    }
  });

  // ۴) عنوان
  if (!post.title) {
    const og = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const h1 = doc.querySelector('h1')?.textContent;
    const t = og || h1 || doc.title;
    if (t) post.title = cleanText(t);
  }

  return post;
};

// ---------- تبدیل به فیلدهای فرم ----------

const stripSiteSuffix = (t: string): string =>
  cleanText(t.replace(/\s*[-|–—]\s*دیوار.*$/, '').replace(/\s*\|\s*divar.*$/i, ''));

const firstRow = (post: RawPost, test: (label: string) => boolean): string | undefined =>
  post.rows.find(r => test(r.label) && r.value)?.value;

const featureOf = (post: RawPost, name: string): boolean | undefined => {
  const hits = post.features.filter(f => f.label.startsWith(name));
  if (!hits.length) return undefined;
  // اگر یک جا «دارد» نوشته شده باشد، دارد
  return hits.some(h => h.available);
};

export const buildImportResult = (post: RawPost, url: string): DivarImportResult => {
  const data: DivarImportFields = {};
  const found: string[] = [];
  const missing: string[] = [];
  const mark = (label: string, ok: boolean) => (ok ? found : missing).push(label);

  // تایتل
  const title = post.title ? stripSiteSuffix(post.title) : '';
  if (title) data.title = title;
  mark('تایتل', !!title);

  // مکان
  let address = '';
  if (post.city || post.district) {
    address = [post.city, post.district].filter(Boolean).join('، ');
  } else if (post.locationText) {
    const m = post.locationText.match(/\sدر\s+(.+)$/);
    if (m) address = cleanText(m[1]).replace(/\s*[-–]\s*/g, '، ');
  } else {
    const row = firstRow(post, l => l === 'محله' || l === 'موقعیت' || l === 'محل');
    if (row) address = row;
  }
  if (address) data.address = address;
  mark('مکان', !!address);

  // متراژ
  const areaRaw = firstRow(post, l => /^متراژ(?!\s*زمین)/.test(l));
  const area = areaRaw ? parseFirstNumber(areaRaw) : null;
  if (area && area > 0) data.areaSqm = area;
  mark('متراژ', !!(area && area > 0));

  // سال ساخت
  const yearRaw = firstRow(post, l => l === 'ساخت' || l === 'سال ساخت');
  if (yearRaw) data.yearBuilt = toPersianDigits(cleanText(yearRaw));
  mark('ساخت', !!yearRaw);

  // تعداد اتاق
  const roomsRaw = firstRow(post, l => l === 'اتاق' || l === 'تعداد اتاق');
  let rooms: number | null = null;
  if (roomsRaw) rooms = /بدون/.test(roomsRaw) ? 0 : parseFirstNumber(roomsRaw);
  if (rooms !== null) data.roomsCount = rooms;
  mark('اتاق', rooms !== null);

  // قیمت کل
  const priceRaw = firstRow(post, l => l === 'قیمت کل') ?? firstRow(post, l => l === 'قیمت');
  const price = priceRaw ? parsePriceMillion(priceRaw) : null;
  if (price) data.totalPriceMillion = price;
  mark('قیمت کل', !!price);

  // طبقه: «۳ از ۵» یا فقط «۳»
  const floorRaw = firstRow(post, l => l === 'طبقه');
  const floor = floorRaw ? parseFloor(floorRaw) : null;
  if (floor) {
    data.floor = floor.floor;
    // اگر کل طبقات ذکر نشده باشد، طبقه‌ی مقصد را به‌عنوان حداقل کل طبقات می‌گذاریم
    data.totalFloors = Math.max(floor.totalFloors ?? floor.floor, 1);
  }
  mark('طبقه', !!floor);

  // امکانات
  const elevator = featureOf(post, 'آسانسور');
  if (elevator !== undefined) data.hasElevator = elevator;
  mark('آسانسور', elevator !== undefined);

  const parking = featureOf(post, 'پارکینگ');
  if (parking !== undefined) data.hasParking = parking;
  mark('پارکینگ', parking !== undefined);

  const storage = featureOf(post, 'انباری');
  if (storage !== undefined) data.hasStorage = storage;
  mark('انباری', storage !== undefined);

  return { data, found, missing, url };
};

// ---------- دریافت از شبکه ----------

/** توکن آگهی را از لینک‌های https://divar.ir/v/<token> یا https://divar.ir/v/<slug>/<token> درمی‌آورد */
export const extractDivarToken = (input: string): string | null => {
  const m = input.trim().match(/divar\.ir\/v\/(?:[^/?#\s]+\/)?([A-Za-z0-9_-]{6,})(?:[/?#\s]|$)/);
  if (m) return m[1];
  // فقط خود توکن وارد شده است
  if (/^[A-Za-z0-9_-]{6,12}$/.test(input.trim())) return input.trim();
  return null;
};

const customProxy: string | undefined = (import.meta as any).env?.VITE_DIVAR_PROXY_URL;

const proxyChain: ((u: string) => string)[] = [
  ...(customProxy ? [(u: string) => customProxy.replace('{url}', encodeURIComponent(u))] : []),
  u => u,
  u => {
    // corsproxy.io برای استفاده از مرورگر به کلید نیاز دارد: ?key=...&url=...
    const key: string | undefined = (import.meta as any).env?.VITE_CORSPROXY_KEY;
    const keyPart = key ? `key=${encodeURIComponent(key)}&` : '';
    return `https://corsproxy.io/?${keyPart}url=${encodeURIComponent(u)}`;
  },
  u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

const fetchText = async (url: string, timeoutMs = 9000): Promise<string> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json, text/html' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(id);
  }
};

const hasUsefulData = (r: DivarImportResult): boolean =>
  !!(r.data.totalPriceMillion || r.data.areaSqm || r.data.title || r.data.address);

export const importFromDivar = async (input: string): Promise<DivarImportResult> => {
  const token = extractDivarToken(input);
  if (!token) {
    throw new Error('لینک دیوار معتبر نیست. لینک باید شبیه https://divar.ir/v/xxxxxxxx باشد.');
  }
  const pageUrl = `https://divar.ir/v/${token}`;
  const targets = [`https://api.divar.ir/v8/posts-v2/web/${token}`, pageUrl];

  for (const target of targets) {
    for (const wrap of proxyChain) {
      try {
        const body = await fetchText(wrap(target));
        let post: RawPost;
        try {
          post = parseDivarJson(JSON.parse(body));
        } catch {
          post = parseDivarHtml(body);
        }
        const result = buildImportResult(post, pageUrl);
        if (hasUsefulData(result)) return result;
      } catch {
        /* مسیر بعدی */
      }
    }
  }

  throw new Error(
    'خواندن آگهی از دیوار ممکن نشد (احتمالاً مسدود شدن توسط مرورگر یا آگهی حذف شده است). ' +
      'اطلاعات را دستی وارد کنید یا یک پراکسی در VITE_DIVAR_PROXY_URL تنظیم کنید.'
  );
};
