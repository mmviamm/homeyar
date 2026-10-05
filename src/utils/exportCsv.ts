import { DivarHouseVisit } from '../types/house';
import { HEADERS_FA, houseToRowValues } from '../services/sheetsService';

export const exportHousesToCsv = (houses: DivarHouseVisit[], filename: string = 'لیست_بازدید_خانه.csv') => {
  const rows = houses.map(h => houseToRowValues(h));
  
  // Format as CSV with proper quote escaping
  const csvContent = [
    HEADERS_FA.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => 
      row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
    )
  ].join('\r\n');

  // Add UTF-8 BOM so Excel opens Persian text without character encoding errors
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
