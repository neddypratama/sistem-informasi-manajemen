import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

/**
 * Format helper: Rupiah currency string
 */
export const formatRupiah = (val: number | string | null | undefined): string => {
  const num = Number(val || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
};

/**
 * Format helper: Date string to DD/MM/YYYY
 */
export const formatDateIndo = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
};

/**
 * Universal Excel (.xlsx) Exporter
 */
export function exportToExcel({
  filename,
  sheetName = 'Data',
  title,
  columns,
  data,
}: {
  filename: string;
  sheetName?: string;
  title?: string;
  columns: ExportColumn[];
  data: any[];
}) {
  const wb = XLSX.utils.book_new();

  // Prepare table headers and rows
  const headers = columns.map((c) => c.header);
  const rows = data.map((item, index) => {
    return columns.map((col) => {
      if (col.key === '_index') return index + 1;
      const val = item[col.key];
      return val !== undefined && val !== null ? val : '';
    });
  });

  const wsData: any[][] = [];

  if (title) {
    wsData.push([title]);
    wsData.push([`Dicetak pada: ${new Date().toLocaleString('id-ID')}`]);
    wsData.push([]); // empty row
  }

  wsData.push(headers);
  rows.forEach((r) => wsData.push(r));

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = columns.map((c) => ({
    wch: c.width || Math.max(c.header.length + 4, 12),
  }));

  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
}

/**
 * Universal PDF Exporter (Khusus Modul Laporan & Ringkasan Keuangan)
 */
export function exportToPdf({
  filename,
  title,
  subtitle,
  period,
  columns,
  data,
  orientation = 'portrait',
  footers,
}: {
  filename: string;
  title: string;
  subtitle?: string;
  period?: string;
  columns: ExportColumn[];
  data: any[];
  orientation?: 'portrait' | 'landscape';
  footers?: Array<string[]>;
}) {
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BIMA PRATAMA ERP', 14, 15);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85); // Slate 700
  doc.text(title.toUpperCase(), 14, 21);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate 500

  let headerY = 26;
  if (subtitle) {
    doc.text(subtitle, 14, headerY);
    headerY += 4.5;
  }
  if (period) {
    doc.text(`Periode: ${period}`, 14, headerY);
    headerY += 4.5;
  }
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, headerY);

  // Line separator
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.5);
  doc.line(14, headerY + 3, pageWidth - 14, headerY + 3);

  // Prepare autoTable data
  const head = [columns.map((c) => c.header)];
  const body = data.map((item, index) => {
    return columns.map((col) => {
      if (col.key === '_index') return index + 1;
      const val = item[col.key];
      return val !== undefined && val !== null ? String(val) : '-';
    });
  });

  const columnStyles: Record<number, any> = {};
  columns.forEach((col, idx) => {
    if (col.align) {
      columnStyles[idx] = { halign: col.align };
    }
  });

  autoTable(doc, {
    startY: headerY + 6,
    head,
    body,
    foot: footers,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    footStyles: {
      fillColor: [241, 245, 249], // Slate 100
      textColor: [15, 23, 42],
      fontSize: 8,
      fontStyle: 'bold',
    },
    columnStyles,
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      // Footer page numbering
      const pageStr = `Halaman ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        pageStr,
        pageWidth - 14 - doc.getTextWidth(pageStr),
        doc.internal.pageSize.getHeight() - 8
      );
    },
  });

  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(cleanFilename);
}
