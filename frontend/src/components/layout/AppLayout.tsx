import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Egg,
  Wheat,
  Pill,
  Layers,
  Package,
  Users,
  FileSpreadsheet,
  WalletCards,
  Receipt,
  Coins,
  Banknote,
  CreditCard,
  Scale,
  Landmark,
  ShieldCheck,
  Tag,
  FolderTree,
  Database,
  ClipboardCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  BookOpen,
  History,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

interface NavSection {
  title: string;
  items: {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }[];
}

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Live count queries for Master Barang and Mitra & Peternak
  const { data: barangsCount } = useQuery({
    queryKey: ['countMasterBarangs'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/barangs?limit=1');
      return res?.meta?.total ?? res?.data?.meta?.total ?? (Array.isArray(res?.data) ? res.data.length : 0);
    },
    staleTime: 60000,
  });

  const { data: clientsCount } = useQuery({
    queryKey: ['countMasterClients'],
    queryFn: async () => {
      const res: any = await apiClient.get('/master/clients?limit=1');
      return res?.meta?.total ?? res?.data?.meta?.total ?? (Array.isArray(res?.data) ? res.data.length : 0);
    },
    staleTime: 60000,
  });

  const navSections: NavSection[] = [
    {
      title: 'UTAMA',
      items: [
        { label: 'Dashboard Analitik', path: '/', icon: LayoutDashboard },
      ],
    },
    {
      title: 'KOMODITAS OPERASIONAL',
      items: [
        { label: 'Menu Telur', path: '/telur', icon: Egg, badge: 'Telur', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
        { label: 'Menu Pakan', path: '/pakan', icon: Wheat, badge: 'Pakan', badgeColor: 'bg-amber-500/20 text-amber-400' },
        { label: 'Menu Obat', path: '/obat', icon: Pill, badge: 'Obat', badgeColor: 'bg-indigo-500/20 text-indigo-400' },
        { label: 'Menu Tray', path: '/tray', icon: Layers, badge: 'Tray', badgeColor: 'bg-teal-500/20 text-teal-400' },
      ],
    },
    {
      title: 'STOK',
      items: [
        { label: 'Monitoring Stok Global', path: '/stok', icon: Boxes, badge: 'Gudang', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
        { label: 'Stok Opname & Penyesuaian', path: '/stok-opname', icon: ClipboardCheck, badge: 'Opname', badgeColor: 'bg-amber-500/20 text-amber-400' },
      ],
    },
    {
      title: 'KEUANGAN & KAS OPERASIONAL',
      items: [
        { label: 'Monitoring Kas & Bank', path: '/kas', icon: Banknote, badge: 'In/Out', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
        { label: 'Hutang Usaha', path: '/hutang', icon: CreditCard, badge: 'Hutang', badgeColor: 'bg-rose-500/20 text-rose-400' },
        { label: 'Piutang Usaha', path: '/piutang', icon: WalletCards, badge: 'Piutang', badgeColor: 'bg-amber-500/20 text-amber-400' },
        { label: 'Pengeluaran Beban', path: '/beban', icon: Receipt, badge: 'PGN', badgeColor: 'bg-rose-500/20 text-rose-400' },
        { label: 'Pendapatan Lainnya', path: '/pendapatan-lain', icon: Coins, badge: 'LNY', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
        { label: 'Bon - Titipan Mitra', path: '/bon-titipan', icon: WalletCards, badge: 'P/H', badgeColor: 'bg-indigo-500/20 text-indigo-400' },
      ],
    },
    {
      title: 'LAPORAN & AKUNTANSI',
      items: [
        { label: 'Laba Rugi Komoditas', path: '/laporan', icon: FileSpreadsheet, badge: 'P&L', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
        { label: 'Laba Rugi Curah', path: '/laporan-curah', icon: Wheat, badge: 'Curah', badgeColor: 'bg-orange-500/20 text-orange-400' },
        { label: 'Jurnal Umum & Detail', path: '/jurnal-umum', icon: BookOpen, badge: 'Double-Entry', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
        { label: 'Neraca Saldo', path: '/neraca-saldo', icon: Scale, badge: 'Trial', badgeColor: 'bg-blue-500/20 text-blue-400' },
        { label: 'Laporan Aset & Modal', path: '/laporan-aset', icon: Landmark, badge: 'Aset', badgeColor: 'bg-purple-500/20 text-purple-400' },
      ],
    },
    {
      title: 'MASTER DATA',
      items: [
        {
          label: 'Master Barang',
          path: '/barangs',
          icon: Package,
          badge: barangsCount !== undefined ? `${barangsCount}` : undefined,
          badgeColor: 'bg-emerald-500/20 text-emerald-400',
        },
        {
          label: 'Mitra & Peternak',
          path: '/clients',
          icon: Users,
          badge: clientsCount !== undefined ? `${clientsCount}` : undefined,
          badgeColor: 'bg-indigo-500/20 text-indigo-400',
        },
        { label: 'Master Kategori', path: '/kategoris', icon: Tag, badge: '100' },
        { label: 'Detail Kategori', path: '/detail-kategoris', icon: FolderTree, badge: '40' },
      ],
    },
    {
      title: 'PENGATURAN & AUDIT',
      items: [
        { label: 'Riwayat Log Aktivitas', path: '/logs', icon: History, badge: 'Audit', badgeColor: 'bg-blue-500/20 text-blue-400' },
        { label: 'Pengguna & Role (RBAC)', path: '/users', icon: ShieldCheck, badge: 'Akses', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
        { label: 'Import Sistem Lama', path: '/import-legacy', icon: Database, badge: 'ETL', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
      ],
    },
  ];

  const renderNavItems = (onItemClick?: () => void) => (
    <nav className="p-3 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
      {navSections.map((sec, secIdx) => (
        <div key={secIdx}>
          {!isCollapsed && (
            <div className="px-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {sec.title}
            </div>
          )}
          <div className="space-y-0.5">
            {sec.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => onItemClick && onItemClick()}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center ${isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2.5'}`}>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.badgeColor || 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Mobile Slide-Over Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Mobile Drawer Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center font-bold text-lg text-white shadow-md">
                BP
              </div>
              <div>
                <h1 className="font-bold text-base tracking-wide text-white leading-tight">Bima Pratama</h1>
                <p className="text-[11px] text-emerald-400 font-medium">ERP 2.0 Modern Enterprise</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          {renderNavItems(() => setIsMobileOpen(false))}

          {/* User Info & Logout on Mobile */}
          <div className="p-3 border-t border-slate-800 shrink-0 bg-slate-900/90">
            <div className="flex items-center justify-between mb-2">
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'Administrator'}</p>
                <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-400">
                  {user?.role || 'Admin'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar Sistem</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop / Tablet Sidebar (Collapsible) */}
      <aside
        className={`hidden lg:flex bg-slate-900 text-white flex-col justify-between shrink-0 shadow-xl transition-all duration-300 relative ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header & Collapse Toggle */}
          <div className={`p-4 border-b border-slate-800 flex items-center shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center font-bold text-lg text-white shadow-md shrink-0">
                BP
              </div>
              {!isCollapsed && (
                <div>
                  <h1 className="font-bold text-base tracking-wide text-white leading-tight">Bima Pratama</h1>
                  <p className="text-[11px] text-emerald-400 font-medium">ERP 2.0 Modern Enterprise</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Grouped Navigation Links */}
          {renderNavItems()}
        </div>

        {/* User Info & Logout (Desktop) */}
        <div className="p-3 border-t border-slate-800 shrink-0 bg-slate-900/90">
          {!isCollapsed ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate">{user?.name || 'Administrator'}</p>
                  <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-400">
                    {user?.role || 'Admin'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Sistem</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              title="Keluar Sistem"
              className="w-full flex items-center justify-center p-2 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Navbar (Visible on Mobile & Tablet < lg) */}
        <header className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-xs text-white">
                BP
              </div>
              <span className="font-bold text-sm text-white tracking-tight">Bima Pratama ERP</span>
            </div>
          </div>
          <div className="text-xs text-slate-300 font-medium">
            {user?.name || 'Admin'}
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
export default AppLayout;
