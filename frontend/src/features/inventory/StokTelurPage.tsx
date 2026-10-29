import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel } from '../../lib/export-utils';
import {
  Boxes,
  AlertTriangle,
  Search,
  Layers,
  X,
  Package,
  Eye,
  ChevronDown,
} from 'lucide-react';

export const StokTelurPage: React.FC = () => {
  const [filterJenisId, setFilterJenisId] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [selectedBarangDetail, setSelectedBarangDetail] = useState<any | null>(null);

  // 1. Fetch Master Jenis Barang for Category Select
  const { data: jenisList } = useQuery({
    queryKey: ['jenisBarangsList'],
    queryFn: async () => {
      try {
        const res: any = await apiClient.get('/master/barangs/jenis');
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (list.length > 0) {
          return list.map((j: any) => ({ id: Number(j.id), name: j.name }));
        }
      } catch (err) {
        // Fallback below if endpoint fails
      }
      const res: any = await apiClient.get('/inventory/summary');
      const items = Array.isArray(res) ? res : (res?.data || []);
      // Extract unique jenis
      const map = new Map<number, string>();
      for (const it of items) {
        if (it.jenisId && it.jenis) {
          map.set(Number(it.jenisId), it.jenis);
        }
      }
      return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    },
  });

  // 2. Fetch stock items
  const { data: stockItems, isLoading } = useQuery({
    queryKey: ['stockGrid', filterJenisId],
    queryFn: async () => {
      let url = '/inventory/summary';
      if (filterJenisId) url += `?jenisId=${filterJenisId}`;
      const res: any = await apiClient.get(url);
      return Array.isArray(res) ? res : (res?.data || []);
    },
  });

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatTanggal = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Filter by search
  const filteredItems = useMemo(() => {
    if (!stockItems) return [];
    if (!search) return stockItems;
    const q = search.toLowerCase();
    return stockItems.filter(
      (item: any) =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.code || '').toLowerCase().includes(q) ||
        (item.jenis || '').toLowerCase().includes(q)
    );
  }, [stockItems, search]);

  const totalNilaiGudang = filteredItems?.reduce((acc: number, curr: any) => acc + (curr.nilaiStok || 0), 0) || 0;

  const handleExportExcel = () => {
    if (!filteredItems || filteredItems.length === 0) {
      alert('Tidak ada data stok untuk diekspor');
      return;
    }

    const rows = filteredItems.map((item: any) => ({
      code: item.code || `SKU-${item.id}`,
      name: item.name,
      jenis: item.jenis || '-',
      totalStok: Number(item.totalStok) || 0,
      satuan: item.satuan || '-',
      hargaRataRata: Number(item.hargaRataRata) || 0,
      nilaiStok: Number(item.nilaiStok) || 0,
      status: item.isDibawahMinimum ? 'Kritis (Di Bawah Minimum)' : 'Aman',
    }));

    exportToExcel({
      filename: `Stok_Gudang_FIFO_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Stok Gudang',
      title: `LAPORAN POSISI STOK & VALUASI FIFO GUDANG`,
      columns: [
        { header: 'No', key: '_index', width: 6 },
        { header: 'Kode SKU', key: 'code', width: 16 },
        { header: 'Nama Barang', key: 'name', width: 30 },
        { header: 'Jenis / Kategori', key: 'jenis', width: 20 },
        { header: 'Stok Fisik', key: 'totalStok', width: 14 },
        { header: 'Satuan', key: 'satuan', width: 10 },
        { header: 'HPP Rata-rata (Rp)', key: 'hargaRataRata', width: 20 },
        { header: 'Total Nilai (Rp)', key: 'nilaiStok', width: 22 },
        { header: 'Status Stok', key: 'status', width: 24 },
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
            <Boxes className="w-7 h-7 text-emerald-600" />
            <span>Monitoring Stok Fisik & Valuasi FIFO Gudang</span>
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Pantau posisi stok real-time seluruh komoditas telur, pakan ternak, obat, dan tray beserta rincian batch FIFO
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportButtonGroup onExportExcel={handleExportExcel} />
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-right">
            <p className="text-xs text-emerald-700 font-semibold uppercase">Total Nilai Persediaan</p>
            <p className="text-lg font-bold text-emerald-800 font-mono">{formatRupiah(totalNilaiGudang)}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar: Search & Select Filter Jenis Barang */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-72 lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari nama barang, kode SKU, jenis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2 min-h-[40px] border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                title="Hapus kata kunci pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Select Filter Jenis Barang */}
          <div className="relative w-full sm:w-64 lg:w-72">
            <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <select
              value={filterJenisId}
              onChange={(e) => setFilterJenisId(e.target.value ? Number(e.target.value) : '')}
              className="w-full pl-10 pr-9 py-2 min-h-[40px] border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer transition-colors shadow-sm"
            >
              <option value="">Semua Jenis Barang</option>
              {jenisList?.map((j: any) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {/* Reset button if search or filter is active */}
          {(search || filterJenisId !== '') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilterJenisId('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold rounded-xl transition-colors border border-rose-200/60 self-start sm:self-auto shrink-0 shadow-sm"
              title="Reset pencarian dan filter jenis"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        {/* Counter Info */}
        <div className="text-xs text-slate-500 font-medium shrink-0 self-end sm:self-auto">
          Menampilkan <span className="font-bold text-slate-800 font-mono">{filteredItems.length}</span> barang
        </div>
      </div>

      {/* Stock Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-slate-400">
            Mengambil data stok dari database...
          </div>
        ) : filteredItems?.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400">
            Tidak ada barang yang sesuai dengan kriteria pencarian.
          </div>
        ) : (
          filteredItems?.map((item: any) => (
            <div
              key={item.id}
                onClick={() => setSelectedBarangDetail(item)}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] text-slate-400 font-mono font-medium">{item.code || `SKU-${item.id}`}</span>
                    <h4 className="text-base font-bold text-slate-800 leading-snug group-hover:text-emerald-700 transition-colors">
                      {item.name}
                    </h4>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 mt-1">
                      {item.jenis}
                    </span>
                  </div>
                  {item.isDibawahMinimum ? (
                    <span
                      className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200 flex items-center gap-1"
                      title="Stok dibawah batas minimum"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Kritis</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                      Tersedia
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Sisa Stok Fisik</p>
                    <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">
                      {Number(item.totalStok).toLocaleString('id-ID')}{' '}
                      <span className="text-xs font-semibold text-slate-500">{item.satuan}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-medium">Nilai Persediaan</p>
                    <p className="text-sm font-extrabold text-emerald-700 font-mono mt-0.5">
                      {formatRupiah(item.nilaiStok)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      HPP: {formatRupiah(item.hargaRataRata)}/{item.satuan}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.batches?.length || 0} Batch FIFO Aktif</span>
                  </span>
                  <span className="text-emerald-600 font-bold group-hover:underline flex items-center gap-1">
                    <span>Lihat Batch</span>
                    <Eye className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))
          )}
      </div>

      {/* ================= MODAL DETAIL BATCH FIFO ================= */}
      {selectedBarangDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {selectedBarangDetail.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedBarangDetail.code || `SKU-${selectedBarangDetail.id}`} • {selectedBarangDetail.jenis}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBarangDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Banner */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 font-semibold block">Total Sisa Stok</span>
                <p className="text-base font-black font-mono text-slate-800 mt-0.5">
                  {Number(selectedBarangDetail.totalStok).toLocaleString('id-ID')} {selectedBarangDetail.satuan}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Rata-rata HPP</span>
                <p className="text-base font-bold font-mono text-slate-800 mt-0.5">
                  {formatRupiah(selectedBarangDetail.hargaRataRata)}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Total Valuasi Fisik</span>
                <p className="text-base font-extrabold font-mono text-emerald-700 mt-0.5">
                  {formatRupiah(selectedBarangDetail.nilaiStok)}
                </p>
              </div>
            </div>

            {/* Batch Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Daftar Antrean Batch FIFO Masuk (First In, First Out)</span>
              </h4>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5 w-10 text-center">No</th>
                      <th className="p-2.5">Tanggal Batch</th>
                      <th className="p-2.5 text-right">Qty Masuk</th>
                      <th className="p-2.5 text-right">Sisa Stok</th>
                      <th className="p-2.5 text-right">Harga Beli FIFO</th>
                      <th className="p-2.5 text-right">Subtotal Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {!selectedBarangDetail.batches || selectedBarangDetail.batches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400 font-sans">
                          Tidak ada batch stok aktif tersisa untuk barang ini.
                        </td>
                      </tr>
                    ) : (
                      selectedBarangDetail.batches.map((b: any, bIdx: number) => {
                        const subtotalBatch = Number(b.qtySisa) * Number(b.hargaBeli);
                        return (
                          <tr key={b.id || bIdx} className="hover:bg-slate-50">
                            <td className="p-2.5 text-center text-slate-400">{bIdx + 1}</td>
                            <td className="p-2.5 font-sans font-medium text-slate-700">
                              {formatTanggal(b.tanggal)}
                            </td>
                            <td className="p-2.5 text-right text-slate-500">
                              {Number(b.qtyMasuk).toLocaleString('id-ID')}
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-800">
                              {Number(b.qtySisa).toLocaleString('id-ID')} {selectedBarangDetail.satuan}
                            </td>
                            <td className="p-2.5 text-right text-slate-700">
                              {formatRupiah(b.hargaBeli)}
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-700">
                              {formatRupiah(subtotalBatch)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedBarangDetail(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
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
export default StokTelurPage;
