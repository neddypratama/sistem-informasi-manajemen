import { type User, isAdminOrManager, hasPermission } from '../stores/auth.store';

/**
 * Matriks Hak Akses Tab berdasarkan Role Pengguna
 * Role IDs:
 * 1: Admin
 * 2: Manager
 * 3: Pembelian Telur
 * 4: Pakan dan Obat-Obatan (Mbak Pakan)
 * 5: Kas Tunai
 * 6: Kas Transfer
 * 7: Akuntasi dan Rekap
 * 8: Super Admin
 */

export type TabKey =
  // Portal Khusus Pak Pri (Curah)
  | 'CURAH_TRANSAKSI'
  | 'CURAH_KAS_AUDIT'
  | 'CURAH_KONVERSI'
  | 'CURAH_SUB_TUNAI'
  | 'CURAH_SUB_TRANSFER'
  | 'CURAH_SUB_BELANJA'
  // Commodity Transaction Page Tabs
  | 'TX_MONITORING'
  | 'TX_PENJUALAN'
  | 'TX_PEMBELIAN'
  | 'TX_RETUR'
  | 'TX_STOK'
  // Laporan Kas Tabs
  | 'KAS_TAB_TUNAI'
  | 'KAS_TAB_BANK'
  | 'KAS_TAB_SUMMARY'
  // Jurnal & Accounting
  | 'JURNAL_UMUM'
  | 'LABA_RUGI'
  | 'NERACA_SALDO'
  | 'LAPORAN_ASET';

export const canAccessTab = (user: User | null, tab: TabKey): boolean => {
  if (!user) return false;
  if (isAdminOrManager(user)) return true;

  const roleId = Number(user.roleId);
  const roleName = (user.role || '').toLowerCase();

  switch (tab) {
    // ==========================================
    // 1. PORTAL CURAH PAK PRI
    // ==========================================
    case 'CURAH_TRANSAKSI':
      return (
        hasPermission(user, ['curah_operasional:read', 'curah_operasional:create']) ||
        roleId === 4 || roleId === 7 || roleName.includes('pakan') || roleName.includes('akuntasi')
      );

    case 'CURAH_KONVERSI':
      return (
        hasPermission(user, ['curah_konversi:read', 'curah_konversi:create']) ||
        roleId === 4 || roleId === 7 || roleName.includes('pakan') || roleName.includes('akuntasi')
      );

    case 'CURAH_KAS_AUDIT':
      return (
        hasPermission(user, ['curah_kas_tunai:read', 'curah_kas_bank:read', 'curah_modal:read']) ||
        roleId === 5 ||
        roleId === 6 ||
        roleId === 7 ||
        roleName.includes('tunai') ||
        roleName.includes('transfer') ||
        roleName.includes('akuntasi')
      );

    case 'CURAH_SUB_TUNAI':
      return (
        hasPermission(user, 'curah_kas_tunai:read') ||
        roleId === 5 || roleId === 7 || roleName.includes('tunai') || roleName.includes('akuntasi')
      );

    case 'CURAH_SUB_TRANSFER':
      return (
        hasPermission(user, 'curah_kas_bank:read') ||
        roleId === 6 || roleId === 7 || roleName.includes('transfer') || roleName.includes('akuntasi')
      );

    case 'CURAH_SUB_BELANJA':
      return (
        hasPermission(user, 'curah_modal:read') ||
        roleId === 4 ||
        roleId === 7 ||
        roleName.includes('pakan') ||
        roleName.includes('akuntasi')
      );

    // ==========================================
    // 2. TRANSAKSI KOMODITAS
    // ==========================================
    case 'TX_MONITORING':
      return true; // Monitoring operasional terbuka untuk semua staf

    case 'TX_PENJUALAN':
      // Kasir penjualan (Tunai, Transfer, Petugas Komoditas, Akuntansi)
      return true;

    case 'TX_PEMBELIAN':
      // Pembelian hanya staf gudang/komoditas terkait & akuntansi
      return (
        roleId === 3 ||
        roleId === 4 ||
        roleId === 7 ||
        roleName.includes('telur') ||
        roleName.includes('pakan') ||
        roleName.includes('akuntasi')
      );

    case 'TX_RETUR':
      return (
        roleId === 3 ||
        roleId === 4 ||
        roleId === 7 ||
        roleName.includes('telur') ||
        roleName.includes('pakan') ||
        roleName.includes('akuntasi')
      );

    case 'TX_STOK':
      return (
        roleId === 3 ||
        roleId === 4 ||
        roleId === 7 ||
        roleName.includes('telur') ||
        roleName.includes('pakan') ||
        roleName.includes('akuntasi')
      );

    // ==========================================
    // 3. LAPORAN KAS & BANK
    // ==========================================
    case 'KAS_TAB_TUNAI':
      return (
        hasPermission(user, 'kas_tunai:read') ||
        roleId === 5 || roleId === 7 || roleName.includes('tunai') || roleName.includes('akuntasi')
      );

    case 'KAS_TAB_BANK':
      return (
        hasPermission(user, 'kas_bank:read') ||
        roleId === 6 || roleId === 7 || roleName.includes('transfer') || roleName.includes('akuntasi')
      );

    case 'KAS_TAB_SUMMARY':
      return (
        hasPermission(user, 'kas_summary:read') ||
        roleId === 7 || roleName.includes('akuntasi')
      );

    // ==========================================
    // 4. JURNAL & LAPORAN KEUANGAN
    // ==========================================
    case 'JURNAL_UMUM':
      return (
        hasPermission(user, 'jurnal:read') ||
        roleId === 7 || roleName.includes('akuntasi')
      );

    case 'LABA_RUGI':
      return (
        hasPermission(user, 'laporan_labarugi:read') ||
        roleId === 7 || roleName.includes('akuntasi')
      );

    case 'NERACA_SALDO':
      return (
        hasPermission(user, 'laporan_neraca_saldo:read') ||
        roleId === 7 || roleName.includes('akuntasi')
      );

    case 'LAPORAN_ASET':
      return (
        hasPermission(user, 'laporan_aset:read') ||
        roleId === 7 || roleName.includes('akuntasi')
      );

    default:
      return false;
  }
};
