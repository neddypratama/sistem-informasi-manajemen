import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { SearchableSelect } from '../../components/SearchableSelect';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel, formatDateIndo } from '../../lib/export-utils';
import {
  HandCoins,
  Plus,
  Search,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Receipt,
} from 'lucide-react';

export const BebanPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedKategoriId, setSelectedKategoriId] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [detailTx, setDetailTx] = useState<any | null>(null);
  const [editTx, setEditTx] = useState<any | null>(null);
  const [deleteTx, setDeleteTx] = useState<any | null>(null);

  // Form states
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [formKategoriId, setFormKategoriId] = useState('');
  const [formNominal, setFormNominal] = useState<number>(0);
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formKasBankKategoriId, setFormKasBankKategoriId] = useState<number>(64);
  const [formType, setFormType] = useState<'Debit' | 'Kredit'>('Debit');

  // Edit states
  const [editKeterangan, setEditKeterangan] = useState('');
  const [editTanggal, setEditTanggal] = useState('');

  // 1. Fetch Beban Categories
  const { data: kategorisData } = useQuery({
    queryKey: ['kategorisBeban'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/kategoris?type=Pengeluaran');
      const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      return items;
    },
  });

  // 2. Fetch Transaksi Beban (module = BEBAN -> PGN / Beban)
  const { data: bebanData, isLoading } = useQuery({
    queryKey: ['transaksiBeban', search, startDate, endDate, selectedKategoriId],
    queryFn: async () => {
      let url = '/transaksi?module=BEBAN&limit=50';
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (selectedKategoriId) url += `&kategoriId=${selectedKategoriId}`;
      const res: any = await apiClient.get(url);
      return res;
    },
  });

  // Mutations
  const createBebanMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/transaksi/beban', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaksiBeban'] });
      queryClient.invalidateQueries({ queryKey: ['labaRugi'] });
      setIsAddOpen(false);
      setFormKategoriId('');
      setFormNominal(0);
      setFormKeterangan('');
      setFormKasBankKategoriId(64);
      setFormType('Debit');
    },
  });

  const updateBebanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiClient.put(`/transaksi/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaksiBeban'] });
      queryClient.invalidateQueries({ queryKey: ['labaRugi'] });
      setEditTx(null);
    },
  });

  const deleteBebanMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/transaksi/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaksiBeban'] });
      queryClient.invalidateQueries({ queryKey: ['labaRugi'] });
      setDeleteTx(null);
    },
  });

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKategoriId || formNominal <= 0) return;
    createBebanMutation.mutate({
      tanggal: formTanggal,
      kategoriId: Number(formKategoriId),
      nominal: formNominal,
      keterangan: formKeterangan,
      kasBankKategoriId: Number(formKasBankKategoriId),
      type: formType,
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
    updateBebanMutation.mutate({
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

  const rawItems = Array.isArray(bebanData)
    ? bebanData
    : Array.isArray(bebanData?.data)
    ? bebanData.data
    : Array.isArray(bebanData?.items)
    ? bebanData.items
    : [];

  const itemsList = selectedKategoriId
    ? rawItems.filter((tx: any) =>
        tx.details?.some((d: any) => Number(d.kategoriId) === Number(selectedKategoriId))
      )
    : rawItems;

  const handleExportExcel = () => {
    if (!itemsList || itemsList.length === 0) {
      alert('Tidak ada data pengeluaran beban untuk diekspor');
      return;
    }

    const rows = itemsList.map((tx: any) => {
      const katNames = (tx.details || [])
        .map((d: any) => d.kategori?.name || '-')
        .filter((n: string) => n !== '-')
        .join(', ');

      return {
        invoice: tx.invoice || '-',
        tanggal: formatDateIndo(tx.tanggal),
        kategori: katNames || 'Beban Operasional',
        keterangan: tx.keterangan || '-',
        paymentMethod: tx.paymentMethod || 'KAS',
        total: Number(tx.total) || 0,
        status: tx.status || 'SELESAI',
      };
    });

    exportToExcel({
      filename: `Beban_Operasional_${startDate || 'Semua'}_sd_${endDate || 'Kini'}`,
      sheetName: 'Beban Operasional',
      title: `DAFTAR PENGELUARAN BEBAN OPERASIONAL (${startDate || 'Awal'} s/d ${endDate || 'Kini'})`,
      columns: [
        { header: 'No', key: '_index', width: 6 },
        { header: 'Invoice', key: 'invoice', width: 20 },
        { header: 'Tanggal', key: 'tanggal', width: 14 },
        { header: 'Kategori Beban', key: 'kategori', width: 28 },
        { header: 'Keterangan Pengeluaran', key: 'keterangan', width: 35 },
        { header: 'Metode Pembayaran', key: 'paymentMethod', width: 18 },
        { header: 'Nominal Beban (Rp)', key: 'total', width: 22 },
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
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2">
            <HandCoins className="w-7 h-7 text-rose-600" />
            <span>Pengeluaran Beban Operasional Usaha</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Pencatatan beban gaji, armada transport, BBM, konsumsi, perawatan, dan penyusutan produksi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButtonGroup onExportExcel={handleExportExcel} />
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran Beban</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari nomor invoice (misal PGN), keterangan pengeluaran..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <Calendar className="w-4 h-4 text-slate-400 ml-1" />
          <span className="text-slate-500 font-semibold">Tgl:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
          />
          <span className="text-slate-400">s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
          />

          <select
            value={selectedKategoriId}
            onChange={(e) => setSelectedKategoriId(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium text-slate-700"
          >
            <option value="">Semua Kategori Beban</option>
            {kategorisData?.map((k: any) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
            <tr>
              <th className="p-4 w-12 text-center">No</th>
              <th className="p-4">Tanggal Transaksi</th>
              <th className="p-4">No. Invoice</th>
              <th className="p-4">Kategori Beban</th>
              <th className="p-4">Keterangan</th>
              <th className="p-4 text-right">Nominal (Rp)</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-center w-28">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate-400">
                  Memuat data beban operasional...
                </td>
              </tr>
            ) : itemsList.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate-400">
                  Tidak ada catatan beban operasional pada filter ini.
                </td>
              </tr>
            ) : (
              itemsList.map((tx: any, idx: number) => {
                const isBatal = tx.status === 'BATAL';
                const katName = tx.details?.[0]?.kategori?.name || tx.keterangan || 'Beban Operasional';
                return (
                  <tr
                    key={tx.id || idx}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isBatal ? 'opacity-40 bg-slate-50 line-through' : ''
                    }`}
                  >
                    <td className="p-4 text-center font-mono text-slate-400 text-xs">{idx + 1}</td>
                    <td className="p-4 text-xs font-mono text-slate-600">
                      {new Date(tx.tanggal).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-4 font-mono font-bold text-xs text-rose-700">
                      {tx.invoice}
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      {katName}
                    </td>
                    <td className="p-4 text-slate-600 text-xs max-w-xs truncate">
                      {tx.keterangan || '-'}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-rose-700">
                      {formatRupiah(Number(tx.total))}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          isBatal
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setDetailTx(tx)}
                          title="Lihat Detail"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {!isBatal && (
                          <button
                            onClick={() => handleOpenEdit(tx)}
                            title="Edit Beban"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {!isBatal && (
                          <button
                            onClick={() => setDeleteTx(tx)}
                            title="Batalkan / Soft Delete"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* ================= MODAL TAMBAH BEBAN ================= */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-600" />
                <span>Catat Pengeluaran Beban</span>
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="p-6 space-y-4">
              {/* Pilihan Tipe: Debit (Pengeluaran) vs Kredit (Kembalian) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Jenis Transaksi Beban
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('Debit')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      formType === 'Debit'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Pengeluaran Beban (Debit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('Kredit')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      formType === 'Kredit'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Kembalian Beban / Koreksi (Kredit)
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {formType === 'Debit'
                    ? 'Beban bertambah, saldo Kas/Bank berkurang.'
                    : 'Pengembalian sisa uang operasional: saldo Kas/Bank bertambah, Beban berkurang.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={formTanggal}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold bg-white"
                  required
                />
              </div>

              <div>
                <SearchableSelect
                  label="Pilih Kategori Beban"
                  options={
                    kategorisData?.map((k: any) => ({
                      value: String(k.id),
                      label: k.name,
                      sublabel: k.detailKategori?.name || 'Beban',
                    })) || []
                  }
                  value={formKategoriId}
                  onChange={(val) => setFormKategoriId(String(val))}
                  placeholder="-- Pilih Kategori Beban --"
                  searchPlaceholder="Ketik untuk mencari kategori beban..."
                  required
                />
              </div>

              {/* Rekening Kas / Bank */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  {formType === 'Debit' ? 'Sumber Pembayaran Kas / Bank' : 'Kas / Bank Penerima Pengembalian'}
                </label>
                <select
                  value={formKasBankKategoriId}
                  onChange={(e) => setFormKasBankKategoriId(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold bg-white"
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
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Nominal Pengeluaran (Rp)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formNominal}
                  onChange={(e) => setFormNominal(Number(e.target.value))}
                  placeholder="0"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Keterangan / Rincian Pengeluaran
                </label>
                <textarea
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Misal: Biaya BBM Truk B 1234 CD..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createBebanMutation.isPending}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {createBebanMutation.isPending ? 'Menyimpan...' : 'Simpan Beban'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DETAIL BEBAN ================= */}
      {detailTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">Detail Pengeluaran Beban</h3>
              <button
                onClick={() => setDetailTx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block">No. Invoice:</span>
                <span className="font-mono font-bold text-rose-700 text-sm">{detailTx.invoice}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Tanggal:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(detailTx.tanggal).toLocaleString('id-ID')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Nominal Beban:</span>
                <span className="font-mono font-black text-rose-700 text-base">
                  {formatRupiah(Number(detailTx.total))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Keterangan:</span>
                <span className="font-semibold text-slate-700">{detailTx.keterangan || '-'}</span>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setDetailTx(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL EDIT BEBAN ================= */}
      {editTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">Edit Catatan Beban</h3>
              <button
                onClick={() => setEditTx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Tanggal Pengeluaran
                </label>
                <input
                  type="date"
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Keterangan Pengeluaran
                </label>
                <textarea
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditTx(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateBebanMutation.isPending}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {updateBebanMutation.isPending ? 'Menyimpan...' : 'Perbarui Beban'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL HAPUS BEBAN ================= */}
      {deleteTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Batalkan Beban Ini?</h4>
            <p className="text-xs text-slate-500 mt-1">
              Invoice beban <strong className="font-mono text-slate-800">{deleteTx.invoice}</strong> akan diubah statusnya menjadi <strong>BATAL (Soft Delete)</strong>.
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setDeleteTx(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100"
              >
                Kembali
              </button>
              <button
                onClick={() => deleteBebanMutation.mutate(Number(deleteTx.id))}
                disabled={deleteBebanMutation.isPending}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                {deleteBebanMutation.isPending ? 'Membatalkan...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default BebanPage;
