/**
 * Date helper utilities for ERP Bima Pratama
 * Menggunakan local timezone client (bukan UTC) untuk konsistensi YYYY-MM-DD
 */

export const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Tanggal hari ini (YYYY-MM-DD)
 */
export const getTodayDateString = (): string => {
  return formatLocalDate(new Date());
};

/**
 * Rentang tanggal bulan ini (awal bulan s/d akhir bulan)
 */
export const getCurrentMonthRange = (): { startDate: string; endDate: string } => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // hari terakhir bulan berjalan
  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
  };
};

/**
 * Rentang tanggal bulan lalu
 */
export const getLastMonthRange = (): { startDate: string; endDate: string } => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() - 1;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
  };
};

/**
 * Rentang tanggal tahun ini (1 Januari s/d Hari ini)
 */
export const getCurrentYearRange = (): { startDate: string; endDate: string } => {
  const now = new Date();
  const year = now.getFullYear();
  return {
    startDate: `${year}-01-01`,
    endDate: formatLocalDate(now),
  };
};
