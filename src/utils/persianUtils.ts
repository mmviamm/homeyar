// تبدیل اعداد انگلیسی به فارسی
export const toPersianDigits = (num: string | number | undefined | null): string => {
  if (num === undefined || num === null) return '';
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/[0-9]/g, (w) => farsiDigits[+w]);
};

// فرمت سه‌رقم سه‌رقم با ارقام فارسی
export const formatNumberFa = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return '۰';
  const parts = Math.round(num).toLocaleString('en-US');
  return toPersianDigits(parts);
};

// بیان کلامی قیمت به تومان (میلیارد و میلیون)
export const formatVerbalPriceMillion = (millionTomans: number): string => {
  if (!millionTomans || isNaN(millionTomans)) return '۰ تومان';
  
  if (millionTomans >= 1000) {
    const milliards = Math.floor(millionTomans / 1000);
    const remainderMillion = Math.round(millionTomans % 1000);
    
    if (remainderMillion === 0) {
      return `${toPersianDigits(milliards)} میلیارد تومان`;
    }
    return `${toPersianDigits(milliards)} میلیارد و ${toPersianDigits(remainderMillion)} میلیون تومان`;
  }
  
  return `${toPersianDigits(Math.round(millionTomans))} میلیون تومان`;
};

// محاسبه و فرمت قیمت هر متر مربع به میلیون تومان
export const calculatePricePerMeter = (totalMillion: number, areaSqm: number): string => {
  if (!totalMillion || !areaSqm || areaSqm <= 0) return '-';
  const perMeter = totalMillion / areaSqm;
  const rounded = Math.round(perMeter * 10) / 10;
  return `${toPersianDigits(rounded.toFixed(1))} م/متر`;
};
