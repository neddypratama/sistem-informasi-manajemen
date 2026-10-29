import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { SearchableSelect, type SelectOption } from '../../components/SearchableSelect';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel, exportToPdf, formatDateIndo } from '../../lib/export-utils';
import {
  Banknote,
  Search,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Building2,
  Wallet,
  Printer,
  RotateCcw,
  BookOpen,
  FileSpreadsheet,
  Plus,
  ArrowRightLeft,
  X,
  CheckCircle2,
} from 'lucide-react';

export const LaporanKasPage: React.FC = () => {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'MASUK' | 'KELUAR'>('ALL');
  const [filterKasAccountId, setFilterKasAccountId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'MUTASI' | 'REKAP'>('MUTASI');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'MASUK' | 'KELUAR' | 'TRANSFER'>('MASUK');
  const [modalKasId, setModalKasId] = useState<number>(64); // Default Kas Tunai
  const [modalLawanId, setModalLawanId] = useState<number>(19); // Default Penjualan Lain-Lain / Beban
  const [modalNominal, setModalNominal] = useState<number>(0);
  const [modalTanggal, setModalTanggal] = useState<string>(todayStr);
  const [modalKeterangan, setModalKeterangan] = useState<string>('');

  // 8 Akun Kas & Bank Resmi Bima Pratama
  const KAS_BANK_OPTIONS = [
    { id: 64, name: 'Kas Tunai' },
    { id: 71, name: 'Kas Deby' },
    { id: 65, name: 'Bank BCA Binti Wasilah' },
    { id: 66, name: 'Bank BCA Masduki' },
    { id: 67, name: 'Bank BRI Binti Wasilah' },
    { id: 68, name: 'Bank BRI Masduki' },
    { id: 69, name: 'Bank BNI Binti Wasilah' },
    { id: 70, name: 'Bank BNI Bima Pratama' },
  ];

  // 1. Query Laporan Kas & Mutasi from Backend
  const { data: kasResponse, isLoading } = useQuery({
    queryKey: ['laporanKas', startDate, endDate, search, filterKasAccountId, filterType],
    queryFn: async () => {
      let url = `/reports/laporan-kas?startDate=${startDate}&endDate=${endDate}&limit=500`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filterKasAccountId) url += `&kasAccountId=${filterKasAccountId}`;
      if (filterType !== 'ALL') url += `&type=${filterType}`;
      const res: any = await apiClient.get(url);
      return res.data;
    },
  });

  // 2. Fetch Master Categories for Modal
  const { data: kategorisData } = useQuery({
    queryKey: ['kategorisKasModal'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/kategoris?limit=250');
      const items = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.data?.items)
        ? res.data.items
        : [];
      return items;
    },
  });

  // Filter Kategori selain Kas dan Bank/Transfer untuk Kas Masuk & Kas Keluar
  const availableLawanKategoriList = useMemo(() => {
    if (!kategorisData || !Array.isArray(kategorisData)) return [];
    const kasBankIds = [64, 65, 66, 67, 68, 69, 70, 71];
    return kategorisData.filter((k: any) => {
      const kId = Number(k.id);
      if (kasBankIds.includes(kId)) return false;

      const kName = (k.name || '').toLowerCase().trim();
      const dtName = (k.detailKategori?.name || '').toLowerCase().trim();

      // Kecualikan jika akun/detail bertipe atau bernama kas, bank, atau transfer
      if (dtName === 'kas' || dtName.includes('bank') || dtName.includes('transfer')) return false;
      if (kName.startsWith('kas ') || kName === 'kas' || kName.startsWith('bank ') || kName.includes('transfer')) return false;

      return true;
    });
  }, [kategorisData]);

  // Options untuk SearchableSelect Kategori (dengan grouping rapi)
  const kategoriSelectOptions = useMemo<SelectOption[]>(() => {
    if (!availableLawanKategoriList || availableLawanKategoriList.length === 0) return [];

    if (modalType === 'MASUK') {
      const groupsOrder = [
        { type: 'Pendapatan', name: 'Pendapatan / Penjualan' },
        { type: 'Aset', name: 'Piutang & Aset Lainnya' },
        { type: 'Liabilitas', name: 'Liabilitas / Hutang' },
        { type: 'Ekuitas', name: 'Ekuitas / Modal' },
        { type: 'Pengeluaran', name: 'Pengeluaran / Beban' },
      ];

      const result: SelectOption[] = [];
      groupsOrder.forEach((g) => {
        const matches = availableLawanKategoriList.filter(
          (k: any) => k.detailKategori?.type === g.type,
        );
        matches.forEach((k: any) => {
          result.push({
            value: Number(k.id),
            label: k.name,
            sublabel: k.detailKategori?.name || k.detailKategori?.type,
            group: g.name,
          });
        });
      });

      const handledTypes = groupsOrder.map((g) => g.type);
      const others = availableLawanKategoriList.filter(
        (k: any) => !handledTypes.includes(k.detailKategori?.type),
      );
      others.forEach((k: any) => {
        result.push({
          value: Number(k.id),
          label: k.name,
          sublabel: k.detailKategori?.name || 'Lainnya',
          group: 'Lain-Lain',
        });
      });

      return result;
    } else {
      const groupsOrder = [
        { type: 'Pengeluaran', name: 'Pengeluaran / Beban Operasional' },
        { type: 'Liabilitas', name: 'Liabilitas / Pembayaran Hutang' },
        { type: 'Aset', name: 'Piutang & Aset Lainnya' },
        { type: 'Ekuitas', name: 'Ekuitas / Modal / Prive' },
        { type: 'Pendapatan', name: 'Pendapatan (Retur/Koreksi)' },
      ];

      const result: SelectOption[] = [];
      groupsOrder.forEach((g) => {
        const matches = availableLawanKategoriList.filter(
          (k: any) => k.detailKategori?.type === g.type,
        );
        matches.forEach((k: any) => {
          result.push({
            value: Number(k.id),
            label: k.name,
            sublabel: k.detailKategori?.name || k.detailKategori?.type,
            group: g.name,
          });
        });
      });

      const handledTypes = groupsOrder.map((g) => g.type);
      const others = availableLawanKategoriList.filter(
        (k: any) => !handledTypes.includes(k.detailKategori?.type),
      );
      others.forEach((k: any) => {
        result.push({
          value: Number(k.id),
          label: k.name,
          sublabel: k.detailKategori?.name || 'Lainnya',
          group: 'Lain-Lain',
        });
      });

      return result;
    }
  }, [availableLawanKategoriList, modalType]);

  const kasBankSelectOptions = useMemo<SelectOption[]>(() => {
    return KAS_BANK_OPTIONS.map((acc) => ({
      value: acc.id,
      label: acc.name,
    }));
  }, [KAS_BANK_OPTIONS]);

  const transferTujuanOptions = useMemo<SelectOption[]>(() => {
    return KAS_BANK_OPTIONS.filter((acc) => acc.id !== modalKasId).map((acc) => ({
      value: acc.id,
      label: acc.name,
    }));
  }, [KAS_BANK_OPTIONS, modalKasId]);

  // Validasi agar modalLawanId bukan akun kas/bank saat mode Kas Masuk atau Kas Keluar
  useEffect(() => {
    if (modalType !== 'TRANSFER') {
      const kasBankIds = [64, 65, 66, 67, 68, 69, 70, 71];
      if (kasBankIds.includes(Number(modalLawanId))) {
        setModalLawanId(modalType === 'MASUK' ? 19 : 25);
      }
    }
  }, [modalType, modalLawanId]);

  // Mutation: Catat Mutasi Kas Langsung
  const createKasMutasiMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/transaksi/kas-mutasi', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laporanKas'] });
      setIsModalOpen(false);
      setModalNominal(0);
      setModalKeterangan('');
      alert('Mutasi kas berhasil dicatat dan diposting ke jurnal akuntansi!');
    },
    onError: (err: any) => {
      alert(`Gagal mencatat mutasi kas: ${err.response?.data?.message || err.message}`);
    },
  });

  const formatRupiah = (val: number | string | null | undefined) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const rekapAkun = kasResponse?.rekapAkun || [];
  const mutasiRinci = kasResponse?.mutasiRinci || [];
  const totalSaldoAwal = kasResponse?.totalSaldoAwal || 0;
  const totalPemasukan = kasResponse?.totalPemasukan || 0;
  const totalPengeluaran = kasResponse?.totalPengeluaran || 0;
  const totalSaldoAkhir = kasResponse?.totalSaldoAkhir || 0;
  const netCashFlow = totalPemasukan - totalPengeluaran;

  // Date Presets
  const setPresetToday = () => {
    setStartDate(todayStr);
    setEndDate(todayStr);
  };

  const setPresetMonth = () => {
    const d = new Date();
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const setPresetYear = () => {
    const d = new Date();
    const firstDay = `${d.getFullYear()}-01-01`;
    const lastDay = `${d.getFullYear()}-12-31`;
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const handleClear = () => {
    setPresetToday();
    setSearch('');
    setFilterType('ALL');
    setFilterKasAccountId('');
  };

  const handleSubmitModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalNominal <= 0) {
      alert('Nominal harus lebih dari 0.');
      return;
    }
    if (modalType === 'TRANSFER' && modalKasId === modalLawanId) {
      alert('Akun kas asal dan tujuan transfer tidak boleh sama.');
      return;
    }

    createKasMutasiMutation.mutate({
      type: modalType,
      kasAccountId: Number(modalKasId),
      lawanAccountId: Number(modalLawanId),
      nominal: Number(modalNominal),
      keterangan: modalKeterangan,
      tanggal: modalTanggal,
    });
  };

  // Export to Excel & PDF
  const handleExportExcel = () => {
    if (activeTab === 'REKAP') {
      const rows = rekapAkun.map((r: any) => ({
        nama: r.nama,
        saldoAwal: Number(r.saldoAwal) || 0,
        pemasukan: Number(r.pemasukan) || 0,
        pengeluaran: Number(r.pengeluaran) || 0,
        saldoAkhir: Number(r.saldoAkhir) || 0,
      }));

      exportToExcel({
        filename: `Rekap_Saldo_Kas_Bank_${startDate}_sd_${endDate}`,
        sheetName: 'Rekap Kas Bank',
        title: `REKAPITULASI SALDO KAS & BANK (${startDate} s/d ${endDate})`,
        columns: [
          { header: 'No', key: '_index', width: 6 },
          { header: 'Akun Kas & Bank', key: 'nama', width: 30 },
          { header: 'Saldo Awal (Rp)', key: 'saldoAwal', width: 20 },
          { header: 'Pemasukan / Masuk (Rp)', key: 'pemasukan', width: 22 },
          { header: 'Pengeluaran / Keluar (Rp)', key: 'pengeluaran', width: 22 },
          { header: 'Saldo Akhir (Rp)', key: 'saldoAkhir', width: 22 },
        ],
        data: rows,
      });
    } else {
      const rows = mutasiRinci.map((m: any) => {
        const debit = Number(m.debit) || 0;
        const kredit = Number(m.kredit) || 0;
        const tipe = debit > 0 ? 'KAS MASUK' : 'KAS KELUAR';
        return {
          tanggal: formatDateIndo(m.tanggal),
          ref: m.nomor_jurnal || m.invoice || '-',
          akun: m.nama_akun || '-',
          tipe,
          keterangan: m.keterangan || '-',
          mitra: m.client_name || '-',
          debit,
          kredit,
        };
      });

      exportToExcel({
        filename: `Mutasi_Kas_Masuk_Keluar_${startDate}_sd_${endDate}`,
        sheetName: 'Mutasi Kas',
        title: `MUTASI ARUS KAS MASUK & KELUAR (${startDate} s/d ${endDate})`,
        columns: [
          { header: 'No', key: '_index', width: 6 },
          { header: 'Tanggal', key: 'tanggal', width: 14 },
          { header: 'No. Jurnal / Ref', key: 'ref', width: 20 },
          { header: 'Akun Kas', key: 'akun', width: 22 },
          { header: 'Tipe Mutasi', key: 'tipe', width: 14 },
          { header: 'Keterangan', key: 'keterangan', width: 35 },
          { header: 'Mitra', key: 'mitra', width: 22 },
          { header: 'Kas Masuk (Rp)', key: 'debit', width: 18 },
          { header: 'Kas Keluar (Rp)', key: 'kredit', width: 18 },
        ],
        data: rows,
      });
    }
  };

  const handleExportPdf = () => {
    if (activeTab === 'REKAP') {
      const rows = rekapAkun.map((r: any) => ({
        nama: r.nama,
        saldoAwal: formatRupiah(r.saldoAwal),
        pemasukan: formatRupiah(r.pemasukan),
        pengeluaran: formatRupiah(r.pengeluaran),
        saldoAkhir: formatRupiah(r.saldoAkhir),
      }));

      exportToPdf({
        filename: `Rekap_Saldo_Kas_Bank_${startDate}_sd_${endDate}`,
        title: 'REKAPITULASI SALDO KAS & BANK',
        period: `${startDate} s/d ${endDate}`,
        columns: [
          { header: 'No', key: '_index', width: 8, align: 'center' },
          { header: 'Akun Kas & Bank', key: 'nama', width: 55 },
          { header: 'Saldo Awal', key: 'saldoAwal', width: 32, align: 'right' },
          { header: 'Pemasukan (Debit)', key: 'pemasukan', width: 32, align: 'right' },
          { header: 'Pengeluaran (Kredit)', key: 'pengeluaran', width: 32, align: 'right' },
          { header: 'Saldo Akhir', key: 'saldoAkhir', width: 32, align: 'right' },
        ],
        data: rows,
        footers: [
          ['', 'TOTAL KESELURUHAN', formatRupiah(totalSaldoAwal), formatRupiah(totalPemasukan), formatRupiah(totalPengeluaran), formatRupiah(totalSaldoAkhir)],
        ],
      });
    } else {
      const rows = mutasiRinci.map((m: any) => {
        const debit = Number(m.debit) || 0;
        const kredit = Number(m.kredit) || 0;
        const tipe = debit > 0 ? 'MASUK' : 'KELUAR';
        return {
          tanggal: formatDateIndo(m.tanggal),
          ref: m.nomor_jurnal || m.invoice || '-',
          akun: m.nama_akun || '-',
          tipe,
          keterangan: m.keterangan || '-',
          mitra: m.client_name || '-',
          debit: debit ? formatRupiah(debit) : '-',
          kredit: kredit ? formatRupiah(kredit) : '-',
        };
      });

      exportToPdf({
        filename: `Mutasi_Kas_Masuk_Keluar_${startDate}_sd_${endDate}`,
        title: 'LAPORAN MUTASI ARUS KAS & BANK',
        period: `${startDate} s/d ${endDate}`,
        orientation: 'landscape',
        columns: [
          { header: 'No', key: '_index', width: 8, align: 'center' },
          { header: 'Tanggal', key: 'tanggal', width: 22 },
          { header: 'Ref / Jurnal', key: 'ref', width: 30 },
          { header: 'Akun Kas', key: 'akun', width: 35 },
          { header: 'Tipe', key: 'tipe', width: 18, align: 'center' },
          { header: 'Keterangan', key: 'keterangan', width: 60 },
          { header: 'Mitra', key: 'mitra', width: 35 },
          { header: 'Masuk (Debit)', key: 'debit', width: 30, align: 'right' },
          { header: 'Keluar (Kredit)', key: 'kredit', width: 30, align: 'right' },
        ],
        data: rows,
        footers: [
          ['', '', '', '', '', 'TOTAL', '', formatRupiah(totalPemasukan), formatRupiah(totalPengeluaran)],
        ],
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2.5">
            <Banknote className="w-7 h-7 text-emerald-600" />
            <span>Menu Kas & Bank: Monitoring Kas Masuk & Keluar</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Pantau arus penerimaan kas masuk, pengeluaran kas keluar, mutasi antar bank, dan saldo terkini 8 akun kas resmi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setModalType('MASUK');
              setModalKasId(64);
              setModalLawanId(19);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Mutasi Kas</span>
          </button>

          <ExportButtonGroup
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
          />

          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all"
            title="Cetak Halaman"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Cetak</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Saldo Kas & Bank</span>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono mt-2">
            {formatRupiah(totalSaldoAkhir)}
          </p>
          <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Saldo Efektif 8 Akun
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Kas Masuk (Debit)</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 font-mono mt-2">
            {formatRupiah(totalPemasukan)}
          </p>
          <span className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Arus Penerimaan Kas Periode Ini
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Kas Keluar (Kredit)</span>
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-rose-600 font-mono mt-2">
            {formatRupiah(totalPengeluaran)}
          </p>
          <span className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> Arus Pengeluaran Kas Periode Ini
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Arus Kas Bersih (Net)</span>
            <Wallet className="w-4 h-4 text-blue-500" />
          </div>
          <p
            className={`text-2xl font-extrabold font-mono mt-2 ${
              netCashFlow >= 0 ? 'text-blue-900' : 'text-rose-700'
            }`}
          >
            {formatRupiah(netCashFlow)}
          </p>
          <span
            className={`text-xs font-semibold mt-1 inline-block ${
              netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {netCashFlow >= 0 ? 'Surplus Kas Positif' : 'Defisit Pengeluaran'}
          </span>
        </div>
      </div>

      {/* Filter Bar & Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Tipe Filter Pills */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl space-x-1 w-full lg:w-auto">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua Mutasi
            </button>
            <button
              onClick={() => setFilterType('MASUK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                filterType === 'MASUK'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-emerald-700'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Kas Masuk Saja</span>
            </button>
            <button
              onClick={() => setFilterType('KELUAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                filterType === 'KELUAR'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-rose-700'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Kas Keluar Saja</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari keterangan, nomor jurnal, invoice, atau nama mitra..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Dropdown Akun Kas */}
          <select
            value={filterKasAccountId}
            onChange={(e) => setFilterKasAccountId(e.target.value)}
            className="w-full lg:w-56 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Akun Kas & Bank</option>
            {KAS_BANK_OPTIONS.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filters & Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Periode:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
            />

            <div className="flex items-center space-x-1 pl-2">
              <button
                onClick={setPresetToday}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium"
              >
                Hari Ini
              </button>
              <button
                onClick={setPresetMonth}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium"
              >
                Bulan Ini
              </button>
              <button
                onClick={setPresetYear}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium"
              >
                Tahun Ini
              </button>
            </div>
          </div>

          {(search || filterKasAccountId || filterType !== 'ALL' || startDate !== todayStr || endDate !== todayStr) && (
            <button
              onClick={handleClear}
              className="flex items-center space-x-1 text-slate-500 hover:text-emerald-600 font-semibold py-1 px-2 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('MUTASI')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === 'MUTASI'
              ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Detail Mutasi Kas Masuk & Keluar ({mutasiRinci.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('REKAP')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === 'REKAP'
              ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Rekapitulasi 8 Akun Kas & Bank ({rekapAkun.length})</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: DETAIL MUTASI KAS MASUK & KELUAR (BUKU KAS HARIAN)
      ========================================================================= */}
      {activeTab === 'MUTASI' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">No. Jurnal / Ref</th>
                  <th className="py-3.5 px-4">Akun Kas / Bank</th>
                  <th className="py-3.5 px-4 text-center">Tipe Mutasi</th>
                  <th className="py-3.5 px-4">Keterangan Transaksi</th>
                  <th className="py-3.5 px-4">Mitra Terkait</th>
                  <th className="py-3.5 px-4 text-right">Kas Masuk (Debit)</th>
                  <th className="py-3.5 px-4 text-right">Kas Keluar (Kredit)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Memuat rincian mutasi kas...
                    </td>
                  </tr>
                ) : mutasiRinci.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Tidak ada data mutasi kas yang cocok dengan filter yang dipilih.
                    </td>
                  </tr>
                ) : (
                  mutasiRinci.map((m: any, idx: number) => {
                    const debit = Number(m.debit) || 0;
                    const kredit = Number(m.kredit) || 0;
                    const isMasuk = debit > 0;

                    return (
                      <tr key={m.jurnal_id ? `${m.jurnal_id}-${idx}` : idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                          {m.tanggal ? m.tanggal.slice(0, 10) : '-'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {m.nomor_jurnal || m.invoice || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap flex items-center space-x-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              m.coa_id === 64 ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                          ></span>
                          <span>{m.nama_akun}</span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isMasuk
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isMasuk ? 'KAS MASUK' : 'KAS KELUAR'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={m.keterangan}>
                          {m.keterangan || '-'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium">
                          {m.client_name || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                          {isMasuk ? formatRupiah(debit) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-red-600 whitespace-nowrap">
                          {!isMasuk ? formatRupiah(kredit) : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-xs">
                <tr>
                  <td colSpan={7} className="py-3.5 px-4 text-right uppercase tracking-wider text-slate-700">
                    TOTAL PERIODE INI:
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-700 text-sm whitespace-nowrap">
                    {formatRupiah(totalPemasukan)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-red-700 text-sm whitespace-nowrap">
                    {formatRupiah(totalPengeluaran)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: REKAPITULASI 8 AKUN KAS & BANK
      ========================================================================= */}
      {activeTab === 'REKAP' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4">Kategori Kas / Akun Bank</th>
                  <th className="py-3.5 px-4 text-right">Saldo Awal (Rp)</th>
                  <th className="py-3.5 px-4 text-right">Pemasukan (Rp)</th>
                  <th className="py-3.5 px-4 text-right">Pengeluaran (Rp)</th>
                  <th className="py-3.5 px-4 text-right">Saldo Akhir (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Memuat data laporan kas...
                    </td>
                  </tr>
                ) : rekapAkun.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Tidak ada akun kas & bank yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  rekapAkun.map((row: any, idx: number) => (
                    <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 flex items-center space-x-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            row.id === 64 ? 'bg-emerald-500' : 'bg-blue-500'
                          }`}
                        ></span>
                        <span>{row.nama}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-blue-700 whitespace-nowrap">
                        {formatRupiah(row.saldoAwal)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-emerald-600 whitespace-nowrap">
                        {formatRupiah(row.pemasukan)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-red-600 whitespace-nowrap">
                        {formatRupiah(row.pengeluaran)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-700 whitespace-nowrap">
                        {formatRupiah(row.saldoAkhir)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-xs">
                <tr>
                  <td colSpan={2} className="py-4 px-4 text-slate-800 uppercase tracking-wider text-right">
                    TOTAL KESELURUHAN:
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-blue-800 text-sm whitespace-nowrap">
                    {formatRupiah(totalSaldoAwal)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-emerald-800 text-sm whitespace-nowrap">
                    {formatRupiah(totalPemasukan)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-red-800 text-sm whitespace-nowrap">
                    {formatRupiah(totalPengeluaran)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-purple-800 text-sm whitespace-nowrap">
                    {formatRupiah(totalSaldoAkhir)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CATAT MUTASI KAS (MASUK / KELUAR / TRANSFER)
      ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Banknote className="w-5 h-5 text-emerald-600" />
                <span>Pencatatan Mutasi Kas & Bank</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type Switcher Pills */}
            <div className="flex p-1 bg-slate-100 rounded-xl space-x-1 mt-4">
              <button
                type="button"
                onClick={() => {
                  setModalType('MASUK');
                  setModalLawanId(19);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
                  modalType === 'MASUK'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Kas Masuk</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalType('KELUAR');
                  setModalLawanId(25);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
                  modalType === 'KELUAR'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Kas Keluar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalType('TRANSFER');
                  setModalKasId(64); // Asal: Kas Tunai
                  setModalLawanId(65); // Tujuan: Bank BCA
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
                  modalType === 'TRANSFER'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Pindah Dana</span>
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <SearchableSelect
                    label={modalType === 'TRANSFER' ? 'Kas/Bank Asal' : 'Akun Kas/Bank'}
                    options={kasBankSelectOptions}
                    value={modalKasId}
                    onChange={(val) => setModalKasId(Number(val))}
                    placeholder="Pilih Akun Kas/Bank"
                    threshold={10}
                  />
                </div>

                <div>
                  {modalType === 'TRANSFER' ? (
                    <SearchableSelect
                      label="Kas/Bank Tujuan"
                      options={transferTujuanOptions}
                      value={modalLawanId}
                      onChange={(val) => setModalLawanId(Number(val))}
                      placeholder="Pilih Kas/Bank Tujuan"
                      threshold={10}
                    />
                  ) : (
                    <SearchableSelect
                      label={
                        modalType === 'MASUK'
                          ? 'Kategori Sumber Penerimaan'
                          : 'Kategori Tujuan Pengeluaran'
                      }
                      options={kategoriSelectOptions}
                      value={modalLawanId}
                      onChange={(val) => setModalLawanId(Number(val))}
                      placeholder="Pilih Kategori..."
                      searchPlaceholder="Ketik nama kategori (cth: Gaji, Pakan, Kantor...)"
                      threshold={10}
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nominal Transaksi (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={modalNominal || ''}
                  onChange={(e) => setModalNominal(Number(e.target.value))}
                  placeholder="Contoh: 1500000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block font-mono">
                  Terbilang: {formatRupiah(modalNominal)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  required
                  value={modalTanggal}
                  onChange={(e) => setModalTanggal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Keterangan / Uraian
                </label>
                <textarea
                  rows={2}
                  required
                  value={modalKeterangan}
                  onChange={(e) => setModalKeterangan(e.target.value)}
                  placeholder="Keterangan peruntukan uang masuk/keluar..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createKasMutasiMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all"
                >
                  {createKasMutasiMutation.isPending ? 'Menyimpan...' : 'Simpan Mutasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
