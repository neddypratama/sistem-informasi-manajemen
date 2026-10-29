import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  FileSpreadsheet,
  Boxes,
  ShoppingCart,
  Wheat,
  Sparkles,
  ShieldCheck,
  Coins,
  UploadCloud,
  FileCode,
  Download,
  Trash2,
  FileUp,
} from 'lucide-react';

export const ImportLegacyPage: React.FC = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [migrationResult, setMigrationResult] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 1. Fetch Migration Status
  const { data: statusData, isLoading, refetch } = useQuery({
    queryKey: ['migrationStatus'],
    queryFn: async () => {
      const res: any = await apiClient.get('/migration/status');
      return res.data;
    },
    refetchInterval: 15000,
  });

  // 2. Mutation to Run Direct Clean Migration (Local DB)
  const runMigrationMutation = useMutation({
    mutationFn: async () => {
      const res: any = await apiClient.post('/migration/run-clean');
      return res.data;
    },
    onSuccess: (data) => {
      setMigrationResult(data);
      queryClient.invalidateQueries();
      refetch();
    },
    onError: (err: any) => {
      alert(`Gagal menjalankan migrasi: ${err?.message || 'Terjadi kesalahan sistem'}`);
    },
  });

  // 3. Mutation to Upload SQL Dump & Migrate
  const uploadSqlMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res: any = await apiClient.post('/migration/upload-sql', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      setMigrationResult(data);
      setSelectedFile(null);
      queryClient.invalidateQueries();
      refetch();
      alert(`Upload & Migrasi Berhasil! Data selesai diproses dalam ${data.durationSeconds} detik.`);
    },
    onError: (err: any) => {
      alert(`Gagal upload file SQL: ${err?.message || 'Terjadi kesalahan sistem'}`);
    },
  });

  const handleStartMigration = () => {
    const confirm = window.confirm(
      'Apakah Anda yakin ingin memulai proses Sinkronisasi & Migrasi Bersih dari database sistem lama?\n\nProses ini akan mengelompokkan invoice, memisahkan opname stok, dan memposting ulang jurnal akuntansi double-entry.',
    );
    if (confirm) {
      runMigrationMutation.mutate();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.match(/\.(sql|txt)$/i)) {
        alert('Hanya file berformat .sql yang diperbolehkan!');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.match(/\.(sql|txt)$/i)) {
        alert('Hanya file berformat .sql yang diperbolehkan!');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleStartUpload = () => {
    if (!selectedFile) return;
    const confirm = window.confirm(
      `Apakah Anda yakin ingin mengunggah file "${selectedFile.name}" (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)?\n\nFile akan otomatis di-restore ke database staging dan ditransformasikan menjadi transaksi baru lengkap dengan jurnal akuntansi double-entry.`,
    );
    if (confirm) {
      uploadSqlMutation.mutate(selectedFile);
    }
  };

  const handleDownloadTemplate = async (type: 'barang' | 'client' | 'transaksi') => {
    try {
      const baseUrl = (apiClient.defaults.baseURL || '').replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/migration/template/${type}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_import_${type}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Gagal mengunduh template: ${err.message}`);
    }
  };

  const modern = statusData?.modern;
  const legacy = statusData?.legacy;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2">
            <Database className="w-7 h-7 text-emerald-600" />
            <span>Sinkronisasi & Import Data Sistem Lama</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Engine ETL Cerdas: Memigrasikan data historis sistem lama ke ERP 2.0 dengan pemisahan jurnal akuntansi dan isolasi opname stok.
          </p>
        </div>

        <button
          onClick={handleStartMigration}
          disabled={runMigrationMutation.isPending}
          className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${runMigrationMutation.isPending ? 'animate-spin' : ''}`} />
          <span>{runMigrationMutation.isPending ? 'Sedang Memproses Migrasi...' : 'Jalankan Sinkronisasi ETL'}</span>
        </button>
      </div>

      {/* Result Alert if just finished */}
      {migrationResult && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-emerald-900 text-base">
                Sinkronisasi & Migrasi Bersih Berhasil Selesai! ({migrationResult.durationSeconds} Detik)
              </h4>
              <p className="text-xs text-emerald-700 mt-1">
                Data historis telah berhasil ditransformasikan ke dalam struktur ERP 2.0 modern. Seluruh jurnal double-entry telah ter-posting seimbang.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-semibold">
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-slate-500 block text-[10px]">Penjualan Murni</span>
                  <span className="text-emerald-700 text-sm font-bold font-mono">
                    {migrationResult.summary?.penjualanMurni?.toLocaleString()}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-slate-500 block text-[10px]">Pembelian Peternak</span>
                  <span className="text-emerald-700 text-sm font-bold font-mono">
                    {migrationResult.summary?.pembelianPeternakMurni?.toLocaleString()}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-slate-500 block text-[10px]">Opname Stok Terpisah</span>
                  <span className="text-emerald-700 text-sm font-bold font-mono">
                    {migrationResult.summary?.opnameStok?.toLocaleString()}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-slate-500 block text-[10px]">Jurnal Akuntansi Diposting</span>
                  <span className="text-emerald-700 text-sm font-bold font-mono">
                    {migrationResult.summary?.totalJurnalUmum?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload File SQL & Data Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center space-x-2">
              <UploadCloud className="w-5 h-5 text-emerald-600" />
              <span>Upload File Backup Database (.SQL) Sistem Lama</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Format tercepat & paling mudah: Cukup export database dari phpMyAdmin/Laragon, lalu unggah file <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono">.sql</code> di bawah ini.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Unduh Format Excel:</span>
            <button
              onClick={() => handleDownloadTemplate('barang')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Unduh Template Barang"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Barang</span>
            </button>
            <button
              onClick={() => handleDownloadTemplate('client')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Unduh Template Mitra"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Mitra</span>
            </button>
            <button
              onClick={() => handleDownloadTemplate('transaksi')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Unduh Template Transaksi"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Transaksi</span>
            </button>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-6 transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
              : selectedFile
              ? 'border-emerald-300 bg-emerald-50/20'
              : 'border-slate-200 hover:border-emerald-400 bg-slate-50/50 hover:bg-slate-50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".sql,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          {!selectedFile ? (
            <div className="space-y-3 py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                <FileCode className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Klik untuk memilih file atau seret file <span className="text-emerald-600 font-mono">.SQL</span> ke sini
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Mendukung file dump database MySQL dari phpMyAdmin / Laragon (Ukuran maksimal: 250 MB)
                </p>
              </div>
            </div>
          ) : (
            <div
              className="w-full max-w-md bg-white rounded-xl p-4 border border-emerald-200 shadow-sm flex items-center justify-between gap-3 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 truncate">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
                  SQL
                </div>
                <div className="truncate">
                  <p className="text-sm font-bold text-slate-800 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Siap diproses
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  disabled={uploadSqlMutation.isPending}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Hapus file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Button & Help notes */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Otomatis memetakan 31 kode operasi legacy, merestorasi transaksi komersial, & memposting jurnal akuntansi seimbang.
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {selectedFile && (
              <button
                type="button"
                onClick={handleStartUpload}
                disabled={uploadSqlMutation.isPending}
                className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 text-sm"
              >
                <FileUp className={`w-4 h-4 ${uploadSqlMutation.isPending ? 'animate-bounce' : ''}`} />
                <span>
                  {uploadSqlMutation.isPending
                    ? 'Sedang Mengunggah & Memproses Database...'
                    : 'Upload & Mulai Migrasi ETL'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Grid: Legacy vs Modern */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source Legacy DB */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                1.0
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Database Sumber (Legacy)</h3>
                <p className="text-xs text-slate-500">Database MySQL `bimapratama`</p>
              </div>
            </div>
            {legacy?.available ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Terhubung</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Tidak Terhubung</span>
              </span>
            )}
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Total Baris Transaksi Mentah:</span>
              <span className="font-mono font-bold text-slate-800 text-base">
                {isLoading ? '...' : legacy?.totalTransactions?.toLocaleString() || 0} baris
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Struktur Flat Lama:</span>
              </p>
              <p>
                1 transaksi penjualan terpecah menjadi 4 baris terpisah (DPT, BON, HPP, TLR) dan transaksi Opname Stok
                tercampur baur dengan Pembelian Peternak.
              </p>
            </div>
          </div>
        </div>

        {/* Target Modern ERP 2.0 DB */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                2.0
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Database Tujuan (Modern)</h3>
                <p className="text-xs text-slate-500">Database MySQL `bimapratama_v2`</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Optimized Schema</span>
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-emerald-900 font-semibold">Transaksi Operasional Bersih:</span>
              <span className="font-mono font-bold text-emerald-700 text-base">
                {isLoading ? '...' : modern?.totalTransactions?.toLocaleString() || 0} transaksi
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 block text-[10px]">Header Jurnal Umum</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {isLoading ? '...' : modern?.totalJurnals?.toLocaleString() || 0}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 block text-[10px]">Baris Jurnal Double-Entry</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {isLoading ? '...' : modern?.totalJurnalDetails?.toLocaleString() || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Metrics in Modern System */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 text-base flex items-center space-x-2">
          <Layers className="w-5 h-5 text-emerald-600" />
          <span>Hasil Klasifikasi Peristiwa Bisnis Bersih (ERP 2.0)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Penjualan Murni</span>
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {isLoading ? '...' : modern?.breakdown?.penjualan?.toLocaleString() || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Faktur penjualan riil (1 faktur + 4 baris jurnal)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Pendapatan Lainnya</span>
              <Coins className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-700">
              {isLoading ? '...' : modern?.breakdown?.pendapatanLain?.toLocaleString() || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Pemasukan non-komoditas (Jasa, Transport, Reject, dll.)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Pembelian Peternak</span>
              <Wheat className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {isLoading ? '...' : modern?.breakdown?.pembelian?.toLocaleString() || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Pembelian murni peternak (tervalidasi pasangan utang)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Stok Batches FIFO</span>
              <Boxes className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {isLoading ? '...' : modern?.totalStokBatches?.toLocaleString() || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Antrean batch stok masuk aktif untuk kalkulasi HPP
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Kas & Beban Operasional</span>
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-800">
              {isLoading ? '...' : modern?.breakdown?.kasMutasi?.toLocaleString() || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Pengeluaran beban & mutasi buku kas/bank
            </p>
          </div>
        </div>
      </div>

      {/* Logic Documentation Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
          <h4 className="font-bold text-sm tracking-wide uppercase">Aturan Bisnis & Logika ETL Cerdas yang Dijalankan</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
            <p className="font-bold text-white mb-1.5">1. Algoritma Hash Pairing Invoice</p>
            <p className="leading-relaxed">
              Membaca kode invoice dengan format <code className="text-emerald-400 font-mono">INV-[TGL]-[KODE]-[HASH]</code>.
              Semua baris transaksi dengan tanggal dan 4 karakter hash yang sama disatukan sebagai satu peristiwa bisnis tunggal.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
            <p className="font-bold text-white mb-1.5">2. Deteksi Pembelian vs Opname Stok</p>
            <p className="leading-relaxed">
              Jika kelompok hash memiliki transaksi pendamping dengan kategori <span className="text-amber-300 font-semibold">Piutang/Hutang Peternak</span>,
              dinyatakan sebagai <strong>Pembelian Murni</strong>. Jika pasangannya adalah Modal Awal / Beban Tray, diisolasi sebagai <strong>Opname Stok</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
            <p className="font-bold text-white mb-1.5">3. Posting Jurnal Double-Entry Berimbang</p>
            <p className="leading-relaxed">
              Setiap transaksi penjualan otomatis memposting 4 baris jurnal akuntansi: (1) Piutang Pedagang (D), (2) Pendapatan Penjualan (K),
              (3) Beban HPP (D), dan (4) Persediaan Stok (K).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ImportLegacyPage;
