import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel, formatDateIndo } from '../../lib/export-utils';
import {
  ClipboardCheck,
  Plus,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Boxes,
  Egg,
  Wheat,
  Pill,
  Layers,
  RefreshCw,
  FileText,
  X,
  Eye,
  ShieldCheck,
} from 'lucide-react';

interface OpnameRecord {
  id: number;
  nomorOpname: string;
  tanggal: string;
  jenisOpname: 'TELUR' | 'PAKAN' | 'OBAT' | 'TRAY';
  barangId: number;
  barangName: string;
  satuan: string;
  userName: string;
  stokSistem: number;
  stokFisik: number;
  selisih: number;
  hpp: number;
  totalNilai: number;
  keterangan?: string;
  selisihStok: number;
  bentes: number;
  ceplok: number;
  prok: number;
  kotor: number;
  jumbo: number;
  barangPakai: number;
  pemakaianTray: number;
  nomorJurnal?: string;
  jurnalDetails?: {
    kategoriName: string;
    debit: number;
    kredit: number;
  }[];
}

export const StokOpnamePage: React.FC = () => {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Tab View: 'LIST' or 'CREATE'
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');

  // Filter States
  const [filterKomoditas, setFilterKomoditas] = useState<string>('ALL');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Selected Opname for Journal Modal
  const [selectedOpnameForJournal, setSelectedOpnameForJournal] = useState<OpnameRecord | null>(null);

  // Form State for CREATE
  const [formKomoditas, setFormKomoditas] = useState<'TELUR' | 'PAKAN' | 'OBAT' | 'TRAY'>('TELUR');
  const [formBarangId, setFormBarangId] = useState<string>('');
  const [formTanggal, setFormTanggal] = useState<string>(todayStr);
  const [formKeterangan, setFormKeterangan] = useState<string>('');

  // Telur Susut & Selisih Inputs
  const [formSelisihStok, setFormSelisihStok] = useState<string>('');
  const [formBentes, setFormBentes] = useState<string>('');
  const [formCeplok, setFormCeplok] = useState<string>('');
  const [formProk, setFormProk] = useState<string>('');
  const [formKotor, setFormKotor] = useState<string>('');
  const [formJumbo, setFormJumbo] = useState<string>('');
  const [formStokFisikUtuh, setFormStokFisikUtuh] = useState<string>('');

  // Pakan / Obat Inputs
  const [formBarangPakai, setFormBarangPakai] = useState<string>('');
  const [formStokFisikBagus, setFormStokFisikBagus] = useState<string>('');

  // Tray Inputs
  const [formPemakaianTray, setFormPemakaianTray] = useState<string>('');

  // Toast / Alert Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // 1. Fetch All Barangs for select options
  const { data: barangsData } = useQuery({
    queryKey: ['masterBarangsAll'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/barangs?limit=500');
      return res.data || [];
    },
  });

  // Filter barangs based on selected commodity
  const filteredBarangList = useMemo(() => {
    if (!barangsData) return [];
    return barangsData.filter((b: any) => {
      const jenis = (b.jenis?.name || '').toLowerCase();
      if (formKomoditas === 'TELUR') {
        return jenis.includes('telur');
      } else if (formKomoditas === 'PAKAN') {
        return jenis.includes('pakan') || jenis.includes('sentrat') || jenis.includes('curah');
      } else if (formKomoditas === 'OBAT') {
        return jenis.includes('obat');
      } else if (formKomoditas === 'TRAY') {
        return jenis.includes('tray');
      }
      return true;
    });
  }, [barangsData, formKomoditas]);

  // 2. Fetch stock summary for current item to get live stock & average HPP
  const { data: stockSummaryData } = useQuery({
    queryKey: ['stockSummaryOpname'],
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/summary');
      return Array.isArray(res) ? res : (res?.data || []);
    },
  });

  // Active selected barang item & stock metrics
  const selectedBarangItem = useMemo(() => {
    if (!formBarangId || !stockSummaryData) return null;
    return stockSummaryData.find((s: any) => Number(s.barangId || s.id) === Number(formBarangId)) || null;
  }, [formBarangId, stockSummaryData]);

  const currentStokSistem = Number(selectedBarangItem?.totalStok ?? selectedBarangItem?.totalQty ?? 0);
  const currentHPP = Number(selectedBarangItem?.hargaRataRata || (currentStokSistem > 0 ? (selectedBarangItem?.nilaiStok || 0) / currentStokSistem : 0));
  const currentSatuan = selectedBarangItem?.satuan || 'Kg';

  // 3. Fetch Opname History
  const { data: opnameHistoryResponse, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['opnameHistory', filterKomoditas, filterStartDate, filterEndDate, filterSearch],
    queryFn: async () => {
      let url = '/inventory/opname?limit=100';
      if (filterKomoditas !== 'ALL') url += `&jenisOpname=${filterKomoditas}`;
      if (filterStartDate) url += `&startDate=${filterStartDate}`;
      if (filterEndDate) url += `&endDate=${filterEndDate}`;
      if (filterSearch) url += `&search=${encodeURIComponent(filterSearch)}`;
      const res: any = await apiClient.get(url);
      return res.data || [];
    },
  });

  const opnameHistoryList: OpnameRecord[] = useMemo(() => {
    const list: OpnameRecord[] = Array.isArray(opnameHistoryResponse)
      ? opnameHistoryResponse
      : Array.isArray((opnameHistoryResponse as any)?.items)
      ? (opnameHistoryResponse as any).items
      : [];
    if (!filterSearch) return list;
    const q = filterSearch.toLowerCase();
    return list.filter(
      (item) =>
        item.nomorOpname.toLowerCase().includes(q) ||
        item.barangName.toLowerCase().includes(q) ||
        (item.nomorJurnal && item.nomorJurnal.toLowerCase().includes(q))
    );
  }, [opnameHistoryResponse, filterSearch]);

  // Real-time Calculation for Create Tab
  const selisihStokNum = Number(formSelisihStok || 0);
  const bentesNum = Number(formBentes || 0);
  const ceplokNum = Number(formCeplok || 0);
  const prokNum = Number(formProk || 0);
  const kotorNum = Number(formKotor || 0);
  const jumboNum = Number(formJumbo || 0);
  const barangPakaiNum = Number(formBarangPakai || 0);
  const pemakaianTrayNum = Number(formPemakaianTray || 0);

  const totalQtyPengurangan = useMemo(() => {
    let sum = selisihStokNum < 0 ? Math.abs(selisihStokNum) : 0;
    if (formKomoditas === 'TELUR') {
      sum += (bentesNum > 0 ? bentesNum : 0) +
        (ceplokNum > 0 ? ceplokNum : 0) +
        (prokNum > 0 ? prokNum : 0) +
        (kotorNum > 0 ? kotorNum : 0) +
        (jumboNum > 0 ? jumboNum : 0);
    } else if (formKomoditas === 'PAKAN' || formKomoditas === 'OBAT') {
      sum += barangPakaiNum > 0 ? barangPakaiNum : 0;
    } else if (formKomoditas === 'TRAY') {
      sum += pemakaianTrayNum > 0 ? pemakaianTrayNum : 0;
    }
    return sum;
  }, [formKomoditas, selisihStokNum, bentesNum, ceplokNum, prokNum, kotorNum, jumboNum, barangPakaiNum, pemakaianTrayNum]);

  const totalQtyPenambahan = useMemo(() => {
    let sum = selisihStokNum > 0 ? selisihStokNum : 0;
    if (formKomoditas === 'TELUR') {
      sum += (bentesNum < 0 ? Math.abs(bentesNum) : 0) +
        (ceplokNum < 0 ? Math.abs(ceplokNum) : 0) +
        (prokNum < 0 ? Math.abs(prokNum) : 0) +
        (kotorNum < 0 ? Math.abs(kotorNum) : 0) +
        (jumboNum < 0 ? Math.abs(jumboNum) : 0);
    } else if (formKomoditas === 'PAKAN' || formKomoditas === 'OBAT') {
      sum += barangPakaiNum < 0 ? Math.abs(barangPakaiNum) : 0;
    } else if (formKomoditas === 'TRAY') {
      sum += pemakaianTrayNum < 0 ? Math.abs(pemakaianTrayNum) : 0;
    }
    return sum;
  }, [formKomoditas, selisihStokNum, bentesNum, ceplokNum, prokNum, kotorNum, jumboNum, barangPakaiNum, pemakaianTrayNum]);

  const netPerubahanStok = totalQtyPenambahan - totalQtyPengurangan;
  const estimatedStokFisik = Math.max(0, currentStokSistem + netPerubahanStok);
  const totalNilaiSusut = (totalQtyPengurangan + totalQtyPenambahan) * currentHPP;

  // Live Jurnal Simulation Preview
  const previewJurnalLines = useMemo(() => {
    const lines: { akun: string; debit: number; kredit: number; ref: string }[] = [];
    const persediaanName =
      formKomoditas === 'TELUR'
        ? 'Persediaan Stok Telur (Kat. 59)'
        : formKomoditas === 'PAKAN'
        ? 'Persediaan Stok Pakan (Kat. 60)'
        : formKomoditas === 'OBAT'
        ? 'Persediaan Stok Obat-Obatan (Kat. 61)'
        : 'Persediaan Stok Tray (Kat. 62)';

    // 1. Selisih Stok Fisik vs Sistem Umum (Kat. 88 Penyesuaian Stok)
    if (selisihStokNum < 0) {
      const val = Math.abs(selisihStokNum) * currentHPP;
      lines.push({ akun: 'Beban Penyesuaian Stok (Kat. 88)', debit: val, kredit: 0, ref: `Selisih Kurang ${Math.abs(selisihStokNum)} ${currentSatuan} × HPP` });
      lines.push({ akun: persediaanName, debit: 0, kredit: val, ref: `Pengurangan Persediaan Fisik` });
    } else if (selisihStokNum > 0) {
      const val = selisihStokNum * currentHPP;
      lines.push({ akun: persediaanName, debit: val, kredit: 0, ref: `Penambahan Persediaan Fisik` });
      lines.push({ akun: 'Penyesuaian Stok (Kat. 88)', debit: 0, kredit: val, ref: `Selisih Tambah ${selisihStokNum} ${currentSatuan} × HPP` });
    }

    if (formKomoditas === 'TELUR') {
      // Bentes
      if (bentesNum > 0) {
        const val = bentesNum * currentHPP;
        lines.push({ akun: 'Beban Telur Bentes (Kat. 27)', debit: val, kredit: 0, ref: `${bentesNum} ${currentSatuan} × HPP` });
        lines.push({ akun: persediaanName, debit: 0, kredit: val, ref: `Susut Telur Bentes` });
      } else if (bentesNum < 0) {
        const val = Math.abs(bentesNum) * currentHPP;
        lines.push({ akun: persediaanName, debit: val, kredit: 0, ref: `Koreksi Pembalikan Bentes` });
        lines.push({ akun: 'Beban Telur Bentes (Kat. 27)', debit: 0, kredit: val, ref: `Pembalikan ${Math.abs(bentesNum)} ${currentSatuan} × HPP` });
      }

      // Ceplok
      if (ceplokNum > 0) {
        const val = ceplokNum * currentHPP;
        lines.push({ akun: 'Beban Telur Ceplok (Kat. 28)', debit: val, kredit: 0, ref: `${ceplokNum} ${currentSatuan} × HPP` });
        lines.push({ akun: persediaanName, debit: 0, kredit: val, ref: `Susut Telur Ceplok` });
      } else if (ceplokNum < 0) {
        const val = Math.abs(ceplokNum) * currentHPP;
        lines.push({ akun: persediaanName, debit: val, kredit: 0, ref: `Koreksi Pembalikan Ceplok` });
        lines.push({ akun: 'Beban Telur Ceplok (Kat. 28)', debit: 0, kredit: val, ref: `Pembalikan ${Math.abs(ceplokNum)} ${currentSatuan} × HPP` });
      }

      // Prok
      if (prokNum > 0) {
        const val = prokNum * currentHPP;
        lines.push({ akun: 'Beban Telur Prok (Kat. 29)', debit: val, kredit: 0, ref: `${prokNum} ${currentSatuan} × HPP` });
        lines.push({ akun: persediaanName, debit: 0, kredit: val, ref: `Susut Telur Prok` });
      } else if (prokNum < 0) {
        const val = Math.abs(prokNum) * currentHPP;
        lines.push({ akun: persediaanName, debit: val, kredit: 0, ref: `Koreksi Pembalikan Prok` });
        lines.push({ akun: 'Beban Telur Prok (Kat. 29)', debit: 0, kredit: val, ref: `Pembalikan ${Math.abs(prokNum)} ${currentSatuan} × HPP` });
      }

      // Kotor
      if (kotorNum > 0) {
        const val = kotorNum * currentHPP;
        lines.push({ akun: 'Beban Telur Kotor (Kat. 40)', debit: val, kredit: 0, ref: `${kotorNum} ${currentSatuan} × HPP` });
        lines.push({ akun: persediaanName, debit: 0, kredit: val, ref: `Susut Telur Kotor` });
      } else if (kotorNum < 0) {
        const val = Math.abs(kotorNum) * currentHPP;
        lines.push({ akun: persediaanName, debit: val, kredit: 0, ref: `Koreksi Pembalikan Kotor (Dibersihkan)` });
        lines.push({ akun: 'Beban Telur Kotor (Kat. 40)', debit: 0, kredit: val, ref: `Pembalikan ${Math.abs(kotorNum)} ${currentSatuan} × HPP` });
      }

      // Jumbo
      if (jumboNum > 0) {
        const val = jumboNum * currentHPP;
        lines.push({ akun: 'Beban Telur Jumbo (Kat. 45)', debit: val, kredit: 0, ref: `${jumboNum} ${currentSatuan} × HPP` });
        lines.push({ akun: persediaanName, debit: 0, kredit: val, ref: `Susut Telur Jumbo` });
      } else if (jumboNum < 0) {
        const val = Math.abs(jumboNum) * currentHPP;
        lines.push({ akun: persediaanName, debit: val, kredit: 0, ref: `Koreksi Pembalikan Jumbo` });
        lines.push({ akun: 'Beban Telur Jumbo (Kat. 45)', debit: 0, kredit: val, ref: `Pembalikan ${Math.abs(jumboNum)} ${currentSatuan} × HPP` });
      }
    } else if (formKomoditas === 'PAKAN' || formKomoditas === 'OBAT') {
      if (barangPakaiNum > 0) {
        const val = barangPakaiNum * currentHPP;
        lines.push({ akun: 'Beban Barang Kadaluarsa / Rusak (Kat. 30)', debit: val, kredit: 0, ref: `${barangPakaiNum} ${currentSatuan} × HPP` });
        lines.push({ akun: persediaanName, debit: 0, kredit: val, ref: `Pemakaian/Susut Fisik` });
      } else if (barangPakaiNum < 0) {
        const val = Math.abs(barangPakaiNum) * currentHPP;
        lines.push({ akun: persediaanName, debit: val, kredit: 0, ref: `Koreksi Pembalikan Barang Pakai` });
        lines.push({ akun: 'Beban Barang Kadaluarsa / Rusak (Kat. 30)', debit: 0, kredit: val, ref: `Pembalikan ${Math.abs(barangPakaiNum)} ${currentSatuan} × HPP` });
      }
    } else if (formKomoditas === 'TRAY') {
      if (pemakaianTrayNum > 0) {
        const val = pemakaianTrayNum * currentHPP;
        lines.push({ akun: 'Beban Tray Terpakai (Kat. 42)', debit: val, kredit: 0, ref: `${pemakaianTrayNum} ${currentSatuan} × HPP` });
        lines.push({ akun: 'Persediaan Stok Tray (Kat. 62)', debit: 0, kredit: val, ref: `Pemakaian Tray` });
      } else if (pemakaianTrayNum < 0) {
        const val = Math.abs(pemakaianTrayNum) * currentHPP;
        lines.push({ akun: 'Persediaan Stok Tray (Kat. 62)', debit: val, kredit: 0, ref: `Koreksi Pembalikan Tray` });
        lines.push({ akun: 'Beban Tray Terpakai (Kat. 42)', debit: 0, kredit: val, ref: `Pembalikan ${Math.abs(pemakaianTrayNum)} ${currentSatuan} × HPP` });
      }
    }
    return lines;
  }, [formKomoditas, selisihStokNum, bentesNum, ceplokNum, prokNum, kotorNum, jumboNum, barangPakaiNum, pemakaianTrayNum, currentHPP, currentSatuan]);

  // 4. Mutation to Save Opname
  const createOpnameMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res: any = await apiClient.post('/inventory/opname', payload);
      return res.data;
    },
    onSuccess: (data) => {
      showNotification('success', `Stok Opname ${data?.nomorOpname || ''} berhasil disimpan dan jurnal penyesuaian otomatis diposting!`);
      queryClient.invalidateQueries({ queryKey: ['opnameHistory'] });
      queryClient.invalidateQueries({ queryKey: ['stockSummaryOpname'] });
      queryClient.invalidateQueries({ queryKey: ['stockGrid'] });
      // Reset form
      setFormBarangId('');
      setFormSelisihStok('');
      setFormBentes('');
      setFormCeplok('');
      setFormProk('');
      setFormKotor('');
      setFormJumbo('');
      setFormStokFisikUtuh('');
      setFormBarangPakai('');
      setFormStokFisikBagus('');
      setFormPemakaianTray('');
      setFormKeterangan('');
      // Switch back to list tab
      setActiveTab('LIST');
    },
    onError: (err: any) => {
      showNotification('error', err?.response?.data?.message || err.message || 'Gagal menyimpan stok opname.');
    },
  });

  const handleSubmitOpname = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBarangId) {
      showNotification('error', 'Silakan pilih barang yang akan di-opname!');
      return;
    }
    let finalStokFisik = estimatedStokFisik;
    if (formKomoditas === 'TELUR' && formStokFisikUtuh) {
      finalStokFisik = Number(formStokFisikUtuh);
    } else if ((formKomoditas === 'PAKAN' || formKomoditas === 'OBAT') && formStokFisikBagus) {
      finalStokFisik = Number(formStokFisikBagus);
    } else if (formKomoditas === 'TRAY' && formStokFisikBagus) {
      finalStokFisik = Number(formStokFisikBagus);
    }

    if (finalStokFisik < 0) {
      showNotification('error', `Kuantitas stok fisik (${finalStokFisik} ${currentSatuan}) tidak boleh bernilai negatif. Mohon periksa kembali inputan fisik Anda.`);
      return;
    }

    const payload: any = {
      barangId: Number(formBarangId),
      tanggal: formTanggal,
      keterangan: formKeterangan || undefined,
      stokFisik: finalStokFisik,
    };

    if (formKomoditas === 'TELUR') {
      payload.selisihStok = selisihStokNum;
      payload.bentes = bentesNum;
      payload.ceplok = ceplokNum;
      payload.prok = prokNum;
      payload.kotor = kotorNum;
      payload.jumbo = jumboNum;
    } else if (formKomoditas === 'PAKAN' || formKomoditas === 'OBAT') {
      payload.selisihStok = selisihStokNum;
      payload.barangPakai = barangPakaiNum;
    } else if (formKomoditas === 'TRAY') {
      payload.selisihStok = selisihStokNum;
      payload.pemakaianTray = pemakaianTrayNum;
    }

    createOpnameMutation.mutate(payload);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleExportExcel = () => {
    if (!opnameHistoryList || opnameHistoryList.length === 0) {
      alert('Tidak ada riwayat stok opname untuk diekspor');
      return;
    }

    const rows = opnameHistoryList.map((op: any) => ({
      nomorOpname: op.nomorOpname,
      tanggal: formatDateIndo(op.tanggal),
      jenisOpname: op.jenisOpname,
      barangName: op.barangName,
      stokSistem: Number(op.stokSistem) || 0,
      stokFisik: Number(op.stokFisik) || 0,
      selisih: Number(op.selisih) || 0,
      satuan: op.satuan || '-',
      hpp: Number(op.hpp) || 0,
      totalNilai: Number(op.totalNilai) || 0,
      keterangan: op.keterangan || '-',
      nomorJurnal: op.nomorJurnal || '-',
      userName: op.userName || 'Petugas',
    }));

    exportToExcel({
      filename: `Riwayat_Stok_Opname_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Stok Opname',
      title: `RIWAYAT PENYESUAIAN STOK OPNAME FISIK GUDANG`,
      columns: [
        { header: 'No', key: '_index', width: 6 },
        { header: 'No. Opname', key: 'nomorOpname', width: 18 },
        { header: 'Tanggal', key: 'tanggal', width: 14 },
        { header: 'Komoditas', key: 'jenisOpname', width: 14 },
        { header: 'Nama Barang', key: 'barangName', width: 28 },
        { header: 'Stok Sistem', key: 'stokSistem', width: 14 },
        { header: 'Stok Fisik', key: 'stokFisik', width: 14 },
        { header: 'Selisih', key: 'selisih', width: 14 },
        { header: 'Satuan', key: 'satuan', width: 10 },
        { header: 'HPP (Rp)', key: 'hpp', width: 16 },
        { header: 'Nilai Selisih (Rp)', key: 'totalNilai', width: 20 },
        { header: 'No. Jurnal', key: 'nomorJurnal', width: 18 },
        { header: 'Petugas', key: 'userName', width: 16 },
        { header: 'Keterangan', key: 'keterangan', width: 30 },
      ],
      data: rows,
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border shadow-lg transition-all animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                Stok Opname & Penyesuaian Fisik
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pencatatan opname berkala & pemisahan susut fisik (Bentes, Ceplok, Prok, Kotor, Jumbo, Barang Pakai, Pemakaian Tray) dengan jurnal penyesuaian otomatis
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'LIST' && (
            <ExportButtonGroup onExportExcel={handleExportExcel} />
          )}
          <button
            onClick={() => setActiveTab('LIST')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
              activeTab === 'LIST'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Riwayat Opname ({opnameHistoryList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('CREATE')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
              activeTab === 'CREATE'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Input Opname Fisik Baru</span>
          </button>
        </div>
      </div>

      {/* TAB 1: INPUT STOK OPNAME BARU */}
      {activeTab === 'CREATE' && (
        <form onSubmit={handleSubmitOpname} className="space-y-6">
          {/* Step 1: Pilih Komoditas & Barang */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">1</span>
              <span>Pilih Komoditas & Barang yang Diperiksa</span>
            </h3>

            {/* Komoditas Selector Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormKomoditas('TELUR');
                  setFormBarangId('');
                }}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 transition-all ${
                  formKomoditas === 'TELUR'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Egg className="w-6 h-6 text-emerald-600" />
                <span className="text-xs font-bold">Komoditas Telur</span>
                <span className="text-[10px] text-slate-400">Horn, Bebek, Arab, Puyuh</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormKomoditas('PAKAN');
                  setFormBarangId('');
                }}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 transition-all ${
                  formKomoditas === 'PAKAN'
                    ? 'border-amber-500 bg-amber-50/50 text-amber-800 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Wheat className="w-6 h-6 text-amber-600" />
                <span className="text-xs font-bold">Pakan Ternak</span>
                <span className="text-[10px] text-slate-400">Sentrat, Curah, Jagung</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormKomoditas('OBAT');
                  setFormBarangId('');
                }}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 transition-all ${
                  formKomoditas === 'OBAT'
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-800 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Pill className="w-6 h-6 text-indigo-600" />
                <span className="text-xs font-bold">Obat & Vitamin</span>
                <span className="text-[10px] text-slate-400">Vaksin, Suplemen</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormKomoditas('TRAY');
                  setFormBarangId('');
                }}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 transition-all ${
                  formKomoditas === 'TRAY'
                    ? 'border-teal-500 bg-teal-50/50 text-teal-800 ring-2 ring-teal-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Layers className="w-6 h-6 text-teal-600" />
                <span className="text-xs font-bold">Egg Tray & Rak</span>
                <span className="text-[10px] text-slate-400">Karton, Plastik, Rak</span>
              </button>
            </div>

            {/* Select Barang & Tanggal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Nama Barang <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formBarangId}
                  onChange={(e) => setFormBarangId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  required
                >
                  <option value="">-- Pilih Barang ({filteredBarangList.length} items tersedia) --</option>
                  {filteredBarangList.map((b: any) => {
                    const st = stockSummaryData?.find((s: any) => Number(s.id || s.barangId) === Number(b.id));
                    const stockQty = Number(st?.totalStok ?? st?.totalQty ?? 0);
                    return (
                      <option key={b.id} value={b.id}>
                        [{b.code}] {b.name} (Stok Sistem: {stockQty.toLocaleString('id-ID')} {b.satuan?.name || 'Kg'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tanggal Opname Fisik <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Real-time Current Stock & HPP Info Card */}
            {formBarangId && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Stok Sistem Saat Ini</p>
                  <p className="text-base font-bold text-slate-800 mt-0.5">
                    {currentStokSistem.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500">{currentSatuan}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rata-rata Biaya Perolehan (HPP)</p>
                  <p className="text-base font-bold text-emerald-700 mt-0.5">
                    {formatRupiah(currentHPP)} <span className="text-xs font-normal text-slate-500">/ {currentSatuan}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Estimasi Nilai Persediaan</p>
                  <p className="text-base font-bold text-slate-800 mt-0.5 font-mono">
                    {formatRupiah(currentStokSistem * currentHPP)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Form Input Susut / Pemakaian Dinamis */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">2</span>
              <span>Rincian Hasil Pemeriksaan Fisik Gudang</span>
            </h3>

            {/* A. KASUS TELUR */}
            {formKomoditas === 'TELUR' && (
              <div className="space-y-4">
                <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-800 flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p>
                      <strong>Aturan Akuntansi Stok Opname Telur:</strong> Susut fisik telur dicatat ke akun beban: Bentes (ID 27), Ceplok (ID 28), Prok (ID 29), Kotor (ID 38), dan Jumbo (ID 43). Selisih stok dialokasikan ke Beban Penyesuaian Stok (ID 88).
                    </p>
                    <p className="text-[11px] text-amber-700">
                      💡 <em>Mendukung input minus ( - ):</em> Jika Selisih minus (-) = stok berkurang. Jika Susut (misal Kotor dibersihkan / salah hitung) minus (-) = koreksi pembalikan beban persediaan normal (D: Persediaan, K: Beban).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Selisih Stok (Kat. 88) */}
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-amber-900">
                        Selisih Stok ({currentSatuan})
                      </label>
                      <span className="text-[9px] font-bold px-1 rounded bg-amber-200 text-amber-800">Kat. 88</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="Contoh: -2 atau +2"
                      value={formSelisihStok}
                      onChange={(e) => setFormSelisihStok(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-amber-200 text-xs font-semibold focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                    <p className="text-[10px] text-amber-800/80 font-medium truncate">
                      {selisihStokNum < 0
                        ? `(D) Beban: ${formatRupiah(Math.abs(selisihStokNum) * currentHPP)}`
                        : selisihStokNum > 0
                        ? `(K) Stok+: ${formatRupiah(selisihStokNum * currentHPP)}`
                        : 'Bisa (+ / -)'}
                    </p>
                  </div>

                  {/* Bentes (Kat. 27) */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Bentes ({currentSatuan})
                      </label>
                      <span className="text-[9px] font-bold px-1 rounded bg-slate-200 text-slate-700">Kat. 27</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={formBentes}
                      onChange={(e) => setFormBentes(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-500 font-medium truncate">
                      {bentesNum < 0
                        ? `(K) Koreksi: ${formatRupiah(Math.abs(bentesNum) * currentHPP)}`
                        : bentesNum > 0
                        ? `(D) Beban: ${formatRupiah(bentesNum * currentHPP)}`
                        : 'Bisa (+ / -)'}
                    </p>
                  </div>

                  {/* Ceplok (Kat. 28) */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Ceplok ({currentSatuan})
                      </label>
                      <span className="text-[9px] font-bold px-1 rounded bg-slate-200 text-slate-700">Kat. 28</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={formCeplok}
                      onChange={(e) => setFormCeplok(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-500 font-medium truncate">
                      {ceplokNum < 0
                        ? `(K) Koreksi: ${formatRupiah(Math.abs(ceplokNum) * currentHPP)}`
                        : ceplokNum > 0
                        ? `(D) Beban: ${formatRupiah(ceplokNum * currentHPP)}`
                        : 'Bisa (+ / -)'}
                    </p>
                  </div>

                  {/* Prok (Kat. 29) */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Prok ({currentSatuan})
                      </label>
                      <span className="text-[9px] font-bold px-1 rounded bg-slate-200 text-slate-700">Kat. 29</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={formProk}
                      onChange={(e) => setFormProk(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-500 font-medium truncate">
                      {prokNum < 0
                        ? `(K) Koreksi: ${formatRupiah(Math.abs(prokNum) * currentHPP)}`
                        : prokNum > 0
                        ? `(D) Beban: ${formatRupiah(prokNum * currentHPP)}`
                        : 'Bisa (+ / -)'}
                    </p>
                  </div>

                  {/* Kotor (Kat. 40) */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Kotor ({currentSatuan})
                      </label>
                      <span className="text-[9px] font-bold px-1 rounded bg-slate-200 text-slate-700">Kat. 40</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={formKotor}
                      onChange={(e) => setFormKotor(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-500 font-medium truncate">
                      {kotorNum < 0
                        ? `(K) Koreksi: ${formatRupiah(Math.abs(kotorNum) * currentHPP)}`
                        : kotorNum > 0
                        ? `(D) Beban: ${formatRupiah(kotorNum * currentHPP)}`
                        : 'Bisa (+ / -)'}
                    </p>
                  </div>

                  {/* Jumbo (Kat. 45) */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Jumbo ({currentSatuan})
                      </label>
                      <span className="text-[9px] font-bold px-1 rounded bg-slate-200 text-slate-700">Kat. 45</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={formJumbo}
                      onChange={(e) => setFormJumbo(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-500 font-medium truncate">
                      {jumboNum < 0
                        ? `(K) Koreksi: ${formatRupiah(Math.abs(jumboNum) * currentHPP)}`
                        : jumboNum > 0
                        ? `(D) Beban: ${formatRupiah(jumboNum * currentHPP)}`
                        : 'Bisa (+ / -)'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Stok Fisik Bagus / Utuh ({currentSatuan}) <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder={`Estimasi sistem: ${estimatedStokFisik.toFixed(2)}`}
                      value={formStokFisikUtuh}
                      onChange={(e) => setFormStokFisikUtuh(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Kosongkan untuk otomatis menggunakan (Stok Sistem - Total Susut = {estimatedStokFisik.toFixed(2)} {currentSatuan})
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Catatan / Keterangan Opname
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Opname fisik mingguan gudang kandang A"
                      value={formKeterangan}
                      onChange={(e) => setFormKeterangan(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* B. KASUS PAKAN */}
            {formKomoditas === 'PAKAN' && (
              <div className="space-y-4">
                <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-800 flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p>
                      <strong>Aturan Akuntansi Stok Opname Pakan:</strong> Pakan rusak, kadaluarsa, atau afkir dicatat ke akun <strong>Beban Barang Kadaluarsa (ID 30)</strong>. Selisih timbangan fisik vs catatan sistem dibukukan ke <strong>Beban Penyesuaian Stok (ID 88)</strong> berpasangan dengan <strong>Persediaan Pakan (ID 60)</strong>.
                    </p>
                    <p className="text-[11px] text-amber-700">
                      💡 <em>Mendukung input minus ( - ):</em> Jika Selisih minus (-) = stok berkurang (Debit: Beban Penyesuaian Kat. 88, Kredit: Persediaan). Jika Susut/Rusak minus (-) = koreksi pembalikan (Debit: Persediaan, Kredit: Beban Kat. 30).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Selisih Stok (Kat. 88) */}
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-amber-900">
                        Selisih Stok ({currentSatuan})
                      </label>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-800">Kat. 88</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="Contoh: -2 atau +2"
                      value={formSelisihStok}
                      onChange={(e) => setFormSelisihStok(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-amber-200 text-xs font-semibold focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                    <p className="text-[10px] text-amber-800/80 font-medium truncate">
                      {selisihStokNum < 0
                        ? `(D) Beban: ${formatRupiah(Math.abs(selisihStokNum) * currentHPP)}`
                        : selisihStokNum > 0
                        ? `(K) Stok+: ${formatRupiah(selisihStokNum * currentHPP)}`
                        : 'Bisa (+ / -)'}
                    </p>
                  </div>

                  {/* Pakan Rusak / Kadaluarsa (Kat. 30) */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-800">
                        Pakan Rusak / Kadaluarsa ({currentSatuan})
                      </label>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">Kat. 30</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={formBarangPakai}
                      onChange={(e) => setFormBarangPakai(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-500 font-medium truncate">
                      {barangPakaiNum < 0
                        ? `(K) Koreksi: ${formatRupiah(Math.abs(barangPakaiNum) * currentHPP)}`
                        : barangPakaiNum > 0
                        ? `(D) Beban: ${formatRupiah(barangPakaiNum * currentHPP)}`
                        : 'Bisa (+ / -)'}
                    </p>
                  </div>

                  {/* Sisa Fisik Tersedia */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-800">
                        Stok Fisik Bagus ({currentSatuan})
                      </label>
                      <span className="text-[9px] font-normal text-slate-400">Opsional</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder={`Estimasi: ${estimatedStokFisik.toFixed(2)}`}
                      value={formStokFisikBagus}
                      onChange={(e) => setFormStokFisikBagus(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      Otomatis: {estimatedStokFisik.toFixed(2)} {currentSatuan}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan / Keterangan Opname Pakan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Pembersihan gudang pakan atau pakan terkena lembap"
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>
            )}

            {/* C. KASUS OBAT */}
            {formKomoditas === 'OBAT' && (
              <div className="space-y-4">
                <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-800 flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p>
                      <strong>Aturan Akuntansi Stok Opname Obat:</strong> Obat expired, kemasan pecah/bocor, atau kadaluarsa dicatat ke akun <strong>Beban Barang Kadaluarsa (ID 30)</strong>. Selisih fisik barang tercatat ke <strong>Beban Penyesuaian Stok (ID 88)</strong> berpasangan dengan <strong>Persediaan Obat-Obatan (ID 61)</strong>.
                    </p>
                    <p className="text-[11px] text-amber-700">
                      💡 <em>Mendukung input minus ( - ):</em> Jika Selisih minus (-) = stok berkurang (Debit: Beban Penyesuaian Kat. 88, Kredit: Persediaan). Jika Expired/Rusak minus (-) = koreksi pembalikan (Debit: Persediaan, Kredit: Beban Kat. 30).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Selisih Stok (Kat. 88) */}
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-amber-900">
                        Selisih Stok ({currentSatuan})
                      </label>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-800">Kat. 88</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="Contoh: -2 atau +2"
                      value={formSelisihStok}
                      onChange={(e) => setFormSelisihStok(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-amber-200 text-xs font-semibold focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                    <p className="text-[10px] text-amber-800/80 font-medium truncate">
                      {selisihStokNum < 0
                        ? `(D) Beban: ${formatRupiah(Math.abs(selisihStokNum) * currentHPP)}`
                        : selisihStokNum > 0
                        ? `(K) Stok+: ${formatRupiah(selisihStokNum * currentHPP)}`
                        : 'Bisa (+ / -)'}
                    </p>
                  </div>

                  {/* Obat Expired / Rusak (Kat. 30) */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-800">
                        Obat Expired / Rusak ({currentSatuan})
                      </label>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">Kat. 30</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={formBarangPakai}
                      onChange={(e) => setFormBarangPakai(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-500 font-medium truncate">
                      {barangPakaiNum < 0
                        ? `(K) Koreksi: ${formatRupiah(Math.abs(barangPakaiNum) * currentHPP)}`
                        : barangPakaiNum > 0
                        ? `(D) Beban: ${formatRupiah(barangPakaiNum * currentHPP)}`
                        : 'Bisa (+ / -)'}
                    </p>
                  </div>

                  {/* Sisa Fisik Tersedia */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-800">
                        Stok Fisik Bagus ({currentSatuan})
                      </label>
                      <span className="text-[9px] font-normal text-slate-400">Opsional</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder={`Estimasi: ${estimatedStokFisik.toFixed(2)}`}
                      value={formStokFisikBagus}
                      onChange={(e) => setFormStokFisikBagus(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      Otomatis: {estimatedStokFisik.toFixed(2)} {currentSatuan}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan / Keterangan Opname Obat
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Pemeriksaan berkala masa expired vaksin / antibiotik"
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>
            )}

            {/* D. KASUS TRAY */}
            {formKomoditas === 'TRAY' && (
              <div className="space-y-4">
                <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-800 flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p>
                      <strong>Aturan Akuntansi Stok Opname Tray:</strong> Tray rusak atau terpakai operasional dicatat ke akun <strong>Beban Tray Terpakai (ID 42)</strong>. Selisih fisik stok dibukukan ke <strong>Beban Penyesuaian Stok (ID 88)</strong> berpasangan dengan <strong>Persediaan Tray (ID 62)</strong>.
                    </p>
                    <p className="text-[11px] text-amber-700">
                      💡 <em>Mendukung input minus ( - ):</em> Jika Selisih minus (-) = stok berkurang (Debit: Beban Penyesuaian Kat. 88, Kredit: Persediaan). Jika Pemakaian Tray minus (-) = koreksi pembalikan (Debit: Persediaan, Kredit: Beban Kat. 42).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Selisih Stok (Kat. 88) */}
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-amber-900">
                        Selisih Stok ({currentSatuan})
                      </label>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-800">Kat. 88</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="Contoh: -2 atau +2"
                      value={formSelisihStok}
                      onChange={(e) => setFormSelisihStok(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-amber-200 text-xs font-semibold focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                    <p className="text-[10px] text-amber-800/80 font-medium truncate">
                      {selisihStokNum < 0
                        ? `(D) Beban: ${formatRupiah(Math.abs(selisihStokNum) * currentHPP)}`
                        : selisihStokNum > 0
                        ? `(K) Stok+: ${formatRupiah(selisihStokNum * currentHPP)}`
                        : 'Bisa (+ / -)'}
                    </p>
                  </div>

                  {/* Pemakaian / Tray Rusak (Kat. 42) */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-800">
                        Pemakaian / Tray Rusak ({currentSatuan})
                      </label>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">Kat. 42</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={formPemakaianTray}
                      onChange={(e) => setFormPemakaianTray(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-500 font-medium truncate">
                      {pemakaianTrayNum < 0
                        ? `(K) Koreksi: ${formatRupiah(Math.abs(pemakaianTrayNum) * currentHPP)}`
                        : pemakaianTrayNum > 0
                        ? `(D) Beban: ${formatRupiah(pemakaianTrayNum * currentHPP)}`
                        : 'Bisa (+ / -)'}
                    </p>
                  </div>

                  {/* Sisa Fisik Baik */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-800">
                        Stok Fisik Baik ({currentSatuan})
                      </label>
                      <span className="text-[9px] font-normal text-slate-400">Opsional</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder={`Estimasi: ${estimatedStokFisik.toFixed(2)}`}
                      value={formStokFisikBagus}
                      onChange={(e) => setFormStokFisikBagus(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      Otomatis: {estimatedStokFisik.toFixed(2)} {currentSatuan}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan / Keterangan Opname Tray
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Pemakaian tray kemasan pengiriman luar kota atau sortir tray patah"
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Preview Jurnal Akuntansi Otomatis (Live Simulation) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">3</span>
                <span>Preview Jurnal Penyesuaian Akuntansi Otomatis</span>
              </h3>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Double-Entry Balanced (Seimbang)</span>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Posisi Akun (Kategori Pembukuan)</th>
                    <th className="px-4 py-3">Formula / Perhitungan</th>
                    <th className="px-4 py-3 text-right">Debit (D)</th>
                    <th className="px-4 py-3 text-right">Kredit (K)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewJurnalLines.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-400 italic">
                        Masukkan rincian kuantitas susut / pemakaian di atas untuk melihat simulasi jurnal penyesuaian.
                      </td>
                    </tr>
                  ) : (
                    previewJurnalLines.map((line, idx) => (
                      <tr key={idx} className={line.debit > 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          {line.debit > 0 ? `(D) ${line.akun}` : `(K) ${line.akun}`}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">
                          {line.ref}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-emerald-700 font-semibold">
                          {line.debit > 0 ? formatRupiah(line.debit) : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-700 font-semibold">
                          {line.kredit > 0 ? formatRupiah(line.kredit) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {previewJurnalLines.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
                    <tr>
                      <td colSpan={2} className="px-4 py-2.5 text-right">Total Jurnal:</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-700">{formatRupiah(totalNilaiSusut)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-700">{formatRupiah(totalNilaiSusut)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Total Summary Bar */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-xs text-slate-400">Total Susut / Pengurangan (-):</p>
                  <p className="text-base font-bold text-rose-400">
                    -{totalQtyPengurangan.toLocaleString('id-ID')} {currentSatuan}
                  </p>
                </div>
                {totalQtyPenambahan > 0 && (
                  <div>
                    <p className="text-xs text-slate-400">Total Tambah / Koreksi (+):</p>
                    <p className="text-base font-bold text-emerald-400">
                      +{totalQtyPenambahan.toLocaleString('id-ID')} {currentSatuan}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400">Net Penyesuaian Fisik:</p>
                  <p className={`text-base font-bold ${netPerubahanStok >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {netPerubahanStok >= 0 ? `+${netPerubahanStok.toLocaleString('id-ID')}` : netPerubahanStok.toLocaleString('id-ID')} {currentSatuan}
                    <span className="text-xs text-slate-400 font-normal ml-2">
                      (Total Valuasi: {formatRupiah(totalNilaiSusut)})
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('LIST')}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createOpnameMutation.isPending || !formBarangId}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-900 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
                >
                  {createOpnameMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memproses Opname & Jurnal...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan Stok Opname & Posting Jurnal</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: RIWAYAT STOK OPNAME */}
      {activeTab === 'LIST' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterKomoditas('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filterKomoditas === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Komoditas
              </button>
              <button
                onClick={() => setFilterKomoditas('TELUR')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filterKomoditas === 'TELUR'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Telur
              </button>
              <button
                onClick={() => setFilterKomoditas('PAKAN')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filterKomoditas === 'PAKAN'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Pakan
              </button>
              <button
                onClick={() => setFilterKomoditas('OBAT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filterKomoditas === 'OBAT'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Obat
              </button>
              <button
                onClick={() => setFilterKomoditas('TRAY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filterKomoditas === 'TRAY'
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tray
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none"
                  title="Dari Tanggal"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none"
                  title="Sampai Tanggal"
                />
              </div>

              <div className="relative flex-1 md:w-56">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari No. Opname / Barang..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <button
                onClick={() => refetchHistory()}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="Segarkan data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table History */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Tanggal & Waktu</th>
                    <th className="px-4 py-3.5">No. Opname</th>
                    <th className="px-4 py-3.5">Barang & Komoditas</th>
                    <th className="px-4 py-3.5 text-center">Stok Sistem vs Fisik</th>
                    <th className="px-4 py-3.5">Rincian Susut / Pemakaian</th>
                    <th className="px-4 py-3.5 text-right">Nilai Penyesuaian</th>
                    <th className="px-4 py-3.5 text-center">Jurnal Akuntansi</th>
                    <th className="px-4 py-3.5">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingHistory ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                        Mengambil riwayat stok opname...
                      </td>
                    </tr>
                  ) : opnameHistoryList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        Belum ada catatan stok opname yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    opnameHistoryList.map((item) => {
                      const totalSusut =
                        item.jenisOpname === 'TELUR'
                          ? Number(item.bentes) + Number(item.ceplok) + Number(item.prok) + Number(item.kotor) + Number(item.jumbo) + Math.abs(Number(item.selisihStok || 0))
                          : item.jenisOpname === 'TRAY'
                          ? Math.abs(Number(item.pemakaianTray || 0)) + Math.abs(Number(item.selisihStok || 0))
                          : Math.abs(Number(item.barangPakai || 0)) + Math.abs(Number(item.selisihStok || 0));

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {new Date(item.tanggal).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {item.nomorOpname}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{item.barangName}</div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                                item.jenisOpname === 'TELUR'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.jenisOpname === 'PAKAN'
                                  ? 'bg-amber-100 text-amber-800'
                                  : item.jenisOpname === 'OBAT'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-teal-100 text-teal-800'
                              }`}
                            >
                              {item.jenisOpname}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="text-slate-500">
                              Sistem: <span className="font-semibold text-slate-700">{Number(item.stokSistem).toFixed(1)}</span>
                            </div>
                            <div className="text-slate-800 font-bold">
                              Fisik: <span>{Number(item.stokFisik).toFixed(1)} {item.satuan}</span>
                            </div>
                            {Number(item.selisih) !== 0 && (
                              <div className="text-[10px] text-rose-600 font-semibold">
                                Selisih: {Number(item.selisih).toFixed(1)} {item.satuan}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {item.jenisOpname === 'TELUR' ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {Number(item.selisihStok || 0) !== 0 && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                                      Number(item.selisihStok) > 0
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}
                                  >
                                    Selisih: {Number(item.selisihStok) > 0 ? `+${item.selisihStok}` : item.selisihStok}
                                  </span>
                                )}
                                {Number(item.bentes) !== 0 && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${
                                      Number(item.bentes) > 0
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-teal-50 text-teal-700 border-teal-200'
                                    }`}
                                  >
                                    {Number(item.bentes) > 0 ? `Bentes: ${item.bentes}` : `Bentes (Koreksi): ${item.bentes}`}
                                  </span>
                                )}
                                {Number(item.ceplok) !== 0 && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${
                                      Number(item.ceplok) > 0
                                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                                        : 'bg-teal-50 text-teal-700 border-teal-200'
                                    }`}
                                  >
                                    {Number(item.ceplok) > 0 ? `Ceplok: ${item.ceplok}` : `Ceplok (Koreksi): ${item.ceplok}`}
                                  </span>
                                )}
                                {Number(item.prok) !== 0 && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${
                                      Number(item.prok) > 0
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-teal-50 text-teal-700 border-teal-200'
                                    }`}
                                  >
                                    {Number(item.prok) > 0 ? `Prok: ${item.prok}` : `Prok (Koreksi): ${item.prok}`}
                                  </span>
                                )}
                                {Number(item.kotor) !== 0 && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${
                                      Number(item.kotor) > 0
                                        ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    }`}
                                  >
                                    {Number(item.kotor) > 0 ? `Kotor: ${item.kotor}` : `Kotor (Bersih): ${item.kotor}`}
                                  </span>
                                )}
                                {Number(item.jumbo) !== 0 && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${
                                      Number(item.jumbo) > 0
                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                        : 'bg-teal-50 text-teal-700 border-teal-200'
                                    }`}
                                  >
                                    {Number(item.jumbo) > 0 ? `Jumbo: ${item.jumbo}` : `Jumbo (Koreksi): ${item.jumbo}`}
                                  </span>
                                )}
                                {totalSusut === 0 && <span className="text-slate-400">-</span>}
                              </div>
                            ) : item.jenisOpname === 'TRAY' ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {Number(item.selisihStok || 0) !== 0 && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                                      Number(item.selisihStok) > 0
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}
                                  >
                                    Selisih: {Number(item.selisihStok) > 0 ? `+${item.selisihStok}` : item.selisihStok}
                                  </span>
                                )}
                                {Number(item.pemakaianTray || 0) !== 0 && (
                                  <span
                                    className={`px-2 py-0.5 rounded border text-[10px] font-medium ${
                                      Number(item.pemakaianTray) > 0
                                        ? 'bg-teal-50 text-teal-700 border-teal-200'
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    }`}
                                  >
                                    {Number(item.pemakaianTray) > 0 ? `Rusak/Pakai: ${item.pemakaianTray}` : `Koreksi Tray: ${item.pemakaianTray}`} {item.satuan}
                                  </span>
                                )}
                                {totalSusut === 0 && <span className="text-slate-400">-</span>}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {Number(item.selisihStok || 0) !== 0 && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                                      Number(item.selisihStok) > 0
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}
                                  >
                                    Selisih: {Number(item.selisihStok) > 0 ? `+${item.selisihStok}` : item.selisihStok}
                                  </span>
                                )}
                                {Number(item.barangPakai || 0) !== 0 && (
                                  <span
                                    className={`px-2 py-0.5 rounded border text-[10px] font-medium ${
                                      Number(item.barangPakai) > 0
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    }`}
                                  >
                                    {Number(item.barangPakai) > 0 ? `Barang Pakai: ${item.barangPakai}` : `Koreksi Pakai: ${item.barangPakai}`} {item.satuan}
                                  </span>
                                )}
                                {totalSusut === 0 && <span className="text-slate-400">-</span>}
                              </div>
                            )}
                            {item.keterangan && (
                              <p className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-xs">
                                {item.keterangan}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            {formatRupiah(Number(item.totalNilai))}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {item.nomorJurnal ? (
                              <button
                                onClick={() => setSelectedOpnameForJournal(item)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-mono font-semibold text-[11px] inline-flex items-center space-x-1 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{item.nomorJurnal}</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Tanpa Jurnal</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {item.userName || 'Admin'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL JURNAL PENYESUAIAN */}
      {selectedOpnameForJournal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Detail Jurnal Penyesuaian Akuntansi
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {selectedOpnameForJournal.nomorJurnal} • Opname: {selectedOpnameForJournal.nomorOpname}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOpnameForJournal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400">Barang:</span>
                  <p className="font-bold text-slate-800">{selectedOpnameForJournal.barangName}</p>
                </div>
                <div>
                  <span className="text-slate-400">Total Nilai Susut / Valuasi:</span>
                  <p className="font-bold text-emerald-700 font-mono">
                    {formatRupiah(Number(selectedOpnameForJournal.totalNilai))}
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Nama Akun / Kategori</th>
                      <th className="px-4 py-2.5 text-right">Debit (D)</th>
                      <th className="px-4 py-2.5 text-right">Kredit (K)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOpnameForJournal.jurnalDetails &&
                    selectedOpnameForJournal.jurnalDetails.length > 0 ? (
                      selectedOpnameForJournal.jurnalDetails.map((jd, idx) => (
                        <tr key={idx} className={jd.debit > 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="px-4 py-2.5 font-medium text-slate-800">
                            {jd.debit > 0 ? `(D) ${jd.kategoriName}` : `(K) ${jd.kategoriName}`}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-emerald-700 font-semibold">
                            {Number(jd.debit) > 0 ? formatRupiah(Number(jd.debit)) : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-700 font-semibold">
                            {Number(jd.kredit) > 0 ? formatRupiah(Number(jd.kredit)) : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-400 italic">
                          Tidak ada rincian baris jurnal untuk opname ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {selectedOpnameForJournal.jurnalDetails &&
                    selectedOpnameForJournal.jurnalDetails.length > 0 && (
                      <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
                        <tr>
                          <td className="px-4 py-2.5">Total Saldo:</td>
                          <td className="px-4 py-2.5 text-right font-mono text-emerald-700">
                            {formatRupiah(
                              selectedOpnameForJournal.jurnalDetails.reduce(
                                (acc, curr) => acc + Number(curr.debit),
                                0
                              )
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                            {formatRupiah(
                              selectedOpnameForJournal.jurnalDetails.reduce(
                                (acc, curr) => acc + Number(curr.kredit),
                                0
                              )
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                </table>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedOpnameForJournal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
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

export default StokOpnamePage;
