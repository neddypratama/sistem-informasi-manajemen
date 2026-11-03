import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { SearchableClientSelect } from '../../components/SearchableClientSelect';
import { SearchableSelect } from '../../components/SearchableSelect';
import { CurrencyInput } from '../../components/CurrencyInput';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { Pagination } from '../../components/Pagination';
import { exportToExcel, formatDateIndo } from '../../lib/export-utils';
import { getTodayDateString, getCurrentMonthRange, getLastMonthRange } from '../../lib/date-utils';
import { useAuthStore, hasPermission } from '../../stores/auth.store';
import {
  WalletCards,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  Users,
  Wallet,
  FileCheck2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const PiutangPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canCreate = hasPermission(user, ['piutang:create', 'piutang_bayar:create', 'piutang:manage']);
  const canUpdate = hasPermission(user, ['piutang:update', 'piutang:manage']);
  const canDelete = hasPermission(user, ['piutang:delete', 'piutang_bayar:delete', 'piutang:manage']);
  const canExport = hasPermission(user, ['piutang:export', 'piutang:read']);

  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedKategoriId, setSelectedKategoriId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('SELESAI');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [detailTx, setDetailTx] = useState<any | null>(null);
  const [editTx, setEditTx] = useState<any | null>(null);
  const [deleteTx, setDeleteTx] = useState<any | null>(null);

  // Form states (Add)
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [formClientId, setFormClientId] = useState('');
  const [formKategoriId, setFormKategoriId] = useState('');
  const [formType, setFormType] = useState<'TAMBAH' | 'BAYAR'>('BAYAR');
  const [formKasBankKategoriId, setFormKasBankKategoriId] = useState('64'); // Default Kas Tunai
  const [formPaymentMethod, setFormPaymentMethod] = useState<'TUNAI' | 'TRANSFER'>('TUNAI');
  const [formNominal, setFormNominal] = useState<number>(0);
  const [formKeterangan, setFormKeterangan] = useState('');

  // Form states (Edit)
  const [editKeterangan, setEditKeterangan] = useState('');
  const [editTanggal, setEditTanggal] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editKategoriId, setEditKategoriId] = useState('');
  const [editNominal, setEditNominal] = useState<number>(0);
  const [editType, setEditType] = useState<'TAMBAH' | 'BAYAR'>('BAYAR');
  const [editKasBankKategoriId, setEditKasBankKategoriId] = useState('64');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'TUNAI' | 'TRANSFER'>('TUNAI');

  // 1. Fetch Categories for Piutang (Detail Kategori Piutang: IDs 46 - 58)
  const { data: kategorisData } = useQuery({
    queryKey: ['kategorisPiutang'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/kategoris?limit=150');
      const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      return items.filter(
        (k: any) =>
          (k.id >= 46 && k.id <= 58) ||
          k.detailKategori?.name?.toLowerCase().includes('piutang') ||
          k.name.toLowerCase().includes('piutang')
      );
    },
  });

  // 2. Fetch Kas & Bank accounts (detailKategori = 'Kas' atau 'Bank%')
  const { data: kasBankData } = useQuery({
    queryKey: ['kategorisKasBank'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/kategoris?limit=150');
      const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      return items.filter((k: any) => {
        const dName = (k.detailKategori?.name || '').toLowerCase().trim();
        return dName === 'kas' || dName.startsWith('bank');
      });
    },
  });

  // Pisahkan Kategori Kas (detailKategori = 'Kas') dan Kategori Transfer (detailKategori = 'Bank%')
  const kategoriKasList = useMemo(() => {
    if (!kasBankData || !Array.isArray(kasBankData)) return [];
    return kasBankData.filter((k: any) => {
      const dName = (k.detailKategori?.name || '').toLowerCase().trim();
      return dName === 'kas';
    });
  }, [kasBankData]);

  const kategoriTransferList = useMemo(() => {
    if (!kasBankData || !Array.isArray(kasBankData)) return [];
    return kasBankData.filter((k: any) => {
      const dName = (k.detailKategori?.name || '').toLowerCase().trim();
      return dName.startsWith('bank');
    });
  }, [kasBankData]);

  // 3. Fetch Clients (Mitra, Pedagang, Peternak)
  const { data: clientsData } = useQuery({
    queryKey: ['clientsList'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/clients?limit=2000');
      return Array.isArray(res.data) ? res.data : (res.data?.items || []);
    },
  });

  // 4. Fetch Piutang Transactions (module=PIUTANG)
  const { data: txData, isLoading } = useQuery({
    queryKey: ['transaksiPiutang', search, startDate, endDate, selectedKategoriId, selectedClientId, selectedType, selectedStatus, page, limit],
    queryFn: async () => {
      let url = `/transaksi?module=PIUTANG&limit=${limit}&page=${page}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (selectedKategoriId) url += `&kategoriId=${selectedKategoriId}`;
      if (selectedClientId) url += `&clientId=${selectedClientId}`;
      if (selectedType) url += `&type=${selectedType}`;
      if (selectedStatus) url += `&status=${selectedStatus}`;
      const res: any = await apiClient.get(url);
      return res;
    },
  });

  // 5. Fetch Client Saldo Summary (Total Piutang across active clients)
  const { data: bonTitipanSummary } = useQuery({
    queryKey: ['bonTitipanSummaryPiutang'],
    queryFn: async () => {
      const res: any = await apiClient.get('/reports/bon-titipan');
      return res.data?.ringkasan || null;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/transaksi/piutang', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaksiPiutang'] });
      queryClient.invalidateQueries({ queryKey: ['bonTitipanSummaryPiutang'] });
      queryClient.invalidateQueries({ queryKey: ['clientsList'] });
      queryClient.invalidateQueries({ queryKey: ['laporanKas'] });
      setIsAddOpen(false);
      setFormClientId('');
      setFormKategoriId('');
      setFormNominal(0);
      setFormKeterangan('');
      setFormType('BAYAR');
    },
    onError: (err: any) => {
      alert(`Gagal mencatat mutasi piutang: ${err.response?.data?.message || err.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiClient.put(`/transaksi/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaksiPiutang'] });
      queryClient.invalidateQueries({ queryKey: ['bonTitipanSummaryPiutang'] });
      queryClient.invalidateQueries({ queryKey: ['clientsList'] });
      queryClient.invalidateQueries({ queryKey: ['laporanKas'] });
      setEditTx(null);
    },
    onError: (err: any) => {
      alert(`Gagal mengubah data: ${err.response?.data?.message || err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/transaksi/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaksiPiutang'] });
      queryClient.invalidateQueries({ queryKey: ['bonTitipanSummaryPiutang'] });
      queryClient.invalidateQueries({ queryKey: ['clientsList'] });
      queryClient.invalidateQueries({ queryKey: ['laporanKas'] });
      setDeleteTx(null);
    },
    onError: (err: any) => {
      alert(`Gagal membatalkan transaksi: ${err.response?.data?.message || err.message}`);
    },
  });

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || !formKategoriId || formNominal <= 0) {
      alert('Mohon pilih Mitra, Kategori Piutang, dan masukkan nominal yang valid.');
      return;
    }
    createMutation.mutate({
      tanggal: formTanggal,
      clientId: Number(formClientId),
      kategoriId: Number(formKategoriId),
      type: formType,
      nominal: formNominal,
      keterangan: formKeterangan,
      paymentMethod: formPaymentMethod,
      kasBankKategoriId: Number(formKasBankKategoriId) || 64,
    });
  };

  const handleOpenEdit = (tx: any) => {
    setEditTx(tx);
    setEditKeterangan(tx.keterangan || '');
    setEditTanggal(tx.tanggal ? tx.tanggal.slice(0, 10) : '');
    setEditClientId(tx.clientId ? String(tx.clientId) : '');
    const piutangDetail =
      tx.details?.find(
        (d: any) =>
          d.kategori?.detailKategori?.name?.toLowerCase().includes('piutang') ||
          (Number(d.kategoriId) >= 46 && Number(d.kategoriId) <= 58)
      ) || tx.details?.[0];
    setEditKategoriId(piutangDetail?.kategoriId ? String(piutangDetail.kategoriId) : '');
    setEditNominal(Number(tx.total || 0));
    const isBayar = tx.posisi === 'Kredit' || tx.type === 'KAS_MASUK';
    setEditType(isBayar ? 'BAYAR' : 'TAMBAH');
    const kasId = tx.jurnalUmums?.[0]?.details?.find((d: any) =>
      [64, 65, 66, 67, 68, 69, 70, 71].includes(Number(d.kategoriId))
    )?.kategoriId;
    setEditKasBankKategoriId(String(kasId || (tx.paymentMethod === 'TRANSFER' ? '65' : '64')));
    setEditPaymentMethod(tx.paymentMethod === 'TRANSFER' ? 'TRANSFER' : 'TUNAI');
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTx) return;
    if (editNominal <= 0) {
      alert('Nominal piutang harus lebih dari 0.');
      return;
    }
    updateMutation.mutate({
      id: Number(editTx.id),
      data: {
        keterangan: editKeterangan,
        tanggal: editTanggal,
        clientId: editClientId ? Number(editClientId) : null,
        kategoriId: Number(editKategoriId),
        nominal: editNominal,
        type: editType,
        kasBankKategoriId: Number(editKasBankKategoriId),
        paymentMethod: editPaymentMethod,
      },
    });
  };

  const formatRupiah = (val: number | string | null | undefined) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const items = txData?.data || [];
  const meta = txData?.meta || { total: 0, page: 1, limit: 25, totalPages: 1 };

  // Calculate page level aggregations
  const pageTotal = items
    .filter((it: any) => it.status !== 'BATAL')
    .reduce((sum: number, it: any) => sum + (Number(it.total) || 0), 0);
  const activeCount = items.filter((it: any) => it.status !== 'BATAL').length;

  // Export to Excel
  const handleExportExcel = async () => {
    let dataToExport = items;
    try {
      if (meta.total > items.length) {
        let url = `/transaksi?type=PIUTANG&limit=1000`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        if (selectedKategoriId) url += `&kategoriId=${selectedKategoriId}`;
        if (selectedClientId) url += `&clientId=${selectedClientId}`;
        const res: any = await apiClient.get(url);
        if (res?.data && Array.isArray(res.data)) dataToExport = res.data;
        else if (Array.isArray(res)) dataToExport = res;
      }
    } catch {
      // fallback
    }

    if (!dataToExport.length) {
      alert('Tidak ada data piutang untuk diekspor.');
      return;
    }

    const rows = dataToExport.map((it: any) => {
      const piutangDetail = it.details?.find((d: any) => (d.kategoriId >= 46 && d.kategoriId <= 58) || d.kategori?.name?.toLowerCase().includes('piutang'));
      const isDebit = it.posisi === 'Debit' || it.type === 'KAS_KELUAR';
      return {
        invoice: it.invoice || '-',
        tanggal: formatDateIndo(it.tanggal),
        mitra: it.client?.name || '-',
        tipeMitra: it.client?.type || '-',
        kategori: piutangDetail?.kategori?.name || it.details?.[0]?.kategori?.name || '-',
        tipe: isDebit ? 'Debit (Kas Bon)' : 'Kredit (Bayar)',
        keterangan: it.keterangan || '-',
        metode: it.paymentMethod === 'TUNAI' ? 'KAS' : (it.paymentMethod || 'KAS'),
        total: Number(it.total) || 0,
        status: it.status || '-',
      };
    });

    exportToExcel({
      filename: `Daftar_Piutang_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Piutang',
      title: `DAFTAR MUTASI PIUTANG USAHA & BON MITRA`,
      columns: [
        { header: 'No', key: '_index', width: 6 },
        { header: 'Invoice', key: 'invoice', width: 20 },
        { header: 'Tanggal', key: 'tanggal', width: 14 },
        { header: 'Mitra', key: 'mitra', width: 26 },
        { header: 'Tipe Mitra', key: 'tipeMitra', width: 16 },
        { header: 'Kategori Piutang', key: 'kategori', width: 25 },
        { header: 'Tipe', key: 'tipe', width: 16 },
        { header: 'Keterangan', key: 'keterangan', width: 35 },
        { header: 'Metode Pembayaran', key: 'metode', width: 18 },
        { header: 'Total (Rp)', key: 'total', width: 18 },
        { header: 'Status', key: 'status', width: 14 },
      ],
      data: rows,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2.5">
            <WalletCards className="w-7 h-7 text-amber-600" />
            <span>Manajemen Piutang Usaha & Bon Mitra</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Pengelolaan mutasi bon dan penerimaan pelunasan piutang pedagang telur, peternak, pakan, obat, dan karyawan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canExport && <ExportButtonGroup onExportExcel={handleExportExcel} />}

          {canCreate && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-200 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Mutasi Piutang</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Bon (Piutang) Berjalan</span>
            <WalletCards className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-700 font-mono mt-2">
            {formatRupiah(bonTitipanSummary?.totalPiutang || 0)}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Saldo Tagihan ke Mitra / Pedagang</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Keseluruhan Piutang</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-800 font-mono mt-2">
            {formatRupiah(meta.totalKeseluruhan ?? pageTotal)}
          </p>
          <span className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Akumulasi Seluruh Halaman ({meta.total.toLocaleString('id-ID')} Data)
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Transaksi</span>
            <FileCheck2 className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono mt-2">
            {meta.total} <span className="text-sm font-normal text-slate-400">Invoice</span>
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            {activeCount} aktif di halaman {meta.page}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Mitra Terkait</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-900 font-mono mt-2">
            {clientsData?.length || 0}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Pedagang & Peternak</span>
        </div>
      </div>

      {/* Filter Bar Responsive Mobile & Desktop */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        {/* Baris 1: Search, Kategori, Mitra, Tipe, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Input */}
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari no invoice, mitra..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[42px]"
            />
          </div>

          {/* Kategori Filter */}
          <div className="w-full">
            <SearchableSelect
              placeholder="Semua Kategori Piutang"
              searchPlaceholder="Cari kategori piutang..."
              value={selectedKategoriId}
              onChange={(val) => {
                setSelectedKategoriId(val ? String(val) : '');
                setPage(1);
              }}
              options={[
                { value: '', label: 'Semua Kategori Piutang' },
                ...(kategorisData?.map((k: any) => ({
                  value: String(k.id),
                  label: k.name,
                })) || []),
              ]}
            />
          </div>

          {/* Client / Mitra Filter */}
          <div className="w-full">
            <SearchableSelect
              placeholder="Semua Mitra / Client"
              searchPlaceholder="Cari nama mitra..."
              value={selectedClientId}
              onChange={(val) => {
                setSelectedClientId(val ? String(val) : '');
                setPage(1);
              }}
              options={[
                { value: '', label: 'Semua Mitra / Client' },
                ...(clientsData?.map((c: any) => ({
                  value: String(c.id),
                  label: c.name,
                  sublabel: c.type,
                })) || []),
              ]}
            />
          </div>

          {/* Type Filter */}
          <div className="w-full">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[42px]"
            >
              <option value="">Semua Tipe (Debit & Kredit)</option>
              <option value="Debit">Debit (Kas Bon / Baru)</option>
              <option value="Kredit">Kredit (Pelunasan / Bayar)</option>
            </select>
          </div>

          {/* Status Filter (Aktif vs Dihapus) */}
          <div className="w-full">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[42px]"
            >
              <option value="SELESAI">Aktif (Tidak Dihapus)</option>
              <option value="BATAL">Hanya yang Dihapus (Batal)</option>
              <option value="ALL">Semua Status (Aktif & Dihapus)</option>
            </select>
          </div>
        </div>

        {/* Baris 2: Quick Dates & Custom Date Range */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Quick Dates Scrollable */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-[11px] font-semibold bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => {
                const today = getTodayDateString();
                setStartDate(today);
                setEndDate(today);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                startDate === getTodayDateString() && endDate === getTodayDateString()
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
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
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                startDate === getCurrentMonthRange().startDate && endDate === getCurrentMonthRange().endDate
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
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
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                startDate === getLastMonthRange().startDate && endDate === getLastMonthRange().endDate
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulan Lalu
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                !startDate && !endDate
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Waktu
            </button>
          </div>

          {/* Date range inputs & Reset Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="grid grid-cols-2 sm:flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-36 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                title="Dari Tanggal"
              />
              <span className="hidden sm:inline text-slate-400 text-xs font-medium">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-36 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                title="Sampai Tanggal"
              />
            </div>

            {(search || startDate || endDate || selectedKategoriId || selectedClientId || selectedType || (selectedStatus && selectedStatus !== 'SELESAI')) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStartDate('');
                  setEndDate('');
                  setSelectedKategoriId('');
                  setSelectedClientId('');
                  setSelectedType('');
                  setSelectedStatus('SELESAI');
                  setPage(1);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 font-bold rounded-xl transition-colors border border-amber-200/60"
                title="Reset semua filter"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4">Invoice</th>
                <th className="py-3.5 px-4">Mitra / Client</th>
                <th className="py-3.5 px-4">Kategori Piutang</th>
                <th className="py-3.5 px-4 text-center w-28">Tipe</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4">Metode</th>
                <th className="py-3.5 px-4 text-right">Nominal (Rp)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    Memuat data mutasi piutang...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <p className="text-slate-500 font-medium text-sm">
                      {startDate || endDate
                        ? `Tidak ada transaksi piutang pada filter tanggal (${startDate || 'Awal'} s/d ${endDate || 'Kini'}).`
                        : 'Tidak ada transaksi piutang yang sesuai dengan kriteria filter.'}
                    </p>
                    {(startDate || endDate) && (
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => {
                            const m = getLastMonthRange();
                            setStartDate(m.startDate);
                            setEndDate(m.endDate);
                            setPage(1);
                          }}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 transition-all cursor-pointer"
                        >
                          Lihat Bulan Lalu (Oktober 2026)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStartDate('');
                            setEndDate('');
                            setPage(1);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                        >
                          Tampilkan Semua Waktu
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((tx: any, idx: number) => {
                  const piutangDetail = tx.details?.find(
                    (d: any) =>
                      (d.kategoriId >= 46 && d.kategoriId <= 58) ||
                      d.kategori?.name?.toLowerCase().includes('piutang')
                  );
                  const kategoriName = piutangDetail?.kategori?.name || 'Piutang';
                  const isBatal = tx.status === 'BATAL';

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isBatal ? 'bg-slate-50/50 opacity-60' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center text-slate-400 font-mono">
                        {(meta.page - 1) * meta.limit + idx + 1}
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap font-medium">
                        {tx.tanggal ? tx.tanggal.slice(0, 10) : '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {tx.invoice}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {tx.client?.name || '-'}
                        </div>
                        {tx.client?.type && (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                            {tx.client.type}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          {kategoriName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {tx.posisi === 'Debit' || tx.type === 'KAS_KELUAR' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Debit (Kas Bon)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Kredit (Bayar)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={tx.keterangan}>
                        {tx.keterangan || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.paymentMethod === 'TUNAI' || tx.paymentMethod === 'KAS'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : tx.paymentMethod === 'TRANSFER'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {tx.paymentMethod === 'TUNAI' ? 'KAS' : (tx.paymentMethod || 'KAS')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatRupiah(tx.total)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isBatal ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-500" />
                            Dihapus
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setDetailTx(tx)}
                            title="Lihat Detail Transaksi & Jurnal"
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {!isBatal && (
                            <>
                              {canUpdate && (
                                <button
                                  onClick={() => handleOpenEdit(tx)}
                                  title="Edit Keterangan / Tanggal"
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => setDeleteTx(tx)}
                                  title="Batalkan Transaksi (Soft Delete)"
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-xs">
              <tr className="border-b border-slate-200 text-slate-600">
                <td colSpan={8} className="py-2.5 px-4 text-right">
                  Subtotal Halaman Ini ({activeCount} Data Aktif):
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-slate-800 whitespace-nowrap">
                  {formatRupiah(pageTotal)}
                </td>
                <td colSpan={2}></td>
              </tr>
              <tr className="bg-emerald-50/70 text-slate-900 font-extrabold text-[13px]">
                <td colSpan={8} className="py-3.5 px-4 text-right uppercase tracking-wider text-emerald-900">
                  Total Keseluruhan ({meta.total.toLocaleString('id-ID')} Transaksi):
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-emerald-700 whitespace-nowrap">
                  {formatRupiah(meta.totalKeseluruhan ?? pageTotal)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination Bar */}
        <Pagination
          page={page}
          limit={limit}
          total={meta.total || 0}
          totalPages={meta.totalPages}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          entityName="transaksi piutang"
        />
      </div>

      {/* MODAL 1: Catat Mutasi Piutang */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Catat Mutasi Piutang Usaha</h3>
                  <p className="text-xs text-slate-500">Mencatat penambahan atau pelunasan bon mitra</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tipe Mutasi Piutang <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('BAYAR')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                      formType === 'BAYAR'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Penerimaan / Bayar Piutang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('TAMBAH')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                      formType === 'TAMBAH'
                        ? 'border-amber-600 bg-amber-50 text-amber-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-amber-600" />
                    <span>Piutang Bertambah (Bon Baru)</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {formType === 'BAYAR'
                    ? 'Penerimaan uang kas dari mitra untuk melunasi piutang (Debit Kas/Bank, Kredit Piutang)'
                    : 'Pemberian bon/pinjaman yang menambah saldo piutang mitra (Debit Piutang, Kredit Kas/Bank)'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tanggal Transaksi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Metode Transaksi (Kategori Kas & Transfer) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formKasBankKategoriId}
                    onChange={(e) => {
                      const selectedId = Number(e.target.value);
                      setFormKasBankKategoriId(String(selectedId));
                      if ([64, 71].includes(selectedId)) {
                        setFormPaymentMethod('TUNAI');
                      } else {
                        setFormPaymentMethod('TRANSFER');
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium text-slate-800"
                  >
                    <optgroup label="-- KATEGORI KAS --">
                      {kategoriKasList.map((k: any) => (
                        <option key={k.id} value={k.id}>
                          {k.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="-- KATEGORI TRANSFER / BANK --">
                      {kategoriTransferList.map((k: any) => (
                        <option key={k.id} value={k.id}>
                          {k.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <SearchableClientSelect
                clients={clientsData || []}
                value={formClientId}
                onChange={(id) => setFormClientId(id)}
                balanceType="piutang"
                label="Pilih Mitra / Client"
                placeholder="🔍 Ketik nama mitra (pedagang/peternak)..."
                required
              />

              <div>
                <SearchableSelect
                  label="Akun / Kategori Piutang"
                  options={
                    kategorisData?.map((k: any) => ({
                      value: String(k.id),
                      label: k.name,
                      sublabel: k.code ? `[${k.code}]` : undefined,
                    })) || []
                  }
                  value={formKategoriId}
                  onChange={(val) => setFormKategoriId(String(val))}
                  placeholder="-- Pilih Kategori Piutang --"
                  searchPlaceholder="Cari kategori piutang..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nominal Piutang (Rp) <span className="text-rose-500">*</span>
                </label>
                <CurrencyInput
                  required
                  value={formNominal}
                  onChange={setFormNominal}
                  placeholder="Contoh: Rp 1.000.000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                {formNominal > 0 && (
                  <p className="text-[11px] font-mono text-amber-600 mt-1 font-semibold">
                    Terbilang: {formatRupiah(formNominal)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Keterangan / Catatan Transaksi
                </label>
                <textarea
                  rows={2}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Catatan pelunasan, nomor bukti transfer, memo bank, dll..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-200 transition-all"
                >
                  {createMutation.isPending ? 'Menyimpan...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Detail Transaksi & Jurnal */}
      {detailTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Rincian Transaksi Piutang</h3>
                  <p className="text-xs font-mono text-slate-500">{detailTx.invoice}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailTx(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Tanggal</span>
                  <span className="font-semibold text-slate-800">
                    {detailTx.tanggal ? detailTx.tanggal.slice(0, 10) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Mitra</span>
                  <span className="font-semibold text-slate-800">{detailTx.client?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Metode</span>
                  <span className="font-semibold text-slate-800">
                    {detailTx.paymentMethod === 'TUNAI' ? 'KAS' : detailTx.paymentMethod}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total</span>
                  <span className="font-bold text-amber-700 font-mono">{formatRupiah(detailTx.total)}</span>
                </div>
              </div>

              {detailTx.keterangan && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Catatan</span>
                  <p className="text-slate-700">{detailTx.keterangan}</p>
                </div>
              )}

              {/* Rincian Detail Transaksi */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Item & Kategori Akun:</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="py-2 px-3">Kategori</th>
                        <th className="py-2 px-3">Barang</th>
                        <th className="py-2 px-3 text-right">Qty</th>
                        <th className="py-2 px-3 text-right">Harga</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailTx.details?.map((d: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {d.kategori?.name || '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{d.barang?.name || '-'}</td>
                          <td className="py-2 px-3 text-right font-mono">{d.qty || 1}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatRupiah(d.hargaSatuan)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(d.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDetailTx(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Transaksi */}
      {editTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Transaksi Piutang Usaha</h3>
                <p className="text-xs text-slate-500">
                  Perubahan akan otomatis menyelaraskan jurnal akuntansi dan saldo piutang mitra terkait.
                </p>
              </div>
              <button
                onClick={() => setEditTx(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nomor Invoice
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editTx.invoice}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tanggal Transaksi
                  </label>
                  <input
                    type="date"
                    required
                    value={editTanggal}
                    onChange={(e) => setEditTanggal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Jenis Tindakan Piutang
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="BAYAR">Pelunasan / Bayar Piutang (Mengurangi Piutang Mitra - Kas Masuk)</option>
                  <option value="TAMBAH">Penambahan Piutang (Menambah Piutang Mitra - Kas Keluar)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mitra Terkait (Pelanggan / Pedagang)
                </label>
                <SearchableSelect
                  placeholder="Pilih Mitra..."
                  searchPlaceholder="Cari nama mitra..."
                  value={editClientId}
                  onChange={(val) => setEditClientId(val ? String(val) : '')}
                  options={(clientsData || []).map((c: any) => ({
                    value: String(c.id),
                    label: `${c.name} (${c.type})`,
                  }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Kategori Akun Piutang
                </label>
                <SearchableSelect
                  placeholder="Pilih Kategori Piutang..."
                  searchPlaceholder="Cari kategori..."
                  value={editKategoriId}
                  onChange={(val) => setEditKategoriId(val ? String(val) : '')}
                  options={(kategorisData || []).map((k: any) => ({
                    value: String(k.id),
                    label: `[${k.code || k.id}] ${k.name}`,
                  }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Metode Pembayaran & Akun Kas/Bank
                </label>
                <select
                  value={editKasBankKategoriId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditKasBankKategoriId(val);
                    setEditPaymentMethod(val === '64' ? 'TUNAI' : 'TRANSFER');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <optgroup label="Tunai / Cash Register">
                    {kategoriKasList.map((k: any) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Transfer Bank">
                    {kategoriTransferList.map((k: any) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nominal Piutang (Rp)
                </label>
                <CurrencyInput
                  required
                  value={editNominal}
                  onChange={setEditNominal}
                  placeholder="Contoh: Rp 1.000.000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                {editNominal > 0 && (
                  <p className="text-[11px] font-mono text-amber-600 mt-1 font-semibold">
                    Terbilang: {formatRupiah(editNominal)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Keterangan / Catatan
                </label>
                <textarea
                  rows={2}
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditTx(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-200 transition-all cursor-pointer"
                >
                  {updateMutation.isPending ? 'Menyimpan...' : 'Perbarui Piutang & Jurnal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Soft Delete Transaksi */}
      {deleteTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Batalkan Transaksi Piutang?</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan mengubah status menjadi BATAL</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan membatalkan transaksi invoice{' '}
              <strong className="font-mono text-slate-800">{deleteTx.invoice}</strong> senilai{' '}
              <strong className="text-amber-700">{formatRupiah(deleteTx.total)}</strong>. Status akan
              diubah menjadi <strong>BATAL</strong> dan saldo piutang mitra terkait akan disesuaikan
              kembali secara otomatis.
            </p>

            <div className="mt-6 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeleteTx(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(Number(deleteTx.id))}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-red-200 transition-all"
              >
                {deleteMutation.isPending ? 'Membatalkan...' : 'Ya, Batalkan Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
