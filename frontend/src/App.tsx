import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { PenjualanPage } from './features/transaksi/PenjualanPage';
import { TelurModulePage } from './features/transaksi/TelurModulePage';
import { PakanModulePage } from './features/transaksi/PakanModulePage';
import { CurahPakPriPage } from './features/curah/CurahPakPriPage';
import { BarangPage } from './features/master/BarangPage';
import { ClientPage } from './features/master/ClientPage';
import { KategoriPage } from './features/master/KategoriPage';
import { DetailKategoriPage } from './features/master/DetailKategoriPage';
import { StokTelurPage } from './features/inventory/StokTelurPage';
import { StokOpnamePage } from './features/inventory/StokOpnamePage';
import { KonversiBarangPage } from './features/inventory/KonversiBarangPage';
import { PenyesuaianStokPage } from './features/inventory/PenyesuaianStokPage';
import { MenuObatPage } from './features/inventory/MenuObatPage';
import { MenuTrayPage } from './features/inventory/MenuTrayPage';
import { BebanPage } from './features/keuangan/BebanPage';
import { PendapatanLainPage } from './features/keuangan/PendapatanLainPage';
import { LabaRugiPage } from './features/reports/LabaRugiPage';
import { LabaRugiCurahPage } from './features/reports/LabaRugiCurahPage';
import { NeracaSaldoPage } from './features/reports/NeracaSaldoPage';
import { LaporanAsetPage } from './features/reports/LaporanAsetPage';
import { BonTitipanPage } from './features/keuangan/BonTitipanPage';
import { HutangPage } from './features/keuangan/HutangPage';
import { PiutangPage } from './features/keuangan/PiutangPage';
import { LaporanKasPage } from './features/keuangan/LaporanKasPage';
import { UserManagementPage } from './features/users/UserManagementPage';
import { ActivityLogPage } from './features/users/ActivityLogPage';
import { JurnalUmumPage } from './features/reports/JurnalUmumPage';
import { ImportLegacyPage } from './features/migration/ImportLegacyPage';
import { WelcomePage } from './features/dashboard/WelcomePage';
import { useAuthStore, isAdminOrManager, hasPermission } from './stores/auth.store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 menit client-side cache
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Guard route berdasarkan permission & role pengguna
const PermissionRoute: React.FC<{
  children: React.ReactElement;
  permission?: string;
  adminOrManagerOnly?: boolean;
}> = ({ children, permission, adminOrManagerOnly }) => {
  const { user } = useAuthStore();
  if (adminOrManagerOnly && !isAdminOrManager(user)) {
    return <Navigate to="/" replace />;
  }
  if (permission && !hasPermission(user, permission)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Landing Page: Admin & Manager ke Dashboard, staf lainnya ke Welcome Page
const MainLanding: React.FC = () => {
  const { user } = useAuthStore();
  if (isAdminOrManager(user)) {
    return <DashboardPage />;
  }
  return <WelcomePage />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Landing page dinamis: Dashboard untuk Admin/Manager, Welcome Page untuk peran lainnya */}
            <Route index element={<MainLanding />} />
            
            {/* 4 Komoditas Operasional Lengkap */}
            <Route
              path="telur"
              element={
                <PermissionRoute permission="telur:read">
                  <TelurModulePage />
                </PermissionRoute>
              }
            />
            <Route
              path="pakan"
              element={
                <PermissionRoute permission="pakan:read">
                  <PakanModulePage />
                </PermissionRoute>
              }
            />
            <Route
              path="curah-pak-pri"
              element={
                <PermissionRoute permission="pakan:read">
                  <CurahPakPriPage />
                </PermissionRoute>
              }
            />
            <Route
              path="obat"
              element={
                <PermissionRoute permission="obat:read">
                  <MenuObatPage />
                </PermissionRoute>
              }
            />
            <Route
              path="tray"
              element={
                <PermissionRoute permission="tray:read">
                  <MenuTrayPage />
                </PermissionRoute>
              }
            />

            {/* Global Monitoring & Transaksi Penjualan */}
            <Route path="penjualan" element={<PenjualanPage />} />
            <Route
              path="stok"
              element={
                <PermissionRoute permission="stok:read">
                  <StokTelurPage />
                </PermissionRoute>
              }
            />
            <Route
              path="stok-opname"
              element={
                <PermissionRoute permission="stok:opname">
                  <StokOpnamePage />
                </PermissionRoute>
              }
            />
            <Route
              path="konversi-barang"
              element={
                <PermissionRoute permission="stok:opname">
                  <KonversiBarangPage />
                </PermissionRoute>
              }
            />
            <Route
              path="penyesuaian-stok"
              element={
                <PermissionRoute adminOrManagerOnly={true}>
                  <PenyesuaianStokPage />
                </PermissionRoute>
              }
            />

            {/* Keuangan & Kas Operasional */}
            <Route
              path="kas"
              element={
                <PermissionRoute permission="kas:read">
                  <LaporanKasPage />
                </PermissionRoute>
              }
            />
            <Route
              path="hutang"
              element={
                <PermissionRoute permission="hutang:read">
                  <HutangPage />
                </PermissionRoute>
              }
            />
            <Route
              path="piutang"
              element={
                <PermissionRoute permission="piutang:read">
                  <PiutangPage />
                </PermissionRoute>
              }
            />
            <Route
              path="beban"
              element={
                <PermissionRoute permission="beban:read">
                  <BebanPage />
                </PermissionRoute>
              }
            />
            <Route
              path="pendapatan-lain"
              element={
                <PermissionRoute permission="pendapatan_lain:read">
                  <PendapatanLainPage />
                </PermissionRoute>
              }
            />
            <Route
              path="bon-titipan"
              element={
                <PermissionRoute permission="bon_titipan:read">
                  <BonTitipanPage />
                </PermissionRoute>
              }
            />

            {/* Modul Laporan Eksekutif & Akuntansi */}
            <Route
              path="laporan"
              element={
                <PermissionRoute permission="laporan:laba_rugi">
                  <LabaRugiPage />
                </PermissionRoute>
              }
            />
            <Route
              path="laporan-curah"
              element={
                <PermissionRoute permission="laporan:curah">
                  <LabaRugiCurahPage />
                </PermissionRoute>
              }
            />
            <Route
              path="jurnal-umum"
              element={
                <PermissionRoute permission="jurnal:read">
                  <JurnalUmumPage />
                </PermissionRoute>
              }
            />
            <Route
              path="neraca-saldo"
              element={
                <PermissionRoute permission="laporan:neraca_saldo">
                  <NeracaSaldoPage />
                </PermissionRoute>
              }
            />
            <Route
              path="laporan-aset"
              element={
                <PermissionRoute permission="laporan:aset">
                  <LaporanAsetPage />
                </PermissionRoute>
              }
            />

            {/* Master Data & Pengguna */}
            <Route
              path="barangs"
              element={
                <PermissionRoute permission="master:barang">
                  <BarangPage />
                </PermissionRoute>
              }
            />
            <Route
              path="clients"
              element={
                <PermissionRoute permission="master:client">
                  <ClientPage />
                </PermissionRoute>
              }
            />
            <Route
              path="kategoris"
              element={
                <PermissionRoute permission="master:kategori">
                  <KategoriPage />
                </PermissionRoute>
              }
            />
            <Route
              path="detail-kategoris"
              element={
                <PermissionRoute permission="master:kategori">
                  <DetailKategoriPage />
                </PermissionRoute>
              }
            />
            <Route
              path="users"
              element={
                <PermissionRoute permission="users:read">
                  <UserManagementPage />
                </PermissionRoute>
              }
            />
            <Route
              path="logs"
              element={
                <PermissionRoute permission="logs:read">
                  <ActivityLogPage />
                </PermissionRoute>
              }
            />

            {/* Sistem & Migrasi Data */}
            <Route
              path="import-legacy"
              element={
                <PermissionRoute adminOrManagerOnly>
                  <ImportLegacyPage />
                </PermissionRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
