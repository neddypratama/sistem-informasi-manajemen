import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel } from '../../lib/export-utils';
import {
  FolderTree,
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export const DetailKategoriPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);

  // Add form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Beban');
  const [formDeskripsi, setFormDeskripsi] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('Beban');
  const [editDeskripsi, setEditDeskripsi] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  const { data: detailKategoris, isLoading } = useQuery({
    queryKey: ['detailKategoris'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/detail-kategoris');
      return res.data;
    },
  });

  const allItems = detailKategoris || [];
  const filteredItems = allItems.filter(
    (item: any) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.type && item.type.toLowerCase().includes(search.toLowerCase())) ||
      (item.deskripsi && item.deskripsi.toLowerCase().includes(search.toLowerCase())),
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/master/detail-kategoris', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailKategoris'] });
      queryClient.invalidateQueries({ queryKey: ['detailKategorisList'] });
      setIsAddOpen(false);
      resetAddForm();
    },
    onError: (err: any) => {
      alert(`Gagal menambah detail kategori: ${err?.message || 'Terjadi kesalahan sistem'}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string | number; payload: any }) => {
      return apiClient.put(`/master/detail-kategoris/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailKategoris'] });
      queryClient.invalidateQueries({ queryKey: ['detailKategorisList'] });
      setEditItem(null);
    },
    onError: (err: any) => {
      alert(`Gagal mengupdate detail kategori: ${err?.message || 'Terjadi kesalahan sistem'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      return apiClient.delete(`/master/detail-kategoris/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailKategoris'] });
      queryClient.invalidateQueries({ queryKey: ['detailKategorisList'] });
      setDeleteItem(null);
    },
    onError: (err: any) => {
      alert(`Gagal menonaktifkan detail kategori: ${err?.message || 'Terjadi kesalahan sistem'}`);
    },
  });

  const resetAddForm = () => {
    setFormName('');
    setFormType('Beban');
    setFormDeskripsi('');
  };

  const handleOpenEdit = (item: any) => {
    setEditItem(item);
    setEditName(item.name);
    setEditType(item.type || 'Beban');
    setEditDeskripsi(item.deskripsi || '');
    setEditIsActive(item.isActive !== false);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Nama detail kategori wajib diisi');
      return;
    }
    createMutation.mutate({
      name: formName.trim(),
      type: formType,
      deskripsi: formDeskripsi.trim() || undefined,
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert('Nama detail kategori wajib diisi');
      return;
    }
    updateMutation.mutate({
      id: editItem.id,
      payload: {
        name: editName.trim(),
        type: editType,
        deskripsi: editDeskripsi.trim() || undefined,
        isActive: editIsActive,
      },
    });
  };

  const handleExportExcel = () => {
    if (!filteredItems || filteredItems.length === 0) {
      alert('Tidak ada data detail kategori untuk diekspor');
      return;
    }

    const rows = filteredItems.map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.type || '-',
      subCount: item.kategoris?.length || 0,
      deskripsi: item.deskripsi || '-',
      status: item.isActive ? 'Aktif' : 'Non-Aktif',
    }));

    exportToExcel({
      filename: `Master_Detail_Kategori_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Detail Kategori',
      title: 'MASTER DETAIL KATEGORI (KLASIFIKASI AKUN & ENTITAS)',
      columns: [
        { header: 'No', key: '_index', width: 6 },
        { header: 'ID', key: 'id', width: 8 },
        { header: 'Nama Detail Kategori', key: 'name', width: 32 },
        { header: 'Tipe Klasifikasi', key: 'type', width: 20 },
        { header: 'Jumlah Sub-Akun', key: 'subCount', width: 18 },
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
            <FolderTree className="w-7 h-7 text-emerald-600" />
            <span>Master Detail Kategori (Klasifikasi Akun & Entitas)</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Master header bagan akun (COA) dan pengelompokan transaksi legacy Bima Pratama ERP
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportButtonGroup onExportExcel={handleExportExcel} />

          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-right">
            <p className="text-xs text-emerald-700 font-semibold">Total Detail Kategori</p>
            <p className="text-lg font-bold text-emerald-900 font-mono">
              {isLoading ? '...' : `${allItems.length} Header Akun`}
            </p>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Detail Kategori</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari tipe atau nama detail kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Ditemukan {filteredItems.length} dari {allItems.length} entitas
        </span>
      </div>

      {/* Detail Kategori Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
            <tr>
              <th className="p-4 w-12 text-center">ID</th>
              <th className="p-4">Nama Detail Kategori</th>
              <th className="p-4">Klasifikasi Tipe</th>
              <th className="p-4">Deskripsi</th>
              <th className="p-4 text-center w-36">Jumlah Sub-Kategori</th>
              <th className="p-4 text-center w-24">Status</th>
              <th className="p-4 text-center w-28">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-slate-400">
                  Memuat daftar master detail kategori...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-slate-400">
                  Tidak ada data detail kategori yang sesuai.
                </td>
              </tr>
            ) : (
              filteredItems.map((dk: any) => {
                const subCount = dk._count?.kategoris || dk.kategoris?.length || 0;
                const isActive = dk.isActive !== false;
                return (
                  <tr key={dk.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-center font-mono text-slate-400 text-xs">{dk.id}</td>
                    <td className="p-4 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <FolderTree className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{dk.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {dk.type || 'Umum'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 text-xs max-w-xs truncate">
                      {dk.deskripsi || '-'}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 font-mono border border-emerald-200">
                        {subCount} Kategori
                      </span>
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
                          onClick={() => setDetailItem(dk)}
                          title="Lihat Detail"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(dk)}
                          title="Edit Detail Kategori"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteItem(dk)}
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
      {/* MODAL: TAMBAH DETAIL KATEGORI                            */}
      {/* ========================================================= */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FolderTree className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-lg">Tambah Header COA</h3>
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
                  Nama Detail Kategori <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Beban Operasional / Kas & Bank"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tipe Klasifikasi Akun <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Beban">Beban (Expense)</option>
                  <option value="Pendapatan">Pendapatan (Revenue)</option>
                  <option value="Aset">Aset / Harta (Asset)</option>
                  <option value="Kewajiban">Kewajiban / Hutang (Liability)</option>
                  <option value="Modal">Modal / Ekuitas (Equity)</option>
                  <option value="HPP">Harga Pokok Penjualan (HPP)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Deskripsi Akun</label>
                <textarea
                  rows={2}
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  placeholder="Penjelasan grup bagan akun ini..."
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
                  {createMutation.isPending ? 'Menyimpan...' : 'Simpan Header'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DETAIL                                            */}
      {/* ========================================================= */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FolderTree className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-lg">Detail Header Akun</h3>
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
                <span className="text-slate-400 font-medium">ID Header</span>
                <span className="font-mono font-bold text-slate-700">#{detailItem.id}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Nama Detail Kategori</span>
                <span className="font-bold text-slate-800 text-sm">{detailItem.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Klasifikasi Tipe</span>
                <span className="px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                  {detailItem.type}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Total Sub-Kategori</span>
                <span className="font-bold text-emerald-700">
                  {detailItem._count?.kategoris || detailItem.kategoris?.length || 0} Sub-Akun
                </span>
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
      {/* MODAL: EDIT DETAIL KATEGORI                              */}
      {/* ========================================================= */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-lg">Edit Detail Kategori</h3>
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
                  Nama Detail Kategori <span className="text-rose-500">*</span>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tipe Klasifikasi Akun <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Beban">Beban (Expense)</option>
                  <option value="Pendapatan">Pendapatan (Revenue)</option>
                  <option value="Aset">Aset / Harta (Asset)</option>
                  <option value="Kewajiban">Kewajiban / Hutang (Liability)</option>
                  <option value="Modal">Modal / Ekuitas (Equity)</option>
                  <option value="HPP">Harga Pokok Penjualan (HPP)</option>
                </select>
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
                  id="editDkIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="editDkIsActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Header Aktif
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
      {/* MODAL: HAPUS / NONAKTIFKAN (SOFT DELETE)                  */}
      {/* ========================================================= */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">Nonaktifkan Header Akun?</h3>
              <p className="text-xs text-slate-500 mb-4">
                Apakah Anda yakin ingin menonaktifkan{' '}
                <span className="font-bold text-slate-700">{deleteItem.name}</span>?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left mb-6">
                <p className="text-[11px] text-amber-800">
                  <span className="font-bold">Keamanan Data (Soft Delete):</span> Header ini akan dinonaktifkan
                  namun data sub-kategori dan transaksi terkait tetap terjaga utuh.
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
export default DetailKategoriPage;
