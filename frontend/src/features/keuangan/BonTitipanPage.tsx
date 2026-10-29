import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel, formatDateIndo } from '../../lib/export-utils';
import {
  WalletCards,
  Search,
  Filter,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  Eye,
  Receipt,
  Calendar,
  Loader2,
} from 'lucide-react';

export const BonTitipanPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  // Selected Mitra for Transaction Details Modal
  const [selectedMitra, setSelectedMitra] = useState<any | null>(null);
  const [txSearch, setTxSearch] = useState('');
  const [txFilterPos, setTxFilterPos] = useState<string>(''); // '' | 'PIUTANG' | 'HUTANG'
  const [txFilterPosisi, setTxFilterPosisi] = useState<string>(''); // '' | 'DEBIT' | 'KREDIT'

  // 1. Fetch Bon-Titipan Cross Ledger Report
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['bonTitipan', search, filterType],
    queryFn: async () => {
      let url = '/reports/bon-titipan';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterType) params.append('type', filterType);
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      const res: any = await apiClient.get(url);
      return res.data;
    },
  });

  // 2. Fetch Transactions & Journals for the Selected Mitra
  const {
    data: clientTxData,
    isLoading: isTxLoading,
    refetch: refetchTx,
  } = useQuery({
    queryKey: ['clientLedger', selectedMitra?.id],
    queryFn: async () => {
      if (!selectedMitra?.id) return { items: [] };
      const res: any = await apiClient.get(`/transaksi/client-ledger/${selectedMitra.id}`);
      return res?.data || res;
    },
    enabled: !!selectedMitra?.id,
  });

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const ringkasan = reportData?.ringkasan || {
    totalMitra: 0,
    totalPiutang: 0,
    totalHutang: 0,
    totalNet: 0,
  };

  const items = reportData?.items || [];

  // Helper to classify transaction into Piutang / Hutang and Debit / Kredit
  const classifyTx = (tx: any): { pos: 'PIUTANG' | 'HUTANG'; posisi: 'DEBIT' | 'KREDIT'; nominal: number } => {
    const nominal = Number(tx.total || tx.nominal || 0);

    // 1. Check Jurnal Umum details if present
    for (const j of tx.jurnalUmums || []) {
      for (const jd of j.details || []) {
        const katId = Number(jd.kategoriId || 0);
        const isPiutang = katId >= 46 && katId <= 58;
        const isHutang = katId >= 72 && katId <= 85;

        if (isPiutang) {
          return {
            pos: 'PIUTANG',
            posisi: Number(jd.debit || 0) > 0 ? 'DEBIT' : 'KREDIT',
            nominal,
          };
        }
        if (isHutang) {
          return {
            pos: 'HUTANG',
            posisi: Number(jd.kredit || 0) > 0 ? 'KREDIT' : 'DEBIT',
            nominal,
          };
        }
      }
    }

    // 2. Check Detail Transaksi kategori
    for (const d of tx.details || []) {
      const katName = (d.kategori?.name || '').toLowerCase();
      const dType = (d.kategori?.detailKategori?.type || '').toLowerCase();
      const katId = Number(d.kategoriId || d.kategori?.id || 0);

      const isPiutang = katName.includes('piutang') || (katId >= 46 && katId <= 58);
      const isHutang = katName.includes('hutang') || dType === 'liabilitas' || (katId >= 72 && katId <= 85);

      if (isPiutang) {
        const posisi = tx.type === 'KAS_MASUK' || tx.type === 'RETUR_PENJUALAN' ? 'KREDIT' : 'DEBIT';
        return { pos: 'PIUTANG', posisi, nominal };
      }
      if (isHutang) {
        const posisi = tx.type === 'KAS_KELUAR' || tx.type === 'RETUR_PEMBELIAN' ? 'DEBIT' : 'KREDIT';
        return { pos: 'HUTANG', posisi, nominal };
      }
    }

    // 3. Fallback by Transaction Type & Invoice
    if (tx.type === 'PENJUALAN') {
      return { pos: 'PIUTANG', posisi: 'DEBIT', nominal };
    }
    if (tx.type === 'PEMBELIAN') {
      return { pos: 'HUTANG', posisi: 'KREDIT', nominal };
    }
    if (tx.type === 'RETUR_PENJUALAN') {
      return { pos: 'PIUTANG', posisi: 'KREDIT', nominal };
    }
    if (tx.type === 'RETUR_PEMBELIAN') {
      return { pos: 'HUTANG', posisi: 'DEBIT', nominal };
    }
    if (tx.type === 'KAS_MASUK') {
      const isUtg = (tx.invoice || '').includes('UTG');
      return isUtg
        ? { pos: 'HUTANG', posisi: 'KREDIT', nominal }
        : { pos: 'PIUTANG', posisi: 'KREDIT', nominal };
    }
    if (tx.type === 'KAS_KELUAR') {
      const isUtg = (tx.invoice || '').includes('UTG');
      return isUtg
        ? { pos: 'HUTANG', posisi: 'DEBIT', nominal }
        : { pos: 'PIUTANG', posisi: 'DEBIT', nominal };
    }

    return { pos: 'PIUTANG', posisi: 'DEBIT', nominal };
  };

  // Classified transactions for the selected mitra
  const rawTransactions: any[] = useMemo(() => {
    return clientTxData?.items || [];
  }, [clientTxData]);

  const classifiedTransactions = useMemo(() => {
    return rawTransactions.map((tx) => {
      if (tx.pos && tx.posisi) {
        return {
          ...tx,
          nominal: Number(tx.nominal || 0),
          debit: tx.posisi === 'DEBIT' ? Number(tx.nominal || 0) : 0,
          kredit: tx.posisi === 'KREDIT' ? Number(tx.nominal || 0) : 0,
        };
      }
      const classification = classifyTx(tx);
      return {
        ...tx,
        pos: classification.pos,
        posisi: classification.posisi,
        nominal: classification.nominal,
        debit: classification.posisi === 'DEBIT' ? classification.nominal : 0,
        kredit: classification.posisi === 'KREDIT' ? classification.nominal : 0,
      };
    });
  }, [rawTransactions]);

  // Filtered transactions based on Pos (Piutang / Hutang) and Posisi (Debit / Kredit)
  const filteredTransactions = useMemo(() => {
    return classifiedTransactions.filter((tx) => {
      // 1. Filter Pos: Piutang / Hutang
      if (txFilterPos && tx.pos !== txFilterPos) return false;

      // 2. Filter Posisi: Debit / Kredit
      if (txFilterPosisi && tx.posisi !== txFilterPosisi) return false;

      // 3. Search query
      if (txSearch.trim()) {
        const query = txSearch.toLowerCase();
        const invoiceMatch = tx.invoice?.toLowerCase().includes(query);
        const ketMatch = tx.keterangan?.toLowerCase().includes(query);
        const detailsMatch = tx.details?.some(
          (d: any) =>
            d.barang?.name?.toLowerCase().includes(query) ||
            d.barang?.code?.toLowerCase().includes(query) ||
            d.kategori?.name?.toLowerCase().includes(query)
        );
        if (!invoiceMatch && !ketMatch && !detailsMatch) return false;
      }
      return true;
    });
  }, [classifiedTransactions, txFilterPos, txFilterPosisi, txSearch]);

  const totalFilteredDebit = useMemo(() => {
    return filteredTransactions.reduce((acc, curr) => acc + (curr.debit || 0), 0);
  }, [filteredTransactions]);

  const totalFilteredKredit = useMemo(() => {
    return filteredTransactions.reduce((acc, curr) => acc + (curr.kredit || 0), 0);
  }, [filteredTransactions]);

  // Export transactions of selected mitra to CSV
  const handleExportMainExcel = () => {
    if (!items || items.length === 0) {
      alert('Tidak ada data mitra untuk diekspor');
      return;
    }

    const rows = items.map((m: any) => ({
      name: m.name,
      type: m.type || '-',
      phone: m.phone || '-',
      saldoPiutang: Number(m.saldoPiutang) || 0,
      saldoHutang: Number(m.saldoHutang) || 0,
      netSaldo: Number(m.netSaldo) || 0,
      status: Number(m.netSaldo) > 0 ? 'Mitra Punya Hutang (Piutang Kita)' : Number(m.netSaldo) < 0 ? 'Kita Punya Hutang (Titipan)' : 'Lunas / Seimbang',
    }));

    exportToExcel({
      filename: `Rekap_Bon_Titipan_Mitra_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Bon Titipan',
      title: 'REKAPITULASI BON - TITIPAN MITRA (PIUTANG & HUTANG)',
      columns: [
        { header: 'No', key: '_index', width: 6 },
        { header: 'Nama Mitra', key: 'name', width: 30 },
        { header: 'Kategori Mitra', key: 'type', width: 18 },
        { header: 'No. Telepon', key: 'phone', width: 16 },
        { header: 'Piutang / Bon (Rp)', key: 'saldoPiutang', width: 22 },
        { header: 'Hutang / Titipan (Rp)', key: 'saldoHutang', width: 22 },
        { header: 'Saldo Bersih / Net (Rp)', key: 'netSaldo', width: 22 },
        { header: 'Status Rekening', key: 'status', width: 32 },
      ],
      data: rows,
    });
  };

  const handleExportClientTxExcel = () => {
    if (!selectedMitra || filteredTransactions.length === 0) return;

    const rows = filteredTransactions.map((tx: any) => {
      const detailsStr = (tx.details || [])
        .map(
          (d: any) =>
            `${d.barang?.name || d.kategori?.name || '-'}${
              d.jumlah ? ` (${d.jumlah} ${d.barang?.satuan || ''})` : ''
            }`
        )
        .join('; ');

      return {
        invoice: tx.invoice || '-',
        tanggal: formatDateIndo(tx.tanggal),
        pos: tx.pos === 'PIUTANG' ? 'Piutang (Bon)' : 'Hutang (Titipan)',
        posisi: tx.posisi,
        type: tx.type || '-',
        debit: tx.posisi === 'DEBIT' ? Number(tx.nominal || 0) : 0,
        kredit: tx.posisi === 'KREDIT' ? Number(tx.nominal || 0) : 0,
        keterangan: tx.keterangan || '-',
        items: detailsStr || '-',
      };
    });

    exportToExcel({
      filename: `Ledger_${selectedMitra.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Buku Besar Mitra',
      title: `BUKU BESAR MUTASI TRANSAKSI: ${selectedMitra.name.toUpperCase()} (${selectedMitra.type || 'Mitra'})`,
      columns: [
        { header: 'No', key: '_index', width: 6 },
        { header: 'Invoice / No. Ref', key: 'invoice', width: 20 },
        { header: 'Tanggal', key: 'tanggal', width: 14 },
        { header: 'Pos Akun', key: 'pos', width: 18 },
        { header: 'Mutasi', key: 'posisi', width: 12 },
        { header: 'Tipe Transaksi', key: 'type', width: 18 },
        { header: 'Debit (Rp)', key: 'debit', width: 18 },
        { header: 'Kredit (Rp)', key: 'kredit', width: 18 },
        { header: 'Keterangan', key: 'keterangan', width: 32 },
        { header: 'Rincian Barang', key: 'items', width: 30 },
      ],
      data: rows,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2">
            <WalletCards className="w-7 h-7 text-indigo-600" />
            <span>Bon - Titipan Mitra (Piutang & Hutang)</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Rekapitulasi saldo silang piutang (Bon) dan hutang (Titipan) mitra bisnis dengan detail riwayat transaksi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportButtonGroup onExportExcel={handleExportMainExcel} />
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl text-right shadow-sm">
            <p className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider">Saldo Bersih (Net)</p>
            <p className="text-lg font-bold text-emerald-900 font-mono">
              {isLoading ? '...' : formatRupiah(ringkasan.totalNet)}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Mitra</p>
            <p className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
              {isLoading ? '...' : ringkasan.totalMitra}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">Peternak, Pedagang, Suplier</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Bon (Piutang)</p>
            <p className="text-2xl font-extrabold text-amber-700 font-mono mt-1">
              {isLoading ? '...' : formatRupiah(ringkasan.totalPiutang)}
            </p>
            <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" /> Tagihan Piutang ke Mitra
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Titipan (Hutang)</p>
            <p className="text-2xl font-extrabold text-indigo-700 font-mono mt-1">
              {isLoading ? '...' : formatRupiah(ringkasan.totalHutang)}
            </p>
            <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-indigo-600" /> Kewajiban Hutang ke Mitra
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-5 rounded-2xl text-white shadow-md">
          <div className="flex items-center justify-between text-emerald-200">
            <span className="text-xs font-bold uppercase tracking-wider">Posisi Saldo Bersih</span>
            <Scale className="w-4 h-4 text-emerald-200" />
          </div>
          <p className="text-2xl font-black font-mono mt-2">
            {isLoading ? '...' : formatRupiah(ringkasan.totalNet)}
          </p>
          <span className="text-xs text-emerald-100 mt-1 block">
            Selisih Bon (Piutang) dikurangi Titipan (Hutang)
          </span>
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
              placeholder="Cari nama mitra atau telepon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Filter by Type */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-slate-200 rounded-xl text-xs px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Semua Tipe Mitra</option>
              <option value="PETERNAK">Peternak</option>
              <option value="PEDAGANG">Pedagang</option>
              <option value="SUPLIER">Suplier</option>
              <option value="EKSPEDISI">Ekspedisi</option>
            </select>
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors"
            title="Muat ulang data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Menampilkan {items.length} mitra bisnis
        </span>
      </div>

      {/* Bon-Titipan Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="p-4 w-12 text-center">No</th>
                <th className="p-4">Kode & Nama Mitra</th>
                <th className="p-4">Tipe Mitra</th>
                <th className="p-4 text-right">Saldo Bon (Piutang)</th>
                <th className="p-4 text-right">Saldo Titipan (Hutang)</th>
                <th className="p-4 text-right">Sisa Bersih (Net)</th>
                <th className="p-4 text-center w-36">Status Saldo</th>
                <th className="p-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    Mengkalkulasi saldo silang piutang dan hutang mitra...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    Tidak ada catatan mitra yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                items.map((mitra: any, i: number) => {
                  const sisa = mitra.sisa;
                  return (
                    <tr key={mitra.id || i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-center font-mono text-slate-400 text-xs">{i + 1}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{mitra.name}</div>
                        <div className="text-xs text-slate-400 font-mono">
                          {mitra.code || `CLI-${mitra.id}`} {mitra.phone ? `• ${mitra.phone}` : ''}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                          {mitra.type}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-medium text-amber-700">
                        {formatRupiah(mitra.bon)}
                      </td>
                      <td className="p-4 text-right font-mono font-medium text-indigo-700">
                        {formatRupiah(mitra.titipan)}
                      </td>
                      <td
                        className={`p-4 text-right font-mono font-bold ${
                          sisa > 0
                            ? 'text-amber-800'
                            : sisa < 0
                            ? 'text-indigo-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {formatRupiah(sisa)}
                      </td>
                      <td className="p-4 text-center">
                        {mitra.statusSaldo === 'BON_LEBIH_BESAR' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            <AlertCircle className="w-3 h-3" />
                            <span>Piutang Bon</span>
                          </span>
                        ) : mitra.statusSaldo === 'TITIPAN_LEBIH_BESAR' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>Hutang Titipan</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Seimbang</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedMitra(mitra);
                            setTxSearch('');
                            setTxFilterPos('');
                            setTxFilterPosisi('');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all shadow-sm active:scale-95"
                          title={`Lihat riwayat hutang & piutang ${mitra.name}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-sm text-slate-900">
              <tr>
                <td className="p-4 text-center">Σ</td>
                <td className="p-4" colSpan={2}>
                  TOTAL SALDO SELURUH MITRA
                </td>
                <td className="p-4 text-right font-mono text-amber-800">{formatRupiah(ringkasan.totalPiutang)}</td>
                <td className="p-4 text-right font-mono text-indigo-800">{formatRupiah(ringkasan.totalHutang)}</td>
                <td className="p-4 text-right font-mono text-emerald-800">{formatRupiah(ringkasan.totalNet)}</td>
                <td className="p-4 text-center text-xs font-mono text-slate-500" colSpan={2}>
                  Live Ledger Bilateral
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MODAL: DETAIL RIWAYAT HUTANG & PIUTANG MITRA (DEBIT / KREDIT) */}
      {selectedMitra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 shadow-sm">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                      Riwayat Hutang & Piutang: {selectedMitra.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {selectedMitra.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {selectedMitra.code || `CLI-${selectedMitra.id}`}
                    {selectedMitra.phone ? ` • Telp: ${selectedMitra.phone}` : ''}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMitra(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Summary Cards */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/40">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                      Saldo Piutang (Bon)
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-lg font-bold text-amber-800 font-mono mt-1">
                    {formatRupiah(selectedMitra.bon)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Tagihan kita ke mitra ini</p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                      Saldo Titipan (Hutang)
                    </span>
                    <ArrowDownLeft className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className="text-lg font-bold text-indigo-800 font-mono mt-1">
                    {formatRupiah(selectedMitra.titipan)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Titipan / kewajiban ke mitra</p>
                </div>

                <div
                  className={`bg-white p-3.5 rounded-xl border shadow-xs ${
                    selectedMitra.sisa > 0
                      ? 'border-amber-300 bg-amber-50/30'
                      : selectedMitra.sisa < 0
                      ? 'border-indigo-300 bg-indigo-50/30'
                      : 'border-emerald-300 bg-emerald-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Sisa Bersih (Net)
                    </span>
                    <Scale className="w-4 h-4 text-slate-500" />
                  </div>
                  <p
                    className={`text-lg font-black font-mono mt-1 ${
                      selectedMitra.sisa > 0
                        ? 'text-amber-800'
                        : selectedMitra.sisa < 0
                        ? 'text-indigo-800'
                        : 'text-emerald-700'
                    }`}
                  >
                    {formatRupiah(selectedMitra.sisa)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {selectedMitra.statusSaldo === 'BON_LEBIH_BESAR'
                      ? 'Mitra berhutang ke kita'
                      : selectedMitra.statusSaldo === 'TITIPAN_LEBIH_BESAR'
                      ? 'Kita berhutang ke mitra'
                      : 'Posisi seimbang / lunas'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Controls: Filter Piutang/Hutang, Debit/Kredit, Search & Export */}
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Search Box */}
                <div className="relative min-w-[200px] flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari invoice, barang, keterangan..."
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Filter 1: Piutang atau Hutang */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Pos:</span>
                  <select
                    value={txFilterPos}
                    onChange={(e) => setTxFilterPos(e.target.value)}
                    className="border border-slate-200 rounded-xl text-xs px-3 py-1.5 bg-slate-50 focus:bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                  >
                    <option value="">Semua (Piutang & Hutang)</option>
                    <option value="PIUTANG">Piutang (Bon)</option>
                    <option value="HUTANG">Hutang (Titipan)</option>
                  </select>
                </div>

                {/* Filter 2: Debit atau Kredit */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Mutasi:</span>
                  <select
                    value={txFilterPosisi}
                    onChange={(e) => setTxFilterPosisi(e.target.value)}
                    className="border border-slate-200 rounded-xl text-xs px-3 py-1.5 bg-slate-50 focus:bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                  >
                    <option value="">Semua (Debit & Kredit)</option>
                    <option value="DEBIT">Debit</option>
                    <option value="KREDIT">Kredit</option>
                  </select>
                </div>

                <button
                  onClick={() => refetchTx()}
                  className="p-1.5 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                  title="Muat ulang transaksi mitra"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <ExportButtonGroup
                  onExportExcel={handleExportClientTxExcel}
                  excelLabel="Export Ledger Excel"
                  disabled={filteredTransactions.length === 0}
                />
              </div>
            </div>

            {/* Transactions Table Body */}
            <div className="flex-1 overflow-y-auto max-h-[50vh] p-4">
              {isTxLoading ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <p className="text-xs">Memuat riwayat hutang dan piutang mitra...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Tidak ada catatan transaksi</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {txSearch || txFilterPos || txFilterPosisi
                      ? 'Tidak ada mutasi yang cocok dengan kriteria filter pos atau posisi debit/kredit.'
                      : 'Mitra ini belum memiliki riwayat hutang atau piutang tercatat di sistem.'}
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="p-3 w-10 text-center">No</th>
                        <th className="p-3 w-44">Tanggal & Invoice</th>
                        <th className="p-3 w-36">Pos Akun</th>
                        <th className="p-3 text-center w-24">Mutasi</th>
                        <th className="p-3">Keterangan / Rincian Barang</th>
                        <th className="p-3 text-right w-36">Debit (Rp)</th>
                        <th className="p-3 text-right w-36">Kredit (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.map((tx: any, idx: number) => {
                        const dateFormatted = tx.tanggal
                          ? new Date(tx.tanggal).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '-';

                        const details = tx.details || [];

                        return (
                          <tr key={tx.id || idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-800 font-mono">{tx.invoice || '-'}</div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                <span>{dateFormatted}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              {tx.pos === 'PIUTANG' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Piutang (Bon)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  <ArrowDownLeft className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Hutang (Titipan)</span>
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {tx.posisi === 'DEBIT' ? (
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                                  DEBIT
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800">
                                  KREDIT
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="space-y-1">
                                {details.length > 0 ? (
                                  details.map((d: any, dIdx: number) => (
                                    <div key={d.id || dIdx} className="text-slate-700">
                                      <span className="font-semibold">
                                        {d.barang?.name || d.kategori?.name || 'Item'}
                                      </span>
                                      {d.jumlah ? (
                                        <span className="text-slate-500 font-mono ml-1">
                                          ({d.jumlah} {d.barang?.satuan || 'satuan'}
                                          {d.hargaSatuan ? ` @ ${formatRupiah(d.hargaSatuan)}` : ''})
                                        </span>
                                      ) : null}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-slate-700 font-medium">
                                    {tx.type === 'PENJUALAN'
                                      ? 'Penjualan Komoditas'
                                      : tx.type === 'PEMBELIAN'
                                      ? 'Pembelian Komoditas'
                                      : tx.type}
                                  </span>
                                )}
                                {tx.keterangan && (
                                  <p className="text-[11px] text-slate-400 italic">
                                    {tx.keterangan}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-700">
                              {tx.posisi === 'DEBIT' ? formatRupiah(tx.nominal) : '-'}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-blue-700">
                              {tx.posisi === 'KREDIT' ? formatRupiah(tx.nominal) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900">
                      <tr>
                        <td className="p-3 text-center font-mono">Σ</td>
                        <td className="p-3" colSpan={4}>
                          TOTAL MUTASI ({filteredTransactions.length} Transaksi Terpilih)
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-800 text-sm">
                          {formatRupiah(totalFilteredDebit)}
                        </td>
                        <td className="p-3 text-right font-mono text-blue-800 text-sm">
                          {formatRupiah(totalFilteredKredit)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Menampilkan {filteredTransactions.length} dari {rawTransactions.length} transaksi
              </span>
              <button
                type="button"
                onClick={() => setSelectedMitra(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-colors shadow-xs"
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

export default BonTitipanPage;
