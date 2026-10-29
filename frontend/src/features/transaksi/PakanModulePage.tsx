import React from 'react';
import { Wheat } from 'lucide-react';
import { CommodityTransactionPage } from './CommodityTransactionPage';

export const PakanModulePage: React.FC = () => {
  return (
    <CommodityTransactionPage
      commodityKey="pakan"
      title="Modul Transaksi & Manajemen Pakan Ternak"
      subtitle="Pengelolaan lengkap Pembelian (Pakan Masuk), Penjualan (Pakan Keluar), Retur, dan Stok Fisik Sentrat & Curah"
      icon={Wheat}
      accentColor="amber"
      jenisIds={[8, 9, 10]}
      isEgg={false}
    />
  );
};
export default PakanModulePage;
