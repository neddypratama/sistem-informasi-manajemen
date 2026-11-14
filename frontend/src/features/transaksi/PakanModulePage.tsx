import React from 'react';
import { Wheat } from 'lucide-react';
import { CommodityTransactionPage } from './CommodityTransactionPage';

export const PakanModulePage: React.FC = () => {
  return (
    <CommodityTransactionPage
      commodityKey="pakan"
      title="Pakan Pabrikan (Sentrat)"
      subtitle="Pengelolaan lengkap Pembelian, Penjualan, Retur, dan Stok Fisik Pakan Sentrat / Pabrikan"
      icon={Wheat}
      accentColor="blue"
      jenisIds={[8, 10]}
      allowedBarangJenisIds={[8, 9, 10]}
      isEgg={false}
    />
  );
};

export default PakanModulePage;
