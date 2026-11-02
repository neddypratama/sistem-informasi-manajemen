import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

export const COMMODITY_MAP = [
  { key: 'telur_horn', name: 'Telur Horn', salesKatId: 1, hppKatId: 90 },
  { key: 'telur_bebek', name: 'Telur Bebek', salesKatId: 2, hppKatId: 91 },
  { key: 'telur_puyuh', name: 'Telur Puyuh', salesKatId: 3, hppKatId: 92 },
  { key: 'telur_arab', name: 'Telur Arab', salesKatId: 4, hppKatId: 93 },
  { key: 'telur_asin', name: 'Telur Asin', salesKatId: 5, hppKatId: 94 },
  { key: 'pakan_sentrat', name: 'Pakan Sentrat/Pabrikan', salesKatId: 6, hppKatId: 95 },
  { key: 'pakan_kucing', name: 'Pakan Kucing', salesKatId: 7, hppKatId: 97 },
  { key: 'obat', name: 'Obat-Obatan', salesKatId: 9, hppKatId: 98 },
  { key: 'egg_tray', name: 'Egg Tray', salesKatId: 10, hppKatId: 99 },
];

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Menghasilkan Laporan Laba Rugi dengan per-komoditas: Penjualan - HPP = Laba Kotor
   */
  async getLabaRugi(startDate?: string, endDate?: string) {
    const now = new Date();
    const defaultStart = '2020-01-01';
    const defaultEnd = now.toISOString().slice(0, 10);
    const sStr = startDate && startDate.trim().length > 0 ? startDate.trim() : defaultStart;
    const eStr = endDate && endDate.trim().length > 0 ? endDate.trim() : defaultEnd;
    let dStart = new Date(`${sStr} 00:00:00`);
    let dEnd = new Date(`${eStr} 23:59:59`);
    if (dStart > dEnd) {
      const tmp = dStart;
      dStart = new Date(`${eStr} 00:00:00`);
      dEnd = new Date(`${sStr} 23:59:59`);
    }
    const start = dStart;
    const end = dEnd;

    // 1. Total Penjualan per Kategori Penjualan Komoditas (1 s/d 10, kecuali 8 Pakan Curah) dari Jurnal Umum (Net: Kredit - Debit)
    const salesResult = await this.prisma.$queryRaw<
      { kategori_id: number; name: string; total_penjualan: string | number }[]
    >`
      SELECT jd.kategori_id, k.name, SUM(jd.kredit - jd.debit) as total_penjualan
      FROM jurnal_details jd
      JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
      JOIN kategoris k ON k.id = jd.kategori_id
      WHERE jd.kategori_id BETWEEN 1 AND 10 AND jd.kategori_id != 8
        AND ju.tanggal BETWEEN ${start} AND ${end}
      GROUP BY jd.kategori_id, k.name
    `;

    // 2. Total HPP per Kategori HPP (90 s/d 99, kecuali 96 HPP Pakan Curah) dari Jurnal Umum (Net: Debit - Kredit)
    const hppResult = await this.prisma.$queryRaw<
      { kategori_id: number; name: string; total_hpp: string | number }[]
    >`
      SELECT jd.kategori_id, k.name, SUM(jd.debit - jd.kredit) as total_hpp
      FROM jurnal_details jd
      JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
      JOIN kategoris k ON k.id = jd.kategori_id
      WHERE jd.kategori_id BETWEEN 90 AND 99 AND jd.kategori_id != 96
        AND ju.tanggal BETWEEN ${start} AND ${end}
      GROUP BY jd.kategori_id, k.name
    `;

    // 3. Rincian Beban Operasional per Kategori Beban dari Jurnal Umum (Net: Debit - Kredit)
    const bebanResult = await this.prisma.$queryRaw<
      { kategori_id: number; name: string; group_name: string; total_beban: string | number }[]
    >`
      SELECT jd.kategori_id, k.name, dk.name as group_name, SUM(jd.debit - jd.kredit) as total_beban
      FROM jurnal_details jd
      JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
      JOIN kategoris k ON k.id = jd.kategori_id
      JOIN detail_kategoris dk ON dk.id = k.detail_kategori_id
      WHERE ((dk.name LIKE '%Beban%' OR dk.name LIKE '%Biaya%' OR (jd.kategori_id BETWEEN 22 AND 45)) AND jd.kategori_id != 38)
        AND ju.tanggal BETWEEN ${start} AND ${end}
      GROUP BY jd.kategori_id, k.name, dk.name
      ORDER BY total_beban DESC
    `;

    // 4. Rincian Pendapatan Lain-Lain (Kategori ID 11 s/d 21) dari Jurnal Umum (Net: Kredit - Debit)
    const pendapatanLainResult = await this.prisma.$queryRaw<
      { kategori_id: number; name: string; group_name: string; total_pendapatan: string | number }[]
    >`
      SELECT jd.kategori_id, k.name, dk.name as group_name, SUM(jd.kredit - jd.debit) as total_pendapatan
      FROM jurnal_details jd
      JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
      JOIN kategoris k ON k.id = jd.kategori_id
      JOIN detail_kategoris dk ON dk.id = k.detail_kategori_id
      WHERE jd.kategori_id BETWEEN 11 AND 21
        AND ju.tanggal BETWEEN ${start} AND ${end}
      GROUP BY jd.kategori_id, k.name, dk.name
      ORDER BY total_pendapatan DESC
    `;

    // 5. Rincian Barang per Kategori Penjualan Komoditas (1 s/d 10, kecuali 8 Pakan Curah)
    const commodityItemsResult = await this.prisma.$queryRaw<
      {
        kategori_id: number;
        barang_id: number;
        barang_name: string;
        satuan: string;
        total_qty: string | number;
        total_penjualan: string | number;
        total_hpp: string | number;
      }[]
    >`
      SELECT 
        dt.kategori_id,
        b.id as barang_id,
        b.name as barang_name,
        COALESCE(s.name, 'Kg') as satuan,
        COALESCE(SUM(CASE WHEN t.type = 'RETUR_PENJUALAN' THEN -dt.qty ELSE dt.qty END), 0) as total_qty,
        COALESCE(SUM(CASE WHEN t.type = 'RETUR_PENJUALAN' THEN -dt.subtotal ELSE dt.subtotal END), 0) as total_penjualan,
        COALESCE(SUM(CASE WHEN t.type = 'RETUR_PENJUALAN' THEN -dt.total_hpp ELSE dt.total_hpp END), 0) as total_hpp
      FROM detail_transaksis dt
      JOIN transaksis t ON t.id = dt.transaksi_id
      JOIN barangs b ON b.id = dt.barang_id
      LEFT JOIN satuans s ON s.id = b.satuan_id
      WHERE dt.kategori_id BETWEEN 1 AND 10 AND dt.kategori_id != 8
        AND t.status = 'SELESAI'
        AND t.tanggal BETWEEN ${start} AND ${end}
      GROUP BY dt.kategori_id, b.id, b.name, s.name
      ORDER BY dt.kategori_id ASC, total_penjualan DESC
    `;

    const itemsByKategoriId = new Map<number, any[]>();
    for (const it of commodityItemsResult) {
      const katId = Number(it.kategori_id);
      if (!itemsByKategoriId.has(katId)) {
        itemsByKategoriId.set(katId, []);
      }
      const pen = Number(it.total_penjualan || 0);
      const hp = Number(it.total_hpp || 0);
      const laba = pen - hp;
      const margin = pen > 0 ? Number(((laba / pen) * 100).toFixed(2)) : 0;

      itemsByKategoriId.get(katId)!.push({
        barangId: Number(it.barang_id),
        barang: it.barang_name,
        satuan: it.satuan || 'Kg',
        qty: Number(it.total_qty || 0),
        penjualan: pen,
        hpp: hp,
        labaKotor: laba,
        marginPersen: margin,
      });
    }

    const salesMap = new Map<number, number>();
    for (const r of salesResult) {
      salesMap.set(Number(r.kategori_id), Number(r.total_penjualan || 0));
    }

    const hppMap = new Map<number, number>();
    for (const r of hppResult) {
      hppMap.set(Number(r.kategori_id), Number(r.total_hpp || 0));
    }

    // Bangun komparasi per-komoditas
    const perKomoditas = COMMODITY_MAP.map((c) => {
      const pen = salesMap.get(c.salesKatId) || 0;
      const hp = hppMap.get(c.hppKatId) || 0;
      const laba = pen - hp;
      const margin = pen > 0 ? (laba / pen) * 100 : 0;
      const items = itemsByKategoriId.get(c.salesKatId) || [];
      return {
        key: c.key,
        komoditas: c.name,
        salesKatId: c.salesKatId,
        penjualan: pen,
        hpp: hp,
        labaKotor: laba,
        marginPersen: Number(margin.toFixed(2)),
        items,
      };
    });

    const totalPendapatan = perKomoditas.reduce((acc, curr) => acc + curr.penjualan, 0);
    const totalHpp = perKomoditas.reduce((acc, curr) => acc + curr.hpp, 0);
    const labaKotor = totalPendapatan - totalHpp;
    const marginKotorPersen = totalPendapatan > 0 ? Number(((labaKotor / totalPendapatan) * 100).toFixed(2)) : 0;

    const rincianBeban = bebanResult.map((b) => ({
      kategoriId: Number(b.kategori_id),
      nama: b.name,
      group: b.group_name || 'Beban Operasional Lainnya',
      total: Number(b.total_beban || 0),
    }));

    const rincianPendapatanLain = pendapatanLainResult.map((p) => ({
      kategoriId: Number(p.kategori_id),
      nama: p.name,
      group: p.group_name || 'Pendapatan Non-Komoditas',
      total: Number(p.total_pendapatan || 0),
    }));

    const bebanOperasional = rincianBeban.reduce((acc, curr) => acc + curr.total, 0);
    const totalPendapatanLain = rincianPendapatanLain.reduce((acc, curr) => acc + curr.total, 0);
    const labaBersih = labaKotor - bebanOperasional + totalPendapatanLain;

    // Grouping Beban Operasional seperti struktur Neraca Saldo
    const bebanGroupsMap = new Map<string, { group: string; total: number; details: any[] }>();
    for (const b of bebanResult) {
      const gName = b.group_name || 'Beban Operasional Lainnya';
      if (!bebanGroupsMap.has(gName)) {
        bebanGroupsMap.set(gName, { group: gName, total: 0, details: [] });
      }
      const itemTotal = Number(b.total_beban || 0);
      const grp = bebanGroupsMap.get(gName)!;
      grp.total += itemTotal;
      grp.details.push({
        kategoriId: Number(b.kategori_id),
        nama: b.name,
        total: itemTotal,
        proporsiBeban: bebanOperasional > 0 ? Number(((itemTotal / bebanOperasional) * 100).toFixed(2)) : 0,
      });
    }
    const bebanGroups = Array.from(bebanGroupsMap.values()).sort((a, b) => b.total - a.total);

    // Grouping Pendapatan Lain-Lain seperti struktur Neraca Saldo
    const pendapatanLainGroupsMap = new Map<string, { group: string; total: number; details: any[] }>();
    for (const p of pendapatanLainResult) {
      const gName = p.group_name || 'Pendapatan Non-Komoditas';
      if (!pendapatanLainGroupsMap.has(gName)) {
        pendapatanLainGroupsMap.set(gName, { group: gName, total: 0, details: [] });
      }
      const itemTotal = Number(p.total_pendapatan || 0);
      const grp = pendapatanLainGroupsMap.get(gName)!;
      grp.total += itemTotal;
      grp.details.push({
        kategoriId: Number(p.kategori_id),
        nama: p.name,
        total: itemTotal,
        proporsiPendapatan: totalPendapatanLain > 0 ? Number(((itemTotal / totalPendapatanLain) * 100).toFixed(2)) : 0,
      });
    }
    const pendapatanLainGroups = Array.from(pendapatanLainGroupsMap.values()).sort((a, b) => b.total - a.total);

    return {
      periode: { startDate, endDate },
      totalPendapatan,
      totalHpp,
      labaKotor,
      marginKotorPersen,
      bebanOperasional,
      totalPendapatanLain,
      labaBersih,
      perKomoditas,
      rincianBeban,
      bebanGroups,
      rincianPendapatanLain,
      pendapatanLainGroups,
    };
  }

  /**
   * Laporan Laba Rugi Curah Khusus & Stok Total Curah
   */
  async getLabaRugiCurah(startDate?: string, endDate?: string) {
    const now = new Date();
    const defaultStart = '2020-01-01';
    const defaultEnd = now.toISOString().slice(0, 10);
    const sStr = startDate && startDate.trim().length > 0 ? startDate.trim() : defaultStart;
    const eStr = endDate && endDate.trim().length > 0 ? endDate.trim() : defaultEnd;
    let dStart = new Date(`${sStr} 00:00:00`);
    let dEnd = new Date(`${eStr} 23:59:59`);
    if (dStart > dEnd) {
      const tmp = dStart;
      dStart = new Date(`${eStr} 00:00:00`);
      dEnd = new Date(`${sStr} 23:59:59`);
    }
    const start = dStart;
    const end = dEnd;

    // 1. Ringkasan Penjualan Pakan Curah (Kategori ID 8)
    const salesCurah = await this.prisma.$queryRaw<
      { total_penjualan: string | number; total_qty: string | number }[]
    >`
      SELECT 
        COALESCE(SUM(CASE WHEN t.type = 'RETUR_PENJUALAN' THEN -dt.subtotal ELSE dt.subtotal END), 0) as total_penjualan,
        COALESCE(SUM(CASE WHEN t.type = 'RETUR_PENJUALAN' THEN -dt.qty ELSE dt.qty END), 0) as total_qty
      FROM detail_transaksis dt
      JOIN transaksis t ON t.id = dt.transaksi_id
      WHERE dt.kategori_id = 8
        AND t.status = 'SELESAI'
        AND t.tanggal BETWEEN ${start} AND ${end}
    `;

    // 2. Ringkasan HPP Pakan Curah (Kategori ID 96 dari General Ledger atau dari total_hpp detail_transaksis)
    const hppCurah = await this.prisma.$queryRaw<
      { total_hpp: string | number }[]
    >`
      SELECT COALESCE(SUM(jd.debit - jd.kredit), 0) as total_hpp
      FROM jurnal_details jd
      JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
      WHERE jd.coa_id = 96
        AND ju.tanggal BETWEEN ${start} AND ${end}
    `;

    // 3. Stok Total Fisik Curah Saat Ini (StokBatch Pakan Curah - jenis_id = 9 atau nama komoditas curah)
    const stokCurah = await this.prisma.$queryRaw<
      { total_qty_sisa: string | number; total_nilai_stok: string | number }[]
    >`
      SELECT 
        COALESCE(SUM(sb.qty_sisa), 0) as total_qty_sisa,
        COALESCE(SUM(sb.qty_sisa * sb.harga_beli), 0) as total_nilai_stok
      FROM stok_batches sb
      JOIN barangs b ON b.id = sb.barang_id
      JOIN jenis_barangs jb ON jb.id = b.jenis_id
      WHERE (jb.name = 'Pakan Curah' OR jb.id = 9)
        AND sb.qty_sisa > 0
    `;

    // 4. Detail Barang Curah: Penjualan & HPP per Barang
    const barangSales = await this.prisma.$queryRaw<
      { barang_id: number; barang: string; qty_jual: string | number; penjualan: string | number; hpp: string | number }[]
    >`
      SELECT 
        b.id as barang_id,
        b.name as barang,
        COALESCE(SUM(dt.qty), 0) as qty_jual,
        COALESCE(SUM(dt.subtotal), 0) as penjualan,
        COALESCE(SUM(dt.total_hpp), 0) as hpp
      FROM detail_transaksis dt
      JOIN transaksis t ON t.id = dt.transaksi_id
      JOIN barangs b ON b.id = dt.barang_id
      WHERE dt.kategori_id = 8
        AND t.status = 'SELESAI'
        AND t.tanggal BETWEEN ${start} AND ${end}
      GROUP BY b.id, b.name
      ORDER BY penjualan DESC
    `;

    const rincianBarang = barangSales.map((item) => {
      const pen = Number(item.penjualan || 0);
      const hp = Number(item.hpp || 0);
      const laba = pen - hp;
      const margin = pen > 0 ? (laba / pen) * 100 : 0;
      return {
        barang: item.barang,
        qtyKg: Number(item.qty_jual || 0),
        penjualan: pen,
        hpp: hp,
        labaKotor: laba,
        marginPersen: Number(margin.toFixed(2)),
      };
    });

    const penjualan = Number(salesCurah[0]?.total_penjualan || 0);
    const hppFromJurnal = Number(hppCurah[0]?.total_hpp || 0);
    const hppFromDetails = barangSales.reduce((acc, curr) => acc + Number(curr.hpp || 0), 0);
    const hpp = hppFromJurnal > 0 ? hppFromJurnal : hppFromDetails;
    const labaKotor = penjualan - hpp;
    const margin = penjualan > 0 ? (labaKotor / penjualan) * 100 : 0;

    return {
      periode: { startDate, endDate },
      penjualanCurah: penjualan,
      hppCurah: hpp,
      labaKotorCurah: labaKotor,
      marginCurah: Number(margin.toFixed(2)),
      qtyTerjualKg: Number(salesCurah[0]?.total_qty || 0),
      stokFisikTotalCurah: {
        totalQtyKg: Number(stokCurah[0]?.total_qty_sisa || 0),
        totalNilaiRupiah: Number(stokCurah[0]?.total_nilai_stok || 0),
      },
      rincianBarang,
    };
  }

  /**
   * Rekapitulasi Bon - Titipan (Saldo Silang Peternak/Mitra)
   */
  async getBonTitipan(search?: string, type?: string) {
    const clients = await this.prisma.client.findMany({
      where: {
        ...(search && { name: { contains: search } }),
        ...(type && { type: type as any }),
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        phone: true,
        saldoPiutang: true,
        saldoHutang: true,
      },
      orderBy: { name: 'asc' },
    });

    const items = clients.map((c) => {
      const bon = Number(c.saldoPiutang || 0);
      const titipan = Number(c.saldoHutang || 0);
      const sisa = bon - titipan;
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        type: c.type,
        phone: c.phone,
        bon,
        titipan,
        sisa,
        statusSaldo: sisa > 0 ? 'BON_LEBIH_BESAR' : sisa < 0 ? 'TITIPAN_LEBIH_BESAR' : 'LUNAS_SEIMBANG',
      };
    });

    const totalPiutang = items.reduce((acc, curr) => acc + curr.bon, 0);
    const totalHutang = items.reduce((acc, curr) => acc + curr.titipan, 0);
    const totalNet = totalPiutang - totalHutang;

    return {
      ringkasan: {
        totalMitra: items.length,
        totalPiutang,
        totalHutang,
        totalNet,
      },
      items,
    };
  }

  /**
   * Menghasilkan Laporan Neraca Saldo (Trial Balance) 5 Kelompok Akun
   * (Pendapatan, Pengeluaran, Aset, Liabilitas, Ekuitas)
   * Mendukung mode:
   * - 'gross': Mutasi Bruto Kumulatif Debit & Kredit (Sesuai SIM Lama / Gross Turnover Rp 450 M)
   * - 'net': Saldo Bersih Buku Besar (Standar Akuntansi SAK/IFRS Ending Balance Rp 119 M)
   */
  async getNeracaSaldo(startDate?: string, endDate?: string, mode: string = 'gross') {
    const reportMode = mode === 'net' ? 'net' : 'gross';

    let dateFilter = Prisma.sql`WHERE (t.status IS NULL OR t.status != 'BATAL')`;
    const sStr = startDate && startDate.trim().length > 0 ? startDate.trim() : null;
    const eStr = endDate && endDate.trim().length > 0 ? endDate.trim() : null;

    if (sStr && eStr) {
      let dStart = new Date(`${sStr} 00:00:00`);
      let dEnd = new Date(`${eStr} 23:59:59`);
      if (dStart > dEnd) {
        const tmp = dStart;
        dStart = new Date(`${eStr} 00:00:00`);
        dEnd = new Date(`${sStr} 23:59:59`);
      }
      dateFilter = Prisma.sql`WHERE (t.status IS NULL OR t.status != 'BATAL') AND ju.tanggal BETWEEN ${dStart} AND ${dEnd}`;
    } else if (sStr) {
      const dStart = new Date(`${sStr} 00:00:00`);
      dateFilter = Prisma.sql`WHERE (t.status IS NULL OR t.status != 'BATAL') AND ju.tanggal >= ${dStart}`;
    } else if (eStr) {
      const dEnd = new Date(`${eStr} 23:59:59`);
      dateFilter = Prisma.sql`WHERE (t.status IS NULL OR t.status != 'BATAL') AND ju.tanggal <= ${dEnd}`;
    }

    const rows = await this.prisma.$queryRaw<
      {
        kategori_id: number;
        kategori_name: string;
        kategori_code: string | null;
        detail_kategori_id: number;
        group_name: string;
        group_type: string;
        total_debit: string | number;
        total_kredit: string | number;
      }[]
    >`
      SELECT 
        k.id as kategori_id,
        k.name as kategori_name,
        k.code as kategori_code,
        dk.id as detail_kategori_id,
        dk.name as group_name,
        dk.type as group_type,
        COALESCE(SUM(filtered_jd.debit), 0) as total_debit,
        COALESCE(SUM(filtered_jd.kredit), 0) as total_kredit
      FROM detail_kategoris dk
      JOIN kategoris k ON k.detail_kategori_id = dk.id
      LEFT JOIN (
        SELECT jd.kategori_id, jd.debit, jd.kredit
        FROM jurnal_details jd
        JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
        LEFT JOIN transaksis t ON t.id = ju.transaksi_id
        ${dateFilter}
      ) filtered_jd ON filtered_jd.kategori_id = k.id
      GROUP BY k.id, k.name, k.code, dk.id, dk.name, dk.type
      ORDER BY dk.id, k.id
    `;

    const groupsByType: Record<string, Map<string, any>> = {
      Pendapatan: new Map(),
      Pengeluaran: new Map(),
      Aset: new Map(),
      Liabilitas: new Map(),
      Ekuitas: new Map(),
    };

    let grandTotalDebit = 0;
    let grandTotalKredit = 0;
    let grandGrossDebit = 0;
    let grandGrossKredit = 0;
    let grandNetDebit = 0;
    let grandNetKredit = 0;

    for (const r of rows) {
      const type = r.group_type || 'Aset';
      const grpMap = groupsByType[type] || (groupsByType[type] = new Map());
      const grpName = r.group_name;
      const rawDebit = Number(r.total_debit || 0);
      const rawKredit = Number(r.total_kredit || 0);

      grandGrossDebit += rawDebit;
      grandGrossKredit += rawKredit;

      let netDebit = 0;
      let netKredit = 0;
      if (type === 'Aset' || type === 'Pengeluaran' || type === 'Beban') {
        netDebit = rawDebit - rawKredit;
        netKredit = 0;
        grandNetDebit += netDebit;
      } else {
        netDebit = 0;
        netKredit = rawKredit - rawDebit;
        grandNetKredit += netKredit;
      }

      let debit = 0;
      let kredit = 0;

      if (reportMode === 'gross') {
        debit = rawDebit;
        kredit = rawKredit;
      } else {
        debit = netDebit;
        kredit = netKredit;
      }

      grandTotalDebit += debit;
      grandTotalKredit += kredit;

      if (!grpMap.has(grpName)) {
        grpMap.set(grpName, {
          group: grpName,
          detailKategoriId: Number(r.detail_kategori_id),
          debit: 0,
          kredit: 0,
          grossDebit: 0,
          grossKredit: 0,
          netDebit: 0,
          netKredit: 0,
          details: [],
        });
      }

      const g = grpMap.get(grpName);
      g.debit += debit;
      g.kredit += kredit;
      g.grossDebit += rawDebit;
      g.grossKredit += rawKredit;
      g.netDebit += netDebit;
      g.netKredit += netKredit;

      g.details.push({
        kategoriId: Number(r.kategori_id),
        kategori: r.kategori_name,
        code: r.kategori_code,
        debit,
        kredit,
        rawDebit,
        rawKredit,
        netDebit,
        netKredit,
      });
    }

    const formatKelompok = (type: string) => {
      const map = groupsByType[type] || new Map();
      const list = Array.from(map.values());
      const totalDebit = list.reduce((s, it) => s + it.debit, 0);
      const totalKredit = list.reduce((s, it) => s + it.kredit, 0);
      return {
        type,
        groups: list,
        totalDebit,
        totalKredit,
      };
    };

    const selisih = Math.abs(grandTotalDebit - grandTotalKredit);

    return {
      periode: { startDate: startDate || null, endDate: endDate || null },
      mode: reportMode,
      pendapatan: formatKelompok('Pendapatan'),
      pengeluaran: formatKelompok('Pengeluaran'),
      aset: formatKelompok('Aset'),
      liabilitas: formatKelompok('Liabilitas'),
      ekuitas: formatKelompok('Ekuitas'),
      totalDebit: grandTotalDebit,
      totalKredit: grandTotalKredit,
      selisih,
      isBalanced: selisih < 1,
      summary: {
        mode: reportMode,
        gross: { totalDebit: grandGrossDebit, totalKredit: grandGrossKredit },
        net: { totalDebit: grandNetDebit, totalKredit: grandNetKredit },
      },
    };
  }

  /**
   * Menghasilkan Laporan Aset & Liabilitas (Neraca Posisi Keuangan)
   */
  async getLaporanAset(startDate?: string, endDate?: string) {
    let dateCondition = Prisma.empty;
    let clientDateCondition = Prisma.empty;
    let start: Date | null = null;
    let end: Date | null = null;
    const sStr = startDate && startDate.trim().length > 0 ? startDate.trim() : null;
    const eStr = endDate && endDate.trim().length > 0 ? endDate.trim() : null;

    if (sStr && eStr) {
      let dStart = new Date(`${sStr} 00:00:00`);
      let dEnd = new Date(`${eStr} 23:59:59`);
      if (dStart > dEnd) {
        const tmp = dStart;
        dStart = new Date(`${eStr} 00:00:00`);
        dEnd = new Date(`${sStr} 23:59:59`);
      }
      start = dStart;
      end = dEnd;
      dateCondition = Prisma.sql`AND ju.tanggal BETWEEN ${start} AND ${end}`;
      clientDateCondition = Prisma.sql`AND t.tanggal BETWEEN ${start} AND ${end}`;
    } else if (sStr) {
      start = new Date(`${sStr} 00:00:00`);
      dateCondition = Prisma.sql`AND ju.tanggal >= ${start}`;
      clientDateCondition = Prisma.sql`AND t.tanggal >= ${start}`;
    } else if (eStr) {
      end = new Date(`${eStr} 23:59:59`);
      dateCondition = Prisma.sql`AND ju.tanggal <= ${end}`;
      clientDateCondition = Prisma.sql`AND t.tanggal <= ${end}`;
    }

    // 1. Ambil saldo akun non-piutang/non-hutang (Kas, Bank, Stok, dsb.) dari jurnal_details
    // Mengikuti logika SIM Lama: akun 'Penyesuaian Stok' dikecualikan
    const nonClientRows = await this.prisma.$queryRaw<
      {
        kategori_id: number;
        kategori_name: string;
        kategori_code: string | null;
        detail_kategori_id: number;
        group_name: string;
        group_type: string;
        saldo: string | number;
      }[]
    >`
      SELECT 
        k.id as kategori_id,
        k.name as kategori_name,
        k.code as kategori_code,
        dk.id as detail_kategori_id,
        dk.name as group_name,
        dk.type as group_type,
        COALESCE(
          SUM(
            CASE 
              WHEN dk.type = 'Aset' THEN jd.debit - jd.kredit
              ELSE jd.kredit - jd.debit
            END
          ), 0
        ) as saldo
      FROM detail_kategoris dk
      JOIN kategoris k ON k.detail_kategori_id = dk.id
      LEFT JOIN (
        SELECT jd.kategori_id, jd.debit, jd.kredit
        FROM jurnal_details jd
        JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
        LEFT JOIN transaksis t ON t.id = ju.transaksi_id
        WHERE (t.status IS NULL OR t.status != 'BATAL')
          ${dateCondition}
      ) jd ON jd.kategori_id = k.id
      WHERE dk.type IN ('Aset', 'Liabilitas')
        AND k.name != 'Penyesuaian Stok'
      GROUP BY k.id, k.name, k.code, dk.id, dk.name, dk.type
      ORDER BY dk.id, k.id
    `;

    const flatAset: Record<string, number> = {};
    const flatLiabilitas: Record<string, number> = {};

    for (const r of nonClientRows) {
      if (r.group_type === 'Aset') {
        flatAset[r.kategori_name] = Number(r.saldo || 0);
      } else {
        flatLiabilitas[r.kategori_name] = Number(r.saldo || 0);
      }
    }

    // 2. Ambil saldo tiap client dan NETTING per mitra (persis logika AssetReportService SIM Lama)
    let clientRows: { id: bigint; name: string; type: string; saldo_piutang: string | number; saldo_hutang: string | number }[];
    if (!sStr && !eStr) {
      clientRows = await this.prisma.$queryRaw<
        { id: bigint; name: string; type: string; saldo_piutang: string | number; saldo_hutang: string | number }[]
      >`
        SELECT id, name, type, saldo_piutang, saldo_hutang
        FROM clients
      `;
    } else {
      clientRows = await this.prisma.$queryRaw<
        { id: bigint; name: string; type: string; saldo_piutang: string | number; saldo_hutang: string | number }[]
      >`
        SELECT 
          c.id, c.name, c.type,
          COALESCE((
            SELECT SUM(t.total) FROM transaksis t
            WHERE t.client_id = c.id AND t.type = 'PENJUALAN' AND t.status = 'SELESAI'
              AND t.payment_method = 'KREDIT_BON'
              ${clientDateCondition}
          ), 0) as saldo_piutang,
          COALESCE((
            SELECT SUM(t.total) FROM transaksis t
            WHERE t.client_id = c.id AND t.type = 'PEMBELIAN' AND t.status = 'SELESAI'
              AND t.payment_method = 'KREDIT_BON'
              ${clientDateCondition}
          ), 0) as saldo_hutang
        FROM clients c
      `;
    }

    const piutangNet: Record<string, number> = {
      'Piutang Peternak': 0,
      'Piutang Karyawan': 0,
      'Piutang Pedagang': 0,
      'Supplier Bp.Supriyadi': 0,
      'Piutang Tray Diamond /DM': 0,
      'Piutang Tray Super Buah /SB': 0,
      'Piutang Tray Random': 0,
      'Piutang Obat SK': 0,
      'Piutang Obat Ponggok': 0,
      'Piutang Obat Random': 0,
      'Piutang Sentrat SK': 0,
      'Piutang Sentrat Ponggok': 0,
      'Piutang Sentrat Random': 0,
    };

    const hutangNet: Record<string, number> = {
      'Hutang Peternak': 0,
      'Hutang Karyawan': 0,
      'Hutang Pedagang': 0,
      'Saldo Bp.Supriyadi': 0,
      'Hutang Tray Diamond /DM': 0,
      'Hutang Tray Super Buah /SB': 0,
      'Hutang Tray Random': 0,
      'Hutang Obat SK': 0,
      'Hutang Obat Ponggok': 0,
      'Hutang Obat Random': 0,
      'Hutang Sentrat SK': 0,
      'Hutang Sentrat Ponggok': 0,
      'Hutang Sentrat Random': 0,
    };

    for (const c of clientRows) {
      const p = Number(c.saldo_piutang || 0);
      const h = Number(c.saldo_hutang || 0);
      const saldo = p - h;

      if (saldo === 0) continue;

      if (saldo > 0) {
        if (c.type === 'Peternak') piutangNet['Piutang Peternak'] += saldo;
        else if (c.type === 'Pedagang') piutangNet['Piutang Pedagang'] += saldo;
        else if (c.type === 'Karyawan') piutangNet['Piutang Karyawan'] += saldo;
        else if (c.type === 'Supplier') {
          for (const k in piutangNet) {
            if (k.includes(c.name)) piutangNet[k] += saldo;
          }
        }
      } else {
        const nilai = Math.abs(saldo);
        if (c.type === 'Peternak') hutangNet['Hutang Peternak'] += nilai;
        else if (c.type === 'Pedagang') hutangNet['Hutang Pedagang'] += nilai;
        else if (c.type === 'Karyawan') hutangNet['Hutang Karyawan'] += nilai;
        else if (c.type === 'Supplier') {
          for (const k in hutangNet) {
            if (k.includes(c.name)) hutangNet[k] += nilai;
          }
        }
      }
    }

    // Timpa akun piutang & hutang dengan hasil netting
    for (const k in piutangNet) flatAset[k] = piutangNet[k];
    for (const k in hutangNet) flatLiabilitas[k] = hutangNet[k];

    // 3. Susun kelompok laporan (detail_kategoris)
    const mapping = await this.prisma.$queryRaw<
      { dk_id: number; group_name: string; group_type: string; kat_id: number; kat_code: string | null; kat_name: string }[]
    >`
      SELECT dk.id as dk_id, dk.name as group_name, dk.type as group_type, k.id as kat_id, k.code as kat_code, k.name as kat_name
      FROM detail_kategoris dk
      LEFT JOIN kategoris k ON k.detail_kategori_id = dk.id
      WHERE dk.type IN ('Aset', 'Liabilitas')
      ORDER BY dk.id, k.id
    `;

    const asetMap = new Map<string, any>();
    const liabilitasMap = new Map<string, any>();

    for (const row of mapping) {
      const isAset = row.group_type === 'Aset';
      const targetMap = isAset ? asetMap : liabilitasMap;
      const flatSource = isAset ? flatAset : flatLiabilitas;

      if (!targetMap.has(row.group_name)) {
        targetMap.set(row.group_name, {
          group: row.group_name,
          detailKategoriId: Number(row.dk_id),
          total: 0,
          details: [],
        });
      }

      const grp = targetMap.get(row.group_name);
      const saldo = Number(flatSource[row.kat_name] || 0);
      grp.total += saldo;
      grp.details.push({
        kategoriId: Number(row.kat_id),
        kategori: row.kat_name,
        code: row.kat_code,
        saldo,
      });
    }

    const asetGroups = Array.from(asetMap.values());
    const liabilitasGroups = Array.from(liabilitasMap.values());

    const totalAset = asetGroups.reduce((acc, curr) => acc + curr.total, 0);
    const totalLiabilitas = liabilitasGroups.reduce((acc, curr) => acc + curr.total, 0);
    const totalModal = totalAset - totalLiabilitas;

    return {
      periode: { startDate: startDate || null, endDate: endDate || null },
      totalAset,
      totalLiabilitas,
      totalModal,
      asetGroups,
      liabilitasGroups,
    };
  }

  /**
   * Menghasilkan Ringkasan Laporan Neraca & Aset (Backward compatibility)
   */
  async getNeraca(startDate?: string, endDate?: string) {
    return this.getLaporanAset(startDate, endDate);
  }

  /**
   * Laporan Kas & Bank Harian (Persis seperti sistem lama dengan filter fleksibel)
   */
  async getLaporanKas(
    startDate: string,
    endDate: string,
    search?: string,
    kasAccountId?: number,
    type?: string,
    limit: number = 200,
  ) {
    const start = new Date(`${startDate} 00:00:00`);
    const end = new Date(`${endDate} 23:59:59`);

    // 8 Akun Kas & Bank resmi Bima Pratama
    const KAS_BANK_ACCOUNTS = [
      { id: 64, name: 'Kas Tunai' },
      { id: 71, name: 'Kas Deby' },
      { id: 65, name: 'Bank BCA Binti Wasilah' },
      { id: 66, name: 'Bank BCA Masduki' },
      { id: 67, name: 'Bank BRI Binti Wasilah' },
      { id: 68, name: 'Bank BRI Masduki' },
      { id: 69, name: 'Bank BNI Binti Wasilah' },
      { id: 70, name: 'Bank BNI Bima Pratama' },
    ];

    // 1. Hitung Saldo Awal (sebelum startDate: sum(debit) - sum(kredit))
    const saldoAwalRows = await this.prisma.$queryRaw<
      { coa_id: number; debit: string | number; kredit: string | number }[]
    >`
      SELECT jd.coa_id, SUM(jd.debit) as debit, SUM(jd.kredit) as kredit
      FROM jurnal_details jd
      JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
      LEFT JOIN transaksis t ON t.id = ju.transaksi_id
      WHERE jd.coa_id BETWEEN 64 AND 71
        AND (t.status IS NULL OR t.status != 'BATAL')
        AND ju.tanggal < ${start}
      GROUP BY jd.coa_id
    `;

    const saldoAwalMap = new Map<number, number>();
    for (const r of saldoAwalRows) {
      saldoAwalMap.set(Number(r.coa_id), Number(r.debit || 0) - Number(r.kredit || 0));
    }

    // 2. Hitung Pemasukan (Debit) & Pengeluaran (Kredit) pada rentang tanggal
    const mutasiPeriodeRows = await this.prisma.$queryRaw<
      { coa_id: number; debit: string | number; kredit: string | number }[]
    >`
      SELECT jd.coa_id, SUM(jd.debit) as debit, SUM(jd.kredit) as kredit
      FROM jurnal_details jd
      JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
      LEFT JOIN transaksis t ON t.id = ju.transaksi_id
      WHERE jd.coa_id BETWEEN 64 AND 71
        AND (t.status IS NULL OR t.status != 'BATAL')
        AND ju.tanggal BETWEEN ${start} AND ${end}
      GROUP BY jd.coa_id
    `;

    const mutasiMap = new Map<number, { debit: number; kredit: number }>();
    for (const r of mutasiPeriodeRows) {
      mutasiMap.set(Number(r.coa_id), {
        debit: Number(r.debit || 0),
        kredit: Number(r.kredit || 0),
      });
    }

    // Rekapitulasi per Akun Kas / Bank
    const rekapAkun = KAS_BANK_ACCOUNTS.map((acc) => {
      const awal = saldoAwalMap.get(acc.id) || 0;
      const mutasi = mutasiMap.get(acc.id) || { debit: 0, kredit: 0 };
      const pemasukan = mutasi.debit;
      const pengeluaran = mutasi.kredit;
      const akhir = awal + pemasukan - pengeluaran;
      return {
        id: acc.id,
        nama: acc.name,
        saldoAwal: awal,
        pemasukan,
        pengeluaran,
        saldoAkhir: akhir,
      };
    });

    const totalSaldoAwal = rekapAkun.reduce((a, b) => a + b.saldoAwal, 0);
    const totalPemasukan = rekapAkun.reduce((a, b) => a + b.pemasukan, 0);
    const totalPengeluaran = rekapAkun.reduce((a, b) => a + b.pengeluaran, 0);
    const totalSaldoAkhir = rekapAkun.reduce((a, b) => a + b.saldoAkhir, 0);

    // 3. Mutasi Arus Kas Rinci (Buku Kas pergerakan transaksi)
    const searchQuery = search ? `%${search}%` : null;
    const accountFilter = kasAccountId ? Prisma.sql`AND jd.coa_id = ${kasAccountId}` : Prisma.sql`AND jd.coa_id BETWEEN 64 AND 71`;
    const typeFilter = type === 'MASUK'
      ? Prisma.sql`AND jd.debit > 0`
      : type === 'KELUAR'
      ? Prisma.sql`AND jd.kredit > 0`
      : Prisma.empty;

    const mutasiRinci = await this.prisma.$queryRaw<any[]>`
      SELECT 
        ju.id as jurnal_id,
        ju.nomor_jurnal,
        ju.tanggal,
        ju.keterangan,
        jd.coa_id,
        coa.name as nama_akun,
        jd.debit,
        jd.kredit,
        t.invoice,
        t.payment_method,
        c.name as client_name
      FROM jurnal_details jd
      JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
      JOIN chart_of_accounts coa ON coa.id = jd.coa_id
      LEFT JOIN transaksis t ON t.id = ju.transaksi_id
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE (t.status IS NULL OR t.status != 'BATAL')
        AND ju.tanggal BETWEEN ${start} AND ${end}
        ${accountFilter}
        ${typeFilter}
        ${searchQuery ? Prisma.sql`AND (ju.keterangan LIKE ${searchQuery} OR ju.nomor_jurnal LIKE ${searchQuery} OR t.invoice LIKE ${searchQuery} OR c.name LIKE ${searchQuery})` : Prisma.empty}
      ORDER BY ju.tanggal DESC, ju.id DESC
      LIMIT ${Number(limit) || 200}
    `;

    return {
      periode: { startDate, endDate },
      totalSaldoAwal,
      totalPemasukan,
      totalPengeluaran,
      totalSaldoAkhir,
      rekapAkun,
      mutasiRinci,
    };
  }

  /**
   * Menampilkan Daftar Jurnal Umum Lengkap beserta Detail Akun (Double-Entry General Journal)
   */
  async getJurnalUmum(query?: {
    page?: number;
    limit?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = query?.page || 1;
    const limit = query?.limit || 25;
    const skip = (page - 1) * limit;

    const where: any = {};
    const sStr = query?.startDate && query.startDate.trim().length > 0 ? query.startDate.trim() : null;
    const eStr = query?.endDate && query.endDate.trim().length > 0 ? query.endDate.trim() : null;

    if (sStr && eStr) {
      let dStart = new Date(`${sStr} 00:00:00`);
      let dEnd = new Date(`${eStr} 23:59:59`);
      if (dStart > dEnd) {
        const tmp = dStart;
        dStart = new Date(`${eStr} 00:00:00`);
        dEnd = new Date(`${sStr} 23:59:59`);
      }
      where.tanggal = { gte: dStart, lte: dEnd };
    } else if (sStr) {
      where.tanggal = { gte: new Date(`${sStr} 00:00:00`) };
    } else if (eStr) {
      where.tanggal = { lte: new Date(`${eStr} 23:59:59`) };
    }

    if (query?.search) {
      where.OR = [
        { nomorJurnal: { contains: query.search } },
        { keterangan: { contains: query.search } },
        { transaksi: { invoice: { contains: query.search } } },
      ];
    }

    const [jurnals, total] = await Promise.all([
      this.prisma.jurnalUmum.findMany({
        where,
        include: {
          transaksi: {
            select: { id: true, invoice: true, type: true, paymentMethod: true, total: true },
          },
          details: {
            include: {
              coa: { select: { id: true, code: true, name: true, type: true } },
              kategori: { select: { id: true, name: true, code: true } },
            },
            orderBy: [{ debit: 'desc' }, { kredit: 'desc' }, { id: 'asc' }],
          },
        },
        orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.jurnalUmum.count({ where }),
    ]);

    const formatted = jurnals.map((j) => {
      const totalDebit = j.details.reduce((acc, curr) => acc + Number(curr.debit), 0);
      const totalKredit = j.details.reduce((acc, curr) => acc + Number(curr.kredit), 0);

      return {
        id: Number(j.id),
        nomorJurnal: j.nomorJurnal,
        tanggal: j.tanggal,
        keterangan: j.keterangan,
        transaksiId: j.transaksiId ? Number(j.transaksiId) : null,
        invoice: j.transaksi?.invoice || null,
        transaksiType: j.transaksi?.type || null,
        paymentMethod: j.transaksi?.paymentMethod || null,
        totalDebit,
        totalKredit,
        isBalanced: Math.abs(totalDebit - totalKredit) < 0.01,
        details: j.details.map((d) => ({
          id: Number(d.id),
          coaId: Number(d.coaId),
          coaCode: d.coa.code,
          coaName: d.coa.name,
          coaType: d.coa.type,
          kategoriName: d.kategori?.name || null,
          debit: Number(d.debit),
          kredit: Number(d.kredit),
        })),
      };
    });

    return {
      items: formatted,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Eksekutif Dashboard Analytics untuk Manajemen & Business Data Analyst
   */
  async getDashboardAnalytics() {
    // 1. Kas & Bank total
    const kasRows = await this.prisma.$queryRaw<{ saldo: string | number }[]>`
      SELECT COALESCE(SUM(jd.debit) - SUM(jd.kredit), 0) as saldo
      FROM jurnal_details jd
      JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
      LEFT JOIN transaksis t ON t.id = ju.transaksi_id
      WHERE jd.coa_id BETWEEN 64 AND 71
        AND (t.status IS NULL OR t.status != 'BATAL')
    `;
    const totalKasBank = Number(kasRows[0]?.saldo || 0);

    // 2. Piutang & Hutang total
    const piutangRows = await this.prisma.$queryRaw<{ saldo: string | number }[]>`
      SELECT COALESCE(SUM(saldo_piutang), 0) as saldo FROM clients
    `;
    const totalPiutang = Number(piutangRows[0]?.saldo || 0);

    const hutangRows = await this.prisma.$queryRaw<{ saldo: string | number }[]>`
      SELECT COALESCE(SUM(saldo_hutang), 0) as saldo FROM clients
    `;
    const totalHutang = Number(hutangRows[0]?.saldo || 0);

    // 3. Top 5 Debitur & Kreditur
    const topDebitur = await this.prisma.client.findMany({
      where: { saldoPiutang: { gt: 0 } },
      orderBy: { saldoPiutang: 'desc' },
      take: 5,
      select: { id: true, name: true, type: true, saldoPiutang: true, phone: true },
    });

    const topKreditur = await this.prisma.client.findMany({
      where: { saldoHutang: { gt: 0 } },
      orderBy: { saldoHutang: 'desc' },
      take: 5,
      select: { id: true, name: true, type: true, saldoHutang: true, phone: true },
    });

    // 4. Inventory valuation & alerts
    const barangs = await this.prisma.barang.findMany({
      where: { isActive: true },
      include: {
        jenis: true,
        stokBatches: {
          where: { qtySisa: { gt: 0 } },
          select: { qtySisa: true, hargaBeli: true },
        },
      },
    });

    let totalNilaiStok = 0;
    let itemsDibawahMinimum = 0;
    const stokPerJenisMap = new Map<string, { jenis: string; totalNilai: number; totalQty: number }>();

    for (const b of barangs) {
      const sisa = b.stokBatches.reduce((acc, curr) => acc + Number(curr.qtySisa), 0);
      const nilai = b.stokBatches.reduce((acc, curr) => acc + Number(curr.qtySisa) * Number(curr.hargaBeli), 0);
      totalNilaiStok += nilai;
      if (sisa <= Number(b.stokMinimum)) {
        itemsDibawahMinimum++;
      }
      const jName = b.jenis?.name || 'Lain-Lain';
      if (!stokPerJenisMap.has(jName)) {
        stokPerJenisMap.set(jName, { jenis: jName, totalNilai: 0, totalQty: 0 });
      }
      const j = stokPerJenisMap.get(jName)!;
      j.totalNilai += nilai;
      j.totalQty += sisa;
    }

    // 5. Monthly Revenue, HPP, and Beban (Last 6 months)
    const monthlySummary = await this.prisma.$queryRaw<
      {
        bulan: string;
        penjualan: string | number;
        hpp: string | number;
      }[]
    >`
      SELECT 
        DATE_FORMAT(t.tanggal, '%Y-%m') as bulan,
        COALESCE(SUM(dt.subtotal), 0) as penjualan,
        COALESCE(SUM(dt.total_hpp), 0) as hpp
      FROM transaksis t
      JOIN detail_transaksis dt ON dt.transaksi_id = t.id
      WHERE t.type = 'PENJUALAN' AND t.status = 'SELESAI'
        AND t.tanggal >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(t.tanggal, '%Y-%m')
      ORDER BY bulan ASC
    `;

    // 6. Beban Operasional by Month
    const monthlyBeban = await this.prisma.$queryRaw<
      {
        bulan: string;
        total_beban: string | number;
      }[]
    >`
      SELECT 
        DATE_FORMAT(t.tanggal, '%Y-%m') as bulan,
        COALESCE(SUM(t.total), 0) as total_beban
      FROM transaksis t
      WHERE t.status = 'SELESAI'
        AND (t.invoice LIKE '%PGN%' OR t.invoice LIKE '%BBN%')
        AND t.tanggal >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(t.tanggal, '%Y-%m')
      ORDER BY bulan ASC
    `;

    const monthlyBebanMap = new Map<string, number>();
    for (const b of monthlyBeban) {
      monthlyBebanMap.set(b.bulan, Number(b.total_beban || 0));
    }

    // 7. Monthly Arus Kas Masuk & Kas Keluar
    const monthlyKas = await this.prisma.$queryRaw<
      {
        bulan: string;
        kas_masuk: string | number;
        kas_keluar: string | number;
      }[]
    >`
      SELECT 
        DATE_FORMAT(ju.tanggal, '%Y-%m') as bulan,
        COALESCE(SUM(jd.debit), 0) as kas_masuk,
        COALESCE(SUM(jd.kredit), 0) as kas_keluar
      FROM jurnal_details jd
      JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
      LEFT JOIN transaksis t ON t.id = ju.transaksi_id
      WHERE jd.coa_id BETWEEN 64 AND 71
        AND (t.status IS NULL OR t.status != 'BATAL')
        AND ju.tanggal >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(ju.tanggal, '%Y-%m')
      ORDER BY bulan ASC
    `;

    const monthlyKasMap = new Map<string, { masuk: number; keluar: number }>();
    for (const k of monthlyKas) {
      monthlyKasMap.set(k.bulan, {
        masuk: Number(k.kas_masuk || 0),
        keluar: Number(k.kas_keluar || 0),
      });
    }

    // 8. Monthly Pendapatan Lain-Lain (LNY/DPT)
    const monthlyLain = await this.prisma.$queryRaw<
      {
        bulan: string;
        total_lain: string | number;
      }[]
    >`
      SELECT 
        DATE_FORMAT(t.tanggal, '%Y-%m') as bulan,
        COALESCE(SUM(t.total), 0) as total_lain
      FROM transaksis t
      WHERE t.status = 'SELESAI'
        AND (t.invoice LIKE '%LNY%' OR t.invoice LIKE '%DPT%')
        AND t.tanggal >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(t.tanggal, '%Y-%m')
      ORDER BY bulan ASC
    `;

    const monthlyLainMap = new Map<string, number>();
    for (const l of monthlyLain) {
      monthlyLainMap.set(l.bulan, Number(l.total_lain || 0));
    }

    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

    const monthlyTrends = monthlySummary.map((m) => {
      const omzet = Number(m.penjualan || 0);
      const hpp = Number(m.hpp || 0);
      const grossProfit = omzet - hpp;
      const beban = monthlyBebanMap.get(m.bulan) || 0;
      const pendapatanLain = monthlyLainMap.get(m.bulan) || 0;
      const totalPendapatan = omzet + pendapatanLain;
      const totalPengeluaran = hpp + beban;
      const netProfit = totalPendapatan - totalPengeluaran;
      const kas = monthlyKasMap.get(m.bulan) || { masuk: 0, keluar: 0 };

      const parts = m.bulan.split('-');
      const mIdx = parseInt(parts[1] || '1', 10) - 1;
      const label = `${MONTH_NAMES[mIdx] || parts[1]} '${parts[0]?.slice(2)}`;

      return {
        bulan: m.bulan,
        label,
        omzet,
        pendapatan: totalPendapatan,
        pendapatanLain,
        hpp,
        beban,
        pengeluaranBeban: beban,
        totalPengeluaran,
        grossProfit,
        netProfit,
        kasMasuk: kas.masuk,
        kasKeluar: kas.keluar,
      };
    });

    // 7. Overall YTD P&L summary
    const today = new Date().toISOString().slice(0, 10);
    const labaRugiSummary = await this.getLabaRugi('2026-01-01', today);

    // 8. Recent 6 Transactions
    const recentTransactions = await this.prisma.transaksi.findMany({
      take: 6,
      orderBy: { tanggal: 'desc' },
      include: {
        client: { select: { name: true, type: true } },
      },
    });

    return {
      financials: {
        totalOmzet: labaRugiSummary.totalPendapatan,
        totalHpp: labaRugiSummary.totalHpp,
        labaKotor: labaRugiSummary.labaKotor,
        marginKotorPersen: labaRugiSummary.marginKotorPersen,
        bebanOperasional: labaRugiSummary.bebanOperasional,
        pendapatanLain: labaRugiSummary.totalPendapatanLain,
        labaBersih: labaRugiSummary.labaBersih,
        totalKasBank,
        totalPiutang,
        totalHutang,
        totalNilaiStok,
        itemsDibawahMinimum,
        totalItems: barangs.length,
      },
      perKomoditas: labaRugiSummary.perKomoditas,
      monthlyTrends,
      stokPerJenis: Array.from(stokPerJenisMap.values()),
      topDebitur: topDebitur.map((d) => ({
        id: Number(d.id),
        name: d.name,
        type: d.type,
        saldoPiutang: Number(d.saldoPiutang),
        phone: d.phone,
      })),
      topKreditur: topKreditur.map((k) => ({
        id: Number(k.id),
        name: k.name,
        type: k.type,
        saldoHutang: Number(k.saldoHutang),
        phone: k.phone,
      })),
      recentTransactions: recentTransactions.map((tx) => ({
        id: Number(tx.id),
        invoice: tx.invoice,
        tanggal: tx.tanggal,
        type: tx.type,
        status: tx.status,
        paymentMethod: tx.paymentMethod,
        clientName: tx.client?.name || 'Pelanggan Umum',
        total: Number(tx.total),
      })),
    };
  }
}
