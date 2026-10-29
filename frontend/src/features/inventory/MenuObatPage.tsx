import React from 'react';
import { Pill } from 'lucide-react';
import { CommodityTransactionPage } from '../transaksi/CommodityTransactionPage';

export const MenuObatPage: React.FC = () => {
  return (
    <CommodityTransactionPage
      commodityKey="obat"
      title="Menu Obat-Obatan & Medis Peternakan"
      subtitle="Pengelolaan lengkap Pembelian (Obat Masuk), Penjualan (Obat Keluar), Retur, dan Monitoring Stok Fisik"
      icon={Pill}
      accentColor="indigo"
      jenisIds={[7]}
      isEgg={false}
    />
  );
};
export default MenuObatPage;
