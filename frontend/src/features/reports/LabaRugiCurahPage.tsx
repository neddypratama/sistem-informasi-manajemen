import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel, exportToPdf } from '../../lib/export-utils';
import {
  Wheat,
  Calendar,
  TrendingUp,
  TrendingDown,
  Boxes,
  Scale,
  Sparkles,
} from 'lucide-react';

export const LabaRugiCurahPage: React.FC = () => {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: curahData, isLoading } = useQuery({
    queryKey: ['labaRugiCurah', startDate, endDate],
    queryFn: async () => {
      const res: any = await apiClient.get(
        `/reports/laba-rugi/curah?startDate=${startDate}&endDate=${endDate}`
      );
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

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const penjualan = curahData?.penjualanCurah || 0;
  const hpp = curahData?.hppCurah || 0;
  const labaKotor = curahData?.labaKotorCurah || 0;
  const marginCurah = curahData?.marginCurah || 0;
  const qtyTerjual = curahData?.qtyTerjualKg || 0;
  const stokFisik = curahData?.stokFisikTotalCurah || { totalQtyKg: 0, totalNilaiRupiah: 0 };
  const rincian = curahData?.rincianBarang || [];

  const handleExportExcel = () => {
    if (!curahData) return;

    const dataRows = rincian.map((item: any) => ({
      name: item.name,
      qtyTerjual: Number(item.qtyTerjual || 0),
      penjualan: Number(item.penjualan || 0),
      hpp: Number(item.hpp || 0),
      labaKotor: Number(item.labaKotor || 0),
      margin: `${Number(item.margin || 0).toFixed(2)}%`,
      stokFisikQty: Number(item.stokFisikQty || 0),
      stokFisikNilai: Number(item.stokFisikNilai || 0),
    }));

    exportToExcel({
      filename: `Laba_Rugi_Curah_${startDate}_sd_${endDate}`,
      sheetName: 'Laba Rugi Curah',
      title: `LAPORAN LABA RUGI & MONITORING STOK CURAH (${startDate} s/d ${endDate})`,
      columns: [
        { header: 'No', key: '_index', width: 8 },
        { header: 'Nama Komoditas Curah', key: 'name', width: 28 },
        { header: 'Vol Terjual (Kg)', key: 'qtyTerjual', width: 18 },
        { header: 'Penjualan (Rp)', key: 'penjualan', width: 20 },
        { header: 'HPP (Rp)', key: 'hpp', width: 20 },
        { header: 'Laba Kotor (Rp)', key: 'labaKotor', width: 20 },
        { header: 'Margin (%)', key: 'margin', width: 14 },
        { header: 'Stok Fisik (Kg)', key: 'stokFisikQty', width: 18 },
        { header: 'Nilai Stok (Rp)', key: 'stokFisikNilai', width: 20 },
      ],
      data: dataRows,
    });
  };

  const handleExportPdf = () => {
    if (!curahData) return;

    const pdfData = rincian.map((item: any) => ({
      name: item.name,
      qtyTerjual: `${formatNumber(item.qtyTerjual || 0)} Kg`,
      penjualan: formatRupiah(item.penjualan || 0),
      hpp: formatRupiah(item.hpp || 0),
      labaKotor: formatRupiah(item.labaKotor || 0),
      margin: `${Number(item.margin || 0).toFixed(1)}%`,
      stokFisik: `${formatNumber(item.stokFisikQty || 0)} Kg (${formatRupiah(item.stokFisikNilai || 0)})`,
    }));

    exportToPdf({
      filename: `Laba_Rugi_Curah_${startDate}_sd_${endDate}`,
      title: 'Laporan Laba Rugi Curah & Stok Gudang',
      subtitle: 'Analisis Margin Penjualan vs HPP dan Fisik Stok Pakan Curah',
      period: `${startDate} s/d ${endDate}`,
      orientation: 'landscape',
      columns: [
        { header: 'No', key: '_index', align: 'center' },
        { header: 'Komoditas Curah', key: 'name', align: 'left' },
        { header: 'Vol Terjual', key: 'qtyTerjual', align: 'right' },
        { header: 'Penjualan (Rp)', key: 'penjualan', align: 'right' },
        { header: 'HPP (Rp)', key: 'hpp', align: 'right' },
        { header: 'Laba Kotor (Rp)', key: 'labaKotor', align: 'right' },
        { header: 'Margin', key: 'margin', align: 'center' },
        { header: 'Stok Gudang (Kg & Rp)', key: 'stokFisik', align: 'right' },
      ],
      data: pdfData,
      footers: [
        [
          '',
          'TOTAL KESELURUHAN',
          `${formatNumber(qtyTerjual)} Kg`,
          formatRupiah(penjualan),
          formatRupiah(hpp),
          formatRupiah(labaKotor),
          `${marginCurah.toFixed(1)}%`,
          `${formatNumber(stokFisik.totalQtyKg)} Kg (${formatRupiah(stokFisik.totalNilaiRupiah)})`,
        ],
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Date Range Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2">
            <Wheat className="w-7 h-7 text-amber-600" />
            <span>Laporan Laba Rugi Curah & Monitoring Stok Curah</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Analisis margin bruto komoditas pakan curah (Jagung, Katul, Kebi, Sekam) & total fisik stok gudang
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-2 text-xs">
            <Calendar className="w-4 h-4 text-amber-600 ml-1" />
            <span className="font-semibold text-slate-600">Periode:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <span className="text-slate-400 font-bold">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <ExportButtonGroup
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Penjualan Curah</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono mt-2">
            {isLoading ? '...' : formatRupiah(penjualan)}
          </p>
          <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-amber-600" /> Vol: {formatNumber(qtyTerjual)} Kg
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">HPP Pakan Curah</span>
            <TrendingDown className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-800 font-mono mt-2">
            {isLoading ? '...' : formatRupiah(hpp)}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Akumulasi modal bahan curah</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Laba Kotor Curah</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 font-mono mt-2">
            {isLoading ? '...' : formatRupiah(labaKotor)}
          </p>
          <span className="text-xs font-semibold text-emerald-600 mt-1 block">
            Margin: {marginCurah}%
          </span>
        </div>

        <div className="bg-gradient-to-br from-amber-600 to-amber-800 p-5 rounded-2xl text-white shadow-md">
          <div className="flex items-center justify-between text-amber-200">
            <span className="text-xs font-bold uppercase tracking-wider">Stok Fisik Total Curah</span>
            <Boxes className="w-4 h-4 text-amber-200" />
          </div>
          <p className="text-2xl font-black font-mono mt-2">
            {isLoading ? '...' : `${formatNumber(stokFisik.totalQtyKg)} Kg`}
          </p>
          <span className="text-xs text-amber-100 mt-1 block">
            Estimasi Nilai: {formatRupiah(stokFisik.totalNilaiRupiah)}
          </span>
        </div>
      </div>

      {/* Rincian Per Barang Curah Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Wheat className="w-5 h-5 text-amber-600" />
              <span>Rincian Laba Kotor Per Jenis Barang Curah</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tabel detail Jagung Giling, Jagung OC, Katul A1, Katul A2, Kebi, Karak, dll.
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-50 text-amber-800 font-semibold text-xs rounded-full border border-amber-200">
            Khusus Stok & Laba Curah
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="p-4 w-12 text-center">No</th>
                <th className="p-4">Nama Barang Curah</th>
                <th className="p-4 text-right">Volume Jual (Kg)</th>
                <th className="p-4 text-right">Penjualan (Rp)</th>
                <th className="p-4 text-right">HPP Bahan (Rp)</th>
                <th className="p-4 text-right">Laba Bruto (Rp)</th>
                <th className="p-4 text-center w-28">Margin (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    Menghitung kalkulasi data bahan curah...
                  </td>
                </tr>
              ) : rincian.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    Tidak ada transaksi curah pada periode ini.
                  </td>
                </tr>
              ) : (
                rincian.map((item: any, i: number) => {
                  return (
                    <tr key={i} className="hover:bg-amber-50/30 transition-colors">
                      <td className="p-4 text-center font-mono text-slate-400 text-xs">{i + 1}</td>
                      <td className="p-4 font-bold text-slate-800">
                        {item.barang}
                      </td>
                      <td className="p-4 text-right font-mono font-medium text-slate-600">
                        {formatNumber(item.qtyKg)}
                      </td>
                      <td className="p-4 text-right font-mono font-medium text-slate-800">
                        {formatRupiah(item.penjualan)}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-500">
                        {formatRupiah(item.hpp)}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-700">
                        {formatRupiah(item.labaKotor)}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            item.marginPersen >= 8
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.marginPersen > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.marginPersen}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-sm text-slate-900">
              <tr>
                <td className="p-4 text-center">Σ</td>
                <td className="p-4">TOTAL CURAH</td>
                <td className="p-4 text-right font-mono text-slate-700">{formatNumber(qtyTerjual)} Kg</td>
                <td className="p-4 text-right font-mono text-amber-800">{formatRupiah(penjualan)}</td>
                <td className="p-4 text-right font-mono text-slate-600">{formatRupiah(hpp)}</td>
                <td className="p-4 text-right font-mono text-emerald-800">{formatRupiah(labaKotor)}</td>
                <td className="p-4 text-center font-mono font-bold text-emerald-700">{marginCurah}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
export default LabaRugiCurahPage;
