import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel, exportToPdf } from '../../lib/export-utils';
import {
  Scale,
  Calendar,
  Printer,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Maximize2,
  Minimize2,
  FolderTree,
} from 'lucide-react';

export const NeracaSaldoPage: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['neracaSaldo', startDate, endDate],
    queryFn: async () => {
      let url = '/reports/neraca-saldo';
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const q = params.toString();
      if (q) url += `?${q}`;
      const res: any = await apiClient.get(url);
      return res.data;
    },
  });

  const formatRupiah = (val: number | string | null | undefined) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatRupiahOrDash = (val: number | string | null | undefined) => {
    const num = Number(val) || 0;
    if (Math.abs(num) < 0.001) return '—';
    return formatRupiah(num);
  };

  const toggleGroup = (grpName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [grpName]: !prev[grpName],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    const sections = ['pendapatan', 'pengeluaran', 'aset', 'liabilitas', 'ekuitas'];
    sections.forEach((sec) => {
      reportData?.[sec]?.groups?.forEach((g: any) => {
        all[g.group] = true;
      });
    });
    setExpandedGroups(all);
  };

  const collapseAll = () => {
    setExpandedGroups({});
  };

  const setPresetThisYear = () => {
    const y = new Date().getFullYear();
    setStartDate(`${y}-01-01`);
    setEndDate(new Date().toISOString().slice(0, 10));
  };

  const setPresetAllTime = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleExportExcel = () => {
    if (!reportData) return;
    const rows: any[] = [];

    const sectionList = [
      { key: 'pendapatan', label: 'Pendapatan' },
      { key: 'pengeluaran', label: 'Pengeluaran' },
      { key: 'aset', label: 'Aset' },
      { key: 'liabilitas', label: 'Liabilitas' },
      { key: 'ekuitas', label: 'Ekuitas' },
    ];

    sectionList.forEach(({ key, label }) => {
      const secData = reportData[key];
      secData?.groups?.forEach((g: any) => {
        g.details?.forEach((d: any) => {
          rows.push({
            kelompok: label,
            group: g.group,
            code: d.code || '',
            kategori: d.kategori,
            debit: Number(d.debit) || 0,
            kredit: Number(d.kredit) || 0,
          });
        });
      });
    });

    exportToExcel({
      filename: `Neraca_Saldo_${startDate || 'Awal'}_sd_${endDate || 'Kini'}`,
      sheetName: 'Neraca Saldo',
      title: `LAPORAN NERACA SALDO / TRIAL BALANCE (${startDate || 'Awal'} s/d ${endDate || 'Kini'})`,
      columns: [
        { header: 'No', key: '_index', width: 8 },
        { header: 'Kelompok Akun', key: 'kelompok', width: 18 },
        { header: 'Grup Akun', key: 'group', width: 24 },
        { header: 'Kode', key: 'code', width: 14 },
        { header: 'Nama Akun / Kategori', key: 'kategori', width: 32 },
        { header: 'Debit (Rp)', key: 'debit', width: 20 },
        { header: 'Kredit (Rp)', key: 'kredit', width: 20 },
      ],
      data: rows,
    });
  };

  const handleExportPdf = () => {
    if (!reportData) return;
    const rows: any[] = [];

    const sectionList = [
      { key: 'pendapatan', label: 'Pendapatan' },
      { key: 'pengeluaran', label: 'Pengeluaran' },
      { key: 'aset', label: 'Aset' },
      { key: 'liabilitas', label: 'Liabilitas' },
      { key: 'ekuitas', label: 'Ekuitas' },
    ];

    sectionList.forEach(({ key, label }) => {
      const secData = reportData[key];
      secData?.groups?.forEach((g: any) => {
        g.details?.forEach((d: any) => {
          rows.push({
            kelompok: label,
            code: d.code || '-',
            kategori: d.kategori,
            debit: formatRupiah(d.debit || 0),
            kredit: formatRupiah(d.kredit || 0),
          });
        });
      });
    });

    exportToPdf({
      filename: `Neraca_Saldo_${startDate || 'Awal'}_sd_${endDate || 'Kini'}`,
      title: 'Laporan Neraca Saldo (Trial Balance)',
      subtitle: 'Keseimbangan Saldo 5 Kelompok Akun Buku Besar',
      period: `${startDate || 'Awal'} s/d ${endDate || 'Kini'}`,
      orientation: 'landscape',
      columns: [
        { header: 'No', key: '_index', align: 'center' },
        { header: 'Kelompok', key: 'kelompok', align: 'left' },
        { header: 'Kode', key: 'code', align: 'center' },
        { header: 'Nama Akun / Kategori', key: 'kategori', align: 'left' },
        { header: 'Debit (Rp)', key: 'debit', align: 'right' },
        { header: 'Kredit (Rp)', key: 'kredit', align: 'right' },
      ],
      data: rows,
      footers: [
        ['', 'TOTAL KESELURUHAN', '', '', formatRupiah(totalDebit), formatRupiah(totalKredit)],
        ['', 'STATUS KESEIMBANGAN', '', '', isBalanced ? 'SEIMBANG (BALANCE)' : `SELISIH: ${formatRupiah(selisih)}`, ''],
      ],
    });
  };

  const sections = [
    { key: 'pendapatan', label: '1. PENDAPATAN', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { key: 'pengeluaran', label: '2. PENGELUARAN (BEBAN & HPP)', badgeColor: 'bg-amber-100 text-amber-800 border-amber-200' },
    { key: 'aset', label: '3. ASET (AKTIVA)', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200' },
    { key: 'liabilitas', label: '4. LIABILITAS (KEWAJIBAN)', badgeColor: 'bg-rose-100 text-rose-800 border-rose-200' },
    { key: 'ekuitas', label: '5. EKUITAS (MODAL)', badgeColor: 'bg-purple-100 text-purple-800 border-purple-200' },
  ];

  const totalDebit = reportData?.totalDebit || 0;
  const totalKredit = reportData?.totalKredit || 0;
  const selisih = reportData?.selisih || 0;
  const isBalanced = reportData?.isBalanced ?? true;

  return (
    <div className="space-y-6">
      {/* Header & Date Range Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2.5">
            <Scale className="w-7 h-7 text-blue-600" />
            <span>Laporan Neraca Saldo (Trial Balance)</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Verifikasi keseimbangan saldo debit dan kredit 5 kelompok akun buku besar standar akuntansi
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak</span>
          </button>

          <ExportButtonGroup
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
          />
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Debit</span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">DR</span>
          </div>
          <p className="text-2xl font-extrabold text-blue-700 font-mono mt-2">
            {isLoading ? '...' : formatRupiah(totalDebit)}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Akumulasi Saldo Sisi Debit</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Kredit</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">CR</span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 font-mono mt-2">
            {isLoading ? '...' : formatRupiah(totalKredit)}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Akumulasi Saldo Sisi Kredit</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Selisih Keseimbangan</span>
            {isBalanced ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <p
            className={`text-2xl font-extrabold font-mono mt-2 ${
              isBalanced ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {isLoading ? '...' : formatRupiah(selisih)}
          </p>
          <span
            className={`text-xs font-semibold mt-1 flex items-center gap-1 ${
              isBalanced ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            {isBalanced ? '✓ Seimbang (Balance)' : '⚠ Terdapat Selisih'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Integritas Jurnal</span>
            <FolderTree className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-extrabold text-purple-900 font-mono mt-2">
            100 Akun
          </p>
          <span className="text-xs text-slate-500 mt-1 block">40 Detail Kategori Terintegrasi</span>
        </div>
      </div>

      {/* Filter Bar & Date Presets */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari akun neraca (misal Kas, Hutang, Piutang, Modal)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Quick Presets */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={setPresetAllTime}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                !startDate && !endDate
                  ? 'bg-white text-blue-700 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Waktu
            </button>
            <button
              onClick={setPresetThisYear}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                startDate.includes('-01-01')
                  ? 'bg-white text-blue-700 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tahun Ini
            </button>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none"
            />
          </div>

          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setSearch('');
            }}
            title="Reset Filter"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          <button
            onClick={expandAll}
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            title="Buka Semua Rincian"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buka Semua</span>
          </button>

          <button
            onClick={collapseAll}
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            title="Tutup Semua Rincian"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tutup Semua</span>
          </button>
        </div>
      </div>

      {/* Warning Box if Imbalanced */}
      {!isBalanced && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center space-x-3 text-amber-800">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-bold">Perhatian: Neraca Saldo Tidak Seimbang</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Terdapat selisih antara Total Debit dan Total Kredit sebesar{' '}
              <strong>{formatRupiah(selisih)}</strong> pada periode terpilih. Silakan cek jurnal umum transaksi.
            </p>
          </div>
        </div>
      )}

      {/* Main Neraca Saldo Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Akun / Kategori Buku Besar</th>
                <th className="py-3.5 px-4 w-32 text-center">Kode Akun</th>
                <th className="py-3.5 px-4 text-right w-48">Debit (Rp)</th>
                <th className="py-3.5 px-4 text-right w-48">Kredit (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Memuat data neraca saldo buku besar...
                  </td>
                </tr>
              ) : (
                sections.map(({ key, label, badgeColor }, secIdx) => {
                  const sectionData = reportData?.[key];
                  const groups = sectionData?.groups || [];

                  // Filter groups if search is active
                  const filteredGroups = groups.filter((g: any) => {
                    if (!search) return true;
                    const query = search.toLowerCase();
                    const matchGroup = g.group.toLowerCase().includes(query);
                    const matchDetails = g.details?.some(
                      (d: any) =>
                        d.kategori.toLowerCase().includes(query) ||
                        (d.code && d.code.toLowerCase().includes(query))
                    );
                    return matchGroup || matchDetails;
                  });

                  if (filteredGroups.length === 0 && search) return null;

                  return (
                    <React.Fragment key={key}>
                      {/* Section Header Row */}
                      <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-200">
                        <td className="py-3 px-4 text-center font-mono text-slate-500">
                          {secIdx + 1}
                        </td>
                        <td colSpan={2} className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeColor}`}
                          >
                            {label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-800 text-sm">
                          {formatRupiahOrDash(sectionData?.totalDebit)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800 text-sm">
                          {formatRupiahOrDash(sectionData?.totalKredit)}
                        </td>
                      </tr>

                      {/* Groups inside Section */}
                      {filteredGroups.map((g: any, gIdx: number) => {
                        const isExpanded = expandedGroups[g.group] || Boolean(search);
                        return (
                          <React.Fragment key={g.group}>
                            {/* Group Header Row */}
                            <tr
                              onClick={() => toggleGroup(g.group)}
                              className="hover:bg-slate-50 cursor-pointer transition-colors bg-white font-semibold text-slate-800"
                            >
                              <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                                {secIdx + 1}.{gIdx + 1}
                              </td>
                              <td className="py-2.5 px-4 flex items-center space-x-2">
                                <span className="text-slate-400">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-slate-600" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </span>
                                <span>{g.group}</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({g.details?.length || 0} akun)
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center text-[10px] font-mono text-slate-400">
                                {g.details?.[0]?.code ? g.details[0].code.slice(0, 7) + '...' : '-'}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-medium text-blue-700">
                                {formatRupiahOrDash(g.debit)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-medium text-emerald-700">
                                {formatRupiahOrDash(g.kredit)}
                              </td>
                            </tr>

                            {/* Detail Categories under Group */}
                            {isExpanded &&
                              g.details?.map((d: any) => {
                                if (
                                  search &&
                                  !d.kategori.toLowerCase().includes(search.toLowerCase()) &&
                                  !(d.code && d.code.toLowerCase().includes(search.toLowerCase()))
                                ) {
                                  return null;
                                }

                                return (
                                  <tr
                                    key={d.kategoriId}
                                    className="bg-slate-50/50 hover:bg-slate-100/60 transition-colors text-slate-600"
                                  >
                                    <td></td>
                                    <td className="py-1.5 px-4 pl-10 text-[11px] flex items-center space-x-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                      <span>{d.kategori}</span>
                                    </td>
                                    <td className="py-1.5 px-4 text-center font-mono text-[10px] text-slate-400">
                                      {d.code || '-'}
                                    </td>
                                    <td className="py-1.5 px-4 text-right font-mono text-[11px] text-blue-600">
                                      {formatRupiahOrDash(d.debit)}
                                    </td>
                                    <td className="py-1.5 px-4 text-right font-mono text-[11px] text-emerald-600">
                                      {formatRupiahOrDash(d.kredit)}
                                    </td>
                                  </tr>
                                );
                              })}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Table Footer: Total Keseluruhan */}
            <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs">
              <tr>
                <td colSpan={3} className="py-4 px-4 text-slate-800 uppercase tracking-wider text-right">
                  TOTAL KESELURUHAN (TRIAL BALANCE):
                </td>
                <td className="py-4 px-4 text-right font-mono text-blue-800 text-sm whitespace-nowrap">
                  {formatRupiah(totalDebit)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-emerald-800 text-sm whitespace-nowrap">
                  {formatRupiah(totalKredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
