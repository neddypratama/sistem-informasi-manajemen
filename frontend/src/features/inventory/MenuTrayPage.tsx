import React from 'react';
import { Layers } from 'lucide-react';
import { CommodityTransactionPage } from '../transaksi/CommodityTransactionPage';

export const MenuTrayPage: React.FC = () => {
  return (
    <CommodityTransactionPage
      commodityKey="tray"
      title="Menu Egg Tray (Wadah Telur Karton & Plastik)"
      subtitle="Pengelolaan lengkap Pembelian (Tray Masuk), Penjualan (Tray Keluar), Retur, dan Monitoring Stok Fisik"
      icon={Layers}
      accentColor="teal"
      jenisIds={[6]}
      isEgg={false}
    />
  );
};
export default MenuTrayPage;
