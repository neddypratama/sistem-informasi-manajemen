const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ALL_GRANULAR_PERMISSIONS = [
  // =========================================================================
  // 1. KOMODITAS TELUR
  // =========================================================================
  { name: 'telur_monitoring:read', group: 'Komoditas Telur', description: 'Melihat riwayat transaksi dan monitoring telur' },
  { name: 'telur_monitoring:export', group: 'Komoditas Telur', description: 'Export rekapitulasi data telur (Excel/PDF)' },
  { name: 'telur_penjualan:read', group: 'Komoditas Telur', description: 'Melihat data transaksi penjualan telur' },
  { name: 'telur_penjualan:create', group: 'Komoditas Telur', description: 'Membuat transaksi penjualan telur ke pedagang' },
  { name: 'telur_penjualan:update', group: 'Komoditas Telur', description: 'Mengedit transaksi penjualan telur' },
  { name: 'telur_penjualan:delete', group: 'Komoditas Telur', description: 'Menghapus transaksi penjualan telur' },
  { name: 'telur_pembelian:read', group: 'Komoditas Telur', description: 'Melihat data pembelian telur dari peternak' },
  { name: 'telur_pembelian:create', group: 'Komoditas Telur', description: 'Membuat transaksi pembelian telur dari peternak' },
  { name: 'telur_pembelian:update', group: 'Komoditas Telur', description: 'Mengedit transaksi pembelian telur' },
  { name: 'telur_pembelian:delete', group: 'Komoditas Telur', description: 'Menghapus transaksi pembelian telur' },
  { name: 'telur_retur_penjualan:read', group: 'Komoditas Telur', description: 'Melihat data retur penjualan telur' },
  { name: 'telur_retur_penjualan:create', group: 'Komoditas Telur', description: 'Membuat retur telur dari pedagang' },
  { name: 'telur_retur_penjualan:delete', group: 'Komoditas Telur', description: 'Membatalkan/hapus retur penjualan telur' },
  { name: 'telur_retur_pembelian:read', group: 'Komoditas Telur', description: 'Melihat data retur pembelian telur' },
  { name: 'telur_retur_pembelian:create', group: 'Komoditas Telur', description: 'Membuat retur telur ke peternak' },
  { name: 'telur_retur_pembelian:delete', group: 'Komoditas Telur', description: 'Membatalkan/hapus retur pembelian telur' },
  { name: 'telur_stok:read', group: 'Komoditas Telur', description: 'Melihat kartu stok fisik per batch telur' },
  { name: 'telur_stok:export', group: 'Komoditas Telur', description: 'Export kartu stok telur (Excel/PDF)' },

  // =========================================================================
  // 2. KOMODITAS PAKAN PABRIKAN
  // =========================================================================
  { name: 'pakan_monitoring:read', group: 'Komoditas Pakan Pabrikan', description: 'Melihat rekapitulasi monitoring transaksi pakan' },
  { name: 'pakan_monitoring:export', group: 'Komoditas Pakan Pabrikan', description: 'Export data transaksi pakan (Excel/PDF)' },
  { name: 'pakan_penjualan:read', group: 'Komoditas Pakan Pabrikan', description: 'Melihat transaksi penjualan pakan sentrat' },
  { name: 'pakan_penjualan:create', group: 'Komoditas Pakan Pabrikan', description: 'Membuat transaksi penjualan pakan' },
  { name: 'pakan_penjualan:update', group: 'Komoditas Pakan Pabrikan', description: 'Mengedit transaksi penjualan pakan' },
  { name: 'pakan_penjualan:delete', group: 'Komoditas Pakan Pabrikan', description: 'Menghapus transaksi penjualan pakan' },
  { name: 'pakan_pembelian:read', group: 'Komoditas Pakan Pabrikan', description: 'Melihat transaksi pembelian pakan pabrik' },
  { name: 'pakan_pembelian:create', group: 'Komoditas Pakan Pabrikan', description: 'Membuat transaksi pembelian pakan dari pabrik' },
  { name: 'pakan_pembelian:update', group: 'Komoditas Pakan Pabrikan', description: 'Mengedit transaksi pembelian pakan pabrik' },
  { name: 'pakan_pembelian:delete', group: 'Komoditas Pakan Pabrikan', description: 'Menghapus transaksi pembelian pakan pabrik' },
  { name: 'pakan_retur_penjualan:read', group: 'Komoditas Pakan Pabrikan', description: 'Melihat retur penjualan pakan' },
  { name: 'pakan_retur_penjualan:create', group: 'Komoditas Pakan Pabrikan', description: 'Membuat retur penjualan pakan' },
  { name: 'pakan_retur_penjualan:delete', group: 'Komoditas Pakan Pabrikan', description: 'Menghapus retur penjualan pakan' },
  { name: 'pakan_retur_pembelian:read', group: 'Komoditas Pakan Pabrikan', description: 'Melihat retur pembelian pakan' },
  { name: 'pakan_retur_pembelian:create', group: 'Komoditas Pakan Pabrikan', description: 'Membuat retur pembelian pakan ke pabrik' },
  { name: 'pakan_retur_pembelian:delete', group: 'Komoditas Pakan Pabrikan', description: 'Menghapus retur pembelian pakan' },
  { name: 'pakan_stok:read', group: 'Komoditas Pakan Pabrikan', description: 'Melihat kartu stok pakan pabrikan' },
  { name: 'pakan_stok:export', group: 'Komoditas Pakan Pabrikan', description: 'Export kartu stok pakan (Excel/PDF)' },

  // =========================================================================
  // 3. PAKAN CURAH PAK PRI
  // =========================================================================
  { name: 'curah_operasional:read', group: 'Pakan Curah (Pak Pri)', description: 'Melihat buku operasional transaksi pakan curah' },
  { name: 'curah_operasional:create', group: 'Pakan Curah (Pak Pri)', description: 'Input penjualan/pembelian pakan curah (jagung, katul)' },
  { name: 'curah_operasional:update', group: 'Pakan Curah (Pak Pri)', description: 'Edit transaksi pakan curah' },
  { name: 'curah_operasional:delete', group: 'Pakan Curah (Pak Pri)', description: 'Hapus transaksi pakan curah' },
  { name: 'curah_operasional:export', group: 'Pakan Curah (Pak Pri)', description: 'Export buku operasional curah (Excel/PDF)' },
  { name: 'curah_konversi:read', group: 'Pakan Curah (Pak Pri)', description: 'Melihat riwayat konversi & giling pakan curah' },
  { name: 'curah_konversi:create', group: 'Pakan Curah (Pak Pri)', description: 'Membuat konversi/reproses barang pakan curah baru' },
  { name: 'curah_konversi:update', group: 'Pakan Curah (Pak Pri)', description: 'Mengedit transaksi konversi pakan curah' },
  { name: 'curah_konversi:delete', group: 'Pakan Curah (Pak Pri)', description: 'Menghapus transaksi konversi pakan curah' },
  { name: 'curah_kas_tunai:read', group: 'Pakan Curah (Pak Pri)', description: 'Audit mutasi arus kas tunai penjualan pakan curah' },
  { name: 'curah_kas_tunai:export', group: 'Pakan Curah (Pak Pri)', description: 'Export audit kas tunai curah' },
  { name: 'curah_kas_bank:read', group: 'Pakan Curah (Pak Pri)', description: 'Audit mutasi rekening bank penjualan pakan curah' },
  { name: 'curah_kas_bank:export', group: 'Pakan Curah (Pak Pri)', description: 'Export audit transfer bank curah' },
  { name: 'curah_modal:read', group: 'Pakan Curah (Pak Pri)', description: 'Melihat saldo pinjaman modal & belanja curah' },
  { name: 'curah_modal:create', group: 'Pakan Curah (Pak Pri)', description: 'Mencatat penambahan pinjaman modal beli bahan curah' },
  { name: 'curah_modal:update', group: 'Pakan Curah (Pak Pri)', description: 'Mengedit catatan pinjaman modal' },
  { name: 'curah_modal:delete', group: 'Pakan Curah (Pak Pri)', description: 'Menghapus catatan pinjaman modal' },

  // =========================================================================
  // 4. KOMODITAS OBAT-OBATAN
  // =========================================================================
  { name: 'obat_monitoring:read', group: 'Komoditas Obat-Obatan', description: 'Melihat monitoring transaksi obat-obatan & vitamin' },
  { name: 'obat_monitoring:export', group: 'Komoditas Obat-Obatan', description: 'Export data obat-obatan (Excel/PDF)' },
  { name: 'obat_penjualan:read', group: 'Komoditas Obat-Obatan', description: 'Melihat transaksi penjualan obat' },
  { name: 'obat_penjualan:create', group: 'Komoditas Obat-Obatan', description: 'Membuat penjualan obat' },
  { name: 'obat_penjualan:update', group: 'Komoditas Obat-Obatan', description: 'Mengedit penjualan obat' },
  { name: 'obat_penjualan:delete', group: 'Komoditas Obat-Obatan', description: 'Menghapus transaksi penjualan obat' },
  { name: 'obat_pembelian:read', group: 'Komoditas Obat-Obatan', description: 'Melihat pembelian obat' },
  { name: 'obat_pembelian:create', group: 'Komoditas Obat-Obatan', description: 'Membuat pembelian obat dari supplier' },
  { name: 'obat_pembelian:update', group: 'Komoditas Obat-Obatan', description: 'Mengedit pembelian obat' },
  { name: 'obat_pembelian:delete', group: 'Komoditas Obat-Obatan', description: 'Menghapus transaksi pembelian obat' },
  { name: 'obat_retur:read', group: 'Komoditas Obat-Obatan', description: 'Melihat riwayat retur obat' },
  { name: 'obat_retur:create', group: 'Komoditas Obat-Obatan', description: 'Membuat retur jual/beli obat' },
  { name: 'obat_retur:delete', group: 'Komoditas Obat-Obatan', description: 'Menghapus transaksi retur obat' },
  { name: 'obat_stok:read', group: 'Komoditas Obat-Obatan', description: 'Melihat kartu stok fisik obat-obatan' },
  { name: 'obat_stok:export', group: 'Komoditas Obat-Obatan', description: 'Export kartu stok obat' },

  // =========================================================================
  // 5. KOMODITAS EGG TRAY
  // =========================================================================
  { name: 'tray_monitoring:read', group: 'Komoditas Egg Tray', description: 'Melihat monitoring transaksi egg tray' },
  { name: 'tray_monitoring:export', group: 'Komoditas Egg Tray', description: 'Export data egg tray (Excel/PDF)' },
  { name: 'tray_penjualan:read', group: 'Komoditas Egg Tray', description: 'Melihat penjualan tray' },
  { name: 'tray_penjualan:create', group: 'Komoditas Egg Tray', description: 'Membuat transaksi penjualan tray' },
  { name: 'tray_penjualan:update', group: 'Komoditas Egg Tray', description: 'Mengedit transaksi penjualan tray' },
  { name: 'tray_penjualan:delete', group: 'Komoditas Egg Tray', description: 'Menghapus transaksi penjualan tray' },
  { name: 'tray_pembelian:read', group: 'Komoditas Egg Tray', description: 'Melihat pembelian tray' },
  { name: 'tray_pembelian:create', group: 'Komoditas Egg Tray', description: 'Membuat transaksi pembelian tray' },
  { name: 'tray_pembelian:update', group: 'Komoditas Egg Tray', description: 'Mengedit transaksi pembelian tray' },
  { name: 'tray_pembelian:delete', group: 'Komoditas Egg Tray', description: 'Menghapus transaksi pembelian tray' },
  { name: 'tray_retur:read', group: 'Komoditas Egg Tray', description: 'Melihat retur egg tray' },
  { name: 'tray_retur:create', group: 'Komoditas Egg Tray', description: 'Membuat retur tray' },
  { name: 'tray_retur:delete', group: 'Komoditas Egg Tray', description: 'Menghapus retur tray' },
  { name: 'tray_stok:read', group: 'Komoditas Egg Tray', description: 'Melihat kartu stok fisik egg tray' },
  { name: 'tray_stok:export', group: 'Komoditas Egg Tray', description: 'Export kartu stok tray' },

  // =========================================================================
  // 6. MANAJEMEN STOK & GUDANG
  // =========================================================================
  { name: 'stok_global:read', group: 'Manajemen Stok & Gudang', description: 'Melihat monitoring stok fisik seluruh gudang terpadu' },
  { name: 'stok_global:export', group: 'Manajemen Stok & Gudang', description: 'Export total stok gudang (Excel/PDF)' },
  { name: 'stok_opname:read', group: 'Manajemen Stok & Gudang', description: 'Melihat riwayat pemeriksaan stok opname fisik' },
  { name: 'stok_opname:create', group: 'Manajemen Stok & Gudang', description: 'Membuat penyesuaian selisih stok opname' },
  { name: 'stok_opname:update', group: 'Manajemen Stok & Gudang', description: 'Mengedit data catatan stok opname' },
  { name: 'stok_opname:delete', group: 'Manajemen Stok & Gudang', description: 'Membatalkan/hapus transaksi stok opname' },
  { name: 'stok_opname:export', group: 'Manajemen Stok & Gudang', description: 'Export berita acara stok opname' },
  { name: 'konversi_global:read', group: 'Manajemen Stok & Gudang', description: 'Melihat riwayat konversi/reproses barang antar-komoditas' },
  { name: 'konversi_global:create', group: 'Manajemen Stok & Gudang', description: 'Membuat konversi/reproses barang baru' },
  { name: 'konversi_global:update', group: 'Manajemen Stok & Gudang', description: 'Mengedit transaksi konversi barang' },
  { name: 'konversi_global:delete', group: 'Manajemen Stok & Gudang', description: 'Menghapus transaksi konversi barang' },

  // =========================================================================
  // 7. KEUANGAN & KAS OPERASIONAL
  // =========================================================================
  { name: 'kas_summary:read', group: 'Keuangan Kas & Bank', description: 'Melihat ringkasan total saldo kas tunai & rekening bank' },
  { name: 'kas_tunai:read', group: 'Keuangan Kas & Bank', description: 'Melihat mutasi buku kas tunai harian' },
  { name: 'kas_bank:read', group: 'Keuangan Kas & Bank', description: 'Melihat mutasi rekening bank (BCA, BRI, BNI)' },
  { name: 'kas_transfer:create', group: 'Keuangan Kas & Bank', description: 'Melakukan pemindahan dana/transfer kas antar-rekening' },
  { name: 'kas_transfer:delete', group: 'Keuangan Kas & Bank', description: 'Membatalkan transaksi transfer kas' },
  { name: 'kas_koreksi:create', group: 'Keuangan Kas & Bank', description: 'Membuat penyesuaian/koreksi saldo kas' },
  { name: 'kas_koreksi:delete', group: 'Keuangan Kas & Bank', description: 'Membatalkan koreksi saldo kas' },
  { name: 'kas:export', group: 'Keuangan Kas & Bank', description: 'Export mutasi buku kas dan bank (Excel/PDF)' },

  { name: 'hutang:read', group: 'Keuangan Hutang Usaha', description: 'Melihat daftar saldo hutang peternak & supplier' },
  { name: 'hutang:create', group: 'Keuangan Hutang Usaha', description: 'Mencatat saldo awal hutang baru manual' },
  { name: 'hutang:update', group: 'Keuangan Hutang Usaha', description: 'Mengedit rincian catatan hutang' },
  { name: 'hutang:delete', group: 'Keuangan Hutang Usaha', description: 'Menghapus catatan hutang' },
  { name: 'hutang_bayar:create', group: 'Keuangan Hutang Usaha', description: 'Mencatat pengeluaran kas bayar cicilan/pelunasan hutang' },
  { name: 'hutang_bayar:delete', group: 'Keuangan Hutang Usaha', description: 'Membatalkan/hapus bukti pembayaran hutang' },
  { name: 'hutang:export', group: 'Keuangan Hutang Usaha', description: 'Export buku hutang usaha (Excel/PDF)' },

  { name: 'piutang:read', group: 'Keuangan Piutang Usaha', description: 'Melihat daftar piutang bon pedagang' },
  { name: 'piutang:create', group: 'Keuangan Piutang Usaha', description: 'Mencatat saldo piutang baru manual' },
  { name: 'piutang:update', group: 'Keuangan Piutang Usaha', description: 'Mengedit rincian piutang' },
  { name: 'piutang:delete', group: 'Keuangan Piutang Usaha', description: 'Menghapus catatan piutang pedagang' },
  { name: 'piutang_bayar:create', group: 'Keuangan Piutang Usaha', description: 'Mencatat penerimaan setoran cicilan/pelunasan piutang' },
  { name: 'piutang_bayar:delete', group: 'Keuangan Piutang Usaha', description: 'Membatalkan/hapus bukti penerimaan setoran piutang' },
  { name: 'piutang:export', group: 'Keuangan Piutang Usaha', description: 'Export buku piutang dagang (Excel/PDF)' },

  { name: 'beban:read', group: 'Keuangan Beban & Pengeluaran', description: 'Melihat daftar pengeluaran operasional & biaya' },
  { name: 'beban:create', group: 'Keuangan Beban & Pengeluaran', description: 'Mencatat pengeluaran beban operasional baru' },
  { name: 'beban:update', group: 'Keuangan Beban & Pengeluaran', description: 'Mengedit transaksi beban operasional' },
  { name: 'beban:delete', group: 'Keuangan Beban & Pengeluaran', description: 'Menghapus transaksi pengeluaran beban' },
  { name: 'beban:export', group: 'Keuangan Beban & Pengeluaran', description: 'Export rekap beban operasional (Excel/PDF)' },

  { name: 'pendapatan_lain:read', group: 'Keuangan Pendapatan Lain-Lain', description: 'Melihat daftar pendapatan non-dagang' },
  { name: 'pendapatan_lain:create', group: 'Keuangan Pendapatan Lain-Lain', description: 'Mencatat penerimaan pendapatan lain-lain' },
  { name: 'pendapatan_lain:update', group: 'Keuangan Pendapatan Lain-Lain', description: 'Mengedit transaksi pendapatan lain' },
  { name: 'pendapatan_lain:delete', group: 'Keuangan Pendapatan Lain-Lain', description: 'Menghapus transaksi pendapatan lain' },
  { name: 'pendapatan_lain:export', group: 'Keuangan Pendapatan Lain-Lain', description: 'Export rekap pendapatan lain-lain' },

  { name: 'bon_titipan:read', group: 'Keuangan Bon & Titipan Mitra', description: 'Melihat rekonsiliasi buku bon dan titipan mitra' },
  { name: 'bon_titipan:export', group: 'Keuangan Bon & Titipan Mitra', description: 'Export buku bon dan titipan mitra' },

  // =========================================================================
  // 8. LAPORAN & AKUNTANSI
  // =========================================================================
  { name: 'laporan_labarugi:read', group: 'Modul Laporan & Akuntansi', description: 'Melihat laporan Laba Rugi komoditas Bima Pratama' },
  { name: 'laporan_labarugi:export', group: 'Modul Laporan & Akuntansi', description: 'Export laporan Laba Rugi komoditas (Excel/PDF)' },
  { name: 'laporan_curah:read', group: 'Modul Laporan & Akuntansi', description: 'Melihat laporan Laba Rugi khusus pakan curah Pak Pri' },
  { name: 'laporan_curah:export', group: 'Modul Laporan & Akuntansi', description: 'Export laporan Laba Rugi pakan curah (Excel/PDF)' },
  { name: 'jurnal:read', group: 'Modul Laporan & Akuntansi', description: 'Melihat buku jurnal umum double-entry akuntansi' },
  { name: 'jurnal:create', group: 'Modul Laporan & Akuntansi', description: 'Membuat jurnal penyesuaian manual akuntansi' },
  { name: 'jurnal:update', group: 'Modul Laporan & Akuntansi', description: 'Mengedit baris jurnal penyesuaian' },
  { name: 'jurnal:delete', group: 'Modul Laporan & Akuntansi', description: 'Menghapus jurnal penyesuaian manual' },
  { name: 'jurnal:export', group: 'Modul Laporan & Akuntansi', description: 'Export buku jurnal umum (Excel/PDF)' },
  { name: 'laporan_neraca_saldo:read', group: 'Modul Laporan & Akuntansi', description: 'Melihat neraca saldo trial balance akuntansi' },
  { name: 'laporan_neraca_saldo:export', group: 'Modul Laporan & Akuntansi', description: 'Export neraca saldo (Excel/PDF)' },
  { name: 'laporan_aset:read', group: 'Modul Laporan & Akuntansi', description: 'Melihat laporan posisi aset & modal ekuitas' },
  { name: 'laporan_aset:export', group: 'Modul Laporan & Akuntansi', description: 'Export laporan aset & modal (Excel/PDF)' },

  // =========================================================================
  // 9. MASTER DATA
  // =========================================================================
  { name: 'master_barang:read', group: 'Master Data', description: 'Melihat katalog master barang dan produk' },
  { name: 'master_barang:create', group: 'Master Data', description: 'Menambah barang atau produk baru' },
  { name: 'master_barang:update', group: 'Master Data', description: 'Mengubah nama, jenis, satuan, stok min barang' },
  { name: 'master_barang:delete', group: 'Master Data', description: 'Menghapus data master barang' },
  { name: 'master_barang:export', group: 'Master Data', description: 'Export daftar master barang' },

  { name: 'master_client:read', group: 'Master Data', description: 'Melihat data master mitra (peternak & pedagang)' },
  { name: 'master_client:create', group: 'Master Data', description: 'Menambah peternak, pedagang, supplier baru' },
  { name: 'master_client:update', group: 'Master Data', description: 'Mengedit profil mitra' },
  { name: 'master_client:delete', group: 'Master Data', description: 'Menghapus data mitra' },
  { name: 'master_client:export', group: 'Master Data', description: 'Export daftar mitra' },

  { name: 'master_kategori:read', group: 'Master Data', description: 'Melihat struktur master kategori COA akuntansi' },
  { name: 'master_kategori:create', group: 'Master Data', description: 'Menambah kategori akun COA baru' },
  { name: 'master_kategori:update', group: 'Master Data', description: 'Mengedit nama & kode kategori akun' },
  { name: 'master_kategori:delete', group: 'Master Data', description: 'Menghapus kategori akun' },

  { name: 'master_detail_kategori:read', group: 'Master Data', description: 'Melihat sub-kategori akun akuntansi' },
  { name: 'master_detail_kategori:create', group: 'Master Data', description: 'Menambah sub-kategori akun baru' },
  { name: 'master_detail_kategori:update', group: 'Master Data', description: 'Mengedit sub-kategori akun' },
  { name: 'master_detail_kategori:delete', group: 'Master Data', description: 'Menghapus sub-kategori akun' },

  // =========================================================================
  // 10. PENGATURAN SISTEM, PENGGUNA & RBAC
  // =========================================================================
  { name: 'dashboard:read', group: 'Dashboard & Analitik', description: 'Mengakses dashboard ringkasan eksekutif' },
  { name: 'users:read', group: 'Manajemen Pengguna & RBAC', description: 'Melihat daftar staf dan pengguna sistem' },
  { name: 'users:create', group: 'Manajemen Pengguna & RBAC', description: 'Membuat akun staf baru' },
  { name: 'users:update', group: 'Manajemen Pengguna & RBAC', description: 'Mengubah profil atau role staf' },
  { name: 'users:delete', group: 'Manajemen Pengguna & RBAC', description: 'Menghapus akun staf' },
  { name: 'users:reset_password', group: 'Manajemen Pengguna & RBAC', description: 'Mereset kata sandi staf' },
  { name: 'roles:read', group: 'Manajemen Pengguna & RBAC', description: 'Melihat daftar role pengguna' },
  { name: 'roles:update', group: 'Manajemen Pengguna & RBAC', description: 'Mengatur checklist matriks hak akses per role' },
  { name: 'logs:read', group: 'Sistem & Audit', description: 'Melihat riwayat log audit aktivitas staf' },
  { name: 'logs:export', group: 'Sistem & Audit', description: 'Export catatan audit log (Excel/PDF)' },
  { name: 'system:migration', group: 'Sistem & Audit', description: 'Menjalankan tools migrasi dan sinkronisasi data' },
];

async function seedGranularCrud() {
  console.log('🚀 Memulai sinkronisasi permissions granular CRUD...');

  // 1. Upsert permissions ke tabel permissions
  let inserted = 0;
  let updated = 0;
  for (const p of ALL_GRANULAR_PERMISSIONS) {
    const existing = await prisma.permission.findUnique({ where: { name: p.name } });
    if (!existing) {
      await prisma.permission.create({ data: p });
      inserted++;
    } else {
      await prisma.permission.update({
        where: { id: existing.id },
        data: { group: p.group, description: p.description },
      });
      updated++;
    }
  }
  console.log(`✅ Permissions siap: ${inserted} baru dibuat, ${updated} diperbarui. Total: ${ALL_GRANULAR_PERMISSIONS.length}`);

  // Ambil semua permissions terkini
  const allDbPerms = await prisma.permission.findMany();
  const permMap = new Map(allDbPerms.map((p) => [p.name, p.id]));

  // Helper untuk assign permissions ke role
  const assignPermissionsToRole = async (roleId, permNames) => {
    const validPermIds = [];
    for (const name of permNames) {
      if (permMap.has(name)) {
        validPermIds.push(permMap.get(name));
      }
    }

    // Insert ke role_permissions (upsert)
    for (const pId of validPermIds) {
      try {
        await prisma.rolePermission.upsert({
          where: {
            idx_role_permission_unique: {
              roleId: BigInt(roleId),
              permissionId: BigInt(pId),
            },
          },
          update: {},
          create: {
            roleId: BigInt(roleId),
            permissionId: BigInt(pId),
          },
        });
      } catch (err) {
        // ignore duplicate
      }
    }
    console.log(`   -> Role ${roleId} diberikan ${validPermIds.length} izin.`);
  };

  // 2. Pemetaan Hak Akses Default untuk 8 Role:
  console.log('📋 Mengonfigurasi pemetaan izin default untuk 8 Role...');

  // ROLE 1: Admin & ROLE 8: Super Admin -> SEMUA IZIN
  const allPermNames = ALL_GRANULAR_PERMISSIONS.map((p) => p.name);
  await assignPermissionsToRole(1, allPermNames); // Admin
  await assignPermissionsToRole(8, allPermNames); // Super Admin

  // ROLE 2: Manager -> Semua kecuali system:migration & roles:update
  const managerPerms = allPermNames.filter((p) => p !== 'system:migration' && p !== 'roles:update');
  await assignPermissionsToRole(2, managerPerms);

  // ROLE 3: Pembelian Telur
  // Khusus pembelian telur, retur pembelian, monitoring telur, stok telur, dan baca master
  const telurPerms = [
    'dashboard:read',
    'telur_monitoring:read',
    'telur_monitoring:export',
    'telur_pembelian:read',
    'telur_pembelian:create',
    'telur_pembelian:update',
    'telur_pembelian:delete',
    'telur_retur_pembelian:read',
    'telur_retur_pembelian:create',
    'telur_retur_pembelian:delete',
    'telur_stok:read',
    'telur_stok:export',
    'stok_global:read',
    'master_barang:read',
    'master_client:read',
  ];
  await assignPermissionsToRole(3, telurPerms);

  // ROLE 4: Pakan dan Obat-Obatan ("Mbak Pakan")
  // Full CRUD Pakan Pabrikan, Curah Pak Pri (Operasional, Konversi, Modal), Obat, Tray, Stok Opname, Konversi Global
  const pakanPerms = [
    'dashboard:read',
    // Pakan
    'pakan_monitoring:read', 'pakan_monitoring:export',
    'pakan_penjualan:read', 'pakan_penjualan:create', 'pakan_penjualan:update', 'pakan_penjualan:delete',
    'pakan_pembelian:read', 'pakan_pembelian:create', 'pakan_pembelian:update', 'pakan_pembelian:delete',
    'pakan_retur_penjualan:read', 'pakan_retur_penjualan:create', 'pakan_retur_penjualan:delete',
    'pakan_retur_pembelian:read', 'pakan_retur_pembelian:create', 'pakan_retur_pembelian:delete',
    'pakan_stok:read', 'pakan_stok:export',
    // Curah Pak Pri Operasional & Konversi & Modal
    'curah_operasional:read', 'curah_operasional:create', 'curah_operasional:update', 'curah_operasional:delete', 'curah_operasional:export',
    'curah_konversi:read', 'curah_konversi:create', 'curah_konversi:update', 'curah_konversi:delete',
    'curah_modal:read', 'curah_modal:create', 'curah_modal:update',
    // Obat
    'obat_monitoring:read', 'obat_monitoring:export',
    'obat_penjualan:read', 'obat_penjualan:create', 'obat_penjualan:update', 'obat_penjualan:delete',
    'obat_pembelian:read', 'obat_pembelian:create', 'obat_pembelian:update', 'obat_pembelian:delete',
    'obat_retur:read', 'obat_retur:create', 'obat_retur:delete',
    'obat_stok:read', 'obat_stok:export',
    // Tray
    'tray_monitoring:read', 'tray_monitoring:export',
    'tray_penjualan:read', 'tray_penjualan:create', 'tray_penjualan:update', 'tray_penjualan:delete',
    'tray_pembelian:read', 'tray_pembelian:create', 'tray_pembelian:update', 'tray_pembelian:delete',
    'tray_retur:read', 'tray_retur:create', 'tray_retur:delete',
    'tray_stok:read', 'tray_stok:export',
    // Stok & Konversi Global
    'stok_global:read', 'stok_global:export',
    'stok_opname:read', 'stok_opname:create', 'stok_opname:update',
    'konversi_global:read', 'konversi_global:create', 'konversi_global:update',
    // Master read
    'master_barang:read', 'master_client:read',
  ];
  await assignPermissionsToRole(4, pakanPerms);

  // ROLE 5: Kas Tunai ("Kasir Tunai")
  const tunaiPerms = [
    'dashboard:read',
    // Kas Tunai
    'kas_summary:read', 'kas_tunai:read', 'kas:export',
    'curah_kas_tunai:read', 'curah_kas_tunai:export',
    // Penerimaan setoran piutang & pembayaran hutang tunai
    'piutang:read', 'piutang_bayar:create', 'piutang:export',
    'hutang:read', 'hutang_bayar:create', 'hutang:export',
    'beban:read', 'beban:create', 'beban:update', 'beban:export',
    'pendapatan_lain:read', 'pendapatan_lain:create', 'pendapatan_lain:update', 'pendapatan_lain:export',
    'bon_titipan:read', 'bon_titipan:export',
    // Monitoring transaksi untuk verifikasi kasir
    'telur_monitoring:read', 'pakan_monitoring:read', 'curah_operasional:read', 'obat_monitoring:read', 'tray_monitoring:read',
    'master_client:read', 'master_barang:read',
  ];
  await assignPermissionsToRole(5, tunaiPerms);

  // ROLE 6: Kas Transfer ("Kasir Transfer")
  const transferPerms = [
    'dashboard:read',
    // Kas Bank & Transfer
    'kas_summary:read', 'kas_bank:read', 'kas_transfer:create', 'kas:export',
    'curah_kas_bank:read', 'curah_kas_bank:export',
    // Penerimaan setoran piutang & pembayaran hutang via transfer
    'piutang:read', 'piutang_bayar:create', 'piutang:export',
    'hutang:read', 'hutang_bayar:create', 'hutang:export',
    'beban:read', 'beban:create', 'beban:update', 'beban:export',
    'pendapatan_lain:read', 'pendapatan_lain:create', 'pendapatan_lain:update', 'pendapatan_lain:export',
    'bon_titipan:read', 'bon_titipan:export',
    // Monitoring transaksi
    'telur_monitoring:read', 'pakan_monitoring:read', 'curah_operasional:read', 'obat_monitoring:read', 'tray_monitoring:read',
    'master_client:read', 'master_barang:read',
  ];
  await assignPermissionsToRole(6, transferPerms);

  // ROLE 7: Akuntasi dan Rekap
  // Seluruh Read + Full CRUD Keuangan, Laporan, Jurnal, Master Data
  const akuntansiPerms = [
    'dashboard:read',
    // Read all Komoditas
    'telur_monitoring:read', 'telur_monitoring:export', 'telur_penjualan:read', 'telur_pembelian:read', 'telur_stok:read',
    'pakan_monitoring:read', 'pakan_monitoring:export', 'pakan_penjualan:read', 'pakan_pembelian:read', 'pakan_stok:read',
    'curah_operasional:read', 'curah_operasional:export', 'curah_konversi:read', 'curah_kas_tunai:read', 'curah_kas_bank:read', 'curah_modal:read',
    'obat_monitoring:read', 'obat_monitoring:export', 'obat_penjualan:read', 'obat_pembelian:read', 'obat_stok:read',
    'tray_monitoring:read', 'tray_monitoring:export', 'tray_penjualan:read', 'tray_pembelian:read', 'tray_stok:read',
    'stok_global:read', 'stok_global:export', 'stok_opname:read', 'konversi_global:read',
    // Full Keuangan
    'kas_summary:read', 'kas_tunai:read', 'kas_bank:read', 'kas_transfer:create', 'kas_transfer:delete', 'kas_koreksi:create', 'kas_koreksi:delete', 'kas:export',
    'hutang:read', 'hutang:create', 'hutang:update', 'hutang:delete', 'hutang_bayar:create', 'hutang_bayar:delete', 'hutang:export',
    'piutang:read', 'piutang:create', 'piutang:update', 'piutang:delete', 'piutang_bayar:create', 'piutang_bayar:delete', 'piutang:export',
    'beban:read', 'beban:create', 'beban:update', 'beban:delete', 'beban:export',
    'pendapatan_lain:read', 'pendapatan_lain:create', 'pendapatan_lain:update', 'pendapatan_lain:delete', 'pendapatan_lain:export',
    'bon_titipan:read', 'bon_titipan:export',
    // Full Laporan & Jurnal
    'laporan_labarugi:read', 'laporan_labarugi:export',
    'laporan_curah:read', 'laporan_curah:export',
    'jurnal:read', 'jurnal:create', 'jurnal:update', 'jurnal:delete', 'jurnal:export',
    'laporan_neraca_saldo:read', 'laporan_neraca_saldo:export',
    'laporan_aset:read', 'laporan_aset:export',
    // Master Data
    'master_barang:read', 'master_barang:create', 'master_barang:update', 'master_barang:export',
    'master_client:read', 'master_client:create', 'master_client:update', 'master_client:export',
    'master_kategori:read', 'master_kategori:create', 'master_kategori:update',
    'master_detail_kategori:read', 'master_detail_kategori:create', 'master_detail_kategori:update',
    'logs:read', 'logs:export',
  ];
  await assignPermissionsToRole(7, akuntansiPerms);

  console.log('🎉 Sinkronisasi seluruh permissions granular CRUD selesai dengan sukses!');
}

seedGranularCrud()
  .catch((e) => {
    console.error('❌ Error saat seeding permissions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
