import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { getCurrentMonthRange, getLastMonthRange, getTodayDateString } from '../../lib/date-utils';
import { exportToExcel, formatDateIndo } from '../../lib/export-utils';
import { CommodityTransactionPage } from '../transaksi/CommodityTransactionPage';
import { KonversiBarangPage } from '../inventory/KonversiBarangPage';
import { Pagination } from '../../components/Pagination';
import { useAuthStore } from '../../stores/auth.store';
import { canAccessTab } from '../../lib/tab-permissions';
import {
  Wheat,
  Banknote,
  Building2,
  Wallet,
  ArrowRightLeft,
  Boxes,
  FileSpreadsheet,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowDownLeft,
  Loader2,
} from 'lucide-react';

export const CurahPakPriPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'TRANSAKSI' | 'KAS_AUDIT' | 'KONVERSI'>('TRANSAKSI');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [kasAuditTab, setKasAuditTab] = useState<'TUNAI' | 'TRANSFER' | 'BELANJA'>('TUNAI');
  const [searchKas, setSearchKas] = useState<string>('');
  const [kasPage, setKasPage] = useState<number>(1);
  const [kasLimit, setKasLimit] = useState<number>(25);
  const user = useAuthStore((s) => s.user);

  const canTransaksi = canAccessTab(user, 'CURAH_TRANSAKSI');
  const canKasAudit = canAccessTab(user, 'CURAH_KAS_AUDIT');
  const canKonversi = canAccessTab(user, 'CURAH_KONVERSI');

  const canSubTunai = canAccessTab(user, 'CURAH_SUB_TUNAI');
  const canSubTransfer = canAccessTab(user, 'CURAH_SUB_TRANSFER');
  const canSubBelanja = canAccessTab(user, 'CURAH_SUB_BELANJA');

  // Auto-switch to accessible tab if current tab is restricted
  useEffect(() => {
    if (activeTab === 'TRANSAKSI' && !canTransaksi) {
      if (canKasAudit) setActiveTab('KAS_AUDIT');
      else if (canKonversi) setActiveTab('KONVERSI');
    } else if (activeTab === 'KAS_AUDIT' && !canKasAudit) {
      if (canTransaksi) setActiveTab('TRANSAKSI');
      else if (canKonversi) setActiveTab('KONVERSI');
    } else if (activeTab === 'KONVERSI' && !canKonversi) {
      if (canTransaksi) setActiveTab('TRANSAKSI');
      else if (canKasAudit) setActiveTab('KAS_AUDIT');
    }
  }, [user, activeTab, canTransaksi, canKasAudit, canKonversi]);

  useEffect(() => {
    if (kasAuditTab === 'TUNAI' && !canSubTunai) {
      if (canSubTransfer) setKasAuditTab('TRANSFER');
      else if (canSubBelanja) setKasAuditTab('BELANJA');
    } else if (kasAuditTab === 'TRANSFER' && !canSubTransfer) {
      if (canSubTunai) setKasAuditTab('TUNAI');
      else if (canSubBelanja) setKasAuditTab('BELANJA');
    } else if (kasAuditTab === 'BELANJA' && !canSubBelanja) {
      if (canSubTunai) setKasAuditTab('TUNAI');
      else if (canSubTransfer) setKasAuditTab('TRANSFER');
    }
  }, [user, kasAuditTab, canSubTunai, canSubTransfer, canSubBelanja]);

  // Fetch Summary Khusus Bpk. Supriyadi (Curah)
  const {
    data: summaryData,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['curahSummary', startDate, endDate],
    queryFn: async () => {
      let url = '/transaksi/curah/summary';
      if (startDate || endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
      }
      const res: any = await apiClient.get(url);
      return res.data || res;
    },
  });

  // Fetch Transaksi Tunai Curah (dengan Client Pak Pri / Bp. Supriyadi)
  const { data: tunaiRes, isLoading: loadingTunai } = useQuery({
    queryKey: ['transaksiCurahTunai', startDate, endDate, kasPage, kasLimit, searchKas],
    queryFn: async () => {
      let url = `/transaksi?clientId=241&paymentMethod=TUNAI&limit=${kasLimit}&page=${kasPage}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (searchKas) url += `&search=${encodeURIComponent(searchKas)}`;
      const res: any = await apiClient.get(url);
      return res.data || res;
    },
    enabled: activeTab === 'KAS_AUDIT' && kasAuditTab === 'TUNAI',
  });

  // Fetch Transaksi Transfer Bank Curah (dengan Client Pak Pri / Bp. Supriyadi)
  const { data: transferRes, isLoading: loadingTransfer } = useQuery({
    queryKey: ['transaksiCurahTransfer', startDate, endDate, kasPage, kasLimit, searchKas],
    queryFn: async () => {
      let url = `/transaksi?clientId=241&paymentMethod=TRANSFER&limit=${kasLimit}&page=${kasPage}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (searchKas) url += `&search=${encodeURIComponent(searchKas)}`;
      const res: any = await apiClient.get(url);
      return res.data || res;
    },
    enabled: activeTab === 'KAS_AUDIT' && kasAuditTab === 'TRANSFER',
  });

  // Fetch Transaksi Pembelian Bahan Baku Curah (dengan Client Pak Pri / Bp. Supriyadi)
  const { data: belanjaRes, isLoading: loadingBelanja } = useQuery({
    queryKey: ['transaksiCurahBelanja', startDate, endDate, kasPage, kasLimit, searchKas],
    queryFn: async () => {
      let url = `/transaksi?clientId=241&type=PEMBELIAN&limit=${kasLimit}&page=${kasPage}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (searchKas) url += `&search=${encodeURIComponent(searchKas)}`;
      const res: any = await apiClient.get(url);
      return res.data || res;
    },
    enabled: activeTab === 'KAS_AUDIT' && kasAuditTab === 'BELANJA',
  });

  useEffect(() => {
    setKasPage(1);
  }, [kasAuditTab, startDate, endDate, searchKas]);

  const currentRes = kasAuditTab === 'TUNAI' ? tunaiRes : kasAuditTab === 'TRANSFER' ? transferRes : belanjaRes;
  const currentLoading = kasAuditTab === 'TUNAI' ? loadingTunai : kasAuditTab === 'TRANSFER' ? loadingTransfer : loadingBelanja;

  const currentItems: any[] = useMemo(() => {
    const raw = currentRes?.items || currentRes?.data || (Array.isArray(currentRes) ? currentRes : []);
    return raw.filter((tx: any) => tx.status !== 'BATAL');
  }, [currentRes]);

  const currentMeta = currentRes?.meta || {
    total: currentItems.length,
    totalPages: 1,
    totalKeseluruhan: currentItems.reduce((acc: number, curr: any) => acc + (Number(curr.total) || 0), 0),
  };

  const pageNominalTotal = useMemo(() => {
    return currentItems.reduce((acc: number, it: any) => acc + Number(it.total || 0), 0);
  }, [currentItems]);

  const pageQtyTotal = useMemo(() => {
    return currentItems.reduce((acc: number, it: any) => {
      const q = (it.details || []).reduce((sum: number, d: any) => sum + Number(d.qty || 0), 0);
      return acc + q;
    }, 0);
  }, [currentItems]);

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

  const handleExportKasAudit = async () => {
    let url = `/transaksi?clientId=241&limit=5000`;
    if (kasAuditTab === 'TUNAI') url += '&paymentMethod=TUNAI';
    else if (kasAuditTab === 'TRANSFER') url += '&paymentMethod=TRANSFER';
    else if (kasAuditTab === 'BELANJA') url += '&type=PEMBELIAN';
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    if (searchKas) url += `&search=${encodeURIComponent(searchKas)}`;

    try {
      const res: any = await apiClient.get(url);
      const allExportItems = (res.data?.items || res.data || res.items || []).filter((tx: any) => tx.status !== 'BATAL');

      const title = `AUDIT KAS PAK PRI (${kasAuditTab}) - ${startDate || 'Awal'} s/d ${endDate || 'Kini'}`;
      const data = allExportItems.map((tx: any) => ({
        invoice: tx.invoice,
        tanggal: formatDateIndo(tx.tanggal),
        mitra: tx.client?.name || 'Bp. Supriyadi',
        tipe: tx.type === 'KAS_MASUK' ? 'Kas Masuk' : tx.type === 'KAS_KELUAR' ? 'Kas Keluar' : tx.type,
        metode: tx.paymentMethod,
        keterangan: tx.keterangan || '-',
        rincian: (tx.details || []).map((d: any) => d.barang?.name || d.kategori?.name || '-').join(', '),
        totalKg: (tx.details || []).reduce((s: number, d: any) => s + Number(d.qty || 0), 0) || 0,
        nominal: Number(tx.total || 0),
        status: tx.status,
      }));

      exportToExcel({
        filename: `Audit_Kas_Pak_Pri_${kasAuditTab}_${startDate || 'Semua'}_sd_${endDate || 'Kini'}`,
        sheetName: `Audit ${kasAuditTab}`,
        title,
        columns: [
          { header: 'No', key: '_index', width: 8 },
          { header: 'Invoice', key: 'invoice', width: 22 },
          { header: 'Tanggal', key: 'tanggal', width: 16 },
          { header: 'Mitra', key: 'mitra', width: 22 },
          { header: 'Tipe', key: 'tipe', width: 16 },
          { header: 'Metode', key: 'metode', width: 14 },
          { header: 'Keterangan', key: 'keterangan', width: 30 },
          { header: 'Rincian', key: 'rincian', width: 30 },
          { header: 'Volume (Kg)', key: 'totalKg', width: 14 },
          { header: 'Total (Rp)', key: 'nominal', width: 20 },
          { header: 'Status', key: 'status', width: 14 },
        ],
        data,
      });
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const mitra = summaryData?.mitraSupriyadi;
  const saldoHutang = Number(mitra?.saldoHutang || 0);
  const saldoPiutang = Number(mitra?.saldoPiutang || 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Clean Page Header (Tanpa banner card berat) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2">
            <Wheat className="w-7 h-7 text-amber-600" />
            <span>Pakan Curah (Pak Pri)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pengelolaan transaksi pakan curah, monitoring kasir (Tunai vs Transfer), dan rekonsiliasi keuangan Bpk. Supriyadi
          </p>
        </div>

        {/* Periode Filter Bar */}
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => {
                const today = getTodayDateString();
                setStartDate(today);
                setEndDate(today);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                startDate === getTodayDateString() && endDate === getTodayDateString()
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => {
                const m = getCurrentMonthRange();
                setStartDate(m.startDate);
                setEndDate(m.endDate);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                startDate === getCurrentMonthRange().startDate && endDate === getCurrentMonthRange().endDate
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => {
                const m = getLastMonthRange();
                setStartDate(m.startDate);
                setEndDate(m.endDate);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                startDate === getLastMonthRange().startDate && endDate === getLastMonthRange().endDate
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Bulan Lalu
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                !startDate && !endDate
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs border-l border-slate-200 pl-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
            />
            <span className="text-slate-400 text-xs">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
            />
            <button
              type="button"
              onClick={() => refetchSummary()}
              title="Muat Ulang"
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Kartu KPI Ringkasan Keuangan & Stok Realtime */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Posisi Saldo Modal / Pinjaman Bp. Supriyadi */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Saldo Rekening Bp. Supriyadi
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {formatRupiah(Math.abs(saldoHutang > 0 ? saldoHutang : saldoPiutang))}
            </div>
            <div className="mt-2 flex items-center space-x-1.5">
              {saldoHutang > 0 ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>Ditalangi Bima Pratama</span>
                </span>
              ) : saldoPiutang > 0 ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Kelebihan / Hak Pak Pri</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700">
                  <span>Lunas Seimbang</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-tight">
              Belanja bahan ditalangi Kas BP dikurangi setoran hasil jual curah.
            </p>
          </div>
        </div>

        {/* KPI 2: Kas Tunai Toko Terkumpul */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Kas Tunai Curah (Laci Toko)
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl md:text-2xl font-black text-emerald-700 tracking-tight">
              {formatRupiah(summaryData?.tunaiMasuk || 0)}
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-600 flex items-center justify-between">
              <span>Uang Fisik Kasir</span>
              <span className="text-[11px] text-emerald-600 font-bold">Siap Dihitung</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-tight">
              Total pembayaran tunai yang diterima kasir atas penjualan pakan curah.
            </p>
          </div>
        </div>

        {/* KPI 3: Transfer Bank Terkumpul */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Transfer Bank Masuk
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl md:text-2xl font-black text-blue-700 tracking-tight">
              {formatRupiah(summaryData?.transferMasuk || 0)}
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-600 flex items-center justify-between">
              <span>Rekening BCA / BRI / BNI</span>
              <span className="text-[11px] text-blue-600 font-bold">Mutasi Bank</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-tight">
              Uang transfer dari pembeli pakan curah ke rekening bank Bima Pratama.
            </p>
          </div>
        </div>

        {/* KPI 4: Stok Fisik & Nilai Gudang Curah */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Stok Gudang Curah Fisik
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl md:text-2xl font-black text-amber-700 tracking-tight">
              {formatNumber(summaryData?.stokFisikTotal?.qtyKg || 0)}{' '}
              <span className="text-sm font-bold text-slate-500">Kg</span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-600 flex items-center justify-between">
              <span>Nilai Modal (HPP):</span>
              <span className="font-bold text-slate-800">
                {formatRupiah(summaryData?.stokFisikTotal?.nilaiRupiah || 0)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-tight">
              Total fisik bahan mentah & hasil racikan pakan curah saat ini di gudang.
            </p>
          </div>
        </div>
      </div>

      {/* Main Tab Bar: Ruang Kerja Terorganisir */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-1.5 flex flex-wrap items-center gap-1.5">
        {canTransaksi && (
          <button
            type="button"
            onClick={() => setActiveTab('TRANSAKSI')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'TRANSAKSI'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Wheat className="w-4 h-4" />
            <span>🛒 Operasional Mbak Pakan (Jual & Beli)</span>
          </button>
        )}

        {canKasAudit && (
          <button
            type="button"
            onClick={() => setActiveTab('KAS_AUDIT')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'KAS_AUDIT'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>💵 Cek Kas: Tunai vs Transfer (Audit Keuangan)</span>
          </button>
        )}

        {canKonversi && (
          <button
            type="button"
            onClick={() => setActiveTab('KONVERSI')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'KONVERSI'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>⚡ Konversi & Racik Pakan (Giling Jagung / Katul)</span>
          </button>
        )}
      </div>

      {/* Tab 1: Operasional Transaksi Mbak Pakan */}
      {activeTab === 'TRANSAKSI' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <CommodityTransactionPage
            commodityKey="pakan"
            title="Transaksi Pakan Curah (Pak Pri)"
            subtitle="Pengelolaan lengkap Pembelian Bahan Mentah Curah, Penjualan Pakan Curah, dan Manajemen Stok Fisik"
            icon={Wheat}
            accentColor="amber"
            jenisIds={[9]}
            isEgg={false}
          />
        </div>
      )}

      {/* Tab 2: Audit Kas: Tunai vs Transfer Bank (Khusus Ayah & Keuangan) */}
      {activeTab === 'KAS_AUDIT' && (
        <div className="space-y-6">
          {/* Header & Sub-Tabs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                  <Banknote className="w-6 h-6 text-emerald-600" />
                  <span>Audit Arus Kas Curah: Tunai vs Transfer Bank</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                  Layar khusus untuk Ayah dan Tim Keuangan mengecek kecocokan fisik uang tunai di laci kasir dan mutasi rekening bank dari bisnis pakan curah.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari invoice, keterangan..."
                    value={searchKas}
                    onChange={(e) => setSearchKas(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 w-48 sm:w-60"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleExportKasAudit}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
              </div>
            </div>

            {/* Sub-Tabs: Tunai, Transfer, Belanja */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {canSubTunai && (
                <button
                  type="button"
                  onClick={() => setKasAuditTab('TUNAI')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    kasAuditTab === 'TUNAI'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Kas Tunai Toko {tunaiRes?.meta?.total !== undefined ? `(${tunaiRes.meta.total})` : ''}</span>
                  {tunaiRes?.meta?.totalKeseluruhan ? (
                    <span className="ml-1 text-[11px] opacity-90 font-mono">
                      {formatRupiah(Number(tunaiRes.meta.totalKeseluruhan))}
                    </span>
                  ) : null}
                </button>
              )}

              {canSubTransfer && (
                <button
                  type="button"
                  onClick={() => setKasAuditTab('TRANSFER')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    kasAuditTab === 'TRANSFER'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Transfer Bank {transferRes?.meta?.total !== undefined ? `(${transferRes.meta.total})` : ''}</span>
                  {transferRes?.meta?.totalKeseluruhan ? (
                    <span className="ml-1 text-[11px] opacity-90 font-mono">
                      {formatRupiah(Number(transferRes.meta.totalKeseluruhan))}
                    </span>
                  ) : null}
                </button>
              )}

              {canSubBelanja && (
                <button
                  type="button"
                  onClick={() => setKasAuditTab('BELANJA')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    kasAuditTab === 'BELANJA'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Belanja Bahan Curah {belanjaRes?.meta?.total !== undefined ? `(${belanjaRes.meta.total})` : ''}</span>
                  {belanjaRes?.meta?.totalKeseluruhan ? (
                    <span className="ml-1 text-[11px] opacity-90 font-mono">
                      {formatRupiah(Number(belanjaRes.meta.totalKeseluruhan))}
                    </span>
                  ) : null}
                </button>
              )}
            </div>

            {/* Table Content */}
            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 text-center">No</th>
                    <th className="py-3 px-3">Tanggal & Waktu</th>
                    <th className="py-3 px-3">Invoice</th>
                    <th className="py-3 px-3">Mitra / Klien</th>
                    <th className="py-3 px-3">Keterangan / Uraian</th>
                    <th className="py-3 px-3">Rincian / Kategori</th>
                    <th className="py-3 px-3 text-right">Volume (Kg)</th>
                    <th className="py-3 px-3 text-right">Nominal (Rp)</th>
                    <th className="py-3 px-3 text-center">Tipe & Metode</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                          <span>Memuat mutasi kas Pak Pri...</span>
                        </div>
                      </td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        Tidak ada transaksi {kasAuditTab === 'TUNAI' ? 'kas tunai' : kasAuditTab === 'TRANSFER' ? 'transfer bank' : 'belanja'} dengan Bpk. Supriyadi pada kriteria ini.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((tx: any, idx: number) => {
                      const totalKg = tx.details?.reduce((s: number, d: any) => s + Number(d.qty || 0), 0) || 0;
                      const isMasuk = tx.type === 'KAS_MASUK';
                      const isKeluar = tx.type === 'KAS_KELUAR';
                      const rincianText = (tx.details || [])
                        .map((d: any) => {
                          if (d.barang?.name) {
                            return `${d.barang.name}${Number(d.qty) > 0 ? ` (${d.qty} Kg)` : ''}`;
                          }
                          if (d.kategori?.name) {
                            return d.kategori.name;
                          }
                          return 'Mutasi Kas';
                        })
                        .join(', ') || '-';

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                            {(kasPage - 1) * kasLimit + idx + 1}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-semibold text-slate-800">{formatDateIndo(tx.tanggal)}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{tx.invoice}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {tx.client?.name || 'Bp. Supriyadi'}
                          </td>
                          <td className="py-2.5 px-3 max-w-xs truncate text-[11px] text-slate-700" title={tx.keterangan}>
                            {tx.keterangan || '-'}
                          </td>
                          <td className="py-2.5 px-3 max-w-xs truncate text-[11px] text-slate-600" title={rincianText}>
                            {rincianText}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold">
                            {totalKg > 0 ? formatNumber(totalKg) : '-'}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                            isMasuk ? 'text-emerald-700' : isKeluar ? 'text-rose-700' : 'text-amber-800'
                          }`}>
                            {isMasuk ? '+' : isKeluar ? '-' : ''} {formatRupiah(Number(tx.total || 0))}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isMasuk
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isKeluar
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {isMasuk ? 'Kas Masuk' : isKeluar ? 'Kas Keluar' : 'Pembelian'}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {tx.paymentMethod === 'KREDIT_BON' ? 'TEMPO' : tx.paymentMethod}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {tx.status || 'SELESAI'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                  <tr>
                    <td colSpan={6} className="py-3 px-3 text-right uppercase text-[11px] text-slate-600">
                      Total Halaman Ini ({currentItems.length} transaksi):
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {pageQtyTotal > 0 ? `${formatNumber(pageQtyTotal)} Kg` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-slate-900">
                      {formatRupiah(pageNominalTotal)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                  {currentMeta.totalKeseluruhan ? (
                    <tr className="bg-amber-50/50 text-amber-950">
                      <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-[11px] font-extrabold text-amber-900">
                        Total Keseluruhan ({currentMeta.total || 0} transaksi):
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-amber-900">
                        -
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm font-black text-amber-900">
                        {formatRupiah(Number(currentMeta.totalKeseluruhan || 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  ) : null}
                </tfoot>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="mt-3">
              <Pagination
                page={kasPage}
                limit={kasLimit}
                total={currentMeta.total || 0}
                totalPages={currentMeta.totalPages || 1}
                onPageChange={setKasPage}
                onLimitChange={setKasLimit}
                entityName="transaksi kas"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Konversi & Racik Pakan */}
      {activeTab === 'KONVERSI' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="mb-4 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                <span>Pengolahan & Konversi Pakan Curah</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Proses penggilingan & peracikan bahan mentah (Jagung OC &rarr; JGIL, Katul Separator &rarr; Katul A & B) tanpa beban susut.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold">
              Otomatis Potong FIFO & Transfer HPP
            </span>
          </div>

          <KonversiBarangPage defaultJenisId={9} fixedJenisName="Pakan Curah (Pak Pri)" />
        </div>
      )}

    </div>
  );
};

export default CurahPakPriPage;
