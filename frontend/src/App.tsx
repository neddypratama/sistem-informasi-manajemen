import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { PenjualanPage } from './features/transaksi/PenjualanPage';
import { TelurModulePage } from './features/transaksi/TelurModulePage';
import { PakanModulePage } from './features/transaksi/PakanModulePage';
import { BarangPage } from './features/master/BarangPage';
import { ClientPage } from './features/master/ClientPage';
import { KategoriPage } from './features/master/KategoriPage';
import { DetailKategoriPage } from './features/master/DetailKategoriPage';
import { StokTelurPage } from './features/inventory/StokTelurPage';
import { StokOpnamePage } from './features/inventory/StokOpnamePage';
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
import { useAuthStore } from './stores/auth.store';

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
            <Route index element={<DashboardPage />} />
            {/* 4 Komoditas Operasional Lengkap (Jual, Beli, Retur Jual, Retur Beli, Stok) */}
            <Route path="telur" element={<TelurModulePage />} />
            <Route path="pakan" element={<PakanModulePage />} />
            <Route path="obat" element={<MenuObatPage />} />
            <Route path="tray" element={<MenuTrayPage />} />

            {/* Quick POS & Global Monitoring */}
            <Route path="penjualan" element={<PenjualanPage />} />
            <Route path="stok" element={<StokTelurPage />} />
            <Route path="stok-opname" element={<StokOpnamePage />} />

            {/* Keuangan & Kas Operasional */}
            <Route path="kas" element={<LaporanKasPage />} />
            <Route path="hutang" element={<HutangPage />} />
            <Route path="piutang" element={<PiutangPage />} />
            <Route path="beban" element={<BebanPage />} />
            <Route path="pendapatan-lain" element={<PendapatanLainPage />} />
            <Route path="bon-titipan" element={<BonTitipanPage />} />

            {/* Modul Laporan Eksekutif & Akuntansi */}
            <Route path="laporan" element={<LabaRugiPage />} />
            <Route path="laporan-curah" element={<LabaRugiCurahPage />} />
            <Route path="jurnal-umum" element={<JurnalUmumPage />} />
            <Route path="neraca-saldo" element={<NeracaSaldoPage />} />
            <Route path="laporan-aset" element={<LaporanAsetPage />} />

            {/* Master Data & Pengguna */}
            <Route path="barangs" element={<BarangPage />} />
            <Route path="clients" element={<ClientPage />} />
            <Route path="kategoris" element={<KategoriPage />} />
            <Route path="detail-kategoris" element={<DetailKategoriPage />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="logs" element={<ActivityLogPage />} />

            {/* Sistem & Migrasi Data */}
            <Route path="import-legacy" element={<ImportLegacyPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
