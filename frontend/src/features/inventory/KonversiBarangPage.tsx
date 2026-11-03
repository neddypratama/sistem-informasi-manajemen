import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { SearchableBarangSelect } from '../../components/SearchableBarangSelect';
import { CurrencyInput } from '../../components/CurrencyInput';
import { exportToExcel } from '../../lib/export-utils';
import { useAuthStore, hasPermission } from '../../stores/auth.store';
import {
  ArrowRightLeft,
  Plus,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  Eye,
  X,
  FileSpreadsheet,
  Sparkles,
  Scale,
  RefreshCw,
} from 'lucide-react';

interface KonversiRecord {
  id: number;
  nomorKonversi: string;
  tanggal: string;
  barangAwalId: number;
  barangAwal: {
    id: number;
    name: string;
    code?: string;
    satuan?: { name: string };
    jenis?: { name: string };
  };
  qtyAwal: number;
  hppAwal: number;
  barangAkhirId: number;
  barangAkhir: {
    id: number;
    name: string;
    code?: string;
    satuan?: { name: string };
    jenis?: { name: string };
  };
  qtyAkhir: number;
  hppAkhir: number;
  totalNominal: number;
  keterangan?: string;
  jurnalId?: number;
  jurnal?: {
    id: number;
    nomorJurnal: string;
    details: Array<{
      id: number;
      coaId: number;
      kategoriId?: number;
      debit: number;
      kredit: number;
    }>;
  };
  user?: {
    id: number;
    name: string;
    username: string;
  };
  createdAt: string;
}

export interface KonversiBarangPageProps {
  defaultJenisId?: number;
  fixedJenisName?: string;
}

export const KonversiBarangPage: React.FC<KonversiBarangPageProps> = ({ defaultJenisId, fixedJenisName }) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canCreate = hasPermission(user, ['curah_konversi:create', 'konversi_global:create', 'stok_opname:create', 'stok:opname']);
  const canUpdate = hasPermission(user, ['curah_konversi:update', 'konversi_global:update', 'stok_opname:update', 'stok:opname']);
  const canDelete = hasPermission(user, ['curah_konversi:delete', 'konversi_global:delete', 'stok_opname:delete', 'stok:opname']);
  const canExport = hasPermission(user, ['curah_operasional:export', 'stok_global:export', 'stok_opname:export', 'stok:read']);
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter States
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Fields
  const [formTanggal, setFormTanggal] = useState<string>(todayStr);
  const [formBarangAwalId, setFormBarangAwalId] = useState<string>('');
  const [formQtyAwal, setFormQtyAwal] = useState<number>(0);
  const [formBarangAkhirId, setFormBarangAkhirId] = useState<string>('');
  const [formQtyAkhir, setFormQtyAkhir] = useState<number>(0);
  const [formHargaAkhir, setFormHargaAkhir] = useState<number>(0);
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Detail & Delete Modals
  const [selectedDetail, setSelectedDetail] = useState<KonversiRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<KonversiRecord | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Auto clear alerts
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => setActionSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  // 1. Fetch Konversi Records
  const { data: konversiData, isLoading: isLoadingKonversi } = useQuery({
    queryKey: ['konversiBarangs', startDate, endDate, search, page],
    queryFn: async () => {
      let url = `/inventory/konversi?page=${page}&limit=${limit}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res: any = await apiClient.get(url);
      return res;
    },
  });

  const items: KonversiRecord[] = useMemo(() => {
    if (!konversiData) return [];
    let list: any[] = [];
    if (Array.isArray(konversiData.data)) list = konversiData.data;
    else if (Array.isArray(konversiData.items)) list = konversiData.items;
    else if (Array.isArray(konversiData)) list = konversiData;

    if (defaultJenisId) {
      list = list.filter((r: any) => {
        const jAwal = Number(r.barangAwal?.jenisId ?? r.barangAwal?.jenis?.id ?? 0);
        const jAkhir = Number(r.barangAkhir?.jenisId ?? r.barangAkhir?.jenis?.id ?? 0);
        return jAwal === defaultJenisId || jAkhir === defaultJenisId;
      });
    }
    return list;
  }, [konversiData, defaultJenisId]);

  const meta = useMemo(() => {
    return (
      konversiData?.meta || {
        total: items.length,
        page: 1,
        limit,
        totalPages: Math.max(1, Math.ceil(items.length / limit)),
      }
    );
  }, [konversiData, items.length]);

  // 2. Fetch Master Barangs (Disesuaikan bila ada defaultJenisId seperti Pakan Curah)
  const { data: barangsData } = useQuery({
    queryKey: ['barangsAllList', defaultJenisId],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/barangs?limit=1000');
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
      const activeList = list.filter((b: any) => b.isActive !== false);
      if (defaultJenisId) {
        return activeList.filter((b: any) => Number(b.jenisId ?? b.jenis?.id ?? 0) === defaultJenisId);
      }
      return activeList;
    },
  });

  // 3. Fetch Realtime Stock Summary (Disesuaikan bila ada defaultJenisId)
  const { data: stockSummaryData } = useQuery({
    queryKey: ['inventoryStockSummaryAll', defaultJenisId],
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/summary');
      const list = Array.isArray(res) ? res : (res?.data || []);
      if (defaultJenisId) {
        return list.filter((s: any) => Number(s.jenisId ?? s.barang?.jenisId ?? 0) === defaultJenisId);
      }
      return list;
    },
  });

  const barangsList = barangsData || [];
  const stockItems = stockSummaryData || [];

  // Match selected barang awal & akhir
  const selectedBarangAwal = useMemo(() => {
    return barangsList.find((b: any) => String(b.id) === String(formBarangAwalId));
  }, [barangsList, formBarangAwalId]);

  const selectedBarangAkhir = useMemo(() => {
    return barangsList.find((b: any) => String(b.id) === String(formBarangAkhirId));
  }, [barangsList, formBarangAkhirId]);

  const barangAwalStock = useMemo(() => {
    if (!formBarangAwalId) return { stok: 0, hpp: 0 };
    const st = stockItems.find((s: any) => String(s.barangId || s.id) === String(formBarangAwalId));
    return {
      stok: Number(st?.totalStok ?? st?.stok ?? st?.totalQty ?? 0),
      hpp: Number(st?.hargaRataRata ?? st?.hpp ?? st?.avgHpp ?? 0),
    };
  }, [stockItems, formBarangAwalId]);

  // When Barang Awal changes, auto-fill Harga Modal Barang Hasil if empty
  const handleBarangAwalChange = (id: string) => {
    setFormBarangAwalId(id);
    setFormError(null);
    if (!id) return;
    const st = stockItems.find((s: any) => String(s.barangId || s.id) === String(id));
    const currentHpp = Number(st?.hargaRataRata ?? st?.hpp ?? st?.avgHpp ?? 0);
    if (modalMode === 'CREATE' && currentHpp > 0) {
      setFormHargaAkhir(currentHpp);
    }
  };

  const handleQtyAwalChange = (qty: number) => {
    setFormQtyAwal(qty);
    setFormError(null);
    // In CREATE mode, auto-mirror to Qty Akhir if Qty Akhir was not customized or same as old
    if (modalMode === 'CREATE') {
      if (formQtyAkhir === 0 || formQtyAkhir === formQtyAwal) {
        setFormQtyAkhir(qty);
      }
      if (formHargaAkhir === 0 && barangAwalStock.hpp > 0) {
        setFormHargaAkhir(barangAwalStock.hpp);
      }
    }
  };

  // Calculated Total Nominal for the target item
  const calculatedTotalNominal = useMemo(() => {
    if (formQtyAkhir <= 0 || formHargaAkhir <= 0) return 0;
    return Number((formQtyAkhir * formHargaAkhir).toFixed(2));
  }, [formQtyAkhir, formHargaAkhir]);

  // Mutations
  const createKonversiMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res: any = await apiClient.post('/inventory/konversi', payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['konversiBarangs'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryStockSummaryAll'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      setIsFormModalOpen(false);
      resetForm();
      setActionSuccess(`Konversi barang ${data?.nomorKonversi || ''} berhasil disimpan dan stok telah diperbarui.`);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || err?.message || 'Gagal menyimpan transaksi konversi.');
    },
  });

  const updateKonversiMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res: any = await apiClient.put(`/inventory/konversi/${id}`, payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['konversiBarangs'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryStockSummaryAll'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      setIsFormModalOpen(false);
      resetForm();
      setActionSuccess(`Konversi barang ${data?.nomorKonversi || ''} berhasil diperbarui.`);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || err?.message || 'Gagal memperbarui transaksi konversi.');
    },
  });

  const deleteKonversiMutation = useMutation({
    mutationFn: async (id: number) => {
      const res: any = await apiClient.delete(`/inventory/konversi/${id}`);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['konversiBarangs'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryStockSummaryAll'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      setDeletingRecord(null);
      setActionSuccess(data?.message || 'Konversi barang berhasil dibatalkan dan stok dikembalikan.');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'Gagal membatalkan transaksi konversi.');
      setDeletingRecord(null);
    },
  });

  const resetForm = () => {
    setFormTanggal(todayStr);
    setFormBarangAwalId('');
    setFormQtyAwal(0);
    setFormBarangAkhirId('');
    setFormQtyAkhir(0);
    setFormHargaAkhir(0);
    setFormKeterangan('');
    setFormError(null);
    setEditingId(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setModalMode('CREATE');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (rec: KonversiRecord) => {
    resetForm();
    setModalMode('EDIT');
    setEditingId(rec.id);
    setFormTanggal(rec.tanggal ? rec.tanggal.slice(0, 10) : todayStr);
    setFormBarangAwalId(String(rec.barangAwalId));
    setFormQtyAwal(Number(rec.qtyAwal));
    setFormBarangAkhirId(String(rec.barangAkhirId));
    setFormQtyAkhir(Number(rec.qtyAkhir));
    const hpp = Number(rec.hppAkhir) || (Number(rec.qtyAkhir) > 0 ? Number(rec.totalNominal) / Number(rec.qtyAkhir) : 0);
    setFormHargaAkhir(hpp);
    setFormKeterangan(rec.keterangan || '');
    setIsFormModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formBarangAwalId) {
      setFormError('Silakan pilih barang asal (awal) yang akan dikonversi.');
      return;
    }
    if (!formBarangAkhirId) {
      setFormError('Silakan pilih barang tujuan (akhir) hasil konversi.');
      return;
    }
    if (formBarangAwalId === formBarangAkhirId) {
      setFormError('Barang awal dan barang akhir hasil konversi tidak boleh sama.');
      return;
    }
    if (formQtyAwal <= 0) {
      setFormError('Kuantitas barang asal harus lebih besar dari 0.');
      return;
    }
    if (formQtyAkhir <= 0) {
      setFormError('Kuantitas barang akhir harus lebih besar dari 0.');
      return;
    }
    if (formHargaAkhir <= 0) {
      setFormError('Harga modal barang hasil harus lebih besar dari Rp 0.');
      return;
    }

    const totalNominal = Number((formQtyAkhir * formHargaAkhir).toFixed(2));

    const payload = {
      tanggal: formTanggal,
      barangAwalId: Number(formBarangAwalId),
      qtyAwal: formQtyAwal,
      barangAkhirId: Number(formBarangAkhirId),
      qtyAkhir: formQtyAkhir,
      hppAkhir: formHargaAkhir,
      totalNominal,
      keterangan: formKeterangan || `Konversi ${selectedBarangAwal?.name || ''} ke ${selectedBarangAkhir?.name || ''}`,
    };

    if (modalMode === 'CREATE') {
      createKonversiMutation.mutate(payload);
    } else if (editingId) {
      updateKonversiMutation.mutate({ id: editingId, payload });
    }
  };

  const handleExportExcel = () => {
    if (items.length === 0) {
      alert('Tidak ada data konversi untuk diekspor.');
      return;
    }

    const exportRows = items.map((r: KonversiRecord, idx: number) => ({
      No: idx + 1,
      'No Konversi': r.nomorKonversi,
      Tanggal: r.tanggal ? r.tanggal.slice(0, 10) : '',
      'Barang Awal (Asal)': r.barangAwal?.name || '-',
      'Qty Awal': Number(r.qtyAwal || 0),
      'Satuan Awal': r.barangAwal?.satuan?.name || 'Kg',
      'HPP Awal (Rp)': Number(r.hppAwal || 0),
      'Barang Akhir (Hasil)': r.barangAkhir?.name || '-',
      'Qty Akhir': Number(r.qtyAkhir || 0),
      'Satuan Akhir': r.barangAkhir?.satuan?.name || 'Kg',
      'HPP Akhir (Rp)': Number(r.hppAkhir || 0),
      'Total Modal (Rp)': Number(r.totalNominal || 0),
      Keterangan: r.keterangan || '-',
      Petugas: r.user?.name || r.user?.username || '-',
    }));

    exportToExcel({
      filename: `Laporan_Konversi_Barang_${todayStr}`,
      sheetName: 'Konversi',
      title: 'LAPORAN KONVERSI BARANG',
      columns: [
        { header: 'No', key: 'No', width: 6 },
        { header: 'No Konversi', key: 'No Konversi', width: 22 },
        { header: 'Tanggal', key: 'Tanggal', width: 14 },
        { header: 'Barang Awal (Asal)', key: 'Barang Awal (Asal)', width: 28 },
        { header: 'Qty Awal', key: 'Qty Awal', width: 12 },
        { header: 'Satuan Awal', key: 'Satuan Awal', width: 12 },
        { header: 'HPP Awal (Rp)', key: 'HPP Awal (Rp)', width: 15 },
        { header: 'Barang Akhir (Hasil)', key: 'Barang Akhir (Hasil)', width: 28 },
        { header: 'Qty Akhir', key: 'Qty Akhir', width: 12 },
        { header: 'Satuan Akhir', key: 'Satuan Akhir', width: 12 },
        { header: 'HPP Akhir (Rp)', key: 'HPP Akhir (Rp)', width: 15 },
        { header: 'Total Modal (Rp)', key: 'Total Modal (Rp)', width: 18 },
        { header: 'Keterangan', key: 'Keterangan', width: 35 },
        { header: 'Petugas', key: 'Petugas', width: 18 },
      ],
      data: exportRows,
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(num || 0);
  };

  const formatRupiah = (num: number) => {
    return 'Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(num || 0);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-1">
            <ArrowRightLeft className="w-4 h-4" />
            <span>Manajemen Stok & Reproses</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center space-x-3">
            <span>{fixedJenisName ? `Konversi ${fixedJenisName}` : 'Konversi & Reproses Barang'}</span>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold">
              {fixedJenisName || 'Ganti Jenis Pakan & Repack'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Catat pemrosesan, sortir grade, atau transformasi komoditas (seperti sortir telur <strong>Horen Merah ⇄ Horen Putih</strong>, giling <strong>Jagung OC</strong>, repack pakan, dsb). Sistem secara otomatis memotong stok asal dan menerbitkan batch stok baru dengan harga modal yang disesuaikan (susut harga atau naik).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {canExport && (
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center space-x-2 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Ekspor Excel</span>
            </button>
          )}
          {canCreate && (
            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center space-x-2 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Konversi Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Notification */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center space-x-3 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari no. konversi, barang, atau keterangan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          {(startDate || endDate || search) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearch('');
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all"
            >
              Reset Filter
            </button>
          )}
          <div className="text-[11px] text-slate-400 font-medium ml-auto">
            Total: <strong>{meta.total}</strong> transaksi
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">No. Konversi & Tanggal</th>
                <th className="py-3 px-4">Barang Awal (Asal)</th>
                <th className="py-3 px-4 text-center">➡️</th>
                <th className="py-3 px-4">Barang Akhir (Hasil)</th>
                <th className="py-3 px-4 text-right">Nilai Total Modal</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4">Petugas</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoadingKonversi ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Memuat data riwayat konversi...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <ArrowRightLeft className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p className="font-bold text-slate-600">Belum Ada Transaksi Konversi Barang</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Klik tombol <strong>"+ Buat Konversi Baru"</strong> untuk memproses perubahan barang.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((row: KonversiRecord) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-indigo-700">{row.nomorKonversi}</div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{row.tanggal ? row.tanggal.slice(0, 10) : '-'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{row.barangAwal?.name || '-'}</div>
                      <div className="text-[11px] text-rose-600 font-semibold flex items-center space-x-1">
                        <span>- {formatNumber(row.qtyAwal)} {row.barangAwal?.satuan?.name || 'Kg'}</span>
                        <span className="text-slate-400">(@ {formatRupiah(row.hppAwal)})</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center text-indigo-500">
                      <span className="inline-block p-1 bg-indigo-50 rounded-lg">
                        <ArrowRightLeft className="w-4 h-4" />
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{row.barangAkhir?.name || '-'}</div>
                      <div className="text-[11px] text-emerald-600 font-semibold flex items-center space-x-1">
                        <span>+ {formatNumber(row.qtyAkhir)} {row.barangAkhir?.satuan?.name || 'Kg'}</span>
                        <span className="text-slate-400">(@ {formatRupiah(row.hppAkhir)})</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="font-black font-mono text-slate-900">{formatRupiah(row.totalNominal)}</div>
                      <div className="text-[10px] text-slate-400 font-medium">Beban/Susut: Rp 0 (Net)</div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-500 text-[11px]">
                      {row.keterangan || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {row.user?.name || row.user?.username || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => setSelectedDetail(row)}
                          title="Lihat Detail & Jurnal"
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-indigo-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canUpdate && (
                          <button
                            onClick={() => handleOpenEditModal(row)}
                            title="Edit Konversi"
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-amber-600 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeletingRecord(row)}
                            title="Batalkan & Hapus Konversi"
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Halaman {meta.page} dari {meta.totalPages}
            </span>
            <div className="flex space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: INPUT / EDIT KONVERSI */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-100 shadow-2xl overflow-hidden my-8">
            <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest">
                  {modalMode === 'CREATE' ? 'Formulir Konversi' : 'Edit Transaksi Konversi'}
                </span>
                <h3 className="text-lg font-black tracking-tight">
                  {modalMode === 'CREATE' ? '⚡ Buat Konversi & Reproses Barang' : '✏️ Perbarui Konversi Barang'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-5">
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Tanggal Transaksi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tanggal Konversi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formTanggal}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                />
              </div>

              {/* Grid 2 Kolom: Barang Awal vs Barang Akhir */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. BARANG AWAL (ASAL) */}
                <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-rose-800 uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">
                      1
                    </span>
                    <span>Barang Asal (Awal)</span>
                  </div>

                  <div>
                    <SearchableBarangSelect
                      barangs={barangsList}
                      stockItems={stockItems}
                      value={formBarangAwalId}
                      onChange={handleBarangAwalChange}
                      label="Pilih Barang Asal"
                      placeholder="Cari barang asal (misal Jagung OC)..."
                      required
                    />
                    {selectedBarangAwal && (
                      <div className="mt-1.5 text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-rose-100 flex items-center justify-between">
                        <span>
                          Stok Tersedia:{' '}
                          <strong className="text-rose-700">
                            {formatNumber(barangAwalStock.stok)} {selectedBarangAwal?.satuan?.name || 'Kg'}
                          </strong>
                        </span>
                        <span>
                          HPP: <strong className="text-slate-800">{formatRupiah(barangAwalStock.hpp)}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Kuantitas Diambil ({selectedBarangAwal?.satuan?.name || 'Kg'}){' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="Contoh: 4485"
                      value={formQtyAwal || ''}
                      onChange={(e) => handleQtyAwalChange(parseFloat(e.target.value) || 0)}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 bg-white"
                    />
                  </div>
                </div>

                {/* 2. BARANG AKHIR (TUJUAN) */}
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-emerald-800 uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                      2
                    </span>
                    <span>Barang Hasil (Tujuan)</span>
                  </div>

                  <div>
                    <SearchableBarangSelect
                      barangs={barangsList}
                      stockItems={stockItems}
                      value={formBarangAkhirId}
                      onChange={(id) => {
                        setFormBarangAkhirId(id);
                        setFormError(null);
                      }}
                      label="Pilih Barang Hasil"
                      placeholder="Cari barang hasil (misal Jagung Giling)..."
                      required
                    />
                    {selectedBarangAkhir && (
                      <div className="mt-1.5 text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-emerald-100">
                        Jenis: <strong className="text-slate-800">{selectedBarangAkhir?.jenis?.name || '-'}</strong> |
                        Satuan: <strong className="text-slate-800">{selectedBarangAkhir?.satuan?.name || 'Kg'}</strong>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Kuantitas Hasil ({selectedBarangAkhir?.satuan?.name || 'Kg'}){' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="Contoh: 4485"
                      value={formQtyAkhir || ''}
                      onChange={(e) => setFormQtyAkhir(parseFloat(e.target.value) || 0)}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 3. INPUT HARGA MODAL BARANG HASIL */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase">
                    Harga Modal Barang Hasil (Rp/{selectedBarangAkhir?.satuan?.name || 'Kg'}) <span className="text-rose-500">*</span>
                  </label>
                  {barangAwalStock.hpp > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormHargaAkhir(barangAwalStock.hpp)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                    >
                      ⚡ Samakan dg HPP Asal (@ {formatRupiah(barangAwalStock.hpp)})
                    </button>
                  )}
                </div>

                <CurrencyInput
                  value={formHargaAkhir}
                  onChange={(val) => setFormHargaAkhir(val)}
                  placeholder="Contoh: Rp 22.500 atau Rp 12.350,5"
                  allowDecimal={true}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-mono font-bold bg-white"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                  <span>
                    Total Nilai Modal:{' '}
                    <strong className="text-emerald-700 font-mono text-xs">
                      {formatRupiah(calculatedTotalNominal)}
                    </strong>{' '}
                    ({formatNumber(formQtyAkhir)} {selectedBarangAkhir?.satuan?.name || 'Kg'} × {formatRupiah(formHargaAkhir)})
                  </span>
                  <span className="text-slate-400 font-medium">Beban/Susut: Rp 0 (Netral)</span>
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Keterangan / Catatan Pemrosesan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Giling Jagung OC menjadi Jagung Giling"
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>

              {/* Live Preview Card */}
              {formBarangAwalId && formBarangAkhirId && formQtyAwal > 0 && formQtyAkhir > 0 && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-[11px] space-y-1.5 text-indigo-950">
                  <div className="font-bold uppercase tracking-wider flex items-center space-x-1.5 text-indigo-700">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ringkasan Alur Konversi:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-medium">
                    <div className="bg-white p-2 rounded-xl border border-indigo-100">
                      🔻 Potong Stok: <strong>{selectedBarangAwal?.name}</strong> (-{formatNumber(formQtyAwal)}{' '}
                      {selectedBarangAwal?.satuan?.name || 'Kg'})
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-indigo-100">
                      🔺 Tambah Batch: <strong>{selectedBarangAkhir?.name}</strong> (+{formatNumber(formQtyAkhir)}{' '}
                      {selectedBarangAkhir?.satuan?.name || 'Kg'})
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-indigo-100">
                      ⚖️ Nilai Modal: <strong>{formatRupiah(calculatedTotalNominal)}</strong> (@ {formatRupiah(formHargaAkhir)})
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createKonversiMutation.isPending || updateKonversiMutation.isPending}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all"
                >
                  {createKonversiMutation.isPending || updateKonversiMutation.isPending ? (
                    <span className="flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </span>
                  ) : modalMode === 'CREATE' ? (
                    'Simpan Konversi'
                  ) : (
                    'Simpan Perubahan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                  Detail Transaksi Konversi
                </span>
                <h3 className="text-base font-black text-slate-800">{selectedDetail.nomorKonversi}</h3>
              </div>
              <button
                onClick={() => setSelectedDetail(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Tanggal</span>
                  <span className="font-bold text-slate-800">
                    {selectedDetail.tanggal ? selectedDetail.tanggal.slice(0, 10) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Petugas</span>
                  <span className="font-bold text-slate-800">
                    {selectedDetail.user?.name || selectedDetail.user?.username || '-'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 space-y-1">
                <span className="text-rose-700 font-bold uppercase text-[10px]">Barang Asal (Keluar):</span>
                <div className="font-black text-slate-800 text-sm">{selectedDetail.barangAwal?.name}</div>
                <div className="text-slate-600 flex justify-between">
                  <span>Kuantitas:</span>
                  <strong>
                    {formatNumber(selectedDetail.qtyAwal)} {selectedDetail.barangAwal?.satuan?.name || 'Kg'}
                  </strong>
                </div>
                <div className="text-slate-600 flex justify-between">
                  <span>HPP Modal:</span>
                  <strong>{formatRupiah(selectedDetail.hppAwal)} / satuan</strong>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-1">
                <span className="text-emerald-700 font-bold uppercase text-[10px]">Barang Hasil (Masuk):</span>
                <div className="font-black text-slate-800 text-sm">{selectedDetail.barangAkhir?.name}</div>
                <div className="text-slate-600 flex justify-between">
                  <span>Kuantitas:</span>
                  <strong>
                    {formatNumber(selectedDetail.qtyAkhir)} {selectedDetail.barangAkhir?.satuan?.name || 'Kg'}
                  </strong>
                </div>
                <div className="text-slate-600 flex justify-between">
                  <span>HPP Baru:</span>
                  <strong>{formatRupiah(selectedDetail.hppAkhir)} / satuan</strong>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                <span className="font-bold text-indigo-900 uppercase text-[11px]">Total Modal Dipindahkan:</span>
                <span className="font-black text-indigo-900 font-mono text-base">
                  {formatRupiah(selectedDetail.totalNominal)}
                </span>
              </div>

              {selectedDetail.jurnal && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-700 text-[10px] uppercase flex items-center space-x-1">
                    <Scale className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Jurnal Akuntansi: {selectedDetail.jurnal.nomorJurnal}</span>
                  </div>
                  <div className="text-[11px] font-mono divide-y divide-slate-200">
                    {selectedDetail.jurnal.details?.map((d: any) => (
                      <div key={d.id} className="py-1 flex justify-between">
                        <span>Akun #{d.coaId}</span>
                        <span>
                          {Number(d.debit) > 0 ? `(D) ${formatRupiah(d.debit)}` : `(K) ${formatRupiah(d.kredit)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedDetail(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-800">Batalkan Konversi Barang?</h3>
              <p className="text-xs text-slate-500">
                Anda akan membatalkan konversi <strong>{deletingRecord.nomorKonversi}</strong>. Stok barang asal (
                {deletingRecord.barangAwal?.name}) akan dikembalikan sebanyak{' '}
                <strong>
                  {formatNumber(deletingRecord.qtyAwal)} {deletingRecord.barangAwal?.satuan?.name || 'Kg'}
                </strong>
                , dan batch barang hasil akan dihapus.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteKonversiMutation.isPending}
                onClick={() => deleteKonversiMutation.mutate(deletingRecord.id)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                {deleteKonversiMutation.isPending ? 'Membatalkan...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
