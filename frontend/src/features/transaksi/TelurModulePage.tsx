import React from 'react';
import { Egg } from 'lucide-react';
import { CommodityTransactionPage } from './CommodityTransactionPage';

export const TelurModulePage: React.FC = () => {
  return (
    <CommodityTransactionPage
      commodityKey="telur"
      title="Modul Transaksi & Manajemen Telur"
      subtitle="Pengelolaan lengkap Pembelian (Telur Masuk), Penjualan (Telur Keluar), Retur Pembelian/Penjualan, dan Stok Fisik"
      icon={Egg}
      accentColor="emerald"
      jenisIds={[1, 2, 3, 4, 5]}
      isEgg={true}
    />
  );
};
export default TelurModulePage;
