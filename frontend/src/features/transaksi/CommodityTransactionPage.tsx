import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { SearchableClientSelect } from '../../components/SearchableClientSelect';
import { SearchableBarangSelect } from '../../components/SearchableBarangSelect';
import { ExportButtonGroup } from '../../components/ExportButtonGroup';
import { exportToExcel, formatDateIndo } from '../../lib/export-utils';
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Plus,
  Search,
  Eye,
  Edit2,
  Edit3,
  Trash2,
  Calendar,
  X,
  AlertTriangle,
  ShoppingCart,
  Info,
  Loader2,
  Lock,
  ChevronDown,
} from 'lucide-react';

interface CommodityConfig {
  commodityKey: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  jenisIds: number[];
  isEgg?: boolean;
}

interface CartItem {
  id: string;
  barangId: number;
  barangName: string;
  satuan: string;
  qty: number;
  hargaSatuan: number;
  subtotal: number;
}

export const KAS_BANK_PAYMENT_ACCOUNTS = [
  { id: 64, code: '1-1001', name: 'Kas Tunai (Pusat)', method: 'TUNAI' as const },
  { id: 71, code: '1-1002', name: 'Kas Deby', method: 'TUNAI' as const },
  { id: 66, code: '1-1004', name: 'Bank BCA Masduki', method: 'TRANSFER' as const },
  { id: 65, code: '1-1003', name: 'Bank BCA Binti Wasilah', method: 'TRANSFER' as const },
  { id: 67, code: '1-1005', name: 'Bank BRI Binti Wasilah', method: 'TRANSFER' as const },
  { id: 68, code: '1-1006', name: 'Bank BRI Masduki', method: 'TRANSFER' as const },
  { id: 70, code: '1-1008', name: 'Bank BNI Bima Pratama', method: 'TRANSFER' as const },
  { id: 69, code: '1-1007', name: 'Bank BNI Binti Wasilah', method: 'TRANSFER' as const },
];

export const PEMBELIAN_TELUR_PAYMENT_ACCOUNTS = [
  { id: 72, code: '2-2001', name: 'Hutang Peternak (Tempo / Hutang)', method: 'KREDIT_BON' as const },
  ...KAS_BANK_PAYMENT_ACCOUNTS,
];

export const PEMBELIAN_PAKAN_PAYMENT_ACCOUNTS = [
  { id: 83, code: '2-2004', name: 'Hutang Sentrat SK (Tempo / Hutang)', method: 'KREDIT_BON' as const },
  { id: 84, code: '2-2005', name: 'Hutang Sentrat Ponggok (Tempo / Hutang)', method: 'KREDIT_BON' as const },
  { id: 85, code: '2-2006', name: 'Hutang Sentrat Random (Tempo / Hutang)', method: 'KREDIT_BON' as const },
  ...KAS_BANK_PAYMENT_ACCOUNTS,
];

export const PEMBELIAN_OBAT_PAYMENT_ACCOUNTS = [
  { id: 80, code: '2-2007', name: 'Hutang Obat SK (Tempo / Hutang)', method: 'KREDIT_BON' as const },
  { id: 81, code: '2-2008', name: 'Hutang Obat Ponggok (Tempo / Hutang)', method: 'KREDIT_BON' as const },
  { id: 82, code: '2-2009', name: 'Hutang Obat Random (Tempo / Hutang)', method: 'KREDIT_BON' as const },
  ...KAS_BANK_PAYMENT_ACCOUNTS,
];

export const PEMBELIAN_TRAY_PAYMENT_ACCOUNTS = [
  { id: 77, code: '2-2010', name: 'Hutang Tray Diamond /DM (Tempo / Hutang)', method: 'KREDIT_BON' as const },
  { id: 78, code: '2-2011', name: 'Hutang Tray Super Buah /SB (Tempo / Hutang)', method: 'KREDIT_BON' as const },
  { id: 79, code: '2-2012', name: 'Hutang Tray Random (Tempo / Hutang)', method: 'KREDIT_BON' as const },
  ...KAS_BANK_PAYMENT_ACCOUNTS,
];

export const PENJUALAN_TELUR_PAYMENT_ACCOUNTS = [
  { id: 48, code: '1-1022', name: 'Piutang Pedagang (Tempo / Bon Jual)', method: 'KREDIT_BON' as const },
  ...KAS_BANK_PAYMENT_ACCOUNTS,
];

export const PENJUALAN_PAKAN_OBAT_TRAY_PAYMENT_ACCOUNTS = [
  { id: 46, code: '1-1020', name: 'Piutang Peternak (Tempo / Bon Jual)', method: 'KREDIT_BON' as const },
  { id: 47, code: '1-1021', name: 'Piutang Karyawan (Tempo / Bon Jual)', method: 'KREDIT_BON' as const },
  ...KAS_BANK_PAYMENT_ACCOUNTS,
];

export const getPenjualanPaymentAccounts = (commodityKey: string, isEgg?: boolean) => {
  if (commodityKey === 'telur' || isEgg) {
    return PENJUALAN_TELUR_PAYMENT_ACCOUNTS;
  }
  return PENJUALAN_PAKAN_OBAT_TRAY_PAYMENT_ACCOUNTS;
};

export const getDefaultPenjualanAccountId = (commodityKey: string, isEgg?: boolean, client?: any) => {
  if (commodityKey === 'telur' || isEgg) return 48; // Piutang Pedagang
  const clientType = client?.type?.toLowerCase() || '';
  if (clientType.includes('karyawan')) return 47; // Piutang Karyawan
  return 46; // Default Piutang Peternak
};

export const getPembelianPaymentAccounts = (commodityKey: string, isEgg?: boolean) => {
  if (commodityKey === 'pakan') return PEMBELIAN_PAKAN_PAYMENT_ACCOUNTS;
  if (commodityKey === 'obat') return PEMBELIAN_OBAT_PAYMENT_ACCOUNTS;
  if (commodityKey === 'tray') return PEMBELIAN_TRAY_PAYMENT_ACCOUNTS;
  if (commodityKey === 'telur' || isEgg) return PEMBELIAN_TELUR_PAYMENT_ACCOUNTS;
  return PEMBELIAN_TELUR_PAYMENT_ACCOUNTS;
};

export const getDefaultPembelianAccountId = (commodityKey: string, isEgg?: boolean) => {
  if (commodityKey === 'pakan') return 83; // Hutang Sentrat SK
  if (commodityKey === 'obat') return 80;  // Hutang Obat SK
  if (commodityKey === 'tray') return 77;  // Hutang Tray Diamond /DM
  if (commodityKey === 'telur' || isEgg) return 72; // Hutang Peternak
  return 72; // Hutang Peternak
};

export const extractPaymentAccountId = (tx: any, isEggParam?: boolean, commodityKeyParam?: string) => {
  if (!tx) return null;
  const jDetails = tx.jurnalUmums?.[0]?.details || [];

  if (tx.type === 'PEMBELIAN') {
    const payDetail = jDetails.find((d: any) => {
      const kId = Number(d.kategoriId);
      const isCredit = Number(d.kredit) > 0;
      const isPayAcc = [64, 71, 65, 66, 67, 68, 69, 70, 72, 77, 78, 79, 80, 81, 82, 83, 84, 85].includes(kId);
      return isCredit && isPayAcc;
    });
    if (payDetail) return Number(payDetail.kategoriId);

    if (tx.paymentMethod === 'TUNAI') return 64;
    if (tx.paymentMethod === 'TRANSFER') return 66;

    const cName = tx.client?.name?.toLowerCase() || '';
    if (commodityKeyParam === 'pakan') {
      if (cName.includes('sk')) return 83;
      if (cName.includes('ponggok')) return 84;
      if (cName.includes('random')) return 85;
      return 83;
    }
    if (commodityKeyParam === 'obat') {
      if (cName.includes('sk')) return 80;
      if (cName.includes('ponggok')) return 81;
      if (cName.includes('random')) return 82;
      return 80;
    }
    if (commodityKeyParam === 'tray') {
      if (cName.includes('diamond') || cName.includes('dm')) return 77;
      if (cName.includes('super buah') || cName.includes('sb')) return 78;
      if (cName.includes('random')) return 79;
      return 77;
    }
    return getDefaultPembelianAccountId(commodityKeyParam || '', isEggParam);
  }

  if (tx.type === 'PENJUALAN') {
    const payDetail = jDetails.find((d: any) => {
      const kId = Number(d.kategoriId);
      const isDebit = Number(d.debit) > 0;
      const isPayAcc = [46, 47, 48, 50, 51, 52, 53, 54, 55, 56, 57, 58, 64, 71, 65, 66, 67, 68, 69, 70].includes(kId);
      return isDebit && isPayAcc;
    });
    if (payDetail) return Number(payDetail.kategoriId);

    if (tx.paymentMethod === 'TUNAI') return 64;
    if (tx.paymentMethod === 'TRANSFER') return 66;
    return getDefaultPenjualanAccountId(commodityKeyParam || '', isEggParam, tx.client);
  }

  return null;
};

export const CommodityTransactionPage: React.FC<CommodityConfig> = ({
  commodityKey,
  title,
  subtitle,
  icon: HeaderIcon,
  accentColor,
  jenisIds,
  isEgg = false,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'PEMBELIAN' | 'PENJUALAN' | 'RETUR_PEMBELIAN' | 'RETUR_PENJUALAN' | 'STOK'>('PENJUALAN');
  const [search, setSearch] = useState('');
  const [filterClientId, setFilterClientId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Helper dates (Local Indonesia YYYY-MM-DD)
  const getTodayString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // State for Monitoring Tab (Telur / Pakan / Obat / Tray)
  const [monitoringType, setMonitoringType] = useState<'PEMBELIAN' | 'PENJUALAN'>('PEMBELIAN');
  const [monitoringDate, setMonitoringDate] = useState<string>(() => getTodayString());
  const [expandedBarangId, setExpandedBarangId] = useState<number | null>(null);
  const [monitoringSubView, setMonitoringSubView] = useState<'REKAP' | 'GUDANG'>('REKAP');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [detailModalTx, setDetailModalTx] = useState<any | null>(null);
  const [editModalTx, setEditModalTx] = useState<any | null>(null);
  const [deleteModalTx, setDeleteModalTx] = useState<any | null>(null);

  // Form State for Add Transaction
  const [formType, setFormType] = useState<'PEMBELIAN' | 'PENJUALAN' | 'RETUR_PEMBELIAN' | 'RETUR_PENJUALAN'>('PENJUALAN');
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [formClientId, setFormClientId] = useState<string>('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'TUNAI' | 'TRANSFER' | 'KREDIT_BON'>('KREDIT_BON');
  const [formPaymentAccountId, setFormPaymentAccountId] = useState<number>(46);
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formDiskon, setFormDiskon] = useState(0);

  // Multi-item cart
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Current line item inputs
  const [selectedBarangId, setSelectedBarangId] = useState<string>('');
  const [formQty, setFormQty] = useState<number>(1);
  const [formHarga, setFormHarga] = useState<number>(0);
  const [formHargaDisplay, setFormHargaDisplay] = useState<string>('0');

  // Retur transaction selection state
  const [selectedOriginalTxId, setSelectedOriginalTxId] = useState<string>('');
  const [returItems, setReturItems] = useState<
    { detailId?: number; barangId: number; barangName: string; originalQty: number; hargaSatuan: number; returQty: number }[]
  >([]);

  // Edit form state
  const [editKeterangan, setEditKeterangan] = useState('');
  const [editTanggal, setEditTanggal] = useState('');
  const [editClientId, setEditClientId] = useState<string>('');
  const [editDiskon, setEditDiskon] = useState<number>(0);
  const [editCartItems, setEditCartItems] = useState<
    Array<{
      id: string;
      detailId?: number;
      barangId: number;
      barangName: string;
      satuan: string;
      qty: number;
      hargaSatuan: number;
      subtotal: number;
    }>
  >([]);
  const [editSelectedBarangId, setEditSelectedBarangId] = useState<string>('');
  const [editFormQty, setEditFormQty] = useState<number>(1);
  const [editFormHarga, setEditFormHarga] = useState<number>(0);
  const [editFormHargaDisplay, setEditFormHargaDisplay] = useState<string>('0');
  const [editError, setEditError] = useState<string | null>(null);

  // Indonesian alert banner state
  const [formError, setFormError] = useState<string | null>(null);

  // 1. Fetch Barangs specifically for this commodity
  const { data: allBarangs } = useQuery({
    queryKey: ['barangsForCommodity', jenisIds],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/barangs?limit=1000');
      let list: any[] = [];
      if (Array.isArray(res)) list = res;
      else if (Array.isArray(res?.data)) list = res.data;
      else if (Array.isArray(res?.items)) list = res.items;
      else if (Array.isArray(res?.data?.items)) list = res.data.items;
      return list.filter((b: any) => jenisIds.includes(Number(b.jenisId)));
    },
  });

  // 2. Fetch Clients for dropdown
  const { data: clientsData } = useQuery({
    queryKey: ['clientsListAll'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/clients?limit=1000');
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.items)) return res.items;
      if (Array.isArray(res?.data?.items)) return res.data.items;
      return [];
    },
  });

  // 3. Fetch Transactions for activeTab
  const { data: txData, isLoading: loadingTx } = useQuery({
    queryKey: ['txCommodity', activeTab, jenisIds, search, filterClientId, startDate, endDate],
    queryFn: async () => {
      if (activeTab === 'STOK') return null;
      let url = `/transaksi?type=${activeTab}&limit=50`;
      if (jenisIds && jenisIds.length > 0) {
        url += `&jenisIds=${jenisIds.join(',')}`;
      }
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filterClientId) url += `&clientId=${filterClientId}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      const res: any = await apiClient.get(url);
      return res;
    },
    enabled: activeTab !== 'STOK',
  });

  // 4. Fetch Inventory Summary
  const { data: stockItems, isLoading: loadingStock } = useQuery({
    queryKey: ['stockCommodity', jenisIds],
    queryFn: async () => {
      const res: any = await apiClient.get(`/inventory/summary`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      return list.filter((item: any) => jenisIds.includes(Number(item.jenisId || 0)));
    },
  });

  // 5. Fetch Completed Transactions for Retur picker
  const originalTxType = formType === 'RETUR_PENJUALAN' ? 'PENJUALAN' : 'PEMBELIAN';
  const { data: originalTransactions } = useQuery({
    queryKey: ['originalTxForRetur', originalTxType, jenisIds],
    queryFn: async () => {
      let url = `/transaksi?type=${originalTxType}&limit=100&status=SELESAI`;
      if (jenisIds && jenisIds.length > 0) {
        url += `&jenisIds=${jenisIds.join(',')}`;
      }
      const res: any = await apiClient.get(url);
      const list = res.items || (Array.isArray(res) ? res : res.data) || [];
      return list;
    },
    enabled: isAddModalOpen && (formType === 'RETUR_PENJUALAN' || formType === 'RETUR_PEMBELIAN'),
  });

  // 6. Fetch Transactions for Monitoring Tab
  const { data: monitoringTxData, isLoading: loadingMonitoring } = useQuery({
    queryKey: ['monitoringTx', commodityKey, jenisIds, monitoringType, monitoringDate, filterClientId, search],
    queryFn: async () => {
      let url = `/transaksi?type=${monitoringType}&startDate=${monitoringDate}&endDate=${monitoringDate}&limit=200&status=SELESAI`;
      if (jenisIds && jenisIds.length > 0) {
        url += `&jenisIds=${jenisIds.join(',')}`;
      }
      if (filterClientId) url += `&clientId=${filterClientId}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res: any = await apiClient.get(url);
      return res?.items || (Array.isArray(res) ? res : res?.data?.items || res?.data) || [];
    },
    enabled: activeTab === 'STOK',
  });

  const isBeli =
    activeTab === 'PEMBELIAN' ||
    activeTab === 'RETUR_PEMBELIAN' ||
    (activeTab === 'STOK' && monitoringType === 'PEMBELIAN');

  // Filter clients specifically for Filter Bar per tab & commodity
  const filterClientsList = useMemo(() => {
    if (!clientsData) return [];
    let list = clientsData;
    if (isBeli) {
      if (commodityKey === 'telur' || isEgg) {
        list = clientsData.filter((c: any) => c.type?.toLowerCase().includes('peternak'));
      } else if (commodityKey === 'pakan') {
        list = clientsData.filter(
          (c: any) => c.type?.toLowerCase().includes('supplier') && c.name?.toLowerCase().includes('sentrat'),
        );
      } else if (commodityKey === 'obat') {
        list = clientsData.filter(
          (c: any) => c.type?.toLowerCase().includes('supplier') && c.name?.toLowerCase().includes('obat'),
        );
      } else if (commodityKey === 'tray') {
        list = clientsData.filter(
          (c: any) => c.type?.toLowerCase().includes('supplier') && c.name?.toLowerCase().includes('tray'),
        );
      }
    } else {
      // Penjualan & Retur Penjualan
      if (commodityKey === 'pakan' || commodityKey === 'obat' || commodityKey === 'tray') {
        list = clientsData.filter((c: any) => {
          const t = c.type?.toLowerCase() || '';
          return !t.includes('pedagang') && !t.includes('supplier');
        });
      } else if (commodityKey === 'telur' || isEgg) {
        list = clientsData.filter((c: any) => c.type?.toLowerCase().includes('pedagang'));
      }
    }
    return list.length > 0 ? list : clientsData;
  }, [clientsData, isBeli, commodityKey, isEgg]);

  // Reset client filter when switching tab or monitoring transaction type
  useEffect(() => {
    setFilterClientId('');
  }, [activeTab, monitoringType]);


  // Filter clients specifically per commodity on Pembelian & Penjualan
  const availableClients = useMemo(() => {
    if (!clientsData) return [];
    if (formType === 'PEMBELIAN') {
      if (commodityKey === 'telur' || isEgg) {
        return clientsData.filter((c: any) => c.type?.toLowerCase().includes('peternak'));
      }
      if (commodityKey === 'pakan') {
        // Tipe supplier yang namanya "Sentrat %"
        return clientsData.filter(
          (c: any) => c.type?.toLowerCase().includes('supplier') && c.name?.toLowerCase().includes('sentrat'),
        );
      }
      if (commodityKey === 'obat') {
        // Tipe supplier yang namanya "Obat %"
        return clientsData.filter(
          (c: any) => c.type?.toLowerCase().includes('supplier') && c.name?.toLowerCase().includes('obat'),
        );
      }
      if (commodityKey === 'tray') {
        // Tipe supplier yang namanya "Tray %"
        return clientsData.filter(
          (c: any) => c.type?.toLowerCase().includes('supplier') && c.name?.toLowerCase().includes('tray'),
        );
      }
    } else if (formType === 'PENJUALAN') {
      if (commodityKey === 'pakan' || commodityKey === 'obat' || commodityKey === 'tray') {
        // Form penjualan untuk pakan, obat, dan tray: semua tipe KECUALI pedagang dan KECUALI supplier
        return clientsData.filter((c: any) => {
          const t = c.type?.toLowerCase() || '';
          return !t.includes('pedagang') && !t.includes('supplier');
        });
      }
      if (commodityKey === 'telur' || isEgg) {
        // Form penjualan telur: pembeli adalah pedagang
        return clientsData.filter((c: any) => c.type?.toLowerCase().includes('pedagang'));
      }
    }
    return clientsData;
  }, [clientsData, isEgg, commodityKey, formType]);

  // Auto-sync Hutang / Piutang Payment Account based on selected Client
  const handleClientSelect = (clientId: string) => {
    setFormClientId(clientId);
    if (!clientId) return;
    const client = clientsData?.find((c: any) => String(c.id) === String(clientId));
    if (!client) return;
    const cName = client.name.toLowerCase();

    if (formType === 'PEMBELIAN') {
      if (commodityKey === 'pakan') {
        if (cName.includes('sk')) setFormPaymentAccountId(83);
        else if (cName.includes('ponggok')) setFormPaymentAccountId(84);
        else if (cName.includes('random')) setFormPaymentAccountId(85);
        else setFormPaymentAccountId(83);
        setFormPaymentMethod('KREDIT_BON');
      } else if (commodityKey === 'obat') {
        if (cName.includes('sk')) setFormPaymentAccountId(80);
        else if (cName.includes('ponggok')) setFormPaymentAccountId(81);
        else if (cName.includes('random')) setFormPaymentAccountId(82);
        else setFormPaymentAccountId(80);
        setFormPaymentMethod('KREDIT_BON');
      } else if (commodityKey === 'tray') {
        if (cName.includes('diamond') || cName.includes('dm')) setFormPaymentAccountId(77);
        else if (cName.includes('super buah') || cName.includes('sb')) setFormPaymentAccountId(78);
        else if (cName.includes('random')) setFormPaymentAccountId(79);
        else setFormPaymentAccountId(77);
        setFormPaymentMethod('KREDIT_BON');
      } else if (commodityKey === 'telur' || isEgg) {
        setFormPaymentAccountId(72);
        setFormPaymentMethod('KREDIT_BON');
      }
    } else if (formType === 'PENJUALAN') {
      if (commodityKey === 'telur' || isEgg) {
        setFormPaymentAccountId(48); // Piutang Pedagang
        setFormPaymentMethod('KREDIT_BON');
      } else {
        const defAccId = getDefaultPenjualanAccountId(commodityKey, isEgg, client);
        setFormPaymentAccountId(defAccId);
        setFormPaymentMethod('KREDIT_BON');
      }
    }
  };

  // List of payment accounts dynamically adjusted for current formType & selected payment account
  const currentPaymentAccountList = useMemo(() => {
    const isPembelian = formType === 'PEMBELIAN' || formType === 'RETUR_PEMBELIAN';
    const list = isPembelian
      ? getPembelianPaymentAccounts(commodityKey, isEgg)
      : getPenjualanPaymentAccounts(commodityKey, isEgg);

    if (formPaymentAccountId && !list.some((a) => a.id === formPaymentAccountId)) {
      const allKnown = [
        ...PEMBELIAN_TELUR_PAYMENT_ACCOUNTS,
        ...PEMBELIAN_PAKAN_PAYMENT_ACCOUNTS,
        ...PEMBELIAN_OBAT_PAYMENT_ACCOUNTS,
        ...PEMBELIAN_TRAY_PAYMENT_ACCOUNTS,
        ...PENJUALAN_TELUR_PAYMENT_ACCOUNTS,
        ...PENJUALAN_PAKAN_OBAT_TRAY_PAYMENT_ACCOUNTS,
      ];
      const found = allKnown.find((a) => a.id === formPaymentAccountId);
      if (found) {
        return [...list, found];
      }
      return [
        ...list,
        {
          id: formPaymentAccountId,
          code: 'AKUN',
          name: `Akun #${formPaymentAccountId}`,
          method: formPaymentMethod,
        },
      ];
    }
    return list;
  }, [formType, commodityKey, isEgg, formPaymentAccountId, formPaymentMethod]);

  // Default payment method and account setup on formType/formPaymentAccountId change
  useEffect(() => {
    const hutangIds = [72, 77, 78, 79, 80, 81, 82, 83, 84, 85];
    const piutangIds = [46, 47, 48, 50, 51, 52, 53, 54, 55, 56, 57, 58];
    const kasIds = [64, 71];

    if (formType === 'PEMBELIAN' || formType === 'RETUR_PEMBELIAN') {
      if (hutangIds.includes(formPaymentAccountId)) {
        setFormPaymentMethod('KREDIT_BON');
      } else if (kasIds.includes(formPaymentAccountId)) {
        setFormPaymentMethod('TUNAI');
      } else {
        setFormPaymentMethod('TRANSFER');
      }
    } else if (formType === 'PENJUALAN' || formType === 'RETUR_PENJUALAN') {
      if (piutangIds.includes(formPaymentAccountId)) {
        setFormPaymentMethod('KREDIT_BON');
      } else if (kasIds.includes(formPaymentAccountId)) {
        setFormPaymentMethod('TUNAI');
      } else {
        setFormPaymentMethod('TRANSFER');
      }
    }
  }, [formType, formPaymentAccountId]);

  // When barang selected in Penjualan, auto-fetch suggested FIFO price
  const handleBarangSelect = (bId: string) => {
    setSelectedBarangId(bId);
    setFormError(null);
    if (!bId) {
      setFormHarga(0);
      setFormHargaDisplay('0');
      return;
    }

    const matchedStock = stockItems?.find((s: any) => Number(s.id || s.barangId) === Number(bId));
    if (matchedStock) {
      const suggestedPrice = Math.round(Number(matchedStock.hargaRataRata || 0));
      if (suggestedPrice > 0 && formType === 'PENJUALAN') {
        setFormHarga(suggestedPrice);
        setFormHargaDisplay(suggestedPrice.toLocaleString('id-ID'));
      }
    }
  };

  // Format currency mask input
  const handleHargaInputChange = (raw: string) => {
    const numeric = raw.replace(/\D/g, '');
    const val = Number(numeric);
    setFormHarga(val);
    setFormHargaDisplay(val > 0 ? val.toLocaleString('id-ID') : '0');
  };

  // Add Item to Multi-Item Cart
  const handleAddToCart = () => {
    if (!selectedBarangId) {
      setFormError('Silakan pilih barang terlebih dahulu.');
      return;
    }
    if (formQty <= 0) {
      setFormError('Kuantitas barang harus lebih dari 0.');
      return;
    }

    const barangObj = allBarangs?.find((b: any) => Number(b.id) === Number(selectedBarangId));
    const newItem: CartItem = {
      id: `${selectedBarangId}-${Date.now()}`,
      barangId: Number(selectedBarangId),
      barangName: barangObj?.name || `Barang #${selectedBarangId}`,
      satuan: barangObj?.satuan?.name || 'Kg',
      qty: formQty,
      hargaSatuan: formHarga,
      subtotal: formQty * formHarga,
    };

    setCartItems([...cartItems, newItem]);
    setSelectedBarangId('');
    setFormQty(1);
    setFormHarga(0);
    setFormHargaDisplay('0');
    setFormError(null);
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems(cartItems.filter((it) => it.id !== id));
  };

  // Selected original transaction object for retur
  const selectedOriginalTx = useMemo(() => {
    if (!selectedOriginalTxId || !originalTransactions) return null;
    return originalTransactions.find((t: any) => Number(t.id) === Number(selectedOriginalTxId)) || null;
  }, [selectedOriginalTxId, originalTransactions]);

  // When original transaction selected in Retur
  const handleOriginalTxSelect = (txId: string) => {
    setSelectedOriginalTxId(txId);
    setFormError(null);
    if (!txId) {
      setReturItems([]);
      setFormClientId('');
      setFormKeterangan('');
      return;
    }

    const orig = originalTransactions?.find((t: any) => Number(t.id) === Number(txId));
    if (orig) {
      // 1. Klien mengambil dari transaksi yang dipilih
      if (orig.clientId) {
        setFormClientId(String(orig.clientId));
      } else {
        setFormClientId('');
      }

      // 2. Metode & Akun Pembayaran mengambil dari transaksi yang dipilih
      const origAccId = extractPaymentAccountId(orig, isEgg, commodityKey);
      if (origAccId) {
        setFormPaymentAccountId(origAccId);
      }
      if (orig.paymentMethod) {
        setFormPaymentMethod(orig.paymentMethod);
      }

      // 3. Catatan default: "Retur pembelian dari pembelian [invoice]" atau "Retur penjualan dari penjualan [invoice]"
      if (formType === 'RETUR_PEMBELIAN') {
        setFormKeterangan(`Retur pembelian dari pembelian ${orig.invoice}`);
      } else if (formType === 'RETUR_PENJUALAN') {
        setFormKeterangan(`Retur penjualan dari penjualan ${orig.invoice}`);
      }

      // 4. Baris barang yang bisa diretur (pastikan detailId terbawa)
      if (Array.isArray(orig.details)) {
        const mapped = orig.details
          .filter((d: any) => d.barangId)
          .map((d: any) => ({
            detailId: Number(d.id),
            barangId: Number(d.barangId),
            barangName: d.barang?.name || `Barang #${d.barangId}`,
            originalQty: Number(d.qty),
            hargaSatuan: Number(d.hargaSatuan),
            returQty: 0,
          }));
        setReturItems(mapped);
      }
    }
  };

  // Mutations
  const createTxMutation = useMutation({
    mutationFn: async (payload: any) => {
      let endpoint = '/transaksi/penjualan';
      if (formType === 'PEMBELIAN') endpoint = '/transaksi/pembelian';
      if (formType === 'RETUR_PENJUALAN') endpoint = '/transaksi/retur-penjualan';
      if (formType === 'RETUR_PEMBELIAN') endpoint = '/transaksi/retur-pembelian';
      return apiClient.post(endpoint, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['txCommodity'] });
      queryClient.invalidateQueries({ queryKey: ['stockCommodity'] });
      queryClient.invalidateQueries({ queryKey: ['labaRugi'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      setIsAddModalOpen(false);
      resetAddForm();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Terjadi kesalahan saat menyimpan transaksi.';
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const updateTxMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiClient.put(`/transaksi/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['txCommodity'] });
      queryClient.invalidateQueries({ queryKey: ['stockCommodity'] });
      queryClient.invalidateQueries({ queryKey: ['labaRugi'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      setEditModalTx(null);
      setEditError(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan perubahan transaksi.';
      setEditError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const deleteTxMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/transaksi/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['txCommodity'] });
      queryClient.invalidateQueries({ queryKey: ['stockCommodity'] });
      queryClient.invalidateQueries({ queryKey: ['labaRugi'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      setDeleteModalTx(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menghapus transaksi.';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const resetAddForm = () => {
    setSelectedBarangId('');
    setFormQty(1);
    setFormHarga(0);
    setFormHargaDisplay('0');
    setFormKeterangan('');
    setFormDiskon(0);
    setCartItems([]);
    setSelectedOriginalTxId('');
    setReturItems([]);
    setFormError(null);
  };

  const handleOpenAddModal = (presetType?: 'PEMBELIAN' | 'PENJUALAN' | 'RETUR_PEMBELIAN' | 'RETUR_PENJUALAN') => {
    const t = presetType || (activeTab !== 'STOK' ? activeTab : 'PENJUALAN');
    setFormType(t);
    resetAddForm();
    if (t === 'PEMBELIAN') {
      const defId = getDefaultPembelianAccountId(commodityKey, isEgg);
      setFormPaymentAccountId(defId);
      setFormPaymentMethod('KREDIT_BON');
    } else if (t === 'PENJUALAN') {
      const defId = getDefaultPenjualanAccountId(commodityKey, isEgg);
      setFormPaymentAccountId(defId);
      setFormPaymentMethod('KREDIT_BON');
    } else {
      setFormPaymentAccountId(64); // Kas Tunai
      setFormPaymentMethod('TUNAI');
    }
    setIsAddModalOpen(true);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Flow Retur
    if (formType === 'RETUR_PEMBELIAN' || formType === 'RETUR_PENJUALAN') {
      if (!selectedOriginalTxId) {
        setFormError('Mohon pilih faktur transaksi asal yang akan diretur terlebih dahulu.');
        return;
      }
      const activeReturs = returItems.filter((r) => r.returQty > 0);
      if (activeReturs.length === 0) {
        setFormError('Mohon tentukan jumlah retur pada minimal satu barang.');
        return;
      }
      for (const it of activeReturs) {
        if (it.returQty > it.originalQty) {
          setFormError(`Kuantitas retur barang ${it.barangName} (${it.returQty}) melebihi kuantitas transaksi asli (${it.originalQty}).`);
          return;
        }
      }

      const defaultReturKet = formType === 'RETUR_PEMBELIAN'
        ? `Retur pembelian dari pembelian ${selectedOriginalTx?.invoice || ''}`.trim()
        : `Retur penjualan dari penjualan ${selectedOriginalTx?.invoice || ''}`.trim();

      const payload = {
        type: formType,
        tanggal: formTanggal,
        clientId: formClientId ? Number(formClientId) : null,
        paymentMethod: formPaymentMethod,
        paymentAccountId: formPaymentAccountId,
        keterangan: formKeterangan || defaultReturKet,
        diskon: formDiskon,
        items: activeReturs.map((r) => ({
          originalDetailId: r.detailId,
          barangId: r.barangId,
          qty: r.returQty,
          hargaSatuan: r.hargaSatuan,
        })),
      };
      createTxMutation.mutate(payload);
      return;
    }

    // Flow Standard (Pembelian / Penjualan)
    let finalItems = [...cartItems];
    if (finalItems.length === 0 && selectedBarangId && formQty > 0) {
      finalItems.push({
        id: 'single-item',
        barangId: Number(selectedBarangId),
        barangName: '',
        satuan: '',
        qty: formQty,
        hargaSatuan: formHarga,
        subtotal: formQty * formHarga,
      });
    }

    if (finalItems.length === 0) {
      setFormError('Silakan tambahkan minimal satu barang ke dalam daftar transaksi.');
      return;
    }

    const payload = {
      type: formType,
      tanggal: formTanggal,
      clientId: formClientId ? Number(formClientId) : null,
      paymentMethod: formPaymentMethod,
      paymentAccountId: formPaymentAccountId,
      keterangan: formKeterangan,
      diskon: formDiskon,
      items: finalItems.map((it) => ({
        barangId: it.barangId,
        qty: it.qty,
        hargaSatuan: it.hargaSatuan,
      })),
    };

    createTxMutation.mutate(payload);
  };

  const handleOpenEdit = (tx: any) => {
    setEditModalTx(tx);
    setEditKeterangan(tx.keterangan || '');
    setEditTanggal(tx.tanggal ? tx.tanggal.slice(0, 10) : '');
    setEditClientId(tx.clientId ? String(tx.clientId) : '');
    setEditDiskon(Number(tx.diskon || 0));
    setEditError(null);
    setEditSelectedBarangId('');
    setEditFormQty(1);
    setEditFormHarga(0);
    setEditFormHargaDisplay('0');

    if (tx.details && Array.isArray(tx.details)) {
      setEditCartItems(
        tx.details.map((d: any) => ({
          id: String(d.id),
          detailId: Number(d.id),
          barangId: Number(d.barangId),
          barangName: d.barang?.name || `Produk #${d.barangId}`,
          satuan: d.barang?.satuan?.name || 'Kg',
          qty: Number(d.qty || 0),
          hargaSatuan: Number(d.hargaSatuan || 0),
          subtotal: Number(d.subtotal || 0),
        })),
      );
    } else {
      setEditCartItems([]);
    }
  };

  const handleEditItemQtyChange = (idx: number, newQty: number) => {
    setEditCartItems((prev) => {
      const copy = [...prev];
      const validQty = Math.max(0, newQty);
      copy[idx] = {
        ...copy[idx],
        qty: validQty,
        subtotal: validQty * copy[idx].hargaSatuan,
      };
      return copy;
    });
  };

  const handleEditItemHargaChange = (idx: number, newHarga: number) => {
    setEditCartItems((prev) => {
      const copy = [...prev];
      const validHarga = Math.max(0, newHarga);
      copy[idx] = {
        ...copy[idx],
        hargaSatuan: validHarga,
        subtotal: copy[idx].qty * validHarga,
      };
      return copy;
    });
  };

  const handleEditRemoveItem = (idx: number) => {
    setEditCartItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEditBarangSelect = (bId: string) => {
    setEditSelectedBarangId(bId);
    if (!bId) {
      setEditFormHarga(0);
      setEditFormHargaDisplay('0');
      return;
    }
    const matchedStock = stockItems?.find((s: any) => Number(s.id || s.barangId) === Number(bId));
    if (matchedStock) {
      const suggestedPrice = Math.round(Number(matchedStock.hargaRataRata || 0));
      if (suggestedPrice > 0) {
        setEditFormHarga(suggestedPrice);
        setEditFormHargaDisplay(suggestedPrice.toLocaleString('id-ID'));
      }
    }
  };

  const handleEditAddCartItem = () => {
    if (!editSelectedBarangId || editFormQty <= 0) return;
    const bId = Number(editSelectedBarangId);
    const bObj = allBarangs?.find((b: any) => Number(b.id) === bId);
    const newItem = {
      id: `new-${Date.now()}`,
      barangId: bId,
      barangName: bObj?.name || 'Produk',
      satuan: bObj?.satuan?.name || 'Kg',
      qty: editFormQty,
      hargaSatuan: editFormHarga,
      subtotal: editFormQty * editFormHarga,
    };
    setEditCartItems((prev) => [...prev, newItem]);
    setEditSelectedBarangId('');
    setEditFormQty(1);
    setEditFormHarga(0);
    setEditFormHargaDisplay('0');
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalTx) return;
    if (editCartItems.length === 0) {
      setEditError('Transaksi harus memiliki minimal satu item barang.');
      return;
    }
    setEditError(null);
    updateTxMutation.mutate({
      id: Number(editModalTx.id),
      data: {
        keterangan: editKeterangan,
        tanggal: editTanggal,
        clientId: editClientId ? Number(editClientId) : null,
        diskon: editDiskon,
        items: editCartItems.map((it) => ({
          detailId: it.detailId,
          barangId: it.barangId,
          qty: it.qty,
          hargaSatuan: it.hargaSatuan,
        })),
      },
    });
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatTanggal = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const monitoringTabTitle = useMemo(() => {
    if (commodityKey === 'telur' || isEgg) return 'Monitoring Telur';
    if (commodityKey === 'pakan') return 'Monitoring Pakan';
    if (commodityKey === 'obat') return 'Monitoring Obat';
    if (commodityKey === 'tray') return 'Monitoring Tray';
    return 'Monitoring Stok';
  }, [commodityKey, isEgg]);

  // Grouping transaction details by Barang for Monitoring Table (Nama Barang, Jenis, Satuan, Jumlah, Total)
  const monitoringRows = useMemo(() => {
    if (!monitoringTxData) return [];
    const txList = Array.isArray(monitoringTxData) ? monitoringTxData : (monitoringTxData.items || monitoringTxData.data || []);
    
    const map = new Map<number, {
      barangId: number;
      namaBarang: string;
      jenis: string;
      satuan: string;
      jumlah: number;
      total: number;
      txDetails: Array<{
        id: number;
        invoice: string;
        tanggal: string;
        clientName: string;
        qty: number;
        hargaSatuan: number;
        subtotal: number;
      }>;
    }>();

    for (const tx of txList) {
      if (tx.status === 'BATAL') continue;
      if (filterClientId && String(tx.clientId) !== String(filterClientId)) continue;

      for (const d of tx.details || []) {
        const bId = Number(d.barangId);
        if (!bId) continue;

        if (jenisIds && jenisIds.length > 0) {
          const bJenisId = Number(d.barang?.jenisId || d.barang?.jenis?.id || 0);
          if (bJenisId && !jenisIds.includes(bJenisId)) continue;
        }

        const qty = Number(d.qty || 0);
        const subtotal = Number(d.subtotal ?? (qty * Number(d.hargaSatuan || 0)));

        const existing = map.get(bId) || {
          barangId: bId,
          namaBarang: d.barang?.name || `Barang #${bId}`,
          jenis: d.barang?.jenis?.name || '-',
          satuan: d.barang?.satuan?.name || 'Kg',
          jumlah: 0,
          total: 0,
          txDetails: [],
        };

        existing.jumlah += qty;
        existing.total += subtotal;
        existing.txDetails.push({
          id: Number(d.id),
          invoice: tx.invoice,
          tanggal: tx.tanggal,
          clientName: tx.client?.name || 'Umum',
          qty,
          hargaSatuan: Number(d.hargaSatuan || 0),
          subtotal,
        });

        map.set(bId, existing);
      }
    }

    let rows = Array.from(map.values());

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.namaBarang.toLowerCase().includes(q) ||
          r.jenis.toLowerCase().includes(q) ||
          r.satuan.toLowerCase().includes(q) ||
          r.txDetails.some(
            (d) =>
              d.invoice.toLowerCase().includes(q) ||
              d.clientName.toLowerCase().includes(q),
          ),
      );
    }

    rows.sort((a, b) => b.total - a.total);
    return rows;
  }, [monitoringTxData, jenisIds, search, filterClientId]);

  const monitoringSummary = useMemo(() => {
    const totalJumlah = monitoringRows.reduce((acc, r) => acc + r.jumlah, 0);
    const totalNominal = monitoringRows.reduce((acc, r) => acc + r.total, 0);
    const totalItemCount = monitoringRows.length;
    return { totalJumlah, totalNominal, totalItemCount };
  }, [monitoringRows]);

  const txList = useMemo(() => {
    if (!txData) return [];
    if (Array.isArray(txData)) return txData;
    if (Array.isArray(txData.data)) return txData.data;
    if (Array.isArray(txData.items)) return txData.items;
    return [];
  }, [txData]);

  const filteredStock = useMemo(() => {
    if (!stockItems) return [];
    if (!search) return stockItems;
    return stockItems.filter((it: any) =>
      (it.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (it.code || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [stockItems, search]);

  const totalCart = cartItems.reduce((acc, curr) => acc + curr.subtotal, 0) - formDiskon;

  const handleExportExcel = () => {
    if (activeTab === 'STOK') {
      if (!monitoringRows || monitoringRows.length === 0) {
        alert('Tidak ada data monitoring stok untuk diekspor');
        return;
      }
      exportToExcel({
        filename: `Monitoring_Stok_${title.replace(/\s+/g, '_')}_${monitoringType}_${monitoringDate}`,
        sheetName: 'Monitoring Stok',
        title: `MONITORING ${title.toUpperCase()} - ${monitoringType} (${monitoringDate})`,
        columns: [
          { header: 'No', key: '_index', width: 6 },
          { header: 'Nama Barang', key: 'namaBarang', width: 30 },
          { header: 'Kategori', key: 'jenis', width: 18 },
          { header: 'Satuan', key: 'satuan', width: 12 },
          { header: 'Volume / Qty', key: 'jumlah', width: 16 },
          { header: 'Total Nilai (Rp)', key: 'total', width: 20 },
        ],
        data: monitoringRows,
      });
    } else {
      if (!txList || txList.length === 0) {
        alert('Tidak ada data transaksi untuk diekspor');
        return;
      }
      const rows = txList.map((tx: any) => {
        const itemNames = (tx.details || []).map((d: any) => `${d.barang?.name || 'Item'} (${d.qty} ${d.barang?.satuan?.name || 'unit'})`).join('; ');
        const totalQty = (tx.details || []).reduce((acc: number, d: any) => acc + Number(d.qty || 0), 0);
        return {
          invoice: tx.invoice,
          tanggal: formatDateIndo(tx.tanggal),
          client: tx.client?.name || 'Pelanggan Umum',
          paymentMethod: tx.paymentMethod || '-',
          items: itemNames,
          totalQty,
          total: Number(tx.total || 0),
          status: tx.status || 'SELESAI',
        };
      });

      exportToExcel({
        filename: `Transaksi_${title.replace(/\s+/g, '_')}_${activeTab}_${startDate || 'Semua'}_sd_${endDate || 'Kini'}`,
        sheetName: 'Transaksi',
        title: `DAFTAR TRANSAKSI ${title.toUpperCase()} - ${activeTab} (${startDate || 'Awal'} s/d ${endDate || 'Kini'})`,
        columns: [
          { header: 'No', key: '_index', width: 6 },
          { header: 'Invoice', key: 'invoice', width: 20 },
          { header: 'Tanggal', key: 'tanggal', width: 14 },
          { header: 'Mitra / Klien', key: 'client', width: 26 },
          { header: 'Metode Pembayaran', key: 'paymentMethod', width: 18 },
          { header: 'Rincian Barang', key: 'items', width: 35 },
          { header: 'Total Qty', key: 'totalQty', width: 14 },
          { header: 'Total (Rp)', key: 'total', width: 18 },
          { header: 'Status', key: 'status', width: 14 },
        ],
        data: rows,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2">
            <HeaderIcon className={`w-7 h-7 text-${accentColor}-600`} />
            <span>{title}</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButtonGroup onExportExcel={handleExportExcel} />
          {activeTab === 'RETUR_PENJUALAN' ? (
            <button
              onClick={() => handleOpenAddModal('RETUR_PENJUALAN')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>+ Catat Retur Penjualan</span>
            </button>
          ) : activeTab === 'RETUR_PEMBELIAN' ? (
            <button
              onClick={() => handleOpenAddModal('RETUR_PEMBELIAN')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>+ Catat Retur Pembelian</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => handleOpenAddModal('PEMBELIAN')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Catat Pembelian</span>
              </button>
              <button
                onClick={() => handleOpenAddModal('PENJUALAN')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Catat Penjualan</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto text-xs font-semibold text-slate-500">
        <button
          onClick={() => setActiveTab('PENJUALAN')}
          className={`px-4 py-3 border-b-2 flex items-center space-x-2 whitespace-nowrap transition-all ${
            activeTab === 'PENJUALAN'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Penjualan</span>
        </button>

        <button
          onClick={() => setActiveTab('PEMBELIAN')}
          className={`px-4 py-3 border-b-2 flex items-center space-x-2 whitespace-nowrap transition-all ${
            activeTab === 'PEMBELIAN'
              ? 'border-emerald-600 text-emerald-600 font-bold'
              : 'border-transparent hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Pembelian</span>
        </button>

        <button
          onClick={() => setActiveTab('RETUR_PENJUALAN')}
          className={`px-4 py-3 border-b-2 flex items-center space-x-2 whitespace-nowrap transition-all ${
            activeTab === 'RETUR_PENJUALAN'
              ? 'border-rose-600 text-rose-600 font-bold'
              : 'border-transparent hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Retur Penjualan</span>
        </button>

        <button
          onClick={() => setActiveTab('RETUR_PEMBELIAN')}
          className={`px-4 py-3 border-b-2 flex items-center space-x-2 whitespace-nowrap transition-all ${
            activeTab === 'RETUR_PEMBELIAN'
              ? 'border-amber-600 text-amber-600 font-bold'
              : 'border-transparent hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Retur Pembelian</span>
        </button>

        <button
          onClick={() => setActiveTab('STOK')}
          className={`px-4 py-3 border-b-2 flex items-center space-x-2 whitespace-nowrap transition-all ${
            activeTab === 'STOK'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>{monitoringTabTitle}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          {/* Search Box: Invoice & Barang */}
          <div className="relative w-full sm:w-64 lg:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Cari no. faktur / invoice, nama barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 min-h-[42px] border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-3 p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                title="Hapus kata kunci pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Mitra / Klien (Searchable Select) */}
          <div className="w-full sm:w-64 lg:w-72 shrink-0">
            <SearchableClientSelect
              clients={filterClientsList}
              value={filterClientId}
              onChange={(id) => setFilterClientId(id)}
              balanceType={isBeli ? 'hutang' : 'piutang'}
              label=""
              placeholder="Semua Mitra / Klien..."
            />
          </div>

          {/* Reset button if search or client filter is active */}
          {(search || filterClientId) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilterClientId('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold rounded-xl transition-colors border border-rose-200/60 self-start sm:self-auto shrink-0 shadow-sm"
              title="Reset pencarian dan filter mitra"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        {activeTab !== 'STOK' ? (
          <div className="flex items-center space-x-2 text-xs shrink-0 self-start xl:self-auto">
            <Calendar className="w-4 h-4 text-slate-400 ml-1" />
            <span className="text-slate-500 font-semibold">Tgl:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-rose-500 font-bold hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        ) : (
          /* Filter Bar Khusus Monitoring Tab (Pembelian / Penjualan & Per Tanggal Default Hari Ini) */
          <div className="flex flex-wrap items-center gap-2 text-xs shrink-0 self-start xl:self-auto">
            {/* Filter Pembelian dan Penjualan */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setMonitoringType('PEMBELIAN')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  monitoringType === 'PEMBELIAN'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Pembelian</span>
              </button>
              <button
                type="button"
                onClick={() => setMonitoringType('PENJUALAN')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  monitoringType === 'PENJUALAN'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Penjualan</span>
              </button>
            </div>

            {/* Filter Per Tanggal (Default Hari Ini) */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400 ml-1" />
              <input
                type="date"
                value={monitoringDate}
                onChange={(e) => setMonitoringDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold"
              />
              <button
                type="button"
                onClick={() => setMonitoringDate(getTodayString())}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  monitoringDate === getTodayString()
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                    : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setMonitoringDate(getYesterdayString())}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  monitoringDate === getYesterdayString()
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                    : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                Kemarin
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content: Transaksi Table (Penjualan / Pembelian / Retur) */}
      {activeTab !== 'STOK' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Invoice & Tanggal</th>
                  <th className="p-4">Mitra / Pelanggan</th>
                  <th className="p-4">Metode Bayar</th>
                  <th className="p-4">Item & Volume</th>
                  <th className="p-4 text-right">Total Transaksi</th>
                  <th className="p-4 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingTx ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400">
                      Memuat daftar transaksi komoditas...
                    </td>
                  </tr>
                ) : txList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400">
                      Tidak ada transaksi tercatat pada kategori ini.
                    </td>
                  </tr>
                ) : (
                  txList.map((tx: any, idx: number) => {
                    const firstItem = tx.details?.[0];
                    const itemCount = tx.details?.length || 0;
                    return (
                      <tr key={tx.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 text-center font-mono text-slate-400 text-xs">{idx + 1}</td>
                        <td className="p-4">
                          <p className="font-bold text-slate-900 font-mono text-xs">{tx.invoice}</p>
                          <span className="text-[11px] text-slate-400">
                            {tx.tanggal ? tx.tanggal.slice(0, 10) : '-'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800 text-xs">
                            {tx.client?.name || 'Pelanggan Umum'}
                          </div>
                          <span className="text-[10px] text-slate-400 uppercase">
                            {tx.client?.type || 'Reguler'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.paymentMethod === 'TUNAI'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.paymentMethod === 'TRANSFER'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {tx.paymentMethod === 'KREDIT_BON' ? 'HUTANG/BON' : tx.paymentMethod}
                          </span>
                        </td>
                        <td className="p-4 text-xs">
                          <div className="font-medium text-slate-800">
                            {firstItem?.barang?.name || 'Produk Komoditas'}
                          </div>
                          <span className="text-slate-500 font-mono">
                            {formatNumber(firstItem?.qty || 0)} {firstItem?.barang?.satuan?.name || 'Kg'}
                            {itemCount > 1 && (
                              <span className="ml-1 text-blue-600 font-bold">
                                (+{itemCount - 1} item lain)
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-slate-900 text-xs">
                          {formatRupiah(tx.total)}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => setDetailModalTx(tx)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded"
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(tx)}
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                              title="Edit Keterangan"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModalTx(tx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Hapus Transaksi"
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
        </div>
      )}

      {/* Content: MONITORING TAB (Telur / Pakan / Obat / Tray) */}
      {activeTab === 'STOK' && (
        <div className="space-y-4">
          {/* Header Sub-View Switch (Rekap Transaksi vs Sisa Stok Fisik Gudang) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setMonitoringSubView('REKAP')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  monitoringSubView === 'REKAP'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📊 Rekap {monitoringType === 'PEMBELIAN' ? 'Pembelian' : 'Penjualan'} ({formatTanggal(monitoringDate)})
              </button>
              <button
                type="button"
                onClick={() => setMonitoringSubView('GUDANG')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  monitoringSubView === 'GUDANG'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📦 Sisa Stok Fisik Gudang
              </button>
            </div>

            {monitoringSubView === 'REKAP' && (
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>Filter: <strong>{monitoringType}</strong></span>
                <span>•</span>
                <span>Tanggal: <strong>{formatTanggal(monitoringDate)}</strong></span>
              </div>
            )}
          </div>

          {monitoringSubView === 'REKAP' ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Ragam Barang {monitoringType === 'PEMBELIAN' ? 'Dibeli' : 'Dijual'}
                    </p>
                    <p className="text-2xl font-black text-slate-800 mt-1">
                      {monitoringSummary.totalItemCount} <span className="text-xs font-normal text-slate-400">produk</span>
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                    <Boxes className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Total Jumlah ({monitoringType === 'PEMBELIAN' ? 'Volume Masuk' : 'Volume Keluar'})
                    </p>
                    <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
                      {formatNumber(monitoringSummary.totalJumlah)}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                    monitoringType === 'PEMBELIAN' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {monitoringType === 'PEMBELIAN' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Total Nilai Rupiah
                    </p>
                    <p className={`text-2xl font-black mt-1 font-mono ${
                      monitoringType === 'PEMBELIAN' ? 'text-emerald-700' : 'text-blue-700'
                    }`}>
                      {formatRupiah(monitoringSummary.totalNominal)}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold">
                    Rp
                  </div>
                </div>
              </div>

              {/* Tabel Monitoring sesuai permintaan: Nama Barang, Jenis, Satuan, Jumlah, Total */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                      <tr>
                        <th className="p-4 w-12 text-center">No</th>
                        <th className="p-4">Nama Barang</th>
                        <th className="p-4">Jenis</th>
                        <th className="p-4">Satuan</th>
                        <th className="p-4 text-right">Jumlah</th>
                        <th className="p-4 text-right">Total</th>
                        <th className="p-4 w-28 text-center">Rincian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingMonitoring ? (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-slate-400">
                            <div className="flex items-center justify-center space-x-2">
                              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                              <span>Memuat data {monitoringTabTitle.toLowerCase()}...</span>
                            </div>
                          </td>
                        </tr>
                      ) : monitoringRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-slate-400">
                            <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                            <p className="font-bold text-slate-700 text-sm">
                              Tidak ada transaksi {monitoringType === 'PEMBELIAN' ? 'Pembelian' : 'Penjualan'} pada tanggal {formatTanggal(monitoringDate)}.
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Gunakan filter tanggal atau ubah tipe transaksi di atas untuk melihat data lainnya.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        monitoringRows.map((r, idx) => {
                          const isExpanded = expandedBarangId === r.barangId;
                          return (
                            <React.Fragment key={r.barangId || idx}>
                              <tr className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-4 text-center font-mono text-slate-400 text-xs">{idx + 1}</td>
                                <td className="p-4">
                                  <div className="font-bold text-slate-900">{r.namaBarang}</div>
                                </td>
                                <td className="p-4">
                                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                                    {r.jenis}
                                  </span>
                                </td>
                                <td className="p-4 text-xs font-medium text-slate-500">
                                  {r.satuan}
                                </td>
                                <td className="p-4 text-right font-mono font-bold text-slate-900 text-sm">
                                  {formatNumber(r.jumlah)}
                                </td>
                                <td className={`p-4 text-right font-mono font-bold text-sm ${
                                  monitoringType === 'PEMBELIAN' ? 'text-emerald-700' : 'text-blue-700'
                                }`}>
                                  {formatRupiah(r.total)}
                                </td>
                                <td className="p-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedBarangId(isExpanded ? null : r.barangId)}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 inline-flex items-center gap-1 shadow-sm transition-all"
                                  >
                                    <span>{r.txDetails.length} Nota</span>
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                </td>
                              </tr>

                              {/* Dropdown rincian faktur per barang */}
                              {isExpanded && (
                                <tr className="bg-slate-50/80">
                                  <td colSpan={7} className="p-3 pl-12 pr-6">
                                    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-inner">
                                      <p className="text-[11px] font-bold text-slate-500 uppercase mb-2">
                                        Rincian Nota Transaksi — {r.namaBarang} ({formatTanggal(monitoringDate)})
                                      </p>
                                      <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
                                          <tr>
                                            <th className="p-2">No. Faktur</th>
                                            <th className="p-2">Mitra / Klien</th>
                                            <th className="p-2 text-right">Kuantitas</th>
                                            <th className="p-2 text-right">Harga Satuan</th>
                                            <th className="p-2 text-right">Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-mono">
                                          {r.txDetails.map((td, tdIdx) => (
                                            <tr key={td.id || tdIdx}>
                                              <td className="p-2 font-bold font-sans text-slate-800">{td.invoice}</td>
                                              <td className="p-2 font-sans text-slate-600">{td.clientName}</td>
                                              <td className="p-2 text-right text-slate-900">{formatNumber(td.qty)} {r.satuan}</td>
                                              <td className="p-2 text-right text-slate-600">{formatRupiah(td.hargaSatuan)}</td>
                                              <td className={`p-2 text-right font-bold ${
                                                monitoringType === 'PEMBELIAN' ? 'text-emerald-700' : 'text-blue-700'
                                              }`}>
                                                {formatRupiah(td.subtotal)}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                    {monitoringRows.length > 0 && (
                      <tfoot className="bg-slate-100/90 font-bold text-xs border-t-2 border-slate-200">
                        <tr>
                          <td colSpan={4} className="p-4 text-right uppercase text-slate-700 tracking-wider">
                            TOTAL KESELURUHAN ({monitoringRows.length} BARANG):
                          </td>
                          <td className="p-4 text-right font-mono font-black text-slate-900 text-base">
                            {formatNumber(monitoringSummary.totalJumlah)}
                          </td>
                          <td className={`p-4 text-right font-mono font-black text-base ${
                            monitoringType === 'PEMBELIAN' ? 'text-emerald-800' : 'text-blue-800'
                          }`}>
                            {formatRupiah(monitoringSummary.totalNominal)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          ) : (
            /* Sub-View: Sisa Stok Fisik Gudang */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-extrabold text-sm text-slate-800">
                  Status Sisa Persediaan Fisik Gudang
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Posisi saldo stok fisik dan valuasi persediaan saat ini
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                    <tr>
                      <th className="p-4 w-12 text-center">No</th>
                      <th className="p-4">Kode & Nama Barang</th>
                      <th className="p-4">Jenis Komoditas</th>
                      <th className="p-4">Satuan</th>
                      <th className="p-4 text-right">Sisa Stok Fisik</th>
                      <th className="p-4 text-right">Harga Pokok Rata-rata</th>
                      <th className="p-4 text-right">Total Valuasi Persediaan</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingStock ? (
                      <tr>
                        <td colSpan={8} className="p-10 text-center text-slate-400">
                          Memuat status persediaan komoditas...
                        </td>
                      </tr>
                    ) : filteredStock.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-10 text-center text-slate-400">
                          Tidak ada barang yang terdaftar pada komoditas ini.
                        </td>
                      </tr>
                    ) : (
                      filteredStock.map((item: any, idx: number) => {
                        const isLow = Number(item.totalStok) <= Number(item.stokMinimum || 5);
                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-50/80">
                            <td className="p-4 text-center font-mono text-slate-400 text-xs">{idx + 1}</td>
                            <td className="p-4">
                              <div className="font-bold text-slate-800">{item.name || item.barang}</div>
                              <div className="text-[11px] font-mono text-slate-400">{item.code || `ID-${item.id}`}</div>
                            </td>
                            <td className="p-4 text-xs text-slate-600">{item.jenis || '-'}</td>
                            <td className="p-4 text-xs font-medium text-slate-500">{item.satuan || 'Kg'}</td>
                            <td className="p-4 text-right font-mono font-bold text-slate-900">
                              {formatNumber(item.totalStok)}
                            </td>
                            <td className="p-4 text-right font-mono text-slate-500 text-xs">
                              {formatRupiah(item.hargaRataRata)}
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-emerald-700">
                              {formatRupiah(item.nilaiStok)}
                            </td>
                            <td className="p-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {isLow ? 'Stok Rendah' : 'Tersedia'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL TAMBAH TRANSAKSI ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>
                  Catat Transaksi {formType.replace('_', ' ')} ({title})
                </span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Alert message if error */}
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Baris Pertama: Jenis Transaksi (READONLY) & Tanggal Transaksi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Jenis Transaksi (Read-Only)
                  </label>
                  <div
                    className={`w-full border rounded-xl p-2.5 text-xs font-extrabold flex items-center gap-2 ${
                      formType === 'PEMBELIAN'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : formType === 'PENJUALAN'
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-rose-50 border-rose-300 text-rose-800'
                    }`}
                  >
                    {formType === 'PEMBELIAN' && <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {formType === 'PENJUALAN' && <ArrowUpRight className="w-4 h-4 text-blue-600 shrink-0" />}
                    {formType.startsWith('RETUR') && <RotateCcw className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>
                      {formType === 'PEMBELIAN'
                        ? isEgg || commodityKey === 'telur'
                          ? 'PEMBELIAN TELUR (TELUR MASUK)'
                          : commodityKey === 'pakan'
                          ? 'PEMBELIAN PAKAN (PAKAN MASUK)'
                          : commodityKey === 'obat'
                          ? 'PEMBELIAN OBAT (OBAT MASUK)'
                          : commodityKey === 'tray'
                          ? 'PEMBELIAN TRAY (TRAY MASUK)'
                          : 'PEMBELIAN (BARANG MASUK)'
                        : formType === 'PENJUALAN'
                        ? isEgg || commodityKey === 'telur'
                          ? 'PENJUALAN TELUR (TELUR KELUAR)'
                          : commodityKey === 'pakan'
                          ? 'PENJUALAN PAKAN (PAKAN KELUAR)'
                          : commodityKey === 'obat'
                          ? 'PENJUALAN OBAT (OBAT KELUAR)'
                          : commodityKey === 'tray'
                          ? 'PENJUALAN TRAY (TRAY KELUAR)'
                          : 'PENJUALAN (BARANG KELUAR)'
                        : formType === 'RETUR_PEMBELIAN'
                        ? 'RETUR PEMBELIAN'
                        : 'RETUR PENJUALAN'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Tanggal Transaksi
                  </label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold bg-white"
                    required
                  />
                </div>
              </div>

              {/* 2. KONTEN FORM: DIBAGI BERDASARKAN FLOW RETUR ATAU FLOW TRANSAKSI BIASA */}
              {formType === 'RETUR_PENJUALAN' || formType === 'RETUR_PEMBELIAN' ? (
                <>
                  {/* LANGKAH 1: PILIH TRANSAKSI ASAL YANG DIRETUR */}
                  <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2.5">
                    <div className="flex items-center space-x-2">
                      <RotateCcw className="w-4 h-4 text-amber-700" />
                      <p className="text-xs font-extrabold text-amber-800 uppercase">
                        Langkah 1: Pilih Faktur Transaksi Asal yang Diretur *
                      </p>
                    </div>

                    <select
                      value={selectedOriginalTxId}
                      onChange={(e) => handleOriginalTxSelect(e.target.value)}
                      className="w-full border border-amber-300 rounded-xl p-2.5 text-xs font-semibold bg-white focus:ring-2 focus:ring-amber-500"
                      required
                    >
                      <option value="">-- Pilih Faktur Transaksi Selesai --</option>
                      {originalTransactions?.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.invoice} ({t.tanggal?.slice(0, 10)}) - {t.client?.name || 'Umum'} [Total: {formatRupiah(t.total)}]
                        </option>
                      ))}
                    </select>

                    {selectedOriginalTx && (
                      <div className="p-2.5 bg-white/90 rounded-lg border border-amber-200 text-xs text-amber-900 grid grid-cols-1 sm:grid-cols-3 gap-2 font-medium">
                        <div><span className="text-slate-500">No. Faktur:</span> <strong className="font-mono">{selectedOriginalTx.invoice}</strong></div>
                        <div><span className="text-slate-500">Klien / Mitra:</span> <strong>{selectedOriginalTx.client?.name || 'Umum'}</strong></div>
                        <div><span className="text-slate-500">Total Asli:</span> <strong className="text-emerald-700">{formatRupiah(selectedOriginalTx.total)}</strong></div>
                      </div>
                    )}
                  </div>

                  {/* IDENTITAS KLIEN & METODE PENGEMBALIAN (TERKUNCI DARI TRANSAKSI ASAL) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <SearchableClientSelect
                        clients={availableClients}
                        value={formClientId}
                        onChange={(id) => handleClientSelect(id)}
                        balanceType={formType === 'RETUR_PEMBELIAN' ? 'hutang' : 'piutang'}
                        label="Klien / Mitra (Terkunci dari Faktur Asal)"
                        placeholder={selectedOriginalTx ? 'Klien terpilih otomatis...' : 'Pilih faktur transaksi asal di atas...'}
                        disabled={true}
                        required
                      />
                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Klien disinkronkan otomatis dari faktur transaksi asal.</span>
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Akun Pengembalian ({formType === 'RETUR_PEMBELIAN' ? 'Hutang / Kas / Bank' : 'Piutang / Kas / Bank'})
                      </label>
                      <select
                        value={formPaymentAccountId}
                        disabled={true}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold bg-slate-100 text-slate-600 cursor-not-allowed opacity-90"
                      >
                        {currentPaymentAccountList.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            [{acc.code}] {acc.name}
                          </option>
                        ))}
                      </select>

                      <div className="mt-1 text-[11px]">
                        {formType === 'RETUR_PEMBELIAN' && (
                          [72, 77, 78, 79, 80, 81, 82, 83, 84, 85].includes(formPaymentAccountId) ? (
                            <span className="text-amber-700 font-semibold">
                              🏷️ <strong>Metode: HUTANG (Tempo)</strong> — Mengurangi saldo hutang ke supplier secara otomatis.
                            </span>
                          ) : [64, 71].includes(formPaymentAccountId) ? (
                            <span className="text-emerald-700 font-semibold">
                              💵 <strong>Metode: TUNAI</strong> — Pengembalian dana tunai dari supplier masuk ke kas.
                            </span>
                          ) : (
                            <span className="text-blue-700 font-semibold">
                              🏦 <strong>Metode: TRANSFER</strong> — Pengembalian dana ditransfer balik ke rekening bank.
                            </span>
                          )
                        )}
                        {formType === 'RETUR_PENJUALAN' && (
                          [46, 47, 48, 50, 51, 52, 53, 54, 55, 56, 57, 58].includes(formPaymentAccountId) ? (
                            <span className="text-amber-700 font-semibold">
                              🏷️ <strong>Metode: PIUTANG (Tempo / Bon)</strong> — Mengurangi saldo piutang pelanggan secara otomatis.
                            </span>
                          ) : [64, 71].includes(formPaymentAccountId) ? (
                            <span className="text-emerald-700 font-semibold">
                              💵 <strong>Metode: TUNAI</strong> — Mengembalikan uang kas tunai ke pelanggan.
                            </span>
                          ) : (
                            <span className="text-blue-700 font-semibold">
                              🏦 <strong>Metode: TRANSFER</strong> — Transfer balik pengembalian dana ke rekening pelanggan.
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CATATAN RETUR (DEFAULT OTOMATIS) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Catatan / Keterangan Retur
                    </label>
                    <input
                      type="text"
                      value={formKeterangan}
                      onChange={(e) => setFormKeterangan(e.target.value)}
                      placeholder={
                        formType === 'RETUR_PEMBELIAN'
                          ? 'Retur pembelian dari pembelian [invoice]'
                          : 'Retur penjualan dari penjualan [invoice]'
                      }
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* LANGKAH 2: TENTUKAN JUMLAH BARANG YANG DIRETUR */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs font-extrabold text-slate-700 uppercase">
                      Langkah 2: Tentukan Jumlah Barang yang Diretur
                    </p>

                    {returItems.length > 0 ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 font-bold text-slate-600">
                            <tr>
                              <th className="p-2.5">Nama Barang</th>
                              <th className="p-2.5 text-right">Kuantitas Asli</th>
                              <th className="p-2.5 text-right">Harga Satuan</th>
                              <th className="p-2.5 text-right w-36">Kuantitas Retur</th>
                              <th className="p-2.5 text-right">Subtotal Retur</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {returItems.map((r, rIdx) => (
                              <tr key={r.barangId || rIdx} className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold font-sans text-slate-800">{r.barangName}</td>
                                <td className="p-2.5 text-right text-slate-600">
                                  {r.originalQty}
                                </td>
                                <td className="p-2.5 text-right text-slate-600">
                                  {formatRupiah(r.hargaSatuan)}
                                </td>
                                <td className="p-2.5 text-right">
                                  <input
                                    type="number"
                                    min="0"
                                    max={r.originalQty}
                                    step="any"
                                    value={r.returQty || ''}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      const updated = [...returItems];
                                      updated[rIdx].returQty = val;
                                      setReturItems(updated);
                                    }}
                                    placeholder="0"
                                    className="w-24 border border-slate-300 rounded-lg p-1 text-right font-mono font-bold text-rose-700 bg-rose-50/50 focus:ring-2 focus:ring-rose-500"
                                  />
                                </td>
                                <td className="p-2.5 text-right font-bold text-rose-700">
                                  {formatRupiah((r.returQty || 0) * r.hargaSatuan)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 text-xs">
                        Silakan pilih faktur transaksi asal pada Langkah 1 di atas untuk memuat daftar barang yang dapat diretur.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* 2. Baris Kedua: Searchable Client Select & Metode Pembayaran Akun Kategori */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <SearchableClientSelect
                        clients={availableClients}
                        value={formClientId}
                        onChange={(id) => handleClientSelect(id)}
                        balanceType={formType === 'PEMBELIAN' ? 'hutang' : 'piutang'}
                        label={
                          formType === 'PEMBELIAN'
                            ? isEgg || commodityKey === 'telur'
                              ? 'Peternak (Hanya Tipe Peternak)'
                              : commodityKey === 'pakan'
                              ? 'Supplier Pakan (Supplier Sentrat)'
                              : commodityKey === 'obat'
                              ? 'Supplier Obat (Supplier Obat-Obatan)'
                              : commodityKey === 'tray'
                              ? 'Supplier Tray (Supplier Egg Tray)'
                              : 'Supplier'
                            : isEgg || commodityKey === 'telur'
                            ? 'Pedagang / Pembeli (Hanya Tipe Pedagang)'
                            : 'Pelanggan / Mitra (Peternak, Karyawan, Truk)'
                        }
                        placeholder={
                          formType === 'PEMBELIAN'
                            ? isEgg || commodityKey === 'telur'
                              ? '🔍 Cari nama peternak...'
                              : commodityKey === 'pakan'
                              ? '🔍 Cari supplier sentrat...'
                              : commodityKey === 'obat'
                              ? '🔍 Cari supplier obat...'
                              : commodityKey === 'tray'
                              ? '🔍 Cari supplier tray...'
                              : '🔍 Cari supplier...'
                            : isEgg || commodityKey === 'telur'
                            ? '🔍 Cari pedagang / pembeli telur...'
                            : '🔍 Cari peternak, karyawan, truk...'
                        }
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Metode Pembayaran (Akun Kas / Bank / {formType === 'PEMBELIAN' ? 'Hutang' : 'Piutang'})
                      </label>
                      <select
                        value={formPaymentAccountId}
                        onChange={(e) => {
                          const selectedId = Number(e.target.value);
                          setFormPaymentAccountId(selectedId);
                          const acc = currentPaymentAccountList.find((a) => a.id === selectedId);
                          if (acc) {
                            setFormPaymentMethod(acc.method);
                          }
                        }}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold bg-white"
                      >
                        {currentPaymentAccountList.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            [{acc.code}] {acc.name}
                          </option>
                        ))}
                      </select>

                      <div className="mt-1 text-[11px]">
                        {formType === 'PEMBELIAN' && (
                          [72, 77, 78, 79, 80, 81, 82, 83, 84, 85].includes(formPaymentAccountId) ? (
                            <span className="text-amber-700 font-semibold">
                              🏷️ <strong>Metode: HUTANG (Tempo)</strong> — Menambah saldo hutang ke {isEgg || commodityKey === 'telur' ? 'peternak' : 'supplier'} secara otomatis.
                            </span>
                          ) : [64, 71].includes(formPaymentAccountId) ? (
                            <span className="text-emerald-700 font-semibold">
                              💵 <strong>Metode: TUNAI</strong> — Pembayaran lunas via kas tunai fisik.
                            </span>
                          ) : (
                            <span className="text-blue-700 font-semibold">
                              🏦 <strong>Metode: TRANSFER</strong> — Pembayaran lunas via transfer rekening bank.
                            </span>
                          )
                        )}
                        {formType === 'PENJUALAN' && (
                          [46, 47, 48, 50, 51, 52, 53, 54, 55, 56, 57, 58].includes(formPaymentAccountId) ? (
                            <span className="text-amber-700 font-semibold">
                              🏷️ <strong>Metode: PIUTANG (Tempo / Bon)</strong> — Menambah saldo piutang mitra secara otomatis.
                            </span>
                          ) : [64, 71].includes(formPaymentAccountId) ? (
                            <span className="text-emerald-700 font-semibold">
                              💵 <strong>Metode: TUNAI</strong> — Penerimaan kas tunai.
                            </span>
                          ) : (
                            <span className="text-blue-700 font-semibold">
                              🏦 <strong>Metode: TRANSFER</strong> — Penerimaan via transfer bank.
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Baris Ketiga: Catatan Transaksi */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Catatan / Keterangan Transaksi
                    </label>
                    <input
                      type="text"
                      value={formKeterangan}
                      onChange={(e) => setFormKeterangan(e.target.value)}
                      placeholder="Contoh: No Truk AG 1234 XY, Sopir Budi, Nota Masuk Kandang..."
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* 4. FLOW TRANSAKSI MULTI-ITEM (PEMBELIAN & PENJUALAN) */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-extrabold text-slate-700 uppercase flex items-center gap-1.5">
                      <ShoppingCart className="w-4 h-4 text-emerald-600" />
                      <span>Input Item Transaksi (Bisa Lebih dari 1 Barang)</span>
                    </p>
                    <span className="text-[11px] text-slate-400">
                      {cartItems.length} item dimasukkan
                    </span>
                  </div>

                  <div>
                    <SearchableBarangSelect
                      barangs={allBarangs || []}
                      value={selectedBarangId}
                      onChange={(bId) => handleBarangSelect(bId)}
                      stockItems={stockItems}
                      label={
                        isEgg || commodityKey === 'telur'
                          ? 'Pilih Produk Telur'
                          : commodityKey === 'pakan'
                          ? 'Pilih Produk Pakan / Sentrat'
                          : commodityKey === 'obat'
                          ? 'Pilih Produk Obat-Obatan'
                          : commodityKey === 'tray'
                          ? 'Pilih Produk Egg Tray'
                          : 'Pilih Produk Komoditas'
                      }
                      placeholder={
                        isEgg || commodityKey === 'telur'
                          ? '🔍 Ketik nama produk telur (misal: Telur Ayam Ras)...'
                          : commodityKey === 'pakan'
                          ? '🔍 Ketik nama pakan/sentrat...'
                          : commodityKey === 'obat'
                          ? '🔍 Ketik nama obat/medis...'
                          : commodityKey === 'tray'
                          ? '🔍 Ketik nama egg tray...'
                          : '🔍 Ketik nama produk...'
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Volume / Kuantitas</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={formQty || ''}
                        onChange={(e) => setFormQty(Number(e.target.value))}
                        className="w-full border border-slate-200 rounded-xl p-2 text-xs font-mono font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Harga Satuan ({formatRupiah(formHarga)})
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                        <input
                          type="text"
                          value={formHargaDisplay}
                          onChange={(e) => handleHargaInputChange(e.target.value)}
                          placeholder="1.000"
                          className="w-full border border-slate-200 rounded-xl p-2 pl-9 text-xs font-mono font-bold bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                    >
                      + Tambah Item ke Daftar Transaksi
                    </button>
                  </div>

                  {/* Cart Table */}
                  {cartItems.length > 0 && (
                    <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 font-bold text-slate-600">
                          <tr>
                            <th className="p-2">Produk</th>
                            <th className="p-2 text-right">Qty</th>
                            <th className="p-2 text-right">Harga (Rp)</th>
                            <th className="p-2 text-right">Subtotal</th>
                            <th className="p-2 text-center w-10">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {cartItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="p-2 font-bold font-sans text-slate-800">{item.barangName}</td>
                              <td className="p-2 text-right">{item.qty} {item.satuan}</td>
                              <td className="p-2 text-right">{formatRupiah(item.hargaSatuan)}</td>
                              <td className="p-2 text-right font-bold text-emerald-700">
                                {formatRupiah(item.subtotal)}
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromCart(item.id)}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold text-xs">
                          <tr>
                            <td colSpan={3} className="p-2 text-right uppercase">
                              Total Kuantitas: {cartItems.reduce((s, it) => s + it.qty, 0)}
                            </td>
                            <td className="p-2 text-right text-emerald-700">
                              {formatRupiah(cartItems.reduce((s, it) => s + it.subtotal, 0))}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

              <div className="bg-slate-100 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Total Keseluruhan Transaksi
                  </span>
                  <p className="text-xl font-black font-mono text-emerald-700">
                    {formatRupiah(
                      formType.startsWith('RETUR')
                        ? returItems.reduce((acc, curr) => acc + (curr.returQty || 0) * curr.hargaSatuan, 0)
                        : totalCart > 0
                        ? totalCart
                        : formQty * formHarga - formDiskon
                    )}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={createTxMutation.isPending}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
                  >
                    {createTxMutation.isPending ? 'Menyimpan...' : formType.startsWith('RETUR') ? 'Simpan Retur' : 'Simpan Transaksi'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DETAIL TRANSAKSI ================= */}
      {detailModalTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-mono">
                  {detailModalTx.invoice}
                </h3>
                <p className="text-xs text-slate-400">
                  {detailModalTx.tanggal?.slice(0, 10)} • {detailModalTx.type}
                </p>
              </div>
              <button
                onClick={() => setDetailModalTx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
              <p>
                <strong>Mitra:</strong> {detailModalTx.client?.name || 'Pelanggan Umum'} (
                {detailModalTx.client?.type || 'Reguler'})
              </p>
              <p>
                <strong>Metode Pembayaran:</strong> {detailModalTx.paymentMethod}
              </p>
              <p>
                <strong>Keterangan:</strong> {detailModalTx.keterangan || '-'}
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold">
                  <tr>
                    <th className="p-2">Produk</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Harga</th>
                    <th className="p-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {detailModalTx.details?.map((d: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2 font-sans font-bold text-slate-800">{d.barang?.name || 'Produk'}</td>
                      <td className="p-2 text-right">{formatNumber(d.qty)} {d.barang?.satuan?.name || 'Kg'}</td>
                      <td className="p-2 text-right">{formatRupiah(d.hargaSatuan)}</td>
                      <td className="p-2 text-right font-bold text-emerald-700">{formatRupiah(d.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs font-bold text-slate-600">Total Transaksi:</span>
              <span className="text-base font-extrabold font-mono text-emerald-700">
                {formatRupiah(detailModalTx.total)}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailModalTx(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL EDIT TRANSAKSI LENGKAP ================= */}
      {editModalTx && (() => {
        const editSubtotal = editCartItems.reduce((acc, it) => acc + (it.qty * it.hargaSatuan), 0);
        const editTotal = Math.max(0, editSubtotal - editDiskon);
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">
                      Edit Transaksi: {editModalTx.invoice}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 font-mono">
                        Metode: {editModalTx.paymentMethod || 'KREDIT_BON'}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        {editModalTx.type}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditModalTx(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Form */}
              <form onSubmit={handleSubmitEdit} className="p-6 space-y-4 overflow-y-auto flex-1">
                {editError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                {/* Baris 1: Tanggal & Klien */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Tanggal Transaksi
                    </label>
                    <input
                      type="date"
                      value={editTanggal}
                      onChange={(e) => setEditTanggal(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold bg-white"
                      required
                    />
                  </div>

                  <div>
                    <SearchableClientSelect
                      clients={
                        editModalTx?.type === 'PEMBELIAN'
                          ? (clientsData || []).filter((c: any) => {
                              if (commodityKey === 'telur' || isEgg) return c.type?.toLowerCase().includes('peternak');
                              if (commodityKey === 'pakan') return c.type?.toLowerCase().includes('supplier') && c.name?.toLowerCase().includes('sentrat');
                              if (commodityKey === 'obat') return c.type?.toLowerCase().includes('supplier') && c.name?.toLowerCase().includes('obat');
                              if (commodityKey === 'tray') return c.type?.toLowerCase().includes('supplier') && c.name?.toLowerCase().includes('tray');
                              return true;
                            })
                          : (clientsData || []).filter((c: any) => {
                              if (commodityKey === 'telur' || isEgg) return c.type?.toLowerCase().includes('pedagang');
                              // Penjualan pakan, obat, tray: KECUALI pedagang dan KECUALI supplier
                              const t = c.type?.toLowerCase() || '';
                              return !t.includes('pedagang') && !t.includes('supplier');
                            })
                      }
                      value={editClientId}
                      onChange={(id) => setEditClientId(id)}
                      balanceType={editModalTx?.type === 'PEMBELIAN' ? 'hutang' : 'piutang'}
                      label={
                        editModalTx?.type === 'PEMBELIAN'
                          ? isEgg || commodityKey === 'telur'
                            ? 'Peternak'
                            : commodityKey === 'pakan'
                            ? 'Supplier Pakan (Sentrat)'
                            : commodityKey === 'obat'
                            ? 'Supplier Obat'
                            : commodityKey === 'tray'
                            ? 'Supplier Tray'
                            : 'Supplier'
                          : isEgg || commodityKey === 'telur'
                          ? 'Pedagang / Pembeli (Hanya Pedagang)'
                          : 'Pelanggan / Mitra (Peternak, Karyawan, Truk)'
                      }
                      placeholder="🔍 Cari nama mitra..."
                    />
                  </div>
                </div>

                {/* Baris 2: Catatan Transaksi */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Catatan / Keterangan Transaksi
                  </label>
                  <input
                    type="text"
                    value={editKeterangan}
                    onChange={(e) => setEditKeterangan(e.target.value)}
                    placeholder="Keterangan transaksi..."
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium bg-white"
                  />
                </div>

                {/* Baris 3: Daftar Barang yang Dibeli / Dijual */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-extrabold text-slate-700 uppercase flex items-center gap-1.5">
                      <ShoppingCart className="w-4 h-4 text-blue-600" />
                      <span>Daftar Barang Transaksi ({editCartItems.length} Produk)</span>
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Kuantitas & Harga dapat langsung diedit pada tabel
                    </span>
                  </div>

                  {/* Tambah Barang Tambahan */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3">
                    <p className="text-[11px] font-bold text-slate-600 uppercase">
                      + Tambah Produk Tambahan ke Transaksi
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-5">
                        <SearchableBarangSelect
                          barangs={allBarangs || []}
                          value={editSelectedBarangId}
                          onChange={(bId) => handleEditBarangSelect(bId)}
                          stockItems={stockItems}
                          label="Pilih Produk"
                          placeholder="🔍 Pilih produk..."
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Volume / Qty</label>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          value={editFormQty || ''}
                          onChange={(e) => setEditFormQty(Number(e.target.value))}
                          className="w-full border border-slate-200 rounded-xl p-2 text-xs font-mono font-bold bg-white"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Harga Satuan</label>
                        <input
                          type="text"
                          value={editFormHargaDisplay}
                          onChange={(e) => {
                            const rawVal = e.target.value.replace(/[^0-9]/g, '');
                            const num = Number(rawVal);
                            setEditFormHarga(num);
                            setEditFormHargaDisplay(num ? num.toLocaleString('id-ID') : '0');
                          }}
                          className="w-full border border-slate-200 rounded-xl p-2 text-xs font-mono font-bold bg-white"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <button
                          type="button"
                          onClick={handleEditAddCartItem}
                          disabled={!editSelectedBarangId || editFormQty <= 0}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tabel Barang yang Bisa Diedit */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 font-bold text-slate-600">
                        <tr>
                          <th className="p-2.5">Produk</th>
                          <th className="p-2.5 text-right w-36">Kuantitas</th>
                          <th className="p-2.5 text-right w-44">Harga Satuan (Rp)</th>
                          <th className="p-2.5 text-right w-36">Subtotal</th>
                          <th className="p-2.5 text-center w-12">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {editCartItems.map((it, idx) => (
                          <tr key={it.id || idx} className="hover:bg-slate-50/50">
                            <td className="p-2.5 font-bold text-slate-800">
                              <div>{it.barangName}</div>
                              <span className="text-[10px] text-slate-400 font-mono">Satuan: {it.satuan}</span>
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                step="any"
                                min="0.01"
                                value={it.qty}
                                onChange={(e) => handleEditItemQtyChange(idx, Number(e.target.value))}
                                className="w-28 border border-slate-300 rounded-lg p-1.5 text-right font-mono font-bold text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                                required
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={it.hargaSatuan}
                                onChange={(e) => handleEditItemHargaChange(idx, Number(e.target.value))}
                                className="w-36 border border-slate-300 rounded-lg p-1.5 text-right font-mono font-bold text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                                required
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-blue-700">
                              {formatRupiah(it.subtotal)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleEditRemoveItem(idx)}
                                disabled={editCartItems.length <= 1}
                                title={editCartItems.length <= 1 ? 'Minimal harus 1 barang' : 'Hapus barang ini'}
                                className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Subtotal, Diskon & Total Akhir */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100 gap-2">
                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Stok batch, saldo hutang/piutang mitra, dan jurnal umum akan otomatis disesuaikan dengan nilai terbaru.
                      </span>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-xs text-slate-500">
                        Subtotal: <strong className="font-mono text-slate-800">{formatRupiah(editSubtotal)}</strong>
                      </div>
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <span className="text-slate-500">Diskon (Rp):</span>
                        <input
                          type="number"
                          min="0"
                          value={editDiskon || ''}
                          onChange={(e) => setEditDiskon(Number(e.target.value))}
                          className="w-24 border border-slate-200 rounded-lg p-1 text-right font-mono text-xs"
                          placeholder="0"
                        />
                      </div>
                      <div className="text-sm font-extrabold text-blue-700">
                        Total Akhir: {formatRupiah(editTotal)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditModalTx(null)}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={updateTxMutation.isPending}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
                  >
                    {updateTxMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan & Menyesuaikan...</span>
                      </>
                    ) : (
                      <span>Simpan Perubahan Transaksi</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ================= MODAL DELETE CONFIRMATION ================= */}
      {deleteModalTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Transaksi</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus transaksi <strong className="font-mono text-slate-900">{deleteModalTx.invoice}</strong> senilai {formatRupiah(deleteModalTx.total)}? Seluruh mutasi stok dan jurnal terkait akan dibatalkan.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalTx(null)}
                className="px-4 py-2 bg-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => deleteTxMutation.mutate(Number(deleteModalTx.id))}
                disabled={deleteTxMutation.isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                {deleteTxMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CommodityTransactionPage;
