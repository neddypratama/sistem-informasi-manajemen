import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel } from '../../lib/export-utils';
import {
  Package,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';

export const BarangPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [jenisId, setJenisId] = useState<number | ''>('');
  const [page, setPage] = useState(1);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);

  // Add form state
  const [formName, setFormName] = useState('');
  const [formJenisId, setFormJenisId] = useState<number | ''>('');
  const [formSatuanId, setFormSatuanId] = useState<number | ''>('');
  const [formStokMin, setFormStokMin] = useState<number>(0);
  const [formCode, setFormCode] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editJenisId, setEditJenisId] = useState<number | ''>('');
  const [editSatuanId, setEditSatuanId] = useState<number | ''>('');
  const [editStokMin, setEditStokMin] = useState<number>(0);

  // 1. Fetch Jenis Barang
  const { data: jenisData } = useQuery({
    queryKey: ['jenisBarangList'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/barangs/jenis');
      return res.data;
    },
  });

  // 2. Fetch Satuans
  const { data: satuansData } = useQuery({
    queryKey: ['satuansList'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/barangs/satuans');
      return res.data;
    },
  });

  // 3. Fetch Barangs
  const { data: barangsData, isLoading } = useQuery({
    queryKey: ['barangsGrid', search, jenisId, page],
    queryFn: async () => {
      let url = `/master/barangs?page=${page}&limit=25`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (jenisId) url += `&jenisId=${jenisId}`;
      const res: any = await apiClient.get(url);
      return res;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/master/barangs', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barangsGrid'] });
      setIsAddOpen(false);
      setFormName('');
      setFormCode('');
      setFormStokMin(0);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiClient.put(`/master/barangs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barangsGrid'] });
      setEditItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/master/barangs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barangsGrid'] });
      setDeleteItem(null);
    },
  });

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formJenisId) return;
    createMutation.mutate({
      name: formName,
      jenisId: Number(formJenisId),
      satuanId: formSatuanId ? Number(formSatuanId) : undefined,
      stokMinimum: formStokMin,
      code: formCode || undefined,
    });
  };

  const handleOpenEdit = (b: any) => {
    setEditItem(b);
    setEditName(b.name);
    setEditJenisId(b.jenisId ? Number(b.jenisId) : '');
    setEditSatuanId(b.satuanId ? Number(b.satuanId) : '');
    setEditStokMin(Number(b.stokMinimum || 0));
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || !editName) return;
    updateMutation.mutate({
      id: Number(editItem.id),
      data: {
        name: editName,
        jenisId: editJenisId ? Number(editJenisId) : undefined,
        satuanId: editSatuanId ? Number(editSatuanId) : undefined,
        stokMinimum: editStokMin,
      },
    });
  };

  const items = barangsData?.data || [];
  const meta = barangsData?.meta;

  const handleExportExcel = async () => {
    let dataToExport = items;
    try {
      if (meta?.total && meta.total > items.length) {
        let url = `/master/barangs?limit=1000&page=1`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (jenisId) url += `&jenisId=${jenisId}`;
        const res: any = await apiClient.get(url);
        if (res?.data && Array.isArray(res.data)) dataToExport = res.data;
        else if (Array.isArray(res)) dataToExport = res;
      }
    } catch {
      // fallback
    }

    if (!dataToExport || dataToExport.length === 0) {
      alert('Tidak ada data barang untuk diekspor');
      return;
    }

    const rows = dataToExport.map((b: any) => ({
      code: b.code || `SKU-${b.id}`,
      name: b.name,
      jenis: b.jenis?.name || '-',
      satuan: b.satuan?.name || '-',
      stokMinimum: Number(b.stokMinimum) || 0,
      status: b.isActive ? 'Aktif' : 'Non-Aktif',
    }));

    exportToExcel({
      filename: `Master_Barang_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Master Barang',
      title: 'MASTER DATA BARANG & KOMODITAS',
      columns: [
        { header: 'No', key: '_index', width: 6 },
        { header: 'Kode SKU', key: 'code', width: 16 },
        { header: 'Nama Barang', key: 'name', width: 32 },
        { header: 'Jenis / Komoditas', key: 'jenis', width: 22 },
        { header: 'Satuan', key: 'satuan', width: 12 },
        { header: 'Stok Minimum', key: 'stokMinimum', width: 16 },
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
            <Package className="w-7 h-7 text-emerald-600" />
            <span>Master Data Barang & Komoditas</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Kelola katalog telur, pakan sentrat, curah, obat-obatan, dan egg tray
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButtonGroup onExportExcel={handleExportExcel} />
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Barang Baru</span>
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama barang atau kode..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={jenisId}
            onChange={(e) => {
              setJenisId(e.target.value ? Number(e.target.value) : '');
              setPage(1);
            }}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Semua Jenis Komoditas</option>
            {jenisData?.map((j: any) => (
              <option key={j.id} value={j.id}>
                {j.name}
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
              <th className="p-4 w-32">Kode Barang</th>
              <th className="p-4">Nama Produk</th>
              <th className="p-4">Jenis Komoditas</th>
              <th className="p-4">Satuan</th>
              <th className="p-4 text-center">Stok Minimum</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-center w-28">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate-400">
                  Memuat master data barang...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate-400">
                  Tidak ada barang yang cocok dengan kriteria pencarian.
                </td>
              </tr>
            ) : (
              items.map((b: any, idx: number) => (
                <tr key={b.id || idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 text-center font-mono text-slate-400 text-xs">
                    {(page - 1) * 25 + idx + 1}
                  </td>
                  <td className="p-4 font-mono font-bold text-xs text-emerald-700">
                    {b.code || `BRG-${String(b.id).padStart(4, '0')}`}
                  </td>
                  <td className="p-4 font-bold text-slate-800">{b.name}</td>
                  <td className="p-4 text-xs font-medium text-slate-600">
                    {b.jenis?.name || '-'}
                  </td>
                  <td className="p-4 text-xs text-slate-500 font-medium">
                    {b.satuan?.name || 'Kg'}
                  </td>
                  <td className="p-4 text-center font-mono text-xs text-slate-700">
                    {b.stokMinimum || 0}
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      Aktif
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setDetailItem(b)}
                        title="Lihat Detail"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(b)}
                        title="Edit Barang"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteItem(b)}
                        title="Hapus Barang (Soft Delete)"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Halaman {page} dari {meta.totalPages} ({meta.total} Total Barang)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-100"
              >
                Sebelumnya
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-100"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL TAMBAH BARANG ================= */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>Tambah Barang Baru</span>
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nama Barang / Produk</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Misal: Telur Horn Super, Katul A1..."
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Jenis Komoditas</label>
                  <select
                    value={formJenisId}
                    onChange={(e) => setFormJenisId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold bg-white"
                    required
                  >
                    <option value="">-- Pilih --</option>
                    {jenisData?.map((j: any) => (
                      <option key={j.id} value={j.id}>{j.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Satuan</label>
                  <select
                    value={formSatuanId}
                    onChange={(e) => setFormSatuanId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold bg-white"
                  >
                    <option value="">-- Default (Kg) --</option>
                    {satuansData?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Stok Minimum Alert</label>
                  <input
                    type="number"
                    value={formStokMin}
                    onChange={(e) => setFormStokMin(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Kode Barang (Opsional)</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="Auto-generate"
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs font-mono bg-white"
                  />
                </div>
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
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {createMutation.isPending ? 'Menyimpan...' : 'Simpan Barang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DETAIL BARANG ================= */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">Detail Barang</h3>
              <button onClick={() => setDetailItem(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block">Kode Barang:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {detailItem.code || `BRG-${detailItem.id}`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Nama Barang:</span>
                <span className="font-bold text-slate-800 text-sm">{detailItem.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Jenis Komoditas:</span>
                <span className="font-semibold text-slate-700">{detailItem.jenis?.name || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Satuan Takaran:</span>
                <span className="font-semibold text-slate-700">{detailItem.satuan?.name || 'Kg'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Stok Minimum:</span>
                <span className="font-mono font-semibold text-slate-800">{detailItem.stokMinimum || 0}</span>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL EDIT BARANG ================= */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">Edit Barang</h3>
              <button onClick={() => setEditItem(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nama Barang</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Jenis Komoditas</label>
                  <select
                    value={editJenisId}
                    onChange={(e) => setEditJenisId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold bg-white"
                  >
                    <option value="">-- Pilih --</option>
                    {jenisData?.map((j: any) => (
                      <option key={j.id} value={j.id}>{j.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Satuan</label>
                  <select
                    value={editSatuanId}
                    onChange={(e) => setEditSatuanId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold bg-white"
                  >
                    <option value="">-- Pilih --</option>
                    {satuansData?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Stok Minimum Alert</label>
                <input
                  type="number"
                  value={editStokMin}
                  onChange={(e) => setEditStokMin(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs font-mono bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {updateMutation.isPending ? 'Menyimpan...' : 'Perbarui Barang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL HAPUS BARANG ================= */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Hapus Barang Ini?</h4>
            <p className="text-xs text-slate-500 mt-1">
              Barang <strong>{deleteItem.name}</strong> akan di-nonaktifkan (Soft Delete).
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setDeleteItem(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={() => deleteMutation.mutate(Number(deleteItem.id))}
                disabled={deleteMutation.isPending}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                {deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default BarangPage;
