import { DivarHouseVisit } from '../types/house';
import { HEADERS_FA, houseToRowValues, rowValuesToHouse } from './sheetsService';

export const APPS_SCRIPT_TEMPLATE = `function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var values = sheet.getDataRange().getValues();
  return ContentService
    .createTextOutput(JSON.stringify({ status: "success", values: values }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  
  if (data.action === "init_headers") {
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(data.headers);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (data.action === "append") {
    sheet.appendRow(data.row);
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  }

  if (data.action === "update") {
    var rowIndex = data.rowIndex;
    if (rowIndex > 1 && rowIndex <= sheet.getLastRow()) {
      var range = sheet.getRange(rowIndex, 1, 1, data.row.length);
      range.setValues([data.row]);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  }

  if (data.action === "delete") {
    var rowIndex = data.rowIndex;
    if (rowIndex > 1 && rowIndex <= sheet.getLastRow()) {
      sheet.deleteRow(rowIndex);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: "unknown_action" })).setMimeType(ContentService.MimeType.JSON);
}`;

/**
 * ارسال سطر جدید به وب‌هوک گوگل شیت
 */
export const appendViaWebhook = async (webhookUrl: string, house: DivarHouseVisit): Promise<void> => {
  const row = houseToRowValues(house);
  await fetch(webhookUrl, {
    method: 'POST',
    mode: 'no-cors', // Google Apps Script redirects require no-cors in browser
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'append', row }),
  });
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
  await fetch(webhookUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'update', rowIndex, row }),
  });
};

/**
 * حذف سطر از گوگل شیت با وب‌هوک
 */
export const deleteViaWebhook = async (webhookUrl: string, rowIndex: number): Promise<void> => {
  await fetch(webhookUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'delete', rowIndex }),
  });
};

/**
 * خواندن سطرهای گوگل شیت از طریق وب‌هوک (درخواست GET)
 */
export const fetchViaWebhook = async (webhookUrl: string): Promise<DivarHouseVisit[]> => {
  const response = await fetch(webhookUrl);
  if (!response.ok) {
    throw new Error(`خطا در ارتباط با وب‌هوک: ${response.status}`);
  }
  const data = await response.json();
  const rows = data.values || [];
  
  // اگر ردیف اول هدر باشد، از ردیف دوم شروع می‌کنیم
  const dataRows = rows.slice(1);
  return dataRows
    .map((row: any[], index: number) => {
      const rowIndex = index + 2;
      return rowValuesToHouse(row, rowIndex);
    })
    .filter((h: DivarHouseVisit) => (h.title && h.title.trim().length > 0) || (h.address && h.address.trim().length > 0));
};
