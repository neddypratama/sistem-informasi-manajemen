import React from 'react';
import { Link } from 'react-router-dom';
import {
  Egg,
  Wheat,
  Pill,
  Layers,
  Boxes,
  Banknote,
  CreditCard,
  WalletCards,
  Receipt,
  Coins,
  FileSpreadsheet,
  BookOpen,
  Scale,
  Landmark,
  Package,
  Users,
  Tag,
  ShieldCheck,
  History,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuthStore, hasPermission } from '../../stores/auth.store';

interface QuickModule {
  title: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  badge: string;
  color: string;
  borderColor: string;
  iconColor: string;
  bgColor: string;
}

export const WelcomePage: React.FC = () => {
  const { user } = useAuthStore();

  const todayStr = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const allModules: QuickModule[] = [
    {
      title: 'Menu Transaksi Telur',
      description: 'Pencatatan pembelian telur peternak, penjualan DO, dan retur telur',
      path: '/telur',
      icon: Egg,
      permission: 'telur:read',
      badge: 'Komoditas Telur',
      color: 'hover:border-emerald-500 hover:shadow-emerald-500/10',
      borderColor: 'border-emerald-200',
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Menu Transaksi Pakan',
      description: 'Transaksi pembelian & penjualan pakan sentrat, konsentrat, serta pakan curah',
      path: '/pakan',
      icon: Wheat,
      permission: 'pakan:read',
      badge: 'Komoditas Pakan',
      color: 'hover:border-amber-500 hover:shadow-amber-500/10',
      borderColor: 'border-amber-200',
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Menu Obat & Vitamin',
      description: 'Kelola inventaris dan pencatatan distribusi obat-obatan ternak',
      path: '/obat',
      icon: Pill,
      permission: 'obat:read',
      badge: 'Obat & Medis',
      color: 'hover:border-indigo-500 hover:shadow-indigo-500/10',
      borderColor: 'border-indigo-200',
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Menu Egg Tray',
      description: 'Pencatatan mutasi tray karton & plastik, masuk dari peternak dan keluar penjualan',
      path: '/tray',
      icon: Layers,
      permission: 'tray:read',
      badge: 'Egg Tray',
      color: 'hover:border-teal-500 hover:shadow-teal-500/10',
      borderColor: 'border-teal-200',
      iconColor: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      title: 'Monitoring Stok Global',
      description: 'Pantau posisi stok fisik gudang secara live untuk telur, pakan, obat, dan tray',
      path: '/stok',
      icon: Boxes,
      permission: 'stok:read',
      badge: 'Gudang & Stok',
      color: 'hover:border-blue-500 hover:shadow-blue-500/10',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Stok Opname & Penyesuaian',
      description: 'Pencatatan hasil hitung fisik barang gudang dan penyesuaian selisih stok',
      path: '/stok-opname',
      icon: Boxes,
      permission: 'stok:opname',
      badge: 'Stok Opname',
      color: 'hover:border-amber-500 hover:shadow-amber-500/10',
      borderColor: 'border-amber-200',
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Buku Kas & Bank',
      description: 'Pencatatan arus kas operasional tunai dan mutasi rekening bank perusahaan',
      path: '/kas',
      icon: Banknote,
      permission: 'kas:read',
      badge: 'Kas & Rekening',
      color: 'hover:border-emerald-500 hover:shadow-emerald-500/10',
      borderColor: 'border-emerald-200',
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Hutang Usaha Mitra',
      description: 'Kelola saldo kewajiban hutang pembelian kepada peternak dan supplier',
      path: '/hutang',
      icon: CreditCard,
      permission: 'hutang:read',
      badge: 'Hutang Usaha',
      color: 'hover:border-rose-500 hover:shadow-rose-500/10',
      borderColor: 'border-rose-200',
      iconColor: 'text-rose-600',
      bgColor: 'bg-rose-50',
    },
    {
      title: 'Piutang & Bon Mitra',
      description: 'Monitoring tagihan piutang penjualan dan pencatatan penerimaan pembayaran',
      path: '/piutang',
      icon: WalletCards,
      permission: 'piutang:read',
      badge: 'Piutang Usaha',
      color: 'hover:border-amber-500 hover:shadow-amber-500/10',
      borderColor: 'border-amber-200',
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Pengeluaran Beban (PGN)',
      description: 'Catat pengeluaran biaya operasional harian, listrik, bahan bakar, dan armada',
      path: '/beban',
      icon: Receipt,
      permission: 'beban:read',
      badge: 'Biaya Beban',
      color: 'hover:border-red-500 hover:shadow-red-500/10',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Pendapatan Lain-lain (LNY)',
      description: 'Catat penerimaan pendapatan sampingan non-komoditas',
      path: '/pendapatan-lain',
      icon: Coins,
      permission: 'pendapatan_lain:read',
      badge: 'Pendapatan Lain',
      color: 'hover:border-emerald-500 hover:shadow-emerald-500/10',
      borderColor: 'border-emerald-200',
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Bon & Titipan Mitra',
      description: 'Rekapitulasi bilateral saldo titipan modal vs bon pengambilan peternak',
      path: '/bon-titipan',
      icon: WalletCards,
      permission: 'bon_titipan:read',
      badge: 'Bilateral Mitra',
      color: 'hover:border-indigo-500 hover:shadow-indigo-500/10',
      borderColor: 'border-indigo-200',
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Laba Rugi Komoditas',
      description: 'Laporan margin keuntungan dan rekapitulasi laba kotor per komoditas',
      path: '/laporan',
      icon: FileSpreadsheet,
      permission: 'laporan:laba_rugi',
      badge: 'Akuntansi P&L',
      color: 'hover:border-emerald-500 hover:shadow-emerald-500/10',
      borderColor: 'border-emerald-200',
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Laba Rugi Pakan Curah',
      description: 'Analitik stok, susut, dan margin khusus penjualan pakan curah',
      path: '/laporan-curah',
      icon: Wheat,
      permission: 'laporan:curah',
      badge: 'Laporan Curah',
      color: 'hover:border-orange-500 hover:shadow-orange-500/10',
      borderColor: 'border-orange-200',
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Jurnal Umum & Detail',
      description: 'Audit pembukuan double-entry akuntansi seluruh transaksi sistem',
      path: '/jurnal-umum',
      icon: BookOpen,
      permission: 'jurnal:read',
      badge: 'Jurnal Umum',
      color: 'hover:border-blue-500 hover:shadow-blue-500/10',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Neraca Saldo',
      description: 'Keseimbangan debit & kredit seluruh akun buku besar periode berjalan',
      path: '/neraca-saldo',
      icon: Scale,
      permission: 'laporan:neraca_saldo',
      badge: 'Neraca Saldo',
      color: 'hover:border-cyan-500 hover:shadow-cyan-500/10',
      borderColor: 'border-cyan-200',
      iconColor: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
    {
      title: 'Laporan Aset & Modal',
      description: 'Posisi keuangan aset lancar, aset tetap, dan ekuitas modal perusahaan',
      path: '/laporan-aset',
      icon: Landmark,
      permission: 'laporan:aset',
      badge: 'Neraca Posisi',
      color: 'hover:border-purple-500 hover:shadow-purple-500/10',
      borderColor: 'border-purple-200',
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Master Barang',
      description: 'Katalog daftar komoditas, harga jual standar, dan konversi satuan',
      path: '/barangs',
      icon: Package,
      permission: 'master:barang',
      badge: 'Master Barang',
      color: 'hover:border-emerald-500 hover:shadow-emerald-500/10',
      borderColor: 'border-emerald-200',
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Mitra & Peternak',
      description: 'Database peternak, pedagang, pelanggan, dan supplier rekanan',
      path: '/clients',
      icon: Users,
      permission: 'master:client',
      badge: 'Klien & Mitra',
      color: 'hover:border-indigo-500 hover:shadow-indigo-500/10',
      borderColor: 'border-indigo-200',
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Master Kategori',
      description: 'Bagan akun kategori keuangan dan detail sub-kategori',
      path: '/kategoris',
      icon: Tag,
      permission: 'master:kategori',
      badge: 'Akun Kategori',
      color: 'hover:border-slate-500 hover:shadow-slate-500/10',
      borderColor: 'border-slate-200',
      iconColor: 'text-slate-600',
      bgColor: 'bg-slate-50',
    },
    {
      title: 'Manajemen Pengguna & Role',
      description: 'Konfigurasi akun staf dan matriks izin permission per divisi',
      path: '/users',
      icon: ShieldCheck,
      permission: 'users:read',
      badge: 'RBAC Akses',
      color: 'hover:border-emerald-500 hover:shadow-emerald-500/10',
      borderColor: 'border-emerald-200',
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Riwayat Audit Log',
      description: 'Rekam jejak setiap aktivitas transaksi staf untuk keamanan data',
      path: '/logs',
      icon: History,
      permission: 'logs:read',
      badge: 'Audit Trail',
      color: 'hover:border-blue-500 hover:shadow-blue-500/10',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
  ];

  // Filter modul hanya yang diizinkan sesuai permissions pengguna
  const allowedModules = allModules.filter((mod) => hasPermission(user, mod.permission));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Welcome Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Portal Staf Operasional Bima Pratama ERP 2.0</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Selamat Datang, <span className="text-emerald-400">{user?.name || 'Staf Operasional'}</span>! 👋
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Anda terautentikasi dengan hak akses peran <span className="font-bold text-white uppercase px-2 py-0.5 rounded bg-white/10">{user?.role || 'Pengguna'}</span>. 
              Sistem telah menyesuaikan menu dan modul di bawah ini secara otomatis sesuai dengan tugas dan tanggung jawab harian Anda.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 shrink-0 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="flex items-center space-x-2 text-xs text-slate-300">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>{todayStr}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-300">Sistem Aktif & Terhubung</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Menu yang Diizinkan */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Menu & Tugas Operasional Anda</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                {allowedModules.length} Modul Aktif
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih modul di bawah ini untuk memulai pencatatan dan pengelolaan data operasional harian.
            </p>
          </div>
        </div>

        {allowedModules.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center text-amber-900 max-w-xl mx-auto space-y-3">
            <ShieldAlert className="w-12 h-12 text-amber-600 mx-auto" />
            <h3 className="font-bold text-base">Belum Ada Izin Menu yang Diberikan</h3>
            <p className="text-xs text-amber-700 leading-relaxed">
              Akun Anda saat ini belum memiliki izin akses ke modul transaksi tertentu. Silakan hubungi 
              <span className="font-semibold"> Administrator</span> atau <span className="font-semibold">Manager</span> untuk mengaktifkan izin permission yang Anda butuhkan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allowedModules.map((mod, idx) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={idx}
                  to={mod.path}
                  className={`group bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-all duration-200 flex flex-col justify-between ${mod.color} hover:shadow-lg`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${mod.bgColor} ${mod.iconColor} border ${mod.borderColor} transition-transform group-hover:scale-105`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {mod.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors text-sm sm:text-base">
                        {mod.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {mod.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600 group-hover:text-emerald-600">
                    <span>Buka Modul</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Security & Accountability Information Footer */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-600">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-slate-800">Integritas & Keamanan Akun Bima Pratama</p>
            <p className="text-slate-500 text-[11px]">
              Setiap aktivitas pencatatan, perubahan harga, dan transaksi secara otomatis terekam dalam audit trail sistem demi transparansi dan akuntabilitas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
