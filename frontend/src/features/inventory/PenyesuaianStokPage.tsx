import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { useAuthStore, isAdminOrManager } from '../../stores/auth.store';
import { formatRupiah, formatDateIndo } from '../../lib/export-utils';
import { SearchableBarangSelect } from '../../components/SearchableBarangSelect';
import { Pagination } from '../../components/Pagination';
import {
  SlidersHorizontal,
  RotateCcw,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  Egg,
  Wheat,
  Pill,
  Layers,
  RefreshCw,
  X,
  Eye,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileCheck,
  History,
  ClipboardCheck,
  Info,
} from 'lucide-react';

interface OpnameRecord {
  id: number;
  nomorOpname: string;
  tanggal: string;
  jenisOpname: 'TELUR' | 'PAKAN' | 'OBAT' | 'TRAY';
  barangId: number;
  barangName: string;
  satuan: string;
  userName: string;
  stokSistem: number;
  stokFisik: number;
  selisih: number;
  hpp: number;
  totalNilai: number;
  keterangan?: string;
  nomorJurnal?: string;
  jurnalDetails?: {
    kategoriName: string;
    debit: number;
    kredit: number;
  }[];
}

export const PenyesuaianStokPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Tab View: 'PENYESUAIAN' | 'ROLLBACK'
  const [activeTab, setActiveTab] = useState<'PENYESUAIAN' | 'ROLLBACK'>('PENYESUAIAN');

  // Form State Penyesuaian Non-Jurnal
  const [formKomoditas, setFormKomoditas] = useState<'ALL' | 'TELUR' | 'PAKAN' | 'OBAT' | 'TRAY'>('TELUR');
  const [selectedBarangId, setSelectedBarangId] = useState<string>('');
  const [stokFisikBaru, setStokFisikBaru] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');
  const [tanggal, setTanggal] = useState<string>(todayStr);

  // Filter Riwayat / Rollback List
  const [rollbackSearch, setRollbackSearch] = useState<string>('');
  const [rollbackKomoditas, setRollbackKomoditas] = useState<string>('ALL');
  const [rollbackTipe, setRollbackTipe] = useState<'ALL' | 'NON_JURNAL' | 'OPNAME'>('ALL');
  const [rollbackStartDate, setRollbackStartDate] = useState<string>('');
  const [rollbackEndDate, setRollbackEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);

  // Modal Rollback Target
  const [rollbackTarget, setRollbackTarget] = useState<OpnameRecord | null>(null);
  const [revertPhysicalStock, setRevertPhysicalStock] = useState<boolean>(false);

  // Alert State
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);

  // Modal Journal View
  const [viewJournalOpname, setViewJournalOpname] = useState<OpnameRecord | null>(null);

  // 1. Fetch All Master Barangs
  const { data: barangsData } = useQuery({
    queryKey: ['masterBarangsAll'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/barangs?limit=1000');
      return res.data || res;
    },
  });

  // 2. Fetch Real-Time Stock Summary per Barang
  const { data: stockSummaryData, isLoading: isLoadingStock } = useQuery({
    queryKey: ['inventoryStockSummary'],
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/summary');
      return res.data || res;
    },
  });

  // Filter barangs by selected commodity
  const filteredBarangs = useMemo(() => {
    if (!barangsData) return [];
    const list = Array.isArray(barangsData)
      ? barangsData
      : (barangsData as any)?.data || (barangsData as any)?.items || [];
    return list.filter((b: any) => {
      if (formKomoditas === 'ALL') return true;
      const jName = (b.jenis?.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      if (formKomoditas === 'TELUR') {
        return jName.includes('telur') || bName.includes('horen') || bName.includes('puyuh') || bName.includes('golden') || bName.includes('asin');
      }
      if (formKomoditas === 'PAKAN') {
        return jName.includes('pakan') || jName.includes('sentrat') || jName.includes('curah');
      }
      if (formKomoditas === 'OBAT') {
        return jName.includes('obat') || jName.includes('vitamin');
      }
      if (formKomoditas === 'TRAY') {
        return jName.includes('tray') || bName.includes('tray');
      }
      return true;
    });
  }, [barangsData, formKomoditas]);

  const stockSummaryList = useMemo(() => {
    if (!stockSummaryData) return [];
    return Array.isArray(stockSummaryData)
      ? stockSummaryData
      : Array.isArray((stockSummaryData as any)?.data)
      ? (stockSummaryData as any).data
      : (stockSummaryData as any)?.items || [];
  }, [stockSummaryData]);

  // Selected Barang Object & Current Stock
  const selectedBarangObj = useMemo(() => {
    if (!selectedBarangId || !barangsData) return null;
    const list = Array.isArray(barangsData)
      ? barangsData
      : (barangsData as any)?.data || (barangsData as any)?.items || [];
    return list.find((b: any) => String(b.id) === String(selectedBarangId)) || null;
  }, [selectedBarangId, barangsData]);

  const currentSystemStock = useMemo(() => {
    if (!selectedBarangId || !stockSummaryData) return 0;
    const list = Array.isArray(stockSummaryData)
      ? stockSummaryData
      : Array.isArray((stockSummaryData as any)?.data)
      ? (stockSummaryData as any).data
      : (stockSummaryData as any)?.items || [];
    const found = list.find((s: any) => String(s.id || s.barangId) === String(selectedBarangId));
    return found ? Number(found.totalStok ?? found.qtySisa ?? found.totalSisa ?? found.totalQty ?? 0) : 0;
  }, [selectedBarangId, stockSummaryData]);

  const satuanName = selectedBarangObj?.satuan?.name || 'unit';

  // Hitung perkiraan selisih
  const calculatedSelisih = useMemo(() => {
    if (stokFisikBaru === '') return null;
    const val = Number(stokFisikBaru);
    if (isNaN(val)) return null;
    return Number((val - currentSystemStock).toFixed(2));
  }, [stokFisikBaru, currentSystemStock]);

  // 3. Fetch Opnames for Rollback & History with Server-Side Pagination
  const { data: opnameResponse, isLoading: isLoadingOpname, refetch: refetchOpnames } = useQuery({
    queryKey: ['opnameListForRollback', rollbackKomoditas, rollbackTipe, rollbackStartDate, rollbackEndDate, rollbackSearch, page, limit],
    queryFn: async () => {
      let url = `/inventory/opname?page=${page}&limit=${limit}`;
      if (rollbackKomoditas !== 'ALL') url += `&jenisOpname=${rollbackKomoditas}`;
      if (rollbackTipe !== 'ALL') url += `&tipe=${rollbackTipe}`;
      if (rollbackStartDate) url += `&startDate=${rollbackStartDate}`;
      if (rollbackEndDate) url += `&endDate=${rollbackEndDate}`;
      if (rollbackSearch) url += `&search=${encodeURIComponent(rollbackSearch)}`;
      const res: any = await apiClient.get(url);
      return res;
    },
  });

  const opnameList: OpnameRecord[] = useMemo(() => {
    if (!opnameResponse) return [];
    if (Array.isArray(opnameResponse?.data)) return opnameResponse.data;
    if (Array.isArray(opnameResponse?.items)) return opnameResponse.items;
    if (Array.isArray(opnameResponse)) return opnameResponse;
    return [];
  }, [opnameResponse]);

  const meta = useMemo(() => {
    return opnameResponse?.meta || {
      page,
      limit,
      total: opnameList.length,
      totalPages: Math.max(1, Math.ceil(opnameList.length / limit)),
    };
  }, [opnameResponse, page, limit, opnameList.length]);

  // Mutasi: Simpan Penyesuaian Non-Jurnal
  const penyesuaianMutation = useMutation({
    mutationFn: async (payload: { barangId: number; stokFisikBaru: number; selisihStok: number; keterangan: string; tanggal: string }) => {
      const res: any = await apiClient.post('/inventory/penyesuaian-non-jurnal', payload);
      return res.data || res;
    },
    onSuccess: (data) => {
      setAlertSuccess(data?.message || 'Penyesuaian stok fisik non-jurnal berhasil disimpan.');
      setAlertError(null);
      setSelectedBarangId('');
      setStokFisikBaru('');
      setKeterangan('');
      queryClient.invalidateQueries({ queryKey: ['inventoryStockSummary'] });
      queryClient.invalidateQueries({ queryKey: ['opnameListForRollback'] });
      queryClient.invalidateQueries({ queryKey: ['laporanAset'] });
    },
    onError: (err: any) => {
      setAlertError(err?.response?.data?.message || err?.message || 'Gagal menyimpan penyesuaian stok.');
      setAlertSuccess(null);
    },
  });

  // Mutasi: Rollback Opname
  const rollbackMutation = useMutation({
    mutationFn: async ({ id, revertStock }: { id: number; revertStock: boolean }) => {
      const res: any = await apiClient.post(`/inventory/opname/${id}/rollback`, { revertStock });
      return res.data || res;
    },
    onSuccess: (data) => {
      setAlertSuccess(data?.message || 'Transaksi opname berhasil di-rollback secara aman.');
      setAlertError(null);
      setRollbackTarget(null);
      setRevertPhysicalStock(false);
      refetchOpnames();
      queryClient.invalidateQueries({ queryKey: ['inventoryStockSummary'] });
      queryClient.invalidateQueries({ queryKey: ['laporanAset'] });
    },
    onError: (err: any) => {
      setAlertError(err?.response?.data?.message || err?.message || 'Gagal melakukan rollback opname.');
      setAlertSuccess(null);
    },
  });

  const handleSubmitPenyesuaian = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarangId) {
      alert('Silakan pilih barang terlebih dahulu.');
      return;
    }
    if (stokFisikBaru === '' || isNaN(Number(stokFisikBaru))) {
      alert('Silakan masukkan jumlah stok fisik baru yang valid.');
      return;
    }
    const valFisik = Number(stokFisikBaru);
    const selisih = calculatedSelisih || 0;

    const confirmMsg = `Anda akan menyesuaikan stok fisik ${selectedBarangObj?.name}:\n` +
      `- Stok Saat Ini: ${currentSystemStock} ${satuanName}\n` +
      `- Stok Fisik Baru: ${valFisik} ${satuanName}\n` +
      `- Selisih: ${selisih > 0 ? '+' : ''}${selisih} ${satuanName}\n\n` +
      `⚠️ Penyesuaian ini TIDAK akan membuat jurnal akuntansi sehingga Laporan Aset dan Laba Rugi tetap terjaga.\n\n` +
      `Apakah Anda yakin ingin melanjutkan?`;

    if (window.confirm(confirmMsg)) {
      penyesuaianMutation.mutate({
        barangId: Number(selectedBarangId),
        stokFisikBaru: valFisik,
        selisihStok: selisih,
        keterangan,
        tanggal,
      });
    }
  };

  const handleConfirmRollback = () => {
    if (!rollbackTarget) return;
    rollbackMutation.mutate({
      id: rollbackTarget.id,
      revertStock: revertPhysicalStock,
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="p-2.5 bg-indigo-600/30 border border-indigo-400/30 rounded-xl text-indigo-300">
                <SlidersHorizontal className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Penyesuaian Stok & Safe Rollback</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Khusus Admin
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  Koreksi kuantitas stok fisik gudang non-jurnal & pencabutan transaksi opname keliru secara aman.
                </p>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 shadow-inner">
            <button
              onClick={() => { setActiveTab('PENYESUAIAN'); setAlertSuccess(null); setAlertError(null); }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'PENYESUAIAN'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Form Penyesuaian</span>
            </button>
            <button
              onClick={() => { setActiveTab('ROLLBACK'); setAlertSuccess(null); setAlertError(null); }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'ROLLBACK'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Riwayat Penyesuaian & Opname ({opnameList?.length || 0})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alert Banners */}
      {alertSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start justify-between animate-fadeIn shadow-sm">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-medium">{alertSuccess}</p>
          </div>
          <button onClick={() => setAlertSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {alertError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between animate-fadeIn shadow-sm">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <p className="text-sm font-medium">{alertError}</p>
          </div>
          <button onClick={() => setAlertError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: PENYESUAIAN STOK FISIK NON-JURNAL                                   */}
      {/* ========================================================================= */}
      {activeTab === 'PENYESUAIAN' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Card */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  <span>Form Penyesuaian Kuantitas Fisik</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update kuantitas batch fisik tanpa memotong/menambah saldo akun di Laporan Aset.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center space-x-1">
                <span>Mode: Bebas Jurnal</span>
              </span>
            </div>

            <form onSubmit={handleSubmitPenyesuaian} className="space-y-4">
              {/* Filter Komoditas */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pilih Kategori Komoditas</label>
                <div className="grid grid-cols-5 gap-2">
                  {(['ALL', 'TELUR', 'PAKAN', 'OBAT', 'TRAY'] as const).map((kom) => (
                    <button
                      key={kom}
                      type="button"
                      onClick={() => { setFormKomoditas(kom); setSelectedBarangId(''); }}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center justify-center space-y-1 ${
                        formKomoditas === kom
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {kom === 'ALL' && <Boxes className="w-3.5 h-3.5" />}
                      {kom === 'TELUR' && <Egg className="w-3.5 h-3.5 text-amber-500" />}
                      {kom === 'PAKAN' && <Wheat className="w-3.5 h-3.5 text-orange-500" />}
                      {kom === 'OBAT' && <Pill className="w-3.5 h-3.5 text-emerald-500" />}
                      {kom === 'TRAY' && <Layers className="w-3.5 h-3.5 text-blue-500" />}
                      <span>{kom === 'ALL' ? 'Semua' : kom}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dropdown Barang Searchable */}
              <div>
                <SearchableBarangSelect
                  barangs={filteredBarangs}
                  value={selectedBarangId}
                  onChange={(id) => setSelectedBarangId(id)}
                  stockItems={stockSummaryList}
                  label="Nama Barang"
                  placeholder="🔍 Ketik atau cari nama / kode barang..."
                  required
                />
              </div>

              {/* Status Barang Terpilih */}
              {selectedBarangObj && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Barang Dipilih</p>
                      <p className="text-sm font-bold text-slate-800">{selectedBarangObj.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Stok Sistem Saat Ini</p>
                      <p className="text-base font-extrabold text-indigo-600 font-mono">
                        {isLoadingStock ? '...' : currentSystemStock.toLocaleString('id-ID')} {satuanName}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Stok Fisik Gudang Baru <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={stokFisikBaru}
                          onChange={(e) => setStokFisikBaru(e.target.value)}
                          placeholder="Contoh: 10425"
                          className="w-full text-sm font-mono font-bold border border-slate-300 rounded-xl p-2.5 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          required
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">{satuanName}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Kalkulasi Selisih</label>
                      <div className={`p-2.5 rounded-xl border text-sm font-mono font-bold flex items-center justify-between ${
                        calculatedSelisih === null
                          ? 'bg-slate-100 border-slate-200 text-slate-400'
                          : calculatedSelisih < 0
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : calculatedSelisih > 0
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-blue-50 border-blue-200 text-blue-700'
                      }`}>
                        <span>
                          {calculatedSelisih === null
                            ? '-'
                            : `${calculatedSelisih > 0 ? '+' : ''}${calculatedSelisih.toLocaleString('id-ID')} ${satuanName}`}
                        </span>
                        {calculatedSelisih !== null && (
                          <span className="text-[10px] font-sans px-2 py-0.5 rounded-md uppercase font-extrabold tracking-wider bg-white/80 border border-current">
                            {calculatedSelisih < 0 ? 'Potong Batch' : calculatedSelisih > 0 ? 'Tambah Batch' : 'Sama'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tanggal & Keterangan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Penyesuaian</label>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Alasan / Keterangan</label>
                  <input
                    type="text"
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    placeholder="Misal: Koreksi fisik awal, sinkronisasi stok riil"
                    className="w-full text-sm border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Warning Box */}
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1 leading-relaxed">
                  <span className="font-bold">Keamanan Akuntansi Terjamin:</span> Penyesuaian ini secara internal memperbarui kuantitas batch fisik (`stok_batches`) via FIFO tanpa memposting debit/kredit ke akun Persediaan atau Beban. Laporan Aset dan Laba Rugi tidak akan terdistorsi.
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={penyesuaianMutation.isPending || !selectedBarangId || stokFisikBaru === ''}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center space-x-2"
              >
                {penyesuaianMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menerapkan Penyesuaian...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>Terapkan Penyesuaian Fisik (Non-Jurnal)</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Side Info & Recent Adjustments */}
          <div className="lg:col-span-5 space-y-6">
            {/* Guide Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <Info className="w-4 h-4 text-indigo-600" />
                <span>Kapan Menggunakan Fitur Ini?</span>
              </h3>
              <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>Sinkronisasi Awal:</strong> Ketika angka sistem terbaca puluhan ton/ribu unit akibat import batch historis, dan Anda ingin menyamakan langsung ke angka fisik gudang.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>Koreksi Non-Komersial:</strong> Koreksi fisik gudang yang tidak ingin dicatat sebagai kerugian operasional (beban) di Laporan Keuangan.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-amber-500 font-bold">⚠️</span>
                  <span><strong>Jika Memang Susut Operasional Harian:</strong> Gunakan menu reguler <em>Stok Opname</em> agar susut/bentes tercatat ke jurnal akuntansi resmi.</span>
                </li>
              </ul>
            </div>

            {/* Quick Status Stok Komoditas */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <Boxes className="w-4 h-4 text-indigo-600" />
                <span>Ringkasan Stok Aktif (Sistem Saat Ini)</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block font-semibold text-[10px]">TOTAL PRODUK AKTIF</span>
                  <span className="text-base font-extrabold text-slate-800 font-mono">
                    {barangsData?.length || 0} Barang
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-600 block font-semibold text-[10px]">STATUS LAPORAN ASET</span>
                  <span className="text-base font-extrabold text-emerald-700">100% Positif</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RIWAYAT PENYESUAIAN & OPNAME STOK (DENGAN ROLLBACK)                 */}
      {/* ========================================================================= */}
      {activeTab === 'ROLLBACK' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                <History className="w-5 h-5 text-indigo-600" />
                <span>Riwayat Penyesuaian & Stok Opname Fisik Gudang</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar lengkap audit trail penyesuaian fisik (Non-Jurnal & Opname) beserta nilai selisih dan opsi rollback aman.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/stok-opname"
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <ClipboardCheck className="w-4 h-4 text-amber-600" />
                <span>Buka Menu Stok Opname Lengkap</span>
              </Link>
            </div>
          </div>

          {/* Segmented Type Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => { setRollbackTipe('ALL'); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                rollbackTipe === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Mutasi
            </button>
            <button
              type="button"
              onClick={() => { setRollbackTipe('NON_JURNAL'); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                rollbackTipe === 'NON_JURNAL'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              Penyesuaian Non-Jurnal Saja
            </button>
            <button
              type="button"
              onClick={() => { setRollbackTipe('OPNAME'); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                rollbackTipe === 'OPNAME'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Stok Opname Jurnal Saja
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Cari No. Opname / Barang</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Ketik nama / no opname..."
                  value={rollbackSearch}
                  onChange={(e) => {
                    setRollbackSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter Komoditas</label>
              <select
                value={rollbackKomoditas}
                onChange={(e) => {
                  setRollbackKomoditas(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="ALL">Semua Komoditas</option>
                <option value="TELUR">Telur</option>
                <option value="PAKAN">Pakan</option>
                <option value="OBAT">Obat-Obatan</option>
                <option value="TRAY">Tray</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Dari Tanggal</label>
              <input
                type="date"
                value={rollbackStartDate}
                onChange={(e) => {
                  setRollbackStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={rollbackEndDate}
                onChange={(e) => {
                  setRollbackEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Tanggal & No. Opname</th>
                  <th className="px-4 py-3">Barang & Komoditas</th>
                  <th className="px-4 py-3 text-right">Stok Sistem vs Fisik</th>
                  <th className="px-4 py-3 text-right">Selisih</th>
                  <th className="px-4 py-3 text-right">Nilai Jurnal</th>
                  <th className="px-4 py-3 text-center">Jurnal</th>
                  <th className="px-4 py-3">Petugas</th>
                  <th className="px-4 py-3 text-center">Aksi Rollback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingOpname ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-500" />
                      <span>Memuat data opname...</span>
                    </td>
                  </tr>
                ) : !opnameList || opnameList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <span>Tidak ada transaksi yang cocok dengan filter yang dipilih.</span>
                    </td>
                  </tr>
                ) : (
                  opnameList.map((op: OpnameRecord) => {
                    const selisih = Number(op.stokFisik) - Number(op.stokSistem);
                    const isNonJurnal = !op.nomorJurnal || op.totalNilai === 0;
                    return (
                      <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 block">
                            {formatDateIndo(op.tanggal)}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">{op.nomorOpname}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-bold text-slate-800 block">{op.barangName}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                            {op.jenisOpname}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-mono">
                          <span className="text-slate-400 block text-[11px]">Sistem: {Number(op.stokSistem).toLocaleString('id-ID')}</span>
                          <span className="font-bold text-slate-700">Fisik: {Number(op.stokFisik).toLocaleString('id-ID')} {op.satuan}</span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-mono font-bold">
                          <span className={selisih < 0 ? 'text-rose-600' : selisih > 0 ? 'text-emerald-600' : 'text-slate-500'}>
                            {selisih > 0 ? '+' : ''}{selisih.toLocaleString('id-ID')} {op.satuan}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-mono font-bold text-slate-800">
                          {formatRupiah(Number(op.totalNilai || 0))}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {op.nomorJurnal ? (
                            <button
                              onClick={() => setViewJournalOpname(op)}
                              className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px] inline-flex items-center space-x-1 hover:bg-emerald-100 transition-colors"
                            >
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span>{op.nomorJurnal}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Non-Jurnal</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {op.userName || 'Admin'}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              setRollbackTarget(op);
                              setRevertPhysicalStock(false);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 inline-flex items-center space-x-1 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Rollback</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <Pagination
            page={page}
            limit={limit}
            total={meta.total}
            totalPages={meta.totalPages}
            onPageChange={(p) => setPage(p)}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
            limitOptions={[10, 25, 50, 100, 200]}
            entityName="riwayat penyesuaian"
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL KONFIRMASI SAFE ROLLBACK                                            */}
      {/* ========================================================================= */}
      {rollbackTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="p-2 bg-rose-600 text-white rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-rose-900 text-base">Konfirmasi Safe Rollback Opname</h3>
                  <p className="text-xs text-rose-600">Pencabutan transaksi stok opname dan pembersihan jurnal</p>
                </div>
              </div>
              <button
                onClick={() => setRollbackTarget(null)}
                className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">No. Opname:</span>
                  <span className="font-mono font-bold text-slate-800">{rollbackTarget.nomorOpname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Barang:</span>
                  <span className="font-bold text-slate-800">{rollbackTarget.barangName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Selisih Stok:</span>
                  <span className="font-mono font-bold text-rose-600">
                    {Number(rollbackTarget.selisih).toLocaleString('id-ID')} {rollbackTarget.satuan}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Nilai Jurnal Akuntansi:</span>
                  <span className="font-mono font-bold text-rose-700 text-sm">
                    {formatRupiah(Number(rollbackTarget.totalNilai || 0))}
                  </span>
                </div>
                {rollbackTarget.nomorJurnal && (
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500 font-medium">Jurnal yang akan dicabut:</span>
                    <span className="font-mono font-bold text-emerald-700">{rollbackTarget.nomorJurnal}</span>
                  </div>
                )}
              </div>

              {/* Opsi Revert Stock */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revertPhysicalStock}
                    onChange={(e) => setRevertPhysicalStock(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">
                      Kembalikan kuantitas batch fisik gudang juga?
                    </span>
                    <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                      Centang opsi ini HANYA jika fisik barang sebenarnya masih ada di gudang dan salah dipotong. <strong>Jangan dicentang</strong> jika opname tersebut terjadi akibat sinkronisasi stok awal (agar sisa gudang tetap pada angka riil).
                    </span>
                  </div>
                </label>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span>
                  Tindakan ini akan <strong>menghapus jurnal akuntansi terkait</strong> dan mencabut baris opname ini secara permanen. Laporan Aset akan segera disesuaikan kembali.
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setRollbackTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRollback}
                disabled={rollbackMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 shadow-md transition-all flex items-center space-x-1.5"
              >
                {rollbackMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses Rollback...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ya, Rollback Opname Ini</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL VIEW JURNAL OPNAME                                                  */}
      {/* ========================================================================= */}
      {viewJournalOpname && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-emerald-900 text-sm">Rincian Jurnal Akuntansi</h3>
                  <p className="text-[11px] text-emerald-700 font-mono">{viewJournalOpname.nomorJurnal}</p>
                </div>
              </div>
              <button
                onClick={() => setViewJournalOpname(null)}
                className="p-1 rounded-lg text-emerald-500 hover:bg-emerald-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Nomor Opname:</span>
                <span className="font-mono font-bold text-slate-800">{viewJournalOpname.nomorOpname}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Barang:</span>
                <span className="font-bold text-slate-800">{viewJournalOpname.barangName}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Total Nilai Penyesuaian:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {formatRupiah(Number(viewJournalOpname.totalNilai || 0))}
                </span>
              </div>

              {viewJournalOpname.jurnalDetails && viewJournalOpname.jurnalDetails.length > 0 && (
                <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 font-bold text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Akun / Kategori</th>
                        <th className="px-3 py-2 text-right">Debit</th>
                        <th className="px-3 py-2 text-right">Kredit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {viewJournalOpname.jurnalDetails.map((jd, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-slate-700 font-sans font-medium">{jd.kategoriName}</td>
                          <td className="px-3 py-2 text-right text-emerald-700">
                            {jd.debit > 0 ? formatRupiah(Number(jd.debit)) : '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-rose-700">
                            {jd.kredit > 0 ? formatRupiah(Number(jd.kredit)) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewJournalOpname(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
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
