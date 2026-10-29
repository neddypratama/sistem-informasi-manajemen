import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel } from '../../lib/export-utils';
import {
  Tag,
  Search,
  Filter,
  FolderTree,
  CheckCircle,
  Plus,
  Eye,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

export const KategoriPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedDk, setSelectedDk] = useState<string>('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);

  // Add form state
  const [formName, setFormName] = useState('');
  const [formDetailKategoriId, setFormDetailKategoriId] = useState<string>('');
  const [formCode, setFormCode] = useState('');
  const [formDeskripsi, setFormDeskripsi] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDetailKategoriId, setEditDetailKategoriId] = useState<string>('');
  const [editCode, setEditCode] = useState('');
  const [editDeskripsi, setEditDeskripsi] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  // 1. Fetch Kategoris
  const { data: kategoriData, isLoading } = useQuery({
    queryKey: ['kategoris', search, selectedDk],
    queryFn: async () => {
      let url = `/master/kategoris?limit=150`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (selectedDk) url += `&detailKategoriId=${selectedDk}`;
      const res: any = await apiClient.get(url);
      return res.data;
    },
  });

  // 2. Fetch Detail Kategoris for dropdown filter & selection
  const { data: detailKategoris } = useQuery({
    queryKey: ['detailKategorisList'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/detail-kategoris');
      return res.data;
    },
  });

  const items = Array.isArray(kategoriData)
    ? kategoriData
    : kategoriData?.items || [];
  const total = items.length;

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/master/kategoris', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kategoris'] });
      setIsAddOpen(false);
      resetAddForm();
    },
    onError: (err: any) => {
      alert(`Gagal menambah kategori: ${err?.message || 'Terjadi kesalahan sistem'}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string | number; payload: any }) => {
      return apiClient.put(`/master/kategoris/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kategoris'] });
      setEditItem(null);
    },
    onError: (err: any) => {
      alert(`Gagal mengupdate kategori: ${err?.message || 'Terjadi kesalahan sistem'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      return apiClient.delete(`/master/kategoris/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kategoris'] });
      setDeleteItem(null);
    },
    onError: (err: any) => {
      alert(`Gagal menonaktifkan kategori: ${err?.message || 'Terjadi kesalahan sistem'}`);
    },
  });

  const resetAddForm = () => {
    setFormName('');
    setFormDetailKategoriId('');
    setFormCode('');
    setFormDeskripsi('');
  };

  const handleOpenEdit = (kat: any) => {
    setEditItem(kat);
    setEditName(kat.name);
    setEditDetailKategoriId(String(kat.detailKategoriId));
    setEditCode(kat.code || '');
    setEditDeskripsi(kat.deskripsi || '');
    setEditIsActive(kat.isActive !== false);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDetailKategoriId) {
      alert('Nama kategori dan Detail Kategori induk wajib dipilih');
      return;
    }
    createMutation.mutate({
      name: formName.trim(),
      detailKategoriId: Number(formDetailKategoriId),
      code: formCode.trim() || undefined,
      deskripsi: formDeskripsi.trim() || undefined,
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editDetailKategoriId) {
      alert('Nama kategori dan Detail Kategori induk wajib dipilih');
      return;
    }
    updateMutation.mutate({
      id: editItem.id,
      payload: {
        name: editName.trim(),
        detailKategoriId: Number(editDetailKategoriId),
        code: editCode.trim() || undefined,
        deskripsi: editDeskripsi.trim() || undefined,
        isActive: editIsActive,
      },
    });
  };

  const handleExportExcel = () => {
    if (!items || items.length === 0) {
      alert('Tidak ada data kategori untuk diekspor');
      return;
    }

    const rows = items.map((k: any) => ({
      id: k.id,
      code: k.code || `KAT-${k.id}`,
      name: k.name,
      detailKategori: k.detailKategori?.name || '-',
      type: k.detailKategori?.type || '-',
      deskripsi: k.deskripsi || '-',
      status: k.isActive ? 'Aktif' : 'Non-Aktif',
    }));

    exportToExcel({
      filename: `Master_Kategori_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Kategori',
      title: 'MASTER KATEGORI AKUN & TRANSAKSI BISNIS',
      columns: [
        { header: 'No', key: '_index', width: 6 },
        { header: 'ID', key: 'id', width: 8 },
        { header: 'Kode Akun', key: 'code', width: 14 },
        { header: 'Nama Kategori', key: 'name', width: 32 },
        { header: 'Detail Kategori Induk', key: 'detailKategori', width: 25 },
        { header: 'Klasifikasi Akun', key: 'type', width: 18 },
        { header: 'Deskripsi', key: 'deskripsi', width: 35 },
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
            <Tag className="w-7 h-7 text-emerald-600" />
            <span>Master Kategori (Sub-Akun & Rekening Buku Besar)</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Daftar 100 kategori transaksi bisnis: Penjualan, HPP Per Komoditas, Stok Pakan & Curah, Kas/Bank, dan Beban
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportButtonGroup onExportExcel={handleExportExcel} />

          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-right">
            <p className="text-xs text-emerald-700 font-semibold">Total Sub-Kategori</p>
            <p className="text-lg font-bold text-emerald-900 font-mono">
              {isLoading ? '...' : `${total} Kategori`}
            </p>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kategori</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari kode atau nama kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Filter by Detail Kategori */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedDk}
              onChange={(e) => setSelectedDk(e.target.value)}
              className="border border-slate-200 rounded-xl text-xs px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Semua Detail Kategori</option>
              {detailKategoris?.map((dk: any) => (
                <option key={dk.id} value={dk.id}>
                  {dk.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Menampilkan {items.length} dari {total} kategori
        </span>
      </div>

      {/* Kategori Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
            <tr>
              <th className="p-4 w-12 text-center">ID</th>
              <th className="p-4 w-28">Kode</th>
              <th className="p-4">Nama Kategori</th>
              <th className="p-4">Detail Kategori (Header)</th>
              <th className="p-4">Tipe / Klasifikasi</th>
              <th className="p-4 text-center w-24">Status</th>
              <th className="p-4 text-center w-28">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-slate-400">
                  Memuat daftar master kategori...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-slate-400">
                  Tidak ada kategori yang sesuai dengan filter.
                </td>
              </tr>
            ) : (
              items.map((kat: any) => {
                const isHpp = kat.id >= 90 && kat.id <= 100;
                const isCurah = kat.id === 89 || kat.id === 96 || kat.name.toLowerCase().includes('curah');
                const isSales = kat.id >= 1 && kat.id <= 10;
                const isActive = kat.isActive !== false;

                return (
                  <tr key={kat.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-center font-mono text-slate-400 text-xs">{kat.id}</td>
                    <td className="p-4 font-mono font-bold text-emerald-700 text-xs">{kat.code || '-'}</td>
                    <td className="p-4 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span>{kat.name}</span>
                        {isHpp && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            HPP Komoditas
                          </span>
                        )}
                        {isCurah && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                            Curah
                          </span>
                        )}
                        {isSales && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Penjualan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-slate-700 text-xs flex items-center gap-1.5">
                      <FolderTree className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{kat.detailKategori?.name || '-'}</span>
                    </td>
                    <td className="p-4 text-xs font-medium text-slate-600">
                      {isSales
                        ? 'Pendapatan Usaha'
                        : isHpp
                        ? 'Beban Pokok (HPP)'
                        : kat.id >= 22 && kat.id <= 45
                        ? 'Beban Operasional'
                        : kat.id >= 59 && kat.id <= 89
                        ? 'Aset / Persediaan'
                        : 'Bagan Akun Umum'}
                    </td>
                    <td className="p-4 text-center">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3" />
                          <span>Nonaktif</span>
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setDetailItem(kat)}
                          title="Lihat Detail"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(kat)}
                          title="Edit Kategori"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteItem(kat)}
                          title="Nonaktifkan (Soft Delete)"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================= */}
      {/* MODAL: TAMBAH KATEGORI                                   */}
      {/* ========================================================= */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-lg">Tambah Kategori Baru</h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Detail Kategori Induk (Header COA) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formDetailKategoriId}
                  onChange={(e) => setFormDetailKategoriId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">-- Pilih Detail Kategori Header --</option>
                  {detailKategoris?.map((dk: any) => (
                    <option key={dk.id} value={dk.id}>
                      {dk.name} ({dk.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Sub-Kategori / Rekening <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Beban Listrik & Genset / Penjualan Telur Horn"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Kode Kategori (Opsional)</label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="Contoh: 6101 atau KAT-BEBAN-01"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Deskripsi / Catatan Akun</label>
                <textarea
                  rows={2}
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  placeholder="Penjelasan fungsi kategori transaksi ini..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Menyimpan...' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DETAIL KATEGORI                                   */}
      {/* ========================================================= */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-lg">Detail Master Kategori</h3>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">ID Kategori</span>
                <span className="font-mono font-bold text-slate-700">#{detailItem.id}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Kode Akun</span>
                <span className="font-mono font-bold text-emerald-700">{detailItem.code || '-'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Nama Kategori</span>
                <span className="font-bold text-slate-800 text-sm">{detailItem.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Detail Kategori Header</span>
                <span className="font-semibold text-slate-700">{detailItem.detailKategori?.name || '-'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    detailItem.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {detailItem.isActive !== false ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <div className="pt-2">
                <span className="text-slate-400 font-medium block mb-1">Deskripsi</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {detailItem.deskripsi || 'Tidak ada deskripsi khusus.'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold text-xs transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT KATEGORI                                     */}
      {/* ========================================================= */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-lg">Edit Master Kategori</h3>
              </div>
              <button
                onClick={() => setEditItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Detail Kategori Induk <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={editDetailKategoriId}
                  onChange={(e) => setEditDetailKategoriId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Pilih Detail Kategori Header --</option>
                  {detailKategoris?.map((dk: any) => (
                    <option key={dk.id} value={dk.id}>
                      {dk.name} ({dk.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Sub-Kategori / Rekening <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Kode Kategori</label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  value={editDeskripsi}
                  onChange={(e) => setEditDeskripsi(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="editIsActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Kategori Aktif (Dapat dipilih dalam transaksi)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Memperbarui...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: HAPUS / NONAKTIFKAN KATEGORI (SOFT DELETE)         */}
      {/* ========================================================= */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">Nonaktifkan Kategori?</h3>
              <p className="text-xs text-slate-500 mb-4">
                Apakah Anda yakin ingin menonaktifkan kategori{' '}
                <span className="font-bold text-slate-700">{deleteItem.name}</span>?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left mb-6">
                <p className="text-[11px] text-amber-800">
                  <span className="font-bold">Keamanan Data (Soft Delete):</span> Kategori ini akan dinonaktifkan
                  sehingga tidak muncul di opsi transaksi baru, namun semua riwayat pembukuan dan laporan laba rugi
                  terdahulu tetap aman.
                </p>
              </div>

              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => setDeleteItem(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteItem.id)}
                  disabled={deleteMutation.isPending}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs shadow-sm transition-colors disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Memproses...' : 'Ya, Nonaktifkan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default KategoriPage;
