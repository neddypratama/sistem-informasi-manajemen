import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel } from '../../lib/export-utils';
import {
  Users,
  Search,
  MapPin,
  Phone,
  Plus,
  Eye,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';

export const ClientPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [detailClient, setDetailClient] = useState<any | null>(null);
  const [editClient, setEditClient] = useState<any | null>(null);
  const [deleteClient, setDeleteClient] = useState<any | null>(null);

  // Add Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Peternak');
  const [formCode, setFormCode] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAlamat, setFormAlamat] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAlamat, setEditAlamat] = useState('');
  const [editKeterangan, setEditKeterangan] = useState('');

  const { data: clientsData, isLoading } = useQuery({
    queryKey: ['clientsGrid', search, type, page],
    queryFn: async () => {
      let url = `/master/clients?page=${page}&limit=25`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (type) url += `&type=${type}`;
      const res: any = await apiClient.get(url);
      return res;
    },
  });

  const items = clientsData?.data || [];
  const meta = clientsData?.meta;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/master/clients', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientsGrid'] });
      queryClient.invalidateQueries({ queryKey: ['clientsListAll'] });
      setIsAddOpen(false);
      resetAddForm();
    },
    onError: (err: any) => {
      alert(`Gagal menambah mitra: ${err?.message || 'Terjadi kesalahan sistem'}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string | number; payload: any }) => {
      return apiClient.put(`/master/clients/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientsGrid'] });
      queryClient.invalidateQueries({ queryKey: ['clientsListAll'] });
      setEditClient(null);
    },
    onError: (err: any) => {
      alert(`Gagal mengupdate mitra: ${err?.message || 'Terjadi kesalahan sistem'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      return apiClient.delete(`/master/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientsGrid'] });
      queryClient.invalidateQueries({ queryKey: ['clientsListAll'] });
      setDeleteClient(null);
    },
    onError: (err: any) => {
      alert(`Gagal menghapus mitra: ${err?.message || 'Terjadi kesalahan sistem'}`);
    },
  });

  const resetAddForm = () => {
    setFormName('');
    setFormType('Peternak');
    setFormCode('');
    setFormPhone('');
    setFormAlamat('');
    setFormKeterangan('');
  };

  const handleOpenEdit = (client: any) => {
    setEditClient(client);
    setEditName(client.name);
    setEditType(client.type);
    setEditPhone(client.phone || '');
    setEditAlamat(client.alamat || '');
    setEditKeterangan(client.keterangan || '');
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Nama mitra wajib diisi');
      return;
    }
    createMutation.mutate({
      name: formName.trim(),
      type: formType,
      code: formCode.trim() || undefined,
      phone: formPhone.trim() || undefined,
      alamat: formAlamat.trim() || undefined,
      keterangan: formKeterangan.trim() || undefined,
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert('Nama mitra wajib diisi');
      return;
    }
    updateMutation.mutate({
      id: editClient.id,
      payload: {
        name: editName.trim(),
        type: editType,
        phone: editPhone.trim() || undefined,
        alamat: editAlamat.trim() || undefined,
        keterangan: editKeterangan.trim() || undefined,
      },
    });
  };

  const handleExportExcel = async () => {
    let dataToExport = items;
    try {
      if (meta?.total && meta.total > items.length) {
        let url = `/master/clients?limit=1000&page=1`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (type) url += `&type=${type}`;
        const res: any = await apiClient.get(url);
        if (res?.data && Array.isArray(res.data)) dataToExport = res.data;
        else if (Array.isArray(res)) dataToExport = res;
      }
    } catch {
      // fallback
    }

    if (!dataToExport || dataToExport.length === 0) {
      alert('Tidak ada data mitra untuk diekspor');
      return;
    }

    const rows = dataToExport.map((c: any) => ({
      code: c.code || '-',
      name: c.name,
      type: c.type || '-',
      phone: c.phone || '-',
      alamat: c.alamat || '-',
      saldoPiutang: Number(c.saldoPiutang) || 0,
      saldoHutang: Number(c.saldoHutang) || 0,
    }));

    exportToExcel({
      filename: `Master_Mitra_Client_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Mitra Usaha',
      title: 'MASTER DATA PELANGGAN & MITRA USAHA',
      columns: [
        { header: 'No', key: '_index', width: 6 },
        { header: 'Kode', key: 'code', width: 14 },
        { header: 'Nama Mitra', key: 'name', width: 30 },
        { header: 'Kategori Mitra', key: 'type', width: 18 },
        { header: 'No. Telepon', key: 'phone', width: 18 },
        { header: 'Alamat', key: 'alamat', width: 35 },
        { header: 'Saldo Piutang (Rp)', key: 'saldoPiutang', width: 22 },
        { header: 'Saldo Hutang (Rp)', key: 'saldoHutang', width: 22 },
      ],
      data: rows,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>Data Pelanggan & Mitra Usaha</span>
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola data pedagang telur, peternak supplier, armada truk, dan karyawan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButtonGroup onExportExcel={handleExportExcel} />
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Mitra</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
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
            placeholder="Cari nama mitra, alamat, telepon, atau kode..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">Semua Tipe Mitra</option>
            <option value="Peternak">Peternak (Supplier)</option>
            <option value="Pedagang">Pedagang (Pelanggan)</option>
            <option value="Supplier">Supplier Bahan</option>
            <option value="Karyawan">Karyawan</option>
            <option value="Truk">Armada Truk</option>
          </select>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="p-4">Kode</th>
              <th className="p-4">Nama Mitra</th>
              <th className="p-4">Tipe</th>
              <th className="p-4">Telepon / Kontak</th>
              <th className="p-4">Alamat / Lokasi</th>
              <th className="p-4 text-right">Saldo Piutang</th>
              <th className="p-4 text-right">Saldo Hutang</th>
              <th className="p-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  Memuat data pelanggan & mitra...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  Tidak ditemukan mitra yang sesuai.
                </td>
              </tr>
            ) : (
              items.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono text-xs font-bold text-slate-600">{c.code || '-'}</td>
                  <td className="p-4 font-semibold text-slate-800">
                    <div className="flex items-center space-x-2">
                      <span>{c.name}</span>
                      {c.keterangan && c.keterangan.includes('[NONAKTIF]') && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                          Nonaktif
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        c.type === 'Pedagang'
                          ? 'bg-blue-100 text-blue-800'
                          : c.type === 'Peternak'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.type === 'Supplier'
                          ? 'bg-amber-100 text-amber-800'
                          : c.type === 'Karyawan'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {c.type}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 text-xs">
                    {c.phone ? (
                      <div className="flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-4 text-slate-600">
                    <div className="flex items-center space-x-1.5 truncate max-w-xs text-xs">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.alamat || '-'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-slate-800">
                    {formatRupiah(Number(c.saldoPiutang || 0))}
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-slate-800">
                    {formatRupiah(Number(c.saldoHutang || 0))}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => setDetailClient(c)}
                        title="Lihat Detail"
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        title="Edit Mitra"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteClient(c)}
                        title="Hapus / Nonaktifkan"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

        {/* Pagination Controls */}
        {meta && meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Halaman <span className="font-bold text-slate-800">{meta.page}</span> dari{' '}
              <span className="font-bold text-slate-800">{meta.totalPages}</span> (Total {meta.total} Mitra)
            </div>
            <div className="flex space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: TAMBAH MITRA                                      */}
      {/* ========================================================= */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-lg">Tambah Mitra Baru</h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nama Mitra / Peternak / Toko <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Peternak Bpk. Slamet / Toko Barokah"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tipe Kemitraan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Peternak">Peternak (Supplier)</option>
                    <option value="Pedagang">Pedagang (Pelanggan)</option>
                    <option value="Supplier">Supplier Bahan</option>
                    <option value="Karyawan">Karyawan</option>
                    <option value="Truk">Armada Truk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Kode Mitra (Opsional)</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="Contoh: CLI-0089"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-xs"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">No. Handphone / WhatsApp</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat / Lokasi Kandang</label>
                  <textarea
                    rows={2}
                    value={formAlamat}
                    onChange={(e) => setFormAlamat(e.target.value)}
                    placeholder="Alamat lengkap mitra..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Keterangan Tambahan</label>
                  <input
                    type="text"
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    placeholder="Catatan tambahan..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
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
                  {createMutation.isPending ? 'Menyimpan...' : 'Simpan Mitra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DETAIL MITRA                                       */}
      {/* ========================================================= */}
      {detailClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-lg">Informasi Detail Mitra</h3>
              </div>
              <button
                onClick={() => setDetailClient(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{detailClient.name}</h4>
                  <p className="text-xs font-mono text-slate-500">Kode: {detailClient.code || '-'}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {detailClient.type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">No. Telepon / WA</p>
                  <p className="text-slate-700 font-semibold mt-0.5">{detailClient.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Terdaftar Sejak</p>
                  <p className="text-slate-700 font-semibold mt-0.5">
                    {detailClient.createdAt ? new Date(detailClient.createdAt).toLocaleDateString('id-ID') : '-'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 font-medium">Alamat Lengkap</p>
                  <p className="text-slate-700 font-semibold mt-0.5">{detailClient.alamat || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 font-medium">Keterangan</p>
                  <p className="text-slate-700 font-semibold mt-0.5">{detailClient.keterangan || '-'}</p>
                </div>
              </div>

              {/* Financial Balances Card */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-[11px] font-semibold text-blue-700">Saldo Piutang (Bon)</p>
                  <p className="text-base font-bold font-mono text-blue-900 mt-1">
                    {formatRupiah(Number(detailClient.saldoPiutang || 0))}
                  </p>
                  <p className="text-[10px] text-blue-600 mt-0.5">Tagihan kita ke mitra ini</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-[11px] font-semibold text-amber-700">Saldo Hutang</p>
                  <p className="text-base font-bold font-mono text-amber-900 mt-1">
                    {formatRupiah(Number(detailClient.saldoHutang || 0))}
                  </p>
                  <p className="text-[10px] text-amber-600 mt-0.5">Kewajiban kita ke mitra ini</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDetailClient(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold text-xs transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT MITRA                                         */}
      {/* ========================================================= */}
      {editClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-lg">Edit Data Mitra</h3>
              </div>
              <button
                onClick={() => setEditClient(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Mitra / Toko <span className="text-rose-500">*</span>
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
                  Tipe Kemitraan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Peternak">Peternak (Supplier)</option>
                  <option value="Pedagang">Pedagang (Pelanggan)</option>
                  <option value="Supplier">Supplier Bahan</option>
                  <option value="Karyawan">Karyawan</option>
                  <option value="Truk">Armada Truk</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">No. Handphone / WhatsApp</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat / Lokasi</label>
                <textarea
                  rows={2}
                  value={editAlamat}
                  onChange={(e) => setEditAlamat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Keterangan</label>
                <input
                  type="text"
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditClient(null)}
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
      {/* MODAL: HAPUS MITRA (SOFT / SAFE DELETE)                    */}
      {/* ========================================================= */}
      {deleteClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">Hapus / Nonaktifkan Mitra?</h3>
              <p className="text-xs text-slate-500 mb-4">
                Apakah Anda yakin ingin menghapus atau menonaktifkan data mitra{' '}
                <span className="font-bold text-slate-700">{deleteClient.name}</span> ({deleteClient.type})?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left mb-6">
                <p className="text-[11px] text-amber-800">
                  <span className="font-bold">Keamanan Data ERP:</span> Jika mitra ini memiliki riwayat transaksi,
                  sistem akan menandainya secara nonaktif tanpa menghapus jejak pembukuan keuangan.
                </p>
              </div>

              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => setDeleteClient(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteClient.id)}
                  disabled={deleteMutation.isPending}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs shadow-sm transition-colors disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Memproses...' : 'Ya, Hapus Mitra'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ClientPage;
