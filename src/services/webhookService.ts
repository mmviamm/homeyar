import { DivarHouseVisit } from '../types/house';
import { HEADERS_FA, houseToRowValues, rowValuesToHouse, isHeaderRow } from './sheetsService';

export const APPS_SCRIPT_TEMPLATE = `function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // اگر هدر وجود ندارد، خودکار هدر را درج کن
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "عنوان آگهی دیوار", "لینک دیوار", "آدرس ملک", "قیمت کل (میلیون تومان)", "متراژ (مترمربع)",
      "قیمت هر متر (میلیون تومان)", "طبقه / کل طبقات", "سال ساخت", "تعداد اتاق", "پارکینگ",
      "آسانسور", "انباری", "تراس", "وضعیت سند", "صاحب‌خانه منتظر وام مسکن می‌ماند؟",
      "تماس با املاک جواب داد؟", "آدرس مشاور املاک", "شماره تماس مشاور املاک", "مکان قرار بازدید",
      "زمان قرار بازدید", "امتیاز از ۱۰", "نظر و ارزیابی", "وضعیت فرآیند خرید", "تاریخ بروزرسانی"
    ]);
  }

  // اکشن افزودن از طریق GET (دارای پاسخ مستقیم JSON)
  if (e && e.parameter && e.parameter.action === 'append') {
    var row = JSON.parse(e.parameter.row);
    sheet.appendRow(row);
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", rowIndex: sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // اکشن ویرایش
  if (e && e.parameter && e.parameter.action === 'update') {
    var rowIndex = parseInt(e.parameter.rowIndex);
    var row = JSON.parse(e.parameter.row);
    if (rowIndex >= 1 && rowIndex <= sheet.getLastRow()) {
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // اکشن حذف
  if (e && e.parameter && e.parameter.action === 'delete') {
    var rowIndex = parseInt(e.parameter.rowIndex);
    if (rowIndex >= 1 && rowIndex <= sheet.getLastRow()) {
      sheet.deleteRow(rowIndex);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // حالت پیش‌فرض: خواندن تمام سطرها
  var range = sheet.getDataRange();
  var values = range ? range.getValues() : [];
  return ContentService
    .createTextOutput(JSON.stringify({ status: "success", values: values }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  if (data.action === "append") {
    sheet.appendRow(data.row);
  } else if (data.action === "update") {
    var r = parseInt(data.rowIndex);
    if (r >= 1 && r <= sheet.getLastRow()) {
      sheet.getRange(r, 1, 1, data.row.length).setValues([data.row]);
    }
  } else if (data.action === "delete") {
    var r = parseInt(data.rowIndex);
    if (r >= 1 && r <= sheet.getLastRow()) {
      sheet.deleteRow(r);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
}`;

const TIMEOUT_ERROR_MSG = 'زمان انتظار ارتباط با گوگل شیت به پایان رسید (کندی یا اختلال اینترنت). لطفاً دوباره امتحان کنید.';

const executeWithTimeout = async (url: string, options: RequestInit, timeoutMs = 35000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError' || String(err.message || '').toLowerCase().includes('abort')) {
      throw new Error(TIMEOUT_ERROR_MSG);
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
};

/**
 * ارسال سطر جدید به وب‌هوک گوگل شیت با تشخیص دقیق موفقیت/خطا
 */
export const appendViaWebhook = async (webhookUrl: string, house: DivarHouseVisit): Promise<{ rowIndex?: number }> => {
  const row = houseToRowValues(house);
  
  // اولویت ۱: ارسال مطمئن با POST بدون محدودیت طول کاراکتر
  try {
    await executeWithTimeout(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'append', row }),
    }, 35000);
    return {};
  } catch (postErr: any) {
    if (String(postErr?.message || '').includes('زمان انتظار')) {
      throw postErr;
    }
    // اولویت ۲: ارسال با GET
    try {
      const url = new URL(webhookUrl);
      url.searchParams.set('action', 'append');
      url.searchParams.set('row', JSON.stringify(row));
      await executeWithTimeout(url.toString(), { method: 'GET', mode: 'no-cors' }, 35000);
      return {};
    } catch (getErr: any) {
      if (String(getErr?.message || '').includes('زمان انتظار')) {
        throw getErr;
      }
      throw new Error(TIMEOUT_ERROR_MSG);
    }
  }
};

/**
 * بروزرسانی سطر در گوگل شیت از طریق وب‌هوک
 */
export const updateViaWebhook = async (
  webhookUrl: string,
  rowIndex: number,
  house: DivarHouseVisit
): Promise<void> => {
  const row = houseToRowValues(house);
  try {
    await executeWithTimeout(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'update', rowIndex, row }),
    }, 35000);
    return;
  } catch (postErr: any) {
    if (String(postErr?.message || '').includes('زمان انتظار')) {
      throw postErr;
    }
    try {
      const url = new URL(webhookUrl);
      url.searchParams.set('action', 'update');
      url.searchParams.set('rowIndex', String(rowIndex));
      url.searchParams.set('row', JSON.stringify(row));
      await executeWithTimeout(url.toString(), { method: 'GET', mode: 'no-cors' }, 35000);
      return;
    } catch (getErr: any) {
      if (String(getErr?.message || '').includes('زمان انتظار')) {
        throw getErr;
      }
      throw new Error(TIMEOUT_ERROR_MSG);
    }
  }
};

/**
 * حذف سطر از گوگل شیت با وب‌هوک
 */
export const deleteViaWebhook = async (webhookUrl: string, rowIndex: number): Promise<void> => {
  // روش اول: ارسال با POST (معتبرترین روش در Google Apps Script)
  try {
    await executeWithTimeout(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'delete', rowIndex }),
    }, 35000);
    return;
  } catch (postErr: any) {
    if (String(postErr?.message || '').includes('زمان انتظار')) {
      throw postErr;
    }
    // روش دوم: ارسال با GET
    try {
      const url = new URL(webhookUrl);
      url.searchParams.set('action', 'delete');
      url.searchParams.set('rowIndex', String(rowIndex));
      await executeWithTimeout(url.toString(), { method: 'GET', mode: 'no-cors' }, 35000);
      return;
    } catch (getErr: any) {
      if (String(getErr?.message || '').includes('زمان انتظار')) {
        throw getErr;
      }
      throw new Error(TIMEOUT_ERROR_MSG);
    }
  }
};

/**
 * خواندن سطرهای گوگل شیت از طریق وب‌هوک (درخواست GET)
 */
export const fetchViaWebhook = async (webhookUrl: string): Promise<DivarHouseVisit[]> => {
  const response = await executeWithTimeout(webhookUrl, { method: 'GET' }, 35000);
  if (!response.ok) {
    throw new Error(`خطا در دریافت اطلاعات از گوگل شیت (${response.status})`);
  }
  const data = await response.json();
  const rows: any[][] = data.values || [];
  
  if (rows.length === 0) {
    return [];
  }

  // بررسی هوشمند سرستون تا هیچ سطر دیتایی از دست نرود
  const firstRowIsHeader = isHeaderRow(rows[0]);
  const dataRowsWithIndex: { row: any[]; rowIndex: number }[] = [];

  for (let i = 0; i < rows.length; i++) {
    if (i === 0 && firstRowIsHeader) {
      continue;
    }
    const rowIndex = i + 1;
    dataRowsWithIndex.push({ row: rows[i], rowIndex });
  }

  return dataRowsWithIndex
    .map(({ row, rowIndex }) => ({
      ...rowValuesToHouse(row, rowIndex),
      syncStatus: 'synced' as const,
    }))
    .filter((h: DivarHouseVisit) => 
      (h.title && h.title.trim().length > 0) || 
      (h.address && h.address.trim().length > 0) || 
      (h.totalPriceMillion > 0) || 
      (h.divarUrl && h.divarUrl.trim().length > 0) ||
      (h.realEstateAgentPhone && h.realEstateAgentPhone.trim().length > 0)
    );
};
