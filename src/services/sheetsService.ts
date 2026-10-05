import { DivarHouseVisit, HouseVisitStatus, AgentCallStatus, DeedStatus, MortgageWaitingStatus } from '../types/house';

export const SHEET_NAME_VISITS = 'لیست بازدید خانه‌های دیوار';

export const HEADERS_FA = [
  'عنوان آگهی دیوار',
  'لینک دیوار',
  'آدرس ملک',
  'قیمت کل (میلیون تومان)',
  'متراژ (مترمربع)',
  'قیمت هر متر (میلیون تومان)',
  'طبقه / کل طبقات',
  'سال ساخت',
  'تعداد اتاق',
  'پارکینگ',
  'آسانسور',
  'انباری',
  'تراس',
  'وضعیت سند',
  'صاحب‌خانه منتظر وام مسکن می‌ماند؟',
  'تماس با املاک جواب داد؟',
  'آدرس مشاور املاک',
  'شماره تماس مشاور املاک',
  'مکان قرار بازدید',
  'زمان قرار بازدید',
  'امتیاز از ۱۰',
  'نظر و ارزیابی',
  'وضعیت فرآیند خرید',
  'تاریخ بروزرسانی',
];

export const parseSpreadsheetId = (input: string): string => {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
};

export const houseToRowValues = (house: DivarHouseVisit): (string | number)[] => {
  const pricePerMeter = house.areaSqm > 0 
    ? Math.round((house.totalPriceMillion / house.areaSqm) * 10) / 10 
    : 0;

  return [
    house.title || '',
    house.divarUrl || '',
    house.address || '',
    house.totalPriceMillion || 0,
    house.areaSqm || 0,
    pricePerMeter,
    `طبقه ${house.floor || 1} از ${house.totalFloors || 1}`,
    house.yearBuilt || '',
    house.roomsCount || 0,
    house.hasParking ? 'دارد' : 'ندارد',
    house.hasElevator ? 'دارد' : 'ندارد',
    house.hasStorage ? 'دارد' : 'ندارد',
    house.hasBalcony ? 'دارد' : 'ندارد',
    house.deedStatus || 'سند تک‌برگ ملکی',
    house.waitsForMortgageLoan || 'نامشخص',
    house.agentCallStatus || 'تماس گرفته نشده',
    house.realEstateAgentAddress || '',
    house.realEstateAgentPhone || '',
    house.appointmentLocation || '',
    house.appointmentDateTime || '',
    house.score || 0,
    house.reviewText || '',
    house.visitStatus || 'در انتظار تماس',
    new Date().toLocaleDateString('fa-IR'),
  ];
};

export const rowValuesToHouse = (row: any[], rowIndex: number): DivarHouseVisit => {
  const parseNum = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    // Replace Persian digits with English digits if any
    const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    let str = String(val);
    for (let i = 0; i < 10; i++) {
      str = str.replace(new RegExp(farsiDigits[i], 'g'), String(i));
    }
    const cleaned = str.replace(/[^0-9.-]+/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const parseString = (val: any): string => (val !== undefined && val !== null ? String(val).trim() : '');
  const parseBool = (val: any): boolean => {
    const s = parseString(val).toLowerCase();
    return s.includes('دارد') || s === 'بله' || s === 'true' || s === 'yes' || s === '1';
  };

  // Parsing floor "طبقه ۳ از ۵"
  const floorRaw = parseString(row[6]);
  let floor = 1;
  let totalFloors = 1;
  const floorMatch = floorRaw.match(/(\d+)\s*(?:از|\/)\s*(\d+)/);
  if (floorMatch) {
    floor = parseInt(floorMatch[1], 10) || 1;
    totalFloors = parseInt(floorMatch[2], 10) || 1;
  } else {
    floor = parseNum(row[6]) || 1;
  }

  return {
    id: `house-row-${rowIndex}`,
    rowIndex,
    title: parseString(row[0]) || `ملک ردیف ${rowIndex}`,
    divarUrl: parseString(row[1]),
    address: parseString(row[2]),
    totalPriceMillion: parseNum(row[3]),
    areaSqm: parseNum(row[4]),
    floor,
    totalFloors,
    yearBuilt: parseString(row[7]),
    roomsCount: parseNum(row[8]),
    hasParking: parseBool(row[9]),
    hasElevator: parseBool(row[10]),
    hasStorage: parseBool(row[11]),
    hasBalcony: parseBool(row[12]),
    deedStatus: (parseString(row[13]) as DeedStatus) || 'سند تک‌برگ ملکی',
    waitsForMortgageLoan: (parseString(row[14]) as MortgageWaitingStatus) || 'نامشخص / باید سوال شود',
    agentCallStatus: (parseString(row[15]) as AgentCallStatus) || 'تماس گرفته نشده',
    realEstateAgentAddress: parseString(row[16]),
    realEstateAgentPhone: parseString(row[17]),
    appointmentLocation: parseString(row[18]),
    appointmentDateTime: parseString(row[19]),
    score: parseNum(row[20]) || 5,
    reviewText: parseString(row[21]),
    visitStatus: (parseString(row[22]) as HouseVisitStatus) || 'در انتظار تماس',
    updatedAt: parseString(row[23]),
  };
};

export const createHouseHuntingSpreadsheet = async (
  accessToken: string,
  title: string = 'مدیریت و بازدید خانه‌های دیوار ۱۴۰۵'
): Promise<{ spreadsheetId: string; url: string; sheetId: number; title: string }> => {
  const requestBody = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: SHEET_NAME_VISITS,
          rightToLeft: true, // RTL for Persian Google Sheet!
          gridProperties: {
            frozenRowCount: 1,
            rowCount: 100,
            columnCount: HEADERS_FA.length + 2,
          },
        },
      },
    ],
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`خطا در ایجاد گوگل شیت: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const sheetId = data.sheets?.[0]?.properties?.sheetId ?? 0;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // نوشتن ردیف عنوان‌ها در گوگل شیت
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(SHEET_NAME_VISITS)}!A1:X1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `${SHEET_NAME_VISITS}!A1:X1`,
        majorDimension: 'ROWS',
        values: [HEADERS_FA],
      }),
    }
  );

  // استایل‌دهی ردیف عناوین به رنگ سبز تیره / سرمه‌ای با فونت درشت و خوانا
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.08, green: 0.22, blue: 0.16 }, // سبز تیره زیبا
                  textFormat: {
                    foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                    bold: true,
                    fontSize: 11,
                  },
                  horizontalAlignment: 'CENTER',
                  wrapStrategy: 'WRAP',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)',
            },
          },
        ],
      }),
    });
  } catch (err) {
    console.warn('Google Sheet header formatting skipped:', err);
  }

  return {
    spreadsheetId,
    url: spreadsheetUrl,
    sheetId,
    title,
  };
};

export const getSpreadsheetDetails = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheetName: string; sheetId: number; url: string }> => {
  const cleanId = parseSpreadsheetId(spreadsheetId);
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`خطا در دریافت اطلاعات گوگل شیت: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const sheets = data.sheets || [];
  const targetSheet = sheets.find((s: any) => s.properties?.title === SHEET_NAME_VISITS) || sheets[0];
  const sheetName = targetSheet?.properties?.title || 'Sheet1';
  const sheetId = targetSheet?.properties?.sheetId || 0;

  return {
    title: data.properties?.title || 'اسپردشیت بازدید خانه',
    sheetName,
    sheetId,
    url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
  };
};

export const readHouseVisits = async (
  accessToken: string,
  spreadsheetId: string,
  sheetName: string = SHEET_NAME_VISITS
): Promise<DivarHouseVisit[]> => {
  const cleanId = parseSpreadsheetId(spreadsheetId);
  const range = `${encodeURIComponent(sheetName)}!A2:X100`;
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${range}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`خطا در خواندن سطرهای گوگل شیت: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const rows = data.values || [];

  return rows
    .map((row: any[], index: number) => {
      const rowIndex = index + 2;
      return rowValuesToHouse(row, rowIndex);
    })
    .filter((h: DivarHouseVisit) => (h.title && h.title.trim().length > 0) || (h.address && h.address.trim().length > 0));
};

export const addHouseVisit = async (
  accessToken: string,
  spreadsheetId: string,
  house: DivarHouseVisit,
  sheetName: string = SHEET_NAME_VISITS
): Promise<{ updatedRange: string }> => {
  const cleanId = parseSpreadsheetId(spreadsheetId);
  const rowValues = houseToRowValues(house);
  const range = `${encodeURIComponent(sheetName)}!A:X`;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [rowValues],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`خطا در افزودن سطر به گوگل شیت: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return { updatedRange: data.updates?.updatedRange || '' };
};

export const updateHouseVisit = async (
  accessToken: string,
  spreadsheetId: string,
  rowIndex: number,
  house: DivarHouseVisit,
  sheetName: string = SHEET_NAME_VISITS
): Promise<void> => {
  const cleanId = parseSpreadsheetId(spreadsheetId);
  const rowValues = houseToRowValues(house);
  const range = `${encodeURIComponent(sheetName)}!A${rowIndex}:X${rowIndex}`;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [rowValues],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`خطا در بروزرسانی ردیف ${rowIndex} در گوگل شیت: ${response.status} ${errorText}`);
  }
};

export const deleteHouseVisit = async (
  accessToken: string,
  spreadsheetId: string,
  rowIndex: number,
  sheetId: number = 0
): Promise<void> => {
  const cleanId = parseSpreadsheetId(spreadsheetId);
  const startIndex = rowIndex - 1;
  const endIndex = rowIndex;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex,
                endIndex,
              },
            },
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`خطا در حذف ردیف ${rowIndex} از گوگل شیت: ${response.status} ${errorText}`);
  }
};
