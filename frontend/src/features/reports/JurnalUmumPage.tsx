import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel, exportToPdf, formatDateIndo } from '../../lib/export-utils';
import {
  BookOpen,
  Search,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Receipt,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
} from 'lucide-react';

export const JurnalUmumPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [modalJurnal, setModalJurnal] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: responseData, isLoading } = useQuery({
    queryKey: ['jurnalUmum', page, search, startDate, endDate],
    queryFn: async () => {
      let url = `/reports/jurnal-umum?limit=25&page=${page}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      const res: any = await apiClient.get(url);
      return res;
    },
  });

  const jurnals = Array.isArray(responseData?.data?.items)
    ? responseData.data.items
    : Array.isArray(responseData?.items)
    ? responseData.items
    : Array.isArray(responseData?.data)
    ? responseData.data
    : Array.isArray(responseData)
    ? responseData
    : [];
  const meta = responseData?.data?.meta || responseData?.meta || { total: 0, page: 1, limit: 25, totalPages: 1 };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatTanggal = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const fetchAllForExport = async () => {
    try {
      setIsExporting(true);
      let url = `/reports/jurnal-umum?limit=2000&page=1`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      const res: any = await apiClient.get(url);
      const items = res?.data?.items || res?.items || res?.data || res || [];
      return Array.isArray(items) ? items : jurnals;
    } catch (err) {
      console.error('Failed to fetch jurnals for export:', err);
      return jurnals;
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    const dataToExport = await fetchAllForExport();
    if (!dataToExport || dataToExport.length === 0) {
      alert('Tidak ada data jurnal untuk diekspor');
      return;
    }

    const rows: any[] = [];
    dataToExport.forEach((j: any) => {
      if (j.details && j.details.length > 0) {
        j.details.forEach((d: any) => {
          rows.push({
            nomorJurnal: j.nomorJurnal,
            tanggal: formatDateIndo(j.tanggal),
            invoice: j.invoice || '-',
            keterangan: j.keterangan || '-',
            coaCode: d.coaCode || '-',
            coaName: d.coaName || '-',
            debit: Number(d.debit) || 0,
            kredit: Number(d.kredit) || 0,
          });
        });
      } else {
        rows.push({
          nomorJurnal: j.nomorJurnal,
          tanggal: formatDateIndo(j.tanggal),
          invoice: j.invoice || '-',
          keterangan: j.keterangan || '-',
          coaCode: '-',
          coaName: '-',
          debit: Number(j.totalDebit) || 0,
          kredit: Number(j.totalKredit) || 0,
        });
      }
    });

    exportToExcel({
      filename: `Jurnal_Umum_${startDate || 'Semua'}_sd_${endDate || 'Kini'}`,
      sheetName: 'Jurnal Umum',
      title: `LAPORAN JURNAL UMUM & BUKU BESAR (${startDate || 'Awal'} s/d ${endDate || 'Kini'})`,
      columns: [
        { header: 'No', key: '_index', width: 6 },
        { header: 'No Jurnal', key: 'nomorJurnal', width: 18 },
        { header: 'Tanggal', key: 'tanggal', width: 14 },
        { header: 'Ref Invoice', key: 'invoice', width: 16 },
        { header: 'Keterangan', key: 'keterangan', width: 35 },
        { header: 'Kode Akun', key: 'coaCode', width: 14 },
        { header: 'Nama Akun', key: 'coaName', width: 30 },
        { header: 'Debit (Rp)', key: 'debit', width: 18 },
        { header: 'Kredit (Rp)', key: 'kredit', width: 18 },
      ],
      data: rows,
    });
  };

  const handleExportPdf = async () => {
    const dataToExport = await fetchAllForExport();
    if (!dataToExport || dataToExport.length === 0) {
      alert('Tidak ada data jurnal untuk diekspor');
      return;
    }

    const rows: any[] = [];
    let grandDebit = 0;
    let grandKredit = 0;

    dataToExport.forEach((j: any) => {
      grandDebit += Number(j.totalDebit) || 0;
      grandKredit += Number(j.totalKredit) || 0;
      if (j.details && j.details.length > 0) {
        j.details.forEach((d: any) => {
          rows.push({
            nomorJurnal: j.nomorJurnal,
            tanggal: formatDateIndo(j.tanggal),
            invoice: j.invoice || '-',
            keterangan: j.keterangan || '-',
            akun: `${d.coaCode || ''} - ${d.coaName || ''}`.trim(),
            debit: Number(d.debit) ? formatRupiah(d.debit) : '-',
            kredit: Number(d.kredit) ? formatRupiah(d.kredit) : '-',
          });
        });
      }
    });

    exportToPdf({
      filename: `Jurnal_Umum_${startDate || 'Semua'}_sd_${endDate || 'Kini'}`,
      title: 'LAPORAN JURNAL UMUM (DOUBLE-ENTRY)',
      period: startDate && endDate ? `${startDate} s/d ${endDate}` : 'Semua Periode',
      orientation: 'landscape',
      columns: [
        { header: 'No', key: '_index', width: 8, align: 'center' },
        { header: 'No Jurnal', key: 'nomorJurnal', width: 28 },
        { header: 'Tanggal', key: 'tanggal', width: 22 },
        { header: 'Ref', key: 'invoice', width: 25 },
        { header: 'Keterangan', key: 'keterangan', width: 55 },
        { header: 'Akun Perkiraan', key: 'akun', width: 60 },
        { header: 'Debit', key: 'debit', width: 30, align: 'right' },
        { header: 'Kredit', key: 'kredit', width: 30, align: 'right' },
      ],
      data: rows,
      footers: [
        ['', '', '', '', 'TOTAL', '', formatRupiah(grandDebit), formatRupiah(grandKredit)],
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2">
            <BookOpen className="w-7 h-7 text-emerald-600" />
            <span>Jurnal Umum & Buku Besar Transaksi</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Daftar lengkap pembukuan double-entry (Debit & Kredit) seluruh transaksi operasional dan kas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportButtonGroup
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            isExporting={isExporting}
          />
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Jurnal Tercatat</span>
              <p className="text-base font-extrabold text-slate-800 font-mono">
                {meta.total ? meta.total.toLocaleString('id-ID') : '...'} Entri
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari nomor jurnal (JUR-...), nomor invoice, atau keterangan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-slate-400 ml-1" />
          <span className="text-slate-500 font-semibold">Tgl:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
          />
          <span className="text-slate-400">s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
          />
        </div>
      </div>

      {/* Jurnal Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="p-4 w-12 text-center">No</th>
                <th className="p-4">Nomor Jurnal & Tanggal</th>
                <th className="p-4">Ref Transaksi</th>
                <th className="p-4">Keterangan</th>
                <th className="p-4 text-right">Total Debit</th>
                <th className="p-4 text-right">Total Kredit</th>
                <th className="p-4 text-center w-28">Status</th>
                <th className="p-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    Memuat daftar jurnal umum...
                  </td>
                </tr>
              ) : jurnals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    Tidak ditemukan data jurnal yang sesuai filter pencarian.
                  </td>
                </tr>
              ) : (
                jurnals.map((j: any, idx: number) => {
                  const isExpanded = expandedId === j.id;
                  return (
                    <React.Fragment key={j.id}>
                      <tr
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-emerald-50/30' : ''
                        }`}
                        onClick={() => toggleExpand(j.id)}
                      >
                        <td className="p-4 text-center font-mono text-slate-400 text-xs">
                          {(page - 1) * meta.limit + idx + 1}
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-800 font-mono text-xs">{j.nomorJurnal}</p>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" /> {formatTanggal(j.tanggal)}
                          </span>
                        </td>
                        <td className="p-4">
                          {j.invoice ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <Receipt className="w-3 h-3 text-slate-400" />
                              {j.invoice}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Manual / Opname</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-700 text-xs max-w-xs truncate">
                          {j.keterangan || '-'}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-700 text-xs">
                          {formatRupiah(j.totalDebit)}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-blue-700 text-xs">
                          {formatRupiah(j.totalKredit)}
                        </td>
                        <td className="p-4 text-center">
                          {j.isBalanced ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Seimbang
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              Selisih
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalJurnal(j);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Lihat Detail Jurnal Lengkap"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Double-Entry Leg Details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={8} className="p-4 pl-14">
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                  <Layers className="w-4 h-4 text-emerald-600" />
                                  <span>Rincian Akun Double-Entry ({j.details?.length || 0} Akun)</span>
                                </h4>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  Nomor: {j.nomorJurnal}
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                                    <tr>
                                      <th className="p-2 w-28">Kode Akun</th>
                                      <th className="p-2">Nama Akun (COA)</th>
                                      <th className="p-2">Kategori</th>
                                      <th className="p-2 text-center w-24">Tipe Akun</th>
                                      <th className="p-2 text-right w-36">Debit (Rp)</th>
                                      <th className="p-2 text-right w-36">Kredit (Rp)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-mono">
                                    {j.details?.map((d: any, dIdx: number) => (
                                      <tr key={d.id || dIdx} className="hover:bg-slate-50/50">
                                        <td className="p-2 font-bold text-slate-700">{d.coaCode}</td>
                                        <td className="p-2 font-semibold font-sans text-slate-800">
                                          {d.debit > 0 ? (
                                            d.coaName
                                          ) : (
                                            <span className="pl-4 text-slate-600">↳ {d.coaName}</span>
                                          )}
                                        </td>
                                        <td className="p-2 font-sans text-slate-500">{d.kategoriName || '-'}</td>
                                        <td className="p-2 text-center font-sans">
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                            {d.coaType}
                                          </span>
                                        </td>
                                        <td className="p-2 text-right font-bold text-emerald-700">
                                          {d.debit > 0 ? formatRupiah(d.debit) : '—'}
                                        </td>
                                        <td className="p-2 text-right font-bold text-blue-700">
                                          {d.kredit > 0 ? formatRupiah(d.kredit) : '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-800">
                                    <tr>
                                      <td colSpan={4} className="p-2 text-right font-sans uppercase text-[11px]">
                                        Total Keseimbangan Jurnal
                                      </td>
                                      <td className="p-2 text-right text-emerald-700">
                                        {formatRupiah(j.totalDebit)}
                                      </td>
                                      <td className="p-2 text-right text-blue-700">
                                        {formatRupiah(j.totalKredit)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan halaman <span className="font-bold text-slate-800">{meta.page}</span> dari{' '}
            <span className="font-bold text-slate-800">{meta.totalPages}</span> (Total{' '}
            {meta.total.toLocaleString('id-ID')} jurnal)
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>
            <span className="px-3 py-1.5 bg-slate-100 rounded-lg font-bold text-slate-700">
              {page}
            </span>
            <button
              onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
              disabled={page >= meta.totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Detail Jurnal Pop-up */}
      {modalJurnal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Detail Jurnal: {modalJurnal.nomorJurnal}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {formatTanggal(modalJurnal.tanggal)} • Ref: {modalJurnal.invoice || 'Manual'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalJurnal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
              <p className="text-slate-500 font-medium">
                <span className="font-bold text-slate-700">Keterangan:</span> {modalJurnal.keterangan || '-'}
              </p>
              {modalJurnal.transaksiType && (
                <p className="text-slate-500 font-medium">
                  <span className="font-bold text-slate-700">Jenis Transaksi:</span> {modalJurnal.transaksiType} ({modalJurnal.paymentMethod || 'TUNAI'})
                </p>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5">Kode</th>
                    <th className="p-2.5">Nama Akun (COA)</th>
                    <th className="p-2.5 text-right">Debit (Rp)</th>
                    <th className="p-2.5 text-right">Kredit (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {modalJurnal.details?.map((d: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-600">{d.coaCode}</td>
                      <td className="p-2.5 font-sans font-semibold text-slate-800">
                        {d.debit > 0 ? d.coaName : <span className="pl-4 text-slate-500">↳ {d.coaName}</span>}
                      </td>
                      <td className="p-2.5 text-right text-emerald-700 font-bold">
                        {d.debit > 0 ? formatRupiah(d.debit) : '—'}
                      </td>
                      <td className="p-2.5 text-right text-blue-700 font-bold">
                        {d.kredit > 0 ? formatRupiah(d.kredit) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-xs sticky bottom-0">
                  <tr>
                    <td colSpan={2} className="p-2.5 text-right font-sans uppercase">
                      Total
                    </td>
                    <td className="p-2.5 text-right text-emerald-700 font-mono">
                      {formatRupiah(modalJurnal.totalDebit)}
                    </td>
                    <td className="p-2.5 text-right text-blue-700 font-mono">
                      {formatRupiah(modalJurnal.totalKredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalJurnal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default JurnalUmumPage;
