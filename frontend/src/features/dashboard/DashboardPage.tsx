import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import {
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  ArrowUpRight,
  Banknote,
  CreditCard,
  WalletCards,
  PieChart,
  Layers,
  Activity,
  BookOpen,
  FileSpreadsheet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { IncomeExpenseLineChart } from './IncomeExpenseLineChart';

export const DashboardPage: React.FC = () => {
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['dashboardAnalytics'],
    queryFn: async () => {
      const res: any = await apiClient.get('/reports/dashboard-analytics');
      return res.data;
    },
    staleTime: 60000,
  });

  const fin = analyticsData?.financials || {};
  const perKomoditas = analyticsData?.perKomoditas || [];
  const monthlyTrends = analyticsData?.monthlyTrends || [];
  const topDebitur = analyticsData?.topDebitur || [];
  const topKreditur = analyticsData?.topKreditur || [];
  const stokPerJenis = analyticsData?.stokPerJenis || [];
  const recentTransactions = analyticsData?.recentTransactions || [];

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

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Executive Analyst Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-800/40">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Executive Business Intelligence • Online
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-full text-[11px] font-semibold text-slate-300">
                Tahun Berjalan 2026
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Dashboard Manajemen & Analisis Bisnis
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Konsolidasi metrik keuangan real-time, profitabilitas komoditas (Telur, Pakan, Obat, Tray), perputaran arus kas, eksposur risiko piutang pedagang & hutang peternak.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Link
              to="/penjualan"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all text-xs flex items-center space-x-1.5 active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Kasir Penjualan</span>
            </Link>
            <Link
              to="/jurnal-umum"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition-all text-xs flex items-center space-x-1.5"
            >
              <BookOpen className="w-4 h-4 text-emerald-300" />
              <span>Jurnal Umum</span>
            </Link>
            <Link
              to="/laporan"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition-all text-xs flex items-center space-x-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Laporan Laba Rugi</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top-Level Executive KPI Cards (Financial Health) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Omzet & Gross Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Omzet Penjualan Usaha</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
            {isLoading ? '...' : formatRupiah(fin.totalOmzet)}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Laba Kotor:</span>
            <span className="font-bold text-emerald-700 font-mono">
              {isLoading ? '...' : formatRupiah(fin.labaKotor)} ({fin.marginKotorPersen || 0}%)
            </span>
          </div>
        </div>

        {/* Laba Bersih Usaha (Net Profit) */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm hover:border-emerald-300 transition-all bg-gradient-to-br from-white to-emerald-50/40">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Laba Bersih Usaha (Net Profit)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-800 font-mono tracking-tight">
            {isLoading ? '...' : formatRupiah(fin.labaBersih)}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-emerald-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Beban Operasional:</span>
            <span className="font-bold text-rose-700 font-mono">
              -{isLoading ? '...' : formatRupiah(fin.bebanOperasional)}
            </span>
          </div>
        </div>

        {/* Likuiditas Kas & Bank */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Likuiditas Kas & Bank</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
            {isLoading ? '...' : formatRupiah(fin.totalKasBank)}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Ketersediaan Dana:</span>
            <Link to="/kas" className="font-bold text-teal-700 hover:underline">
              8 Akun Kas & Bank →
            </Link>
          </div>
        </div>

        {/* Valuasi Persediaan Gudang */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Valuasi Stok Fisik FIFO</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
            {isLoading ? '...' : formatRupiah(fin.totalNilaiStok)}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Status Minimum:</span>
            <span className={`font-bold font-mono ${fin.itemsDibawahMinimum > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
              {fin.itemsDibawahMinimum || 0} item perlu restock
            </span>
          </div>
        </div>
      </div>

      {/* 3. Working Capital & Risk Exposure (Piutang vs Hutang) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Piutang Usaha (Debitur Pedagang) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <WalletCards className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Piutang Usaha & Bon Pedagang</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Total hak tagih penjualan tempo: {formatRupiah(fin.totalPiutang)}</p>
            </div>
            <Link
              to="/piutang"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
            >
              <span>Kelola Semua</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top 5 Mitra Piutang Terbesar</p>
            {topDebitur.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">Tidak ada saldo piutang aktif.</p>
            ) : (
              topDebitur.map((d: any, idx: number) => (
                <div key={d.id || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">{d.name}</p>
                      <span className="text-[10px] text-slate-400">{d.type} {d.phone ? `• ${d.phone}` : ''}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono font-extrabold text-blue-700">
                    {formatRupiah(d.saldoPiutang)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Hutang Usaha (Kreditur Peternak & Supplier) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-sm">Hutang Usaha & Bon Peternak</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Total kewajiban pembayaran tempo: {formatRupiah(fin.totalHutang)}</p>
            </div>
            <Link
              to="/hutang"
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
            >
              <span>Kelola Semua</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top 5 Mitra Hutang Terbesar</p>
            {topKreditur.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">Tidak ada saldo hutang aktif.</p>
            ) : (
              topKreditur.map((k: any, idx: number) => (
                <div key={k.id || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">{k.name}</p>
                      <span className="text-[10px] text-slate-400">{k.type} {k.phone ? `• ${k.phone}` : ''}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono font-extrabold text-rose-700">
                    {formatRupiah(k.saldoHutang)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. Analisis Performa Komoditas (Penjualan vs HPP vs Laba Kotor) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>Analisis Laba Kotor Per Komoditas Bisnis (Penjualan - HPP FIFO)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tinjauan kontribusi profitabilitas komoditas telur, pakan sentrat, pakan curah, obat ternak, dan tray
            </p>
          </div>
          <Link
            to="/laporan"
            className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Laporan Lengkap</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="p-4 w-12 text-center">No</th>
                <th className="p-4">Komoditas Usaha</th>
                <th className="p-4 text-right">Penjualan Bruto</th>
                <th className="p-4 text-right">Beban Pokok (HPP)</th>
                <th className="p-4 text-right">Laba Kotor</th>
                <th className="p-4 text-center w-36">Gross Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {perKomoditas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                    Memuat ringkasan komoditas...
                  </td>
                </tr>
              ) : (
                perKomoditas.map((row: any, i: number) => {
                  const isPositive = row.labaKotor >= 0;
                  return (
                    <tr key={row.key || i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-center font-mono text-slate-400">{i + 1}</td>
                      <td className="p-4 font-bold font-sans text-slate-800 text-sm">
                        {row.komoditas}
                      </td>
                      <td className="p-4 text-right text-slate-900 font-semibold">
                        {formatRupiah(row.penjualan)}
                      </td>
                      <td className="p-4 text-right text-amber-800">
                        {formatRupiah(row.hpp)}
                      </td>
                      <td className={`p-4 text-right font-black ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatRupiah(row.labaKotor)}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                            isPositive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {row.marginPersen}%
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

      {/* 5. Grafik Alur Pendapatan & Pengeluaran (Executive Line Chart) */}
      <IncomeExpenseLineChart data={monthlyTrends} isLoading={isLoading} />

      {/* 6. Distribusi Stok Gudang & Aktivitas Transaksi Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Distribusi Nilai Stok Gudang */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  <span>Distribusi Stok Per Jenis</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Komposisi nilai barang gudang</p>
              </div>
              <Link to="/stok" className="text-xs font-bold text-emerald-600 hover:underline">
                Semua →
              </Link>
            </div>

            <div className="space-y-3 pt-3">
              {stokPerJenis.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Memuat kategori gudang...</p>
              ) : (
                stokPerJenis.map((sj: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{sj.jenis}</p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {Number(sj.totalQty).toLocaleString('id-ID')} unit fisik
                      </span>
                    </div>
                    <div className="text-right font-mono font-bold text-emerald-800">
                      {formatRupiah(sj.totalNilai)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-center">
            <Link
              to="/stok"
              className="text-xs font-bold text-slate-600 hover:text-emerald-700 inline-flex items-center gap-1"
            >
              <span>Buka Manajemen Inventori & FIFO</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Transaksi Operasional Terbaru (Audit Ringkas) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span>Aktivitas Transaksi Terbaru Masuk Sistem</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Log mutasi kasir dan pembukuan komoditas real-time
              </p>
            </div>
            <Link
              to="/logs"
              className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
            >
              <span>Riwayat Lengkap User</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="p-3.5">Invoice</th>
                  <th className="p-3.5">Tanggal</th>
                  <th className="p-3.5">Jenis Transaksi</th>
                  <th className="p-3.5">Pelanggan / Mitra</th>
                  <th className="p-3.5">Metode Bayar</th>
                  <th className="p-3.5 text-right">Nominal Transaksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-mono">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                      Memuat transaksi terbaru...
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80">
                      <td className="p-3.5 font-bold text-slate-900 font-sans">{tx.invoice}</td>
                      <td className="p-3.5 text-slate-500">{formatTanggal(tx.tanggal)}</td>
                      <td className="p-3.5 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans font-semibold text-slate-800">{tx.clientName}</td>
                      <td className="p-3.5 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.paymentMethod === 'TUNAI'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : tx.paymentMethod === 'TRANSFER'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {tx.paymentMethod === 'KREDIT_BON' ? 'HUTANG/BON' : tx.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-900 font-mono">
                        {formatRupiah(tx.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardPage;
