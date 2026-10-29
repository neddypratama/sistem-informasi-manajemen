import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel, exportToPdf } from '../../lib/export-utils';
import {
  FileSpreadsheet,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Layers,
  ArrowUpRight,
  Coins,
  Receipt,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Wheat,
} from 'lucide-react';

export const LabaRugiPage: React.FC = () => {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [expandedCommodities, setExpandedCommodities] = useState<Record<string, boolean>>({});
  const [isBebanCardOpen, setIsBebanCardOpen] = useState(true);
  const [isPendapatanCardOpen, setIsPendapatanCardOpen] = useState(true);
  const [expandedBebanGroups, setExpandedBebanGroups] = useState<Record<string, boolean>>({});
  const [expandedPendapatanGroups, setExpandedPendapatanGroups] = useState<Record<string, boolean>>({});

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['labaRugi', startDate, endDate],
    queryFn: async () => {
      const res: any = await apiClient.get(`/reports/laba-rugi?startDate=${startDate}&endDate=${endDate}`);
      return res.data;
    },
  });

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const totalPendapatan = reportData?.totalPendapatan || 0;
  const totalHpp = reportData?.totalHpp || 0;
  const labaKotor = reportData?.labaKotor || 0;
  const marginKotorPersen = reportData?.marginKotorPersen || 0;
  const bebanOperasional = reportData?.bebanOperasional || 0;
  const totalPendapatanLain = reportData?.totalPendapatanLain || 0;
  const labaBersih = reportData?.labaBersih || 0;
  const perKomoditas = reportData?.perKomoditas || [];
  const bebanGroups = reportData?.bebanGroups || [];
  const pendapatanLainGroups = reportData?.pendapatanLainGroups || [];

  const toggleCommodity = (key: string) => {
    setExpandedCommodities((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const expandAllCommodities = () => {
    const all: Record<string, boolean> = {};
    perKomoditas.forEach((c: any) => {
      all[c.key] = true;
    });
    setExpandedCommodities(all);
  };

  const collapseAllCommodities = () => {
    setExpandedCommodities({});
  };

  const toggleBebanGroup = (group: string) => {
    setExpandedBebanGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const expandAllBeban = () => {
    const all: Record<string, boolean> = {};
    bebanGroups.forEach((g: any) => {
      all[g.group] = true;
    });
    setExpandedBebanGroups(all);
  };

  const collapseAllBeban = () => {
    setExpandedBebanGroups({});
  };

  const togglePendapatanGroup = (group: string) => {
    setExpandedPendapatanGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const expandAllPendapatan = () => {
    const all: Record<string, boolean> = {};
    pendapatanLainGroups.forEach((g: any) => {
      all[g.group] = true;
    });
    setExpandedPendapatanGroups(all);
  };

  const collapseAllPendapatan = () => {
    setExpandedPendapatanGroups({});
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    const dataRows = perKomoditas.map((c: any) => ({
      name: c.name,
      penjualan: c.penjualan || 0,
      hpp: c.hpp || 0,
      labaKotor: c.labaKotor || 0,
      margin: `${Number(c.margin || 0).toFixed(2)}%`,
    }));

    exportToExcel({
      filename: `Laba_Rugi_Komoditas_${startDate}_sd_${endDate}`,
      sheetName: 'Laba Rugi',
      title: `LAPORAN LABA RUGI KOMODITAS (${startDate} s/d ${endDate})`,
      columns: [
        { header: 'No', key: '_index', width: 8 },
        { header: 'Komoditas Usaha', key: 'name', width: 30 },
        { header: 'Penjualan (Rp)', key: 'penjualan', width: 22 },
        { header: 'HPP (Rp)', key: 'hpp', width: 22 },
        { header: 'Laba Kotor (Rp)', key: 'labaKotor', width: 22 },
        { header: 'Margin (%)', key: 'margin', width: 14 },
      ],
      data: dataRows,
    });
  };

  const handleExportPdf = () => {
    if (!reportData) return;

    const pdfData = perKomoditas.map((c: any) => ({
      name: c.name,
      penjualan: formatRupiah(c.penjualan || 0),
      hpp: formatRupiah(c.hpp || 0),
      labaKotor: formatRupiah(c.labaKotor || 0),
      margin: `${Number(c.margin || 0).toFixed(2)}%`,
    }));

    exportToPdf({
      filename: `Laba_Rugi_Komoditas_${startDate}_sd_${endDate}`,
      title: 'Laporan Laba Rugi Komparasi Per Komoditas',
      subtitle: 'Breakdown Penjualan, HPP, Margin Kotor Komoditas, Beban & Laba Bersih',
      period: `${startDate} s/d ${endDate}`,
      columns: [
        { header: 'No', key: '_index', align: 'center' },
        { header: 'Komoditas Usaha', key: 'name', align: 'left' },
        { header: 'Penjualan (Rp)', key: 'penjualan', align: 'right' },
        { header: 'HPP (Rp)', key: 'hpp', align: 'right' },
        { header: 'Laba Kotor (Rp)', key: 'labaKotor', align: 'right' },
        { header: 'Margin', key: 'margin', align: 'center' },
      ],
      data: pdfData,
      footers: [
        ['', 'TOTAL PENJUALAN & HPP', formatRupiah(totalPendapatan), formatRupiah(totalHpp), formatRupiah(labaKotor), `${marginKotorPersen.toFixed(1)}%`],
        ['', 'BEBAN OPERASIONAL', '', '', `(${formatRupiah(bebanOperasional)})`, ''],
        ['', 'PENDAPATAN LAIN', '', '', formatRupiah(totalPendapatanLain), ''],
        ['', 'LABA BERSIH BERJALAN', '', '', formatRupiah(labaBersih), ''],
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Date Range Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2">
            <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
            <span>Laporan Laba Rugi Komparasi Per Komoditas</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Breakdown Laba Kotor Komoditas Usaha (Non-Curah): Penjualan vs HPP Telur, Pakan Pabrikan, Pakan Kucing, Obat, & Tray
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/laporan-curah"
            className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
            title="Pakan Curah memiliki modul laporan tersendiri"
          >
            <Wheat className="w-4 h-4 text-amber-600" />
            <span>Laba Rugi Pakan Curah</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>

          {/* Date Filter */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-2 text-xs">
            <Calendar className="w-4 h-4 text-emerald-600 ml-1" />
            <span className="font-semibold text-slate-600">Periode:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span className="text-slate-400 font-bold">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <ExportButtonGroup
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
          />
        </div>
      </div>

      {/* KPI Cards (2 Baris: 3 kolom per baris) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Penjualan Komoditas</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 font-mono mt-2">
            {isLoading ? '...' : formatRupiah(totalPendapatan)}
          </p>
          <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" /> 9 Komoditas Usaha (Non-Curah)
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total HPP (FIFO)</span>
            <TrendingDown className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-extrabold text-amber-900 font-mono mt-2">
            {isLoading ? '...' : formatRupiah(totalHpp)}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Beban Pokok Penjualan</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Laba Kotor Komoditas</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-emerald-700 font-mono mt-2">
            {isLoading ? '...' : formatRupiah(labaKotor)}
          </p>
          <span className="text-xs font-semibold text-emerald-600 mt-1 block">
            Margin: {marginKotorPersen}% dari Omzet
          </span>
        </div>

        <Link
          to="/beban"
          className="bg-white p-5 rounded-2xl border border-rose-200/80 shadow-sm hover:border-rose-400 hover:shadow-md transition-all group block"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Total Beban Operasional</span>
            <Receipt className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-xl font-extrabold text-rose-800 font-mono mt-2">
            {isLoading ? '...' : `-${formatRupiah(bebanOperasional)}`}
          </p>
          <span className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-semibold">
            Gaji, BBM & Operasional →
          </span>
        </Link>

        <Link
          to="/pendapatan-lain"
          className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all group block"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Pendapatan Lainnya</span>
            <Coins className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-xl font-extrabold text-emerald-800 font-mono mt-2">
            {isLoading ? '...' : `+${formatRupiah(totalPendapatanLain)}`}
          </p>
          <span className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-semibold">
            Non-Komoditas (LNY) →
          </span>
        </Link>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-5 rounded-2xl text-white shadow-md">
          <div className="flex items-center justify-between text-emerald-200">
            <span className="text-xs font-bold uppercase tracking-wider">Laba Bersih Usaha</span>
            <PieChart className="w-4 h-4 text-emerald-200" />
          </div>
          <p className="text-xl font-black font-mono mt-2">
            {isLoading ? '...' : formatRupiah(labaBersih)}
          </p>
          <span className="text-[11px] text-emerald-100 mt-1 block leading-tight">
            Laba Kotor - Beban + Pendapatan Lain
          </span>
        </div>
      </div>

      {/* Ringkasan Beban & Pendapatan Konsolidasi */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
          <span className="text-slate-400 font-bold uppercase block text-[10px]">Total Penerimaan Usaha</span>
          <p className="text-base font-black font-mono text-emerald-700 mt-1">
            {isLoading ? '...' : formatRupiah(totalPendapatan + totalPendapatanLain)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Omzet Komoditas + Pendapatan Lain</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
          <span className="text-slate-400 font-bold uppercase block text-[10px]">Total Keseluruhan Beban (Beban Usaha)</span>
          <p className="text-base font-black font-mono text-rose-700 mt-1">
            {isLoading ? '...' : formatRupiah(totalHpp + bebanOperasional)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Total HPP ({formatRupiah(totalHpp)}) + Beban ({formatRupiah(bebanOperasional)})</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200">
          <span className="text-emerald-700 font-bold uppercase block text-[10px]">Laba Bersih Bersih Setelah Beban</span>
          <p className="text-base font-black font-mono text-emerald-800 mt-1">
            {isLoading ? '...' : formatRupiah(labaBersih)}
          </p>
          <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">Laba Riil Siap Distribusi</p>
        </div>
      </div>

      {/* Per-Commodity Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>Rincian Laba Kotor Per Komoditas (Penjualan - HPP)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik komoditas untuk melihat rincian barang, volume penjualan, dan HPP satuan per produk
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAllCommodities}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200/80 transition-all"
            >
              <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Buka Semua</span>
            </button>
            <button
              onClick={collapseAllCommodities}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200/80 transition-all"
            >
              <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Tutup Semua</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="p-4 w-12 text-center"></th>
                <th className="p-4">Komoditas Usaha</th>
                <th className="p-4 text-right">Penjualan (Rp)</th>
                <th className="p-4 text-right">HPP FIFO (Rp)</th>
                <th className="p-4 text-right">Laba Kotor (Rp)</th>
                <th className="p-4 text-center w-36">Gross Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    Mengkalkulasi buku besar multi-leg komoditas...
                  </td>
                </tr>
              ) : perKomoditas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    Tidak ada transaksi tercatat pada rentang tanggal ini.
                  </td>
                </tr>
              ) : (
                perKomoditas.map((row: any, i: number) => {
                  const isPositive = row.labaKotor >= 0;
                  const isExpanded = expandedCommodities[row.key] || false;
                  return (
                    <React.Fragment key={row.key || i}>
                      <tr
                        onClick={() => toggleCommodity(row.key)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer select-none group"
                      >
                        <td className="p-4 text-center text-slate-400">
                          <span className="inline-flex items-center justify-center p-1 rounded-md group-hover:bg-slate-200/70 transition-colors">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-emerald-600 font-bold" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
                            )}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{row.komoditas}</span>
                            <span className="text-[11px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
                              {row.items?.length || 0} barang
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono font-medium text-slate-700">
                          {formatRupiah(row.penjualan)}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-500">
                          {formatRupiah(row.hpp)}
                        </td>
                        <td
                          className={`p-4 text-right font-mono font-bold ${
                            isPositive ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {formatRupiah(row.labaKotor)}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                row.marginPersen >= 10
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : row.marginPersen > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {row.marginPersen}%
                            </span>
                            <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full ${
                                  row.marginPersen >= 10
                                  ? 'bg-emerald-500'
                                  : row.marginPersen > 0
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, row.marginPersen))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Detail Sub-Row Rincian Barang (Expandable seperti Laporan Aset) */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-200/80">
                          <td colSpan={6} className="p-0">
                            <div className="py-3 px-4 sm:px-10">
                              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                                <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                                  <span>Rincian Barang Komoditas: {row.komoditas}</span>
                                  <span>{row.items?.length || 0} Barang Terdaftar</span>
                                </div>
                                <table className="w-full text-xs">
                                  <thead className="bg-slate-50/40 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <tr>
                                      <th className="py-2.5 px-4 text-left">Nama Barang</th>
                                      <th className="py-2.5 px-3 text-right">Volume Terjual</th>
                                      <th className="py-2.5 px-3 text-right">Penjualan (Rp)</th>
                                      <th className="py-2.5 px-3 text-right">HPP (Rp)</th>
                                      <th className="py-2.5 px-3 text-right">Laba Kotor (Rp)</th>
                                      <th className="py-2.5 px-4 text-center w-28">Margin</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {!row.items || row.items.length === 0 ? (
                                      <tr>
                                        <td colSpan={6} className="py-4 text-center text-slate-400 text-xs">
                                          Tidak ada catatan transaksi barang pada periode ini.
                                        </td>
                                      </tr>
                                    ) : (
                                      row.items.map((it: any, idx: number) => {
                                        const isPositiveItem = it.labaKotor >= 0;
                                        return (
                                          <tr key={it.barangId || idx} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-2.5 px-4 font-medium text-slate-800">
                                              <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                                <span>{it.barang}</span>
                                              </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                              {it.qty ? Number(it.qty).toLocaleString('id-ID') : 0} {it.satuan || 'Kg'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                                              {formatRupiah(it.penjualan)}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                                              {formatRupiah(it.hpp)}
                                            </td>
                                            <td
                                              className={`py-2.5 px-3 text-right font-mono font-bold ${
                                                isPositiveItem ? 'text-emerald-700' : 'text-rose-600'
                                              }`}
                                            >
                                              {formatRupiah(it.labaKotor)}
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                              <span
                                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                  it.marginPersen >= 10
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : it.marginPersen > 0
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-rose-100 text-rose-800'
                                                }`}
                                              >
                                                {it.marginPersen}%
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })
                                    )}
                                  </tbody>
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
            <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-sm text-slate-900">
              <tr>
                <td className="p-4 text-center">Σ</td>
                <td className="p-4">TOTAL KESELURUHAN</td>
                <td className="p-4 text-right font-mono text-emerald-800">{formatRupiah(totalPendapatan)}</td>
                <td className="p-4 text-right font-mono text-slate-600">{formatRupiah(totalHpp)}</td>
                <td className="p-4 text-right font-mono text-emerald-800">{formatRupiah(labaKotor)}</td>
                <td className="p-4 text-center font-mono font-bold text-emerald-700">{marginKotorPersen}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 2-Kolom Split: Rincian Beban Operasional vs Rincian Pendapatan Lain-Lain (dengan Sistem Buka & Tutup seperti Neraca Saldo) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Kolom 1: Rincian Beban Operasional Usaha */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Card Header dengan Toggle & Buka/Tutup Semua */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-base">Rincian Beban Operasional</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Biaya produksi, gaji, armada, kantor & penyusutan</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-rose-600 font-mono bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                Total: {formatRupiah(bebanOperasional)}
              </span>

              {/* Buka Semua / Tutup Semua Kontrol seperti Neraca Saldo */}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={expandAllBeban}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors flex items-center gap-1"
                  title="Buka semua rincian akun beban"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Buka Semua</span>
                </button>
                <button
                  type="button"
                  onClick={collapseAllBeban}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors flex items-center gap-1"
                  title="Tutup semua rincian akun beban"
                >
                  <Minimize2 className="w-3 h-3" />
                  <span>Tutup Semua</span>
                </button>
              </div>

              {/* Toggle Card Body Open/Close */}
              <button
                type="button"
                onClick={() => setIsBebanCardOpen(!isBebanCardOpen)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
                title={isBebanCardOpen ? 'Tutup panel beban' : 'Buka panel beban'}
              >
                {isBebanCardOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* Table Content (Collapsible) */}
          {isBebanCardOpen && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3">Grup & Akun Beban</th>
                    <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                    <th className="py-2.5 px-3 text-right w-24">Proporsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Memuat data beban operasional...
                      </td>
                    </tr>
                  ) : bebanGroups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Tidak ada catatan beban pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    bebanGroups.map((grp: any, gIdx: number) => {
                      const isExpanded = Boolean(expandedBebanGroups[grp.group]);
                      const grpProporsi =
                        bebanOperasional > 0 ? ((grp.total / bebanOperasional) * 100).toFixed(1) : '0';

                      return (
                        <React.Fragment key={grp.group}>
                          {/* Group Header Row (Klik untuk buka/tutup seperti di Neraca Saldo) */}
                          <tr
                            onClick={() => toggleBebanGroup(grp.group)}
                            className="bg-white hover:bg-rose-50/40 cursor-pointer transition-colors border-t border-slate-100 font-semibold text-slate-800"
                          >
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {gIdx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-rose-600" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </span>
                                <span className="font-bold text-slate-900">{grp.group}</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({grp.details?.length || 0} akun)
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                              {formatRupiah(grp.total)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 text-[10px] font-bold">
                                {grpProporsi}%
                              </span>
                            </td>
                          </tr>

                          {/* Detail Sub-Rows under this Group */}
                          {isExpanded &&
                            grp.details?.map((item: any, dIdx: number) => (
                              <tr
                                key={item.kategoriId || dIdx}
                                className="bg-slate-50/60 hover:bg-slate-100/70 transition-colors text-slate-600"
                              >
                                <td className="py-2 px-3 text-center text-slate-300 font-mono text-[10px]">
                                  {gIdx + 1}.{dIdx + 1}
                                </td>
                                <td className="py-2 px-3 pl-8">
                                  <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
                                    <span className="text-slate-700 font-medium">{item.nama}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-rose-600 font-medium text-xs">
                                  {formatRupiah(item.total)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-400 text-[11px]">
                                  {item.proporsiBeban}%
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs text-slate-900">
                  <tr>
                    <td className="py-3 px-3 text-center">Σ</td>
                    <td className="py-3 px-3">TOTAL BEBAN OPERASIONAL</td>
                    <td className="py-3 px-3 text-right font-mono text-rose-700 font-extrabold">
                      {formatRupiah(bebanOperasional)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Kolom 2: Rincian Pendapatan Lain-Lain (Non-Komoditas) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Card Header dengan Toggle & Buka/Tutup Semua */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Rincian Pendapatan Lain</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Jasa pengadaan, transport, reject, armada & sak bekas</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-emerald-700 font-mono bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                Total: +{formatRupiah(totalPendapatanLain)}
              </span>

              {/* Buka Semua / Tutup Semua Kontrol seperti Neraca Saldo */}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={expandAllPendapatan}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors flex items-center gap-1"
                  title="Buka semua rincian akun pendapatan lain"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Buka Semua</span>
                </button>
                <button
                  type="button"
                  onClick={collapseAllPendapatan}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors flex items-center gap-1"
                  title="Tutup semua rincian akun pendapatan lain"
                >
                  <Minimize2 className="w-3 h-3" />
                  <span>Tutup Semua</span>
                </button>
              </div>

              {/* Toggle Card Body Open/Close */}
              <button
                type="button"
                onClick={() => setIsPendapatanCardOpen(!isPendapatanCardOpen)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
                title={isPendapatanCardOpen ? 'Tutup panel pendapatan lain' : 'Buka panel pendapatan lain'}
              >
                {isPendapatanCardOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* Table Content (Collapsible) */}
          {isPendapatanCardOpen && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3">Grup & Akun Pendapatan</th>
                    <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                    <th className="py-2.5 px-3 text-right w-24">Proporsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Memuat data pendapatan lain-lain...
                      </td>
                    </tr>
                  ) : pendapatanLainGroups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Tidak ada catatan pendapatan lain-lain pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    pendapatanLainGroups.map((grp: any, gIdx: number) => {
                      const isExpanded = Boolean(expandedPendapatanGroups[grp.group]);
                      const grpProporsi =
                        totalPendapatanLain > 0 ? ((grp.total / totalPendapatanLain) * 100).toFixed(1) : '0';

                      return (
                        <React.Fragment key={grp.group}>
                          {/* Group Header Row (Klik untuk buka/tutup seperti di Neraca Saldo) */}
                          <tr
                            onClick={() => togglePendapatanGroup(grp.group)}
                            className="bg-white hover:bg-emerald-50/40 cursor-pointer transition-colors border-t border-slate-100 font-semibold text-slate-800"
                          >
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {gIdx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </span>
                                <span className="font-bold text-slate-900">{grp.group}</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({grp.details?.length || 0} akun)
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                              +{formatRupiah(grp.total)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                                {grpProporsi}%
                              </span>
                            </td>
                          </tr>

                          {/* Detail Sub-Rows under this Group */}
                          {isExpanded &&
                            grp.details?.map((item: any, dIdx: number) => (
                              <tr
                                key={item.kategoriId || dIdx}
                                className="bg-slate-50/60 hover:bg-slate-100/70 transition-colors text-slate-600"
                              >
                                <td className="py-2 px-3 text-center text-slate-300 font-mono text-[10px]">
                                  {gIdx + 1}.{dIdx + 1}
                                </td>
                                <td className="py-2 px-3 pl-8">
                                  <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                                    <span className="text-slate-700 font-medium">{item.nama}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold text-xs">
                                  +{formatRupiah(item.total)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-400 text-[11px]">
                                  {item.proporsiPendapatan}%
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs text-slate-900">
                  <tr>
                    <td className="py-3 px-3 text-center">Σ</td>
                    <td className="py-3 px-3">TOTAL PENDAPATAN LAIN</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 font-extrabold">
                      +{formatRupiah(totalPendapatanLain)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default LabaRugiPage;
