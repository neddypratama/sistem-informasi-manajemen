import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { SearchableSelect } from '../../components/SearchableSelect';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel, formatDateIndo } from '../../lib/export-utils';
import {
  Coins,
  Plus,
  Search,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  CreditCard,
  Banknote,
  TrendingUp,
  FileCheck2,
} from 'lucide-react';

export const PendapatanLainPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedKategoriId, setSelectedKategoriId] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [detailTx, setDetailTx] = useState<any | null>(null);
  const [editTx, setEditTx] = useState<any | null>(null);
  const [deleteTx, setDeleteTx] = useState<any | null>(null);

  // Form states (Add)
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [formKategoriId, setFormKategoriId] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formKasBankKategoriId, setFormKasBankKategoriId] = useState<number>(64);
  const [formPaymentMethod, setFormPaymentMethod] = useState<'TUNAI' | 'TRANSFER'>('TUNAI');
  const [formNominal, setFormNominal] = useState<number>(0);
  const [formKeterangan, setFormKeterangan] = useState('');

  // Form states (Edit)
  const [editKeterangan, setEditKeterangan] = useState('');
  const [editTanggal, setEditTanggal] = useState('');

  // 1. Fetch Categories for Pendapatan Lain-Lain (Excluding commodity sales 1-10)
  const { data: kategorisData } = useQuery({
    queryKey: ['kategorisPendapatanLain'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/kategoris?type=Pendapatan');
      const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      return items.filter((k: any) => Number(k.id) > 10);
    },
  });

  // 1b. Fetch Clients for optional penyetor
  const { data: clientsData } = useQuery({
    queryKey: ['clientsListPendapatanLain'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/clients?limit=500');
      return Array.isArray(res.data) ? res.data : (res.data?.items || []);
    },
  });

  // 2. Fetch Transaksi Pendapatan Lain (module = PENDAPATAN_LAIN)
  const { data: txData, isLoading } = useQuery({
    queryKey: ['transaksiPendapatanLain', search, startDate, endDate, selectedKategoriId, page],
    queryFn: async () => {
      let url = `/transaksi?module=PENDAPATAN_LAIN&limit=25&page=${page}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (selectedKategoriId) url += `&kategoriId=${selectedKategoriId}`;
      const res: any = await apiClient.get(url);
      return res;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/transaksi/pendapatan-lain', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaksiPendapatanLain'] });
      queryClient.invalidateQueries({ queryKey: ['labaRugi'] });
      setIsAddOpen(false);
      setFormKategoriId('');
      setFormClientId('');
      setFormKasBankKategoriId(64);
      setFormNominal(0);
      setFormKeterangan('');
      setFormPaymentMethod('TUNAI');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiClient.put(`/transaksi/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaksiPendapatanLain'] });
      queryClient.invalidateQueries({ queryKey: ['labaRugi'] });
      setEditTx(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/transaksi/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaksiPendapatanLain'] });
      queryClient.invalidateQueries({ queryKey: ['labaRugi'] });
      setDeleteTx(null);
    },
  });

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKategoriId || formNominal <= 0) return;
    createMutation.mutate({
      tanggal: formTanggal,
      kategoriId: Number(formKategoriId),
      nominal: formNominal,
      keterangan: formKeterangan,
      paymentMethod: formPaymentMethod,
      kasBankKategoriId: Number(formKasBankKategoriId),
      clientId: formClientId ? Number(formClientId) : undefined,
    });
  };

  const handleOpenEdit = (tx: any) => {
    setEditTx(tx);
    setEditKeterangan(tx.keterangan || '');
    setEditTanggal(tx.tanggal ? tx.tanggal.slice(0, 10) : '');
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTx) return;
    updateMutation.mutate({
      id: Number(editTx.id),
      data: {
        keterangan: editKeterangan,
        tanggal: editTanggal,
      },
    });
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const rawItems = Array.isArray(txData)
    ? txData
    : Array.isArray(txData?.data?.items)
    ? txData.data.items
    : Array.isArray(txData?.items)
    ? txData.items
    : [];

  const meta = txData?.data?.meta || txData?.meta || { total: rawItems.length, totalPages: 1 };

  // Calculate quick summary metrics from current dataset
  const totalNominal = rawItems.reduce((acc: number, curr: any) => {
    return curr.status === 'BATAL' ? acc : acc + Number(curr.total || 0);
  }, 0);

  const tunaiTotal = rawItems
    .filter((t: any) => t.paymentMethod === 'TUNAI' && t.status !== 'BATAL')
    .reduce((acc: number, curr: any) => acc + Number(curr.total || 0), 0);

  const transferTotal = rawItems
    .filter((t: any) => t.paymentMethod === 'TRANSFER' && t.status !== 'BATAL')
    .reduce((acc: number, curr: any) => acc + Number(curr.total || 0), 0);

  const handleExportExcel = () => {
    if (!rawItems || rawItems.length === 0) {
      alert('Tidak ada data pendapatan lain-lain untuk diekspor');
      return;
    }

    const rows = rawItems.map((tx: any) => {
      const katNames = (tx.details || [])
        .map((d: any) => d.kategori?.name || '-')
        .filter((n: string) => n !== '-')
        .join(', ');

      return {
        invoice: tx.invoice || '-',
        tanggal: formatDateIndo(tx.tanggal),
        kategori: katNames || 'Pendapatan Lain',
        mitra: tx.client?.name || '-',
        keterangan: tx.keterangan || '-',
        paymentMethod: tx.paymentMethod || 'TUNAI',
        total: Number(tx.total) || 0,
        status: tx.status || 'SELESAI',
      };
    });

    exportToExcel({
      filename: `Pendapatan_Lain_${startDate || 'Semua'}_sd_${endDate || 'Kini'}`,
      sheetName: 'Pendapatan Lain',
      title: `DAFTAR PENDAPATAN LAIN-LAIN (${startDate || 'Awal'} s/d ${endDate || 'Kini'})`,
      columns: [
        { header: 'No', key: '_index', width: 6 },
        { header: 'Invoice', key: 'invoice', width: 20 },
        { header: 'Tanggal', key: 'tanggal', width: 14 },
        { header: 'Kategori Pendapatan', key: 'kategori', width: 28 },
        { header: 'Mitra / Penyetor', key: 'mitra', width: 25 },
        { header: 'Keterangan Transaksi', key: 'keterangan', width: 35 },
        { header: 'Metode Pembayaran', key: 'paymentMethod', width: 18 },
        { header: 'Nominal (Rp)', key: 'total', width: 20 },
        { header: 'Status', key: 'status', width: 14 },
      ],
      data: rows,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2">
            <Coins className="w-7 h-7 text-emerald-600" />
            <span>Pendapatan Lain-Lain (Non-Komoditas)</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Pencatatan & rekapitulasi arus kas masuk selain penjualan komoditas utama (Jasa Pengadaan, Transport, Telur Reject, Tali/Sak, dll.)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButtonGroup onExportExcel={handleExportExcel} />
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pendapatan Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Pendapatan (Page)</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono mt-2">
            {formatRupiah(totalNominal)}
          </p>
          <span className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Pemasukan Bersih
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Kas Tunai Masuk</span>
            <Banknote className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-800 font-mono mt-2">
            {formatRupiah(tunaiTotal)}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Metode Tunai / Cash Register</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Transfer Bank Masuk</span>
            <CreditCard className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-blue-900 font-mono mt-2">
            {formatRupiah(transferTotal)}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Rekening Bank (BCA/BRI/BNI)</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Transaksi</span>
            <FileCheck2 className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono mt-2">
            {meta.total} <span className="text-sm font-normal text-slate-400">Pemasukan</span>
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Database Riwayat Transaksi</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari invoice (misal: LNY), keterangan, atau mitra..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={selectedKategoriId}
            onChange={(e) => {
              setSelectedKategoriId(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Kategori Pendapatan</option>
            {kategorisData?.map((k: any) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>

          {/* Date Range */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="bg-transparent font-medium text-slate-700 focus:outline-none"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="bg-transparent font-medium text-slate-700 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="p-4 w-12 text-center">No</th>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Invoice</th>
                <th className="p-4">Kategori Pendapatan</th>
                <th className="p-4">Keterangan</th>
                <th className="p-4 text-center">Metode</th>
                <th className="p-4 text-right">Nominal (Rp)</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400">
                    Memuat data pendapatan lainnya...
                  </td>
                </tr>
              ) : rawItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400">
                    Tidak ada catatan pendapatan lain yang sesuai filter.
                  </td>
                </tr>
              ) : (
                rawItems.map((item: any, i: number) => {
                  const kategoriName =
                    item.details?.[0]?.kategori?.name ||
                    (item.keterangan?.includes('Jasa') ? 'Pendapatan Pengadaan Jasa' : 'Pendapatan Lain-Lain');
                  const isBatal = item.status === 'BATAL';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isBatal ? 'opacity-60 bg-rose-50/20 line-through' : ''
                      }`}
                    >
                      <td className="p-4 text-center font-mono text-slate-400 text-xs">
                        {(page - 1) * 25 + i + 1}
                      </td>
                      <td className="p-4 font-medium text-slate-700 whitespace-nowrap">
                        {item.tanggal ? item.tanggal.slice(0, 10) : '-'}
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                          {item.invoice}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 whitespace-nowrap">
                          {kategoriName}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 max-w-xs truncate" title={item.keterangan}>
                        {item.keterangan || '-'}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                            item.paymentMethod === 'TRANSFER'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.paymentMethod || 'TUNAI'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {formatRupiah(Number(item.total || 0))}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isBatal
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setDetailTx(item)}
                            title="Lihat Detail Transaksi & Jurnal"
                            className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </button>
                          {!isBatal && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(item)}
                                title="Edit Keterangan / Tanggal"
                                className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4 text-amber-600" />
                              </button>
                              <button
                                onClick={() => setDeleteTx(item)}
                                title="Batalkan Transaksi (Soft Delete)"
                                className="p-1.5 hover:bg-rose-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 text-rose-600" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Menampilkan {rawItems.length} dari {meta.total} transaksi
            </span>
            <div className="flex items-center space-x-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
              >
                Sebelumnya
              </button>
              <span className="px-3 py-1.5 font-bold text-slate-700">
                Halaman {page} dari {meta.totalPages}
              </span>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: + Catat Pendapatan Baru */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Catat Pendapatan Lain-Lain</h3>
                  <p className="text-xs text-slate-500">Posting kas masuk & jurnal otomatis</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="p-5 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={formTanggal}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <SearchableSelect
                  label="Kategori Pendapatan"
                  options={
                    kategorisData?.map((k: any) => ({
                      value: String(k.id),
                      label: k.name,
                      sublabel: k.code ? `[${k.code}]` : undefined,
                    })) || []
                  }
                  value={formKategoriId}
                  onChange={(val) => setFormKategoriId(String(val))}
                  placeholder="-- Pilih Kategori Pendapatan --"
                  searchPlaceholder="Ketik untuk mencari kategori pendapatan..."
                  required
                />
              </div>

              <div>
                <SearchableSelect
                  label="Pihak Penyetor / Mitra (Opsional)"
                  options={[
                    { value: '', label: '-- Tanpa Mitra / Pihak Umum --' },
                    ...(clientsData?.map((c: any) => ({
                      value: String(c.id),
                      label: c.name,
                      sublabel: c.type,
                    })) || []),
                  ]}
                  value={formClientId}
                  onChange={(val) => setFormClientId(String(val))}
                  placeholder="-- Tanpa Mitra / Pihak Umum --"
                  searchPlaceholder="Ketik nama mitra/penyetor..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Rekening Kas / Bank Penerima Setoran
                </label>
                <select
                  value={formKasBankKategoriId}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFormKasBankKategoriId(val);
                    setFormPaymentMethod([64, 71].includes(val) ? 'TUNAI' : 'TRANSFER');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs font-semibold"
                  required
                >
                  <option value={64}>[1-1001] Kas Tunai (Pusat)</option>
                  <option value={71}>[1-1002] Kas Deby</option>
                  <option value={66}>[1-1004] Bank BCA Masduki</option>
                  <option value={65}>[1-1003] Bank BCA Binti Wasilah</option>
                  <option value={67}>[1-1005] Bank BRI Binti Wasilah</option>
                  <option value={68}>[1-1006] Bank BRI Masduki</option>
                  <option value={70}>[1-1008] Bank BNI Bima Pratama</option>
                  <option value={69}>[1-1007] Bank BNI Binti Wasilah</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Posting otomatis ke jurnal kas/bank debit dan pendapatan kredit.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nominal Pemasukan (Rp)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formNominal || ''}
                  onChange={(e) => setFormNominal(Number(e.target.value))}
                  placeholder="Contoh: 500000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {formNominal > 0 && (
                  <p className="text-xs font-mono text-emerald-600 font-semibold mt-1">
                    {formatRupiah(formNominal)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Keterangan / Rincian
                </label>
                <textarea
                  rows={2}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Uraian transaksi (opsional)..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !formKategoriId || formNominal <= 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Menyimpan...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Detail Transaksi & Jurnal */}
      {detailTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Detail Transaksi & Jurnal</h3>
                  <p className="text-xs font-mono text-slate-500">{detailTx.invoice}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailTx(null)}
                className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block">Tanggal:</span>
                  <span className="font-bold text-slate-800">{detailTx.tanggal ? detailTx.tanggal.slice(0, 10) : '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Status:</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      detailTx.status === 'BATAL'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {detailTx.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Metode Pembayaran:</span>
                  <span className="font-bold text-slate-800">{detailTx.paymentMethod || 'TUNAI'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Total Nominal:</span>
                  <span className="font-bold font-mono text-emerald-700 text-sm">
                    {formatRupiah(Number(detailTx.total || 0))}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 font-semibold block">Keterangan:</span>
                  <span className="text-slate-700">{detailTx.keterangan || '-'}</span>
                </div>
              </div>

              {/* Rincian Kategori Detail */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Rincian Kategori
                </h4>
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                      <tr>
                        <th className="p-2.5">Kategori ID & Nama</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailTx.details?.map((d: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-medium text-slate-800">
                            {d.kategori?.name || `Kategori ID: ${d.kategoriId || '-'}`}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(Number(d.subtotal || detailTx.total || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Double-Entry Journal Overview */}
              <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 text-xs">
                <span className="font-bold text-emerald-900 block mb-1">
                  Posting Buku Besar (Double-Entry General Ledger):
                </span>
                <p className="text-emerald-800 leading-relaxed">
                  • <b>Debit:</b> {detailTx.paymentMethod === 'TRANSFER' ? 'Bank (Transfer)' : 'Kas Tunai'} (+{formatRupiah(Number(detailTx.total || 0))})
                  <br />
                  • <b>Kredit:</b> {detailTx.details?.[0]?.kategori?.name || 'Pendapatan Lain-Lain'} (+{formatRupiah(Number(detailTx.total || 0))})
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setDetailTx(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Edit Transaksi */}
      {editTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Edit Pendapatan</h3>
                  <p className="text-xs font-mono text-slate-500">{editTx.invoice}</p>
                </div>
              </div>
              <button
                onClick={() => setEditTx(null)}
                className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-5 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Keterangan
                </label>
                <textarea
                  rows={3}
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditTx(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Menyimpan...' : 'Perbarui'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Konfirmasi Soft Delete / Batal */}
      {deleteTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-900 text-base">Batalkan Transaksi Ini?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Status transaksi <span className="font-mono font-bold text-slate-800">{deleteTx.invoice}</span> sebesar{' '}
                  <span className="font-bold text-rose-600">{formatRupiah(Number(deleteTx.total || 0))}</span> akan diubah menjadi <span className="font-bold text-rose-600">BATAL</span>.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeleteTx(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-white font-semibold text-xs"
              >
                Jangan Batalkan
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(Number(deleteTx.id))}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-500/20 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Memproses...' : 'Ya, Batalkan Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendapatanLainPage;
