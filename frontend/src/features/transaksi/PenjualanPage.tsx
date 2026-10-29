import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel } from '../../lib/export-utils';
import { Plus, Trash2, CheckCircle2, ShoppingCart } from 'lucide-react';

interface CartItem {
  barangId: number;
  barangName: string;
  qty: number;
  hargaSatuan: number;
}

export const PenjualanPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [clientId, setClientId] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'TUNAI' | 'TRANSFER' | 'KREDIT_BON'>('KREDIT_BON');
  const [paymentAccountId, setPaymentAccountId] = useState<number>(46);
  const [keterangan, setKeterangan] = useState('');
  const [diskon, setDiskon] = useState(0);
  const [items, setItems] = useState<CartItem[]>([]);

  // Item form inputs
  const [selectedBarangId, setSelectedBarangId] = useState<number | ''>('');
  const [qty, setQty] = useState<number>(0);
  const [hargaSatuan, setHargaSatuan] = useState<number>(0);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch clients (Pedagang)
  const { data: clientsData } = useQuery({
    queryKey: ['clientsList'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/clients?limit=200');
      return res.data;
    },
  });

  // Fetch barangs
  const { data: barangsData } = useQuery({
    queryKey: ['barangsList'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/barangs?limit=200');
      return res.data;
    },
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarangId || qty <= 0 || hargaSatuan <= 0) return;

    const b = barangsData?.find((item: any) => item.id === Number(selectedBarangId));
    const newItem: CartItem = {
      barangId: Number(selectedBarangId),
      barangName: b?.name || `Barang #${selectedBarangId}`,
      qty,
      hargaSatuan,
    };

    setItems([...items, newItem]);
    // Reset form
    setSelectedBarangId('');
    setQty(0);
    setHargaSatuan(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((acc, curr) => acc + curr.qty * curr.hargaSatuan, 0);
  const grandTotal = Math.max(0, subtotal - diskon);

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/transaksi/penjualan', payload);
    },
    onSuccess: (res: any) => {
      setSuccessMessage(`Transaksi ${res.data?.invoice || 'Penjualan'} Berhasil Disimpan & Jurnal Terposting!`);
      setErrorMessage(null);
      setItems([]);
      setDiskon(0);
      setKeterangan('');
      queryClient.invalidateQueries({ queryKey: ['neraca'] });
      queryClient.invalidateQueries({ queryKey: ['stockSummary'] });
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Gagal menyimpan transaksi. Periksa ketersediaan stok FIFO.');
      setSuccessMessage(null);
    },
  });

  const handleSubmitTransaksi = () => {
    if (items.length === 0) {
      setErrorMessage('Tambahkan minimal 1 item barang ke keranjang.');
      return;
    }

    const payload = {
      type: 'PENJUALAN',
      paymentMethod,
      paymentAccountId,
      clientId: clientId ? Number(clientId) : undefined,
      diskon,
      keterangan,
      items: items.map((it) => ({
        barangId: it.barangId,
        qty: it.qty,
        hargaSatuan: it.hargaSatuan,
      })),
    };

    mutation.mutate(payload);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleExportCartExcel = () => {
    if (items.length === 0) return;
    exportToExcel({
      filename: `Draft_Keranjang_Penjualan_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Keranjang Penjualan',
      title: `DRAFT KERANJANG PENJUALAN POS`,
      columns: [
        { header: 'No', key: '_index', width: 6 },
        { header: 'Nama Barang', key: 'barangName', width: 30 },
        { header: 'Qty', key: 'qty', width: 14 },
        { header: 'Harga Satuan (Rp)', key: 'hargaSatuan', width: 18 },
        { header: 'Subtotal (Rp)', key: 'subtotal', width: 20 },
      ],
      data: items.map((it) => ({
        barangName: it.barangName,
        qty: it.qty,
        hargaSatuan: it.hargaSatuan,
        subtotal: it.qty * it.hargaSatuan,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2">
            <ShoppingCart className="w-6 h-6 text-emerald-600" />
            <span>Kasir POS Penjualan Telur & Produk</span>
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Input nota penjualan dengan alokasi FIFO atomik dan posting otomatis</p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center space-x-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kiri: Form Input Item */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Data */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">1. Informasi Nota Penjualan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pelanggan / Pedagang</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">-- Pilih Pedagang / Pelanggan --</option>
                  {clientsData?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Metode Pembayaran</label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    setPaymentMethod(val);
                    if (val === 'KREDIT_BON') setPaymentAccountId(46);
                    else if (val === 'TUNAI') setPaymentAccountId(64);
                    else if (val === 'TRANSFER') setPaymentAccountId(66);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium mb-2"
                >
                  <option value="KREDIT_BON">Bon Kredit (Piutang Pedagang)</option>
                  <option value="TUNAI">Kas Tunai (Lunas)</option>
                  <option value="TRANSFER">Transfer Bank (Lunas)</option>
                </select>

                {paymentMethod === 'TUNAI' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Akun Kas Penerima:</span>
                    <select
                      value={paymentAccountId}
                      onChange={(e) => setPaymentAccountId(Number(e.target.value))}
                      className="w-full mt-1 border border-slate-200 rounded p-1 text-xs bg-white font-medium"
                    >
                      <option value={64}>[1-1001] Kas Tunai (Pusat)</option>
                      <option value={71}>[1-1002] Kas Deby</option>
                    </select>
                  </div>
                )}

                {paymentMethod === 'TRANSFER' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs">
                    <span className="text-[10px] text-blue-700 font-bold block uppercase">Rekening Bank Penerima:</span>
                    <select
                      value={paymentAccountId}
                      onChange={(e) => setPaymentAccountId(Number(e.target.value))}
                      className="w-full mt-1 border border-blue-200 rounded p-1 text-xs bg-white font-medium"
                    >
                      <option value={66}>[1-1004] Bank BCA Masduki</option>
                      <option value={65}>[1-1003] Bank BCA Binti Wasilah</option>
                      <option value={67}>[1-1005] Bank BRI Binti Wasilah</option>
                      <option value={68}>[1-1006] Bank BRI Masduki</option>
                      <option value={70}>[1-1008] Bank BNI Bima Pratama</option>
                      <option value={69}>[1-1007] Bank BNI Binti Wasilah</option>
                    </select>
                  </div>
                )}

                {paymentMethod === 'KREDIT_BON' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800">
                    <span className="font-bold block">Akun Piutang:</span>
                    <span>[1-1020] Piutang Pedagang (ID 46) — Otomatis dibukukan ke saldo pelanggan</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Tambah Item */}
          <form onSubmit={handleAddItem} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">2. Rincian Barang & Kuantitas</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Barang</label>
                <select
                  required
                  value={selectedBarangId}
                  onChange={(e) => setSelectedBarangId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">-- Pilih Barang --</option>
                  {barangsData?.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.jenis?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Jumlah (Kg / Sak / Pcs)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={qty || ''}
                  onChange={(e) => setQty(Number(e.target.value))}
                  placeholder="Contoh: 150.5"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Harga Satuan (Rp)</label>
                <input
                  type="number"
                  required
                  value={hargaSatuan || ''}
                  onChange={(e) => setHargaSatuan(Number(e.target.value))}
                  placeholder="Contoh: 24500"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-lg flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Masukkan ke Keranjang</span>
            </button>
          </form>

          {/* Keranjang Item */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-700">
                Daftar Barang yang Dikeluarkan ({items.length} item)
              </span>
              {items.length > 0 && (
                <ExportButtonGroup onExportExcel={handleExportCartExcel} excelLabel="Export Keranjang" />
              )}
            </div>
            {items.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Belum ada barang dalam keranjang transaksi.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Nama Barang</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Harga Satuan</th>
                    <th className="p-3 text-right">Subtotal</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{it.barangName}</td>
                      <td className="p-3 text-right font-mono">{it.qty}</td>
                      <td className="p-3 text-right font-mono">{formatRupiah(it.hargaSatuan)}</td>
                      <td className="p-3 text-right font-bold text-slate-800 font-mono">
                        {formatRupiah(it.qty * it.hargaSatuan)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Summary & Checkout */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">3. Ringkasan Pembayaran</h3>

            <div className="space-y-3 pt-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Barang:</span>
                <span className="font-mono font-medium">{formatRupiah(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Diskon / Potongan:</span>
                <input
                  type="number"
                  value={diskon || ''}
                  onChange={(e) => setDiskon(Number(e.target.value))}
                  placeholder="0"
                  className="w-32 px-2 py-1 text-right border border-slate-200 rounded font-mono text-sm"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="font-bold text-base text-slate-800">Total Akhir:</span>
                <span className="text-xl font-extrabold text-emerald-700 font-mono">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan Tambahan</label>
              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Pengiriman via armada truk L300..."
                rows={3}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleSubmitTransaksi}
              disabled={mutation.isPending || items.length === 0}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{mutation.isPending ? 'Memproses FIFO & Jurnal...' : 'Selesaikan Transaksi Penjualan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
