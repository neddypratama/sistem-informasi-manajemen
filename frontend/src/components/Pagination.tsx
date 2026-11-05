import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  page?: number;
  currentPage?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
  limitOptions?: number[];
  entityName?: string;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  page: propPage,
  currentPage: propCurrentPage,
  limit = 25,
  total = 0,
  totalPages,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 25, 50, 100, 500],
  entityName = 'data',
  className = '',
}) => {
  const activePage = propPage ?? propCurrentPage ?? 1;
  const safeTotal = typeof total === 'number' && !isNaN(total) ? Math.max(0, total) : 0;
  const safeLimit = typeof limit === 'number' && limit > 0 ? limit : 25;
  const calculatedTotalPages = totalPages || Math.max(1, Math.ceil(safeTotal / safeLimit));
  const from = safeTotal === 0 ? 0 : (activePage - 1) * safeLimit + 1;
  const to = Math.min(activePage * safeLimit, safeTotal);

  return (
    <div
      className={`p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 ${className}`}
    >
      {/* Sisi Kiri: Pilihan Show Entries & Informasi Range Data */}
      <div className="flex flex-wrap items-center gap-2.5">
        {onLimitChange && (
          <div className="flex items-center space-x-1.5">
            <span className="font-medium text-slate-600">Tampilkan:</span>
            <select
              value={safeLimit}
              onChange={(e) => {
                onLimitChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-xs"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="text-slate-600 font-medium">
          Menampilkan{' '}
          <strong className="font-bold text-slate-900 font-mono">
            {Number(from || 0).toLocaleString('id-ID')}
          </strong>{' '}
          –{' '}
          <strong className="font-bold text-slate-900 font-mono">
            {Number(to || 0).toLocaleString('id-ID')}
          </strong>{' '}
          dari{' '}
          <strong className="font-bold text-slate-900 font-mono">
            {Number(safeTotal || 0).toLocaleString('id-ID')}
          </strong>{' '}
          {entityName}
        </div>
      </div>

      {/* Sisi Kanan: Tombol Navigasi Halaman */}
      <div className="flex items-center space-x-1">
        {/* Tombol Pertama (<<) */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={activePage <= 1}
          title="Halaman Pertama"
          className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed text-slate-600 transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Tombol Sebelumnya (<) */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, activePage - 1))}
          disabled={activePage <= 1}
          title="Halaman Sebelumnya"
          className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed text-slate-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Info Halaman Saat Ini */}
        <span className="px-3 py-1 text-slate-700 font-bold font-mono">
          {activePage} / {calculatedTotalPages}
        </span>

        {/* Tombol Selanjutnya (>) */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(calculatedTotalPages, activePage + 1))}
          disabled={activePage >= calculatedTotalPages}
          title="Halaman Selanjutnya"
          className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed text-slate-600 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Tombol Terakhir (>>) */}
        <button
          type="button"
          onClick={() => onPageChange(calculatedTotalPages)}
          disabled={activePage >= calculatedTotalPages}
          title="Halaman Terakhir"
          className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed text-slate-600 transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
