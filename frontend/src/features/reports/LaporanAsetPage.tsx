import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel, exportToPdf } from '../../lib/export-utils';
import {
  Landmark,
  Calendar,
  Printer,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Coins,
  ShieldCheck,
  RotateCcw,
  Search,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export const LaporanAsetPage: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['laporanAset', startDate, endDate],
    queryFn: async () => {
      let url = '/reports/aset';
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

  const toggleGroup = (grpName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [grpName]: !prev[grpName],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    reportData?.asetGroups?.forEach((g: any) => {
      all[g.group] = true;
    });
    reportData?.liabilitasGroups?.forEach((g: any) => {
      all[g.group] = true;
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

  const totalAset = reportData?.totalAset || 0;
  const totalLiabilitas = reportData?.totalLiabilitas || 0;
  const totalModal = reportData?.totalModal || 0;
  const asetGroups = reportData?.asetGroups || [];
  const liabilitasGroups = reportData?.liabilitasGroups || [];

  const handleExportExcel = () => {
    if (!reportData) return;
    const rows: any[] = [];

    asetGroups.forEach((g: any) => {
      g.details?.forEach((d: any) => {
        rows.push({
          tipe: 'Aset',
          group: g.group,
          code: d.code || '',
          kategori: d.kategori,
          saldo: Number(d.saldo) || 0,
          debit: Number(d.debit) || 0,
          kredit: Number(d.kredit) || 0,
        });
      });
    });

    liabilitasGroups.forEach((g: any) => {
      g.details?.forEach((d: any) => {
        rows.push({
          tipe: 'Liabilitas',
          group: g.group,
          code: d.code || '',
          kategori: d.kategori,
          saldo: Number(d.saldo) || 0,
          debit: Number(d.debit) || 0,
          kredit: Number(d.kredit) || 0,
        });
      });
    });

    exportToExcel({
      filename: `Laporan_Aset_Liabilitas_${startDate || 'Awal'}_sd_${endDate || 'Kini'}`,
      sheetName: 'Neraca Posisi',
      title: `LAPORAN ASET, LIABILITAS, & MODAL BERSIH (${startDate || 'Awal'} s/d ${endDate || 'Kini'})`,
      columns: [
        { header: 'No', key: '_index', width: 8 },
        { header: 'Kategori Akun', key: 'tipe', width: 16 },
        { header: 'Kelompok Akun', key: 'group', width: 26 },
        { header: 'Kode', key: 'code', width: 14 },
        { header: 'Nama Akun / Kategori', key: 'kategori', width: 32 },
        { header: 'Saldo Bersih (Rp)', key: 'saldo', width: 22 },
        { header: 'Debit (Rp)', key: 'debit', width: 20 },
        { header: 'Kredit (Rp)', key: 'kredit', width: 20 },
      ],
      data: rows,
    });
  };

  const handleExportPdf = () => {
    if (!reportData) return;
    const rows: any[] = [];

    asetGroups.forEach((g: any) => {
      g.details?.forEach((d: any) => {
        rows.push({
          tipe: 'Aset',
          code: d.code || '-',
          kategori: d.kategori,
          saldo: formatRupiah(d.saldo || 0),
          debit: formatRupiah(d.debit || 0),
          kredit: formatRupiah(d.kredit || 0),
        });
      });
    });

    liabilitasGroups.forEach((g: any) => {
      g.details?.forEach((d: any) => {
        rows.push({
          tipe: 'Liabilitas',
          code: d.code || '-',
          kategori: d.kategori,
          saldo: formatRupiah(d.saldo || 0),
          debit: formatRupiah(d.debit || 0),
          kredit: formatRupiah(d.kredit || 0),
        });
      });
    });

    exportToPdf({
      filename: `Laporan_Aset_Liabilitas_${startDate || 'Awal'}_sd_${endDate || 'Kini'}`,
      title: 'Laporan Aset, Liabilitas, & Modal Bersih',
      subtitle: 'Neraca Posisi Keuangan Perusahaan',
      period: `${startDate || 'Awal'} s/d ${endDate || 'Kini'}`,
      orientation: 'landscape',
      columns: [
        { header: 'No', key: '_index', align: 'center' },
        { header: 'Tipe', key: 'tipe', align: 'left' },
        { header: 'Kode', key: 'code', align: 'center' },
        { header: 'Nama Akun', key: 'kategori', align: 'left' },
        { header: 'Saldo Bersih (Rp)', key: 'saldo', align: 'right' },
        { header: 'Debit (Rp)', key: 'debit', align: 'right' },
        { header: 'Kredit (Rp)', key: 'kredit', align: 'right' },
      ],
      data: rows,
      footers: [
        ['', 'TOTAL ASET (AKTIVA)', '', '', formatRupiah(totalAset), '', ''],
        ['', 'TOTAL LIABILITAS (KEWAJIBAN)', '', '', formatRupiah(totalLiabilitas), '', ''],
        ['', 'TOTAL MODAL BERSIH (EKUITAS)', '', '', formatRupiah(totalModal), '', ''],
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2.5">
            <Landmark className="w-7 h-7 text-emerald-600" />
            <span>Laporan Aset, Liabilitas, & Modal (Neraca Posisi)</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Ringkasan posisi kekayaan aset lancar/stok, kewajiban liabilitas mitra/bank, dan modal bersih perusahaan
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

      {/* Top 3 KPI Cards: Total Aset, Total Liabilitas, Total Modal (Matching legacy aset.blade.php) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Total Aset (Aktiva)
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-700 font-mono mt-3">
            {isLoading ? '...' : formatRupiah(totalAset)}
          </p>
          <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Kas, Bank, Piutang, & Stok Persediaan
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Total Liabilitas (Kewajiban)
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-rose-700 font-mono mt-3">
            {isLoading ? '...' : formatRupiah(totalLiabilitas)}
          </p>
          <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> Hutang Peternak, Supplier, & Bank
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
              Total Modal Bersih (Ekuitas)
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-blue-700 font-mono mt-3">
            {isLoading ? '...' : formatRupiah(totalModal)}
          </p>
          <span className="text-xs text-blue-600 font-semibold mt-1 block">
            = Total Aset - Total Liabilitas
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kelompok akun atau nama kategori aset/liabilitas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={setPresetAllTime}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                !startDate && !endDate
                  ? 'bg-white text-emerald-700 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Waktu
            </button>
            <button
              onClick={setPresetThisYear}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                startDate.includes('-01-01')
                  ? 'bg-white text-emerald-700 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tahun Ini
            </button>
          </div>

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
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buka Semua</span>
          </button>

          <button
            onClick={collapseAll}
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tutup Semua</span>
          </button>
        </div>
      </div>

      {/* 2-Column Split: Aset per Kelompok vs Liabilitas per Kelompok */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KOLOM 1: ASET */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-emerald-900 flex items-center space-x-2">
                <Coins className="w-5 h-5 text-emerald-600" />
                <span>Rincian Aset (Aktiva) per Kelompok</span>
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-xs">
                {formatRupiah(totalAset)}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-8 text-center text-slate-400 text-xs">Memuat data aset...</div>
              ) : asetGroups.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">Tidak ada data aset.</div>
              ) : (
                asetGroups.map((g: any) => {
                  if (
                    search &&
                    !g.group.toLowerCase().includes(search.toLowerCase()) &&
                    !g.details?.some((d: any) => d.kategori.toLowerCase().includes(search.toLowerCase()))
                  ) {
                    return null;
                  }

                  const isExpanded = expandedGroups[g.group] || Boolean(search);

                  return (
                    <div key={g.group} className="transition-colors">
                      <div
                        onClick={() => toggleGroup(g.group)}
                        className="p-3.5 px-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer select-none text-xs"
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="text-slate-400">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </span>
                          <span className="font-bold text-slate-800">{g.group}</span>
                          <span className="text-[10px] text-slate-400">
                            ({g.details?.length || 0} akun)
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-700">
                          {formatRupiah(g.total)}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="bg-slate-50/70 px-4 py-2 space-y-1.5 border-t border-slate-100 text-xs">
                          {g.details?.map((d: any) => (
                            <div
                              key={d.kategoriId}
                              className="flex items-center justify-between py-1 px-3 rounded-lg hover:bg-white text-[11px]"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                <span className="text-slate-700">{d.kategori}</span>
                                {d.code && (
                                  <span className="text-[9px] font-mono text-slate-400 bg-slate-200/60 px-1 py-0.2 rounded">
                                    {d.code}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-semibold text-emerald-600">
                                {formatRupiah(d.saldo)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-4 bg-emerald-50/50 border-t border-emerald-100 flex items-center justify-between font-bold text-xs text-emerald-900">
            <span>TOTAL SELURUH ASET:</span>
            <span className="font-mono text-sm">{formatRupiah(totalAset)}</span>
          </div>
        </div>

        {/* KOLOM 2: LIABILITAS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-rose-900 flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-rose-600" />
                <span>Rincian Liabilitas (Kewajiban) per Kelompok</span>
              </h3>
              <span className="text-xs font-mono font-bold text-rose-800 bg-white px-2.5 py-1 rounded-lg border border-rose-200 shadow-xs">
                {formatRupiah(totalLiabilitas)}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-8 text-center text-slate-400 text-xs">Memuat data liabilitas...</div>
              ) : liabilitasGroups.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">Tidak ada data liabilitas.</div>
              ) : (
                liabilitasGroups.map((g: any) => {
                  if (
                    search &&
                    !g.group.toLowerCase().includes(search.toLowerCase()) &&
                    !g.details?.some((d: any) => d.kategori.toLowerCase().includes(search.toLowerCase()))
                  ) {
                    return null;
                  }

                  const isExpanded = expandedGroups[g.group] || Boolean(search);

                  return (
                    <div key={g.group} className="transition-colors">
                      <div
                        onClick={() => toggleGroup(g.group)}
                        className="p-3.5 px-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer select-none text-xs"
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="text-slate-400">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-rose-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </span>
                          <span className="font-bold text-slate-800">{g.group}</span>
                          <span className="text-[10px] text-slate-400">
                            ({g.details?.length || 0} akun)
                          </span>
                        </div>
                        <span className="font-mono font-bold text-rose-700">
                          {formatRupiah(g.total)}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="bg-slate-50/70 px-4 py-2 space-y-1.5 border-t border-slate-100 text-xs">
                          {g.details?.map((d: any) => (
                            <div
                              key={d.kategoriId}
                              className="flex items-center justify-between py-1 px-3 rounded-lg hover:bg-white text-[11px]"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                <span className="text-slate-700">{d.kategori}</span>
                                {d.code && (
                                  <span className="text-[9px] font-mono text-slate-400 bg-slate-200/60 px-1 py-0.2 rounded">
                                    {d.code}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-semibold text-rose-600">
                                {formatRupiah(d.saldo)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-4 bg-rose-50/50 border-t border-rose-100 flex items-center justify-between font-bold text-xs text-rose-900">
            <span>TOTAL SELURUH LIABILITAS:</span>
            <span className="font-mono text-sm">{formatRupiah(totalLiabilitas)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
