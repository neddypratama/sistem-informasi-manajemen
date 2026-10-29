import React from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';

interface ExportButtonGroupProps {
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  excelLabel?: string;
  pdfLabel?: string;
  disabled?: boolean;
  isExporting?: boolean;
  className?: string;
}

export const ExportButtonGroup: React.FC<ExportButtonGroupProps> = ({
  onExportExcel,
  onExportPdf,
  excelLabel = 'Export Excel',
  pdfLabel = 'Export PDF',
  disabled = false,
  isExporting = false,
  className = '',
}) => {
  const isBusy = disabled || isExporting;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {onExportExcel && (
        <button
          type="button"
          onClick={onExportExcel}
          disabled={isBusy}
          title="Unduh data dalam format Microsoft Excel (.xlsx)"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{isExporting ? 'Mengekspor...' : excelLabel}</span>
        </button>
      )}

      {onExportPdf && (
        <button
          type="button"
          onClick={onExportPdf}
          disabled={isBusy}
          title="Unduh laporan dalam format dokumen cetak PDF (.pdf)"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
        >
          <FileText className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{isExporting ? 'Mengekspor...' : pdfLabel}</span>
        </button>
      )}
    </div>
  );
};

export default ExportButtonGroup;
