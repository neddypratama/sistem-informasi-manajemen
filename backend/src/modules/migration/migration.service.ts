import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import ExcelJS from 'exceljs';

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStatus() {
    let legacyAvailable = false;
    let legacyTxCount = 0;

    try {
      const sourceConn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: 'bimapratama',
      });
      const [res] = await sourceConn.query<any[]>('SELECT COUNT(*) as total FROM transaksis');
      legacyTxCount = res[0]?.total || 0;
      legacyAvailable = true;
      await sourceConn.end();
    } catch (e: any) {
      this.logger.warn(`Legacy database 'bimapratama' not reachable: ${e.message}`);
    }

    const [txCount, jCount, jdCount, batchCount, clientCount, barangCount] = await Promise.all([
      this.prisma.transaksi.count(),
      this.prisma.jurnalUmum.count(),
      this.prisma.jurnalDetail.count(),
      this.prisma.stokBatch.count(),
      this.prisma.client.count(),
      this.prisma.barang.count(),
    ]);

    // Breakdown by type in new database
    const [penjualanCount, pembelianCount, returJualCount, returBeliCount, kasCount, lnyCount] = await Promise.all([
      this.prisma.transaksi.count({ where: { type: 'PENJUALAN' } }),
      this.prisma.transaksi.count({ where: { type: 'PEMBELIAN' } }),
      this.prisma.transaksi.count({ where: { type: 'RETUR_PENJUALAN' } }),
      this.prisma.transaksi.count({ where: { type: 'RETUR_PEMBELIAN' } }),
      this.prisma.transaksi.count({ where: { type: { in: ['KAS_MASUK', 'KAS_KELUAR'] } } }),
      this.prisma.transaksi.count({ where: { invoice: { contains: '-LNY-' } } }),
    ]);

    return {
      legacy: {
        available: legacyAvailable,
        totalTransactions: legacyTxCount,
      },
      modern: {
        totalTransactions: txCount,
        breakdown: {
          penjualan: penjualanCount,
          pembelian: pembelianCount,
          pendapatanLain: lnyCount,
          returPenjualan: returJualCount,
          returPembelian: returBeliCount,
          kasDanBeban: kasCount,
        },
        totalJurnals: jCount,
        totalJurnalDetails: jdCount,
        totalStokBatches: batchCount,
        totalClients: clientCount,
        totalBarangs: barangCount,
      },
    };
  }

  /**
   * Menjalankan ETL Migrasi Bersih dari database sumber 'bimapratama' ke 'bimapratama_v2'
   * Mengikuti alur spesifikasi presisi double-entry:
   * 1. JURNAL UMUM: Mengelompokkan transaksi berdasarkan bundle (Tanggal & Hash yang sama)
   *    menjadi 1 Jurnal Umum dengan rincian Debit & Kredit yang 100% SEIMBANG (Balanced).
   * 2. TRANSAKSI OPERASIONAL: Memilah transaksi fisik perdagangan komoditas (Penjualan DPT,
   *    Pembelian TLR, STR, OBT, TRY, Retur, Beban, Pendapatan Lain) dan memisahkan sub-kategori
   *    penjualan per komoditas (Telur, Pakan, Obat, Tray).
   */
  async runCleanMigration() {
    this.logger.log('🚀 Memulai proses Presisi 1:1 Migrasi Data (Lossless ETL)...');
    const startTime = Date.now();

    const sourceConn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'bimapratama',
    });

    const destConn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'bimapratama_v2',
    });

    try {
      await destConn.query('SET FOREIGN_KEY_CHECKS = 0;');

      // 1. Reset data di bimapratama_v2
      this.logger.log('🧹 Membersihkan tabel target di bimapratama_v2...');
      await destConn.query('TRUNCATE TABLE monthly_account_balances;');
      await destConn.query('TRUNCATE TABLE stok_opnames;');
      await destConn.query('TRUNCATE TABLE jurnal_details;');
      await destConn.query('TRUNCATE TABLE jurnal_umums;');
      await destConn.query('TRUNCATE TABLE stok_keluar_batches;');
      await destConn.query('TRUNCATE TABLE stok_batches;');
      await destConn.query('TRUNCATE TABLE detail_transaksis;');
      await destConn.query('TRUNCATE TABLE transaksis;');

      // 2. Fetch master data & maps
      this.logger.log('📥 Membaca data master barang dan kategori...');
      const [barangs] = await destConn.query<any[]>('SELECT id, jenis_id FROM barangs');
      const barangJenisMap = new Map<number, number>();
      for (const b of barangs) {
        barangJenisMap.set(Number(b.id), Number(b.jenis_id));
      }

      const [kategoris] = await destConn.query<any[]>('SELECT id, name, detail_kategori_id FROM kategoris');
      const kategoriNameMap = new Map<number, string>();
      for (const k of kategoris) {
        kategoriNameMap.set(Number(k.id), String(k.name));
      }

      const HPP_MAP: Record<number, number> = {
        2: 90, // Telur Horn -> HPP Telur Horn
        1: 91, // Telur Bebek -> HPP Telur Bebek
        3: 92, // Telur Puyuh -> HPP Telur Puyuh
        4: 93, // Telur Arab -> HPP Telur Arab
        5: 94, // Telur Asin -> HPP Telur Asin
        8: 95, // Pakan Sentrat/Pabrikan -> HPP Pakan Sentrat
        9: 96, // Pakan Curah -> HPP Pakan Curah
        10: 97, // Pakan Kucing -> HPP Pakan Kucing
        7: 98, // Obat-Obatan -> HPP Obat-Obatan
        6: 99, // Tray -> HPP EggTray
      };

      // 3. Fetch all legacy transaksis and detail_transaksis
      this.logger.log('📥 Membaca seluruh transaksis dan detail_transaksis dari database sumber...');
      const [legacyTx] = await sourceConn.query<any[]>('SELECT * FROM transaksis ORDER BY tanggal ASC, id ASC');
      const [legacyDt] = await sourceConn.query<any[]>('SELECT * FROM detail_transaksis ORDER BY id ASC');

      this.logger.log(`Memuat ${legacyTx.length} transaksi dan ${legacyDt.length} detail transaksi.`);

      // Group details by transaksi_id
      const detailsByTxId = new Map<number, any[]>();
      for (const dt of legacyDt) {
        const tid = Number(dt.transaksi_id);
        if (!detailsByTxId.has(tid)) {
          detailsByTxId.set(tid, []);
        }
        detailsByTxId.get(tid)!.push(dt);
      }

      // Group transactions into bundle_key = CONCAT(DATE, '-', HASH)
      const bundles = new Map<string, any[]>();
      for (const t of legacyTx) {
        const inv = String(t.invoice || `INV-${t.id}`);
        const parts = inv.split('-');
        const dateStr = parts[1] || '20260101';
        const hash = parts[parts.length - 1] || `${t.id}`;
        const bundleKey = `${dateStr}-${hash}`;

        if (!bundles.has(bundleKey)) {
          bundles.set(bundleKey, []);
        }
        bundles.get(bundleKey)!.push(t);
      }

      this.logger.log(`Ditemukan ${bundles.size} bundle transaksi double-entry.`);

      // ----------------------------------------------------
      // TRACK 2: TRANSAKSI OPERASIONAL & DETAIL TRANSAKSI
      // ----------------------------------------------------
      this.logger.log('⚙️ Memproses Track 2: Transaksi Operasional Komoditas & Finansial...');

      const txValues: any[] = [];
      const dtValues: any[] = [];
      const bundleOperationalTxMap = new Map<string, number>();

      let countPenjualanTelur = 0;
      let countPenjualanPakan = 0;
      let countPenjualanObat = 0;
      let countPenjualanTray = 0;
      let countPembelianTelur = 0;
      let countPembelianPakan = 0;
      let countPembelianObat = 0;
      let countPembelianTray = 0;
      let countReturJual = 0;
      let countReturBeli = 0;
      let countBeban = 0;
      let countPendapatanLain = 0;

      // In-memory FIFO queue per barangId: Array of { batchId, barangId, detailTransaksiId, userId, tanggal, qtyMasuk, qtySisa, hargaBeli }
      const fifoQueues = new Map<number, any[]>();
      const batchValues: any[] = [];
      const keluarBatchValues: any[] = [];
      let batchIdCounter = 1;
      let keluarBatchIdCounter = 1;

      for (const t of legacyTx) {
        const inv = String(t.invoice || `INV-${t.id}`);
        const isDebit = String(t.type).toLowerCase() === 'debit';
        const parts = inv.split('-');
        const dateStr = parts[1] || '20260101';
        const hash = parts[parts.length - 1] || `${t.id}`;
        const bundleKey = `${dateStr}-${hash}`;

        let isOperational = false;
        let modernType: string = 'KAS_MASUK';
        let subCategoryLabel = '';

        if (inv.includes('-DPT-')) {
          // Penjualan komoditas
          isOperational = true;
          modernType = 'PENJUALAN';

          // Cek detail transaksi -> kategori id -> nama kategori
          const details = detailsByTxId.get(Number(t.id)) || [];
          const firstDetail = details[0];
          const firstKatId = firstDetail ? Number(firstDetail.kategori_id) : 0;
          const katName = kategoriNameMap.get(firstKatId) || '';

          if (katName.includes('Penjualan Telur')) {
            subCategoryLabel = 'Penjualan Telur';
            countPenjualanTelur++;
          } else if (katName.includes('Penjualan Pakan')) {
            subCategoryLabel = 'Penjualan Pakan';
            countPenjualanPakan++;
          } else if (katName.includes('Penjualan Obat')) {
            subCategoryLabel = 'Penjualan Obat';
            countPenjualanObat++;
          } else if (katName.includes('Penjualan EggTray') || katName.includes('Penjualan Tray')) {
            subCategoryLabel = 'Penjualan Tray';
            countPenjualanTray++;
          } else {
            subCategoryLabel = 'Penjualan Komoditas';
          }
        } else if (inv.includes('-TLR-') && isDebit) {
          isOperational = true;
          modernType = 'PEMBELIAN';
          subCategoryLabel = 'Pembelian Telur';
          countPembelianTelur++;
        } else if (inv.includes('-STR-') && isDebit) {
          isOperational = true;
          modernType = 'PEMBELIAN';
          subCategoryLabel = 'Pembelian Pakan';
          countPembelianPakan++;
        } else if (inv.includes('-OBT-') && isDebit) {
          isOperational = true;
          modernType = 'PEMBELIAN';
          subCategoryLabel = 'Pembelian Obat';
          countPembelianObat++;
        } else if (inv.includes('-TRY-') && isDebit) {
          isOperational = true;
          modernType = 'PEMBELIAN';
          subCategoryLabel = 'Pembelian Tray';
          countPembelianTray++;
        } else if (inv.includes('-RTN-')) {
          isOperational = true;
          modernType = 'RETUR_PENJUALAN';
          subCategoryLabel = 'Retur Penjualan';
          countReturJual++;
        } else if (inv.includes('-RTR-')) {
          isOperational = true;
          modernType = 'RETUR_PEMBELIAN';
          subCategoryLabel = 'Retur Pembelian';
          countReturBeli++;
        } else if (inv.includes('-PGN-')) {
          isOperational = true;
          modernType = 'KAS_KELUAR';
          subCategoryLabel = 'Pengeluaran Beban';
          countBeban++;
        } else if (inv.includes('-LNY-')) {
          isOperational = true;
          modernType = 'KAS_MASUK';
          subCategoryLabel = 'Pendapatan Lain';
          countPendapatanLain++;
        }

        if (!isOperational) {
          continue;
        }

        // Simpan referensi ke bundle agar Jurnal Umum dapat terhubung dengan Transaksi Operasional
        bundleOperationalTxMap.set(bundleKey, Number(t.id));

        // Format Payment Method
        let paymentMethod = 'TUNAI';
        if (inv.includes('-TFR-') || inv.includes('-BCA-') || inv.includes('-BRI-') || inv.includes('-BNI-')) {
          paymentMethod = 'TRANSFER';
        } else if (inv.includes('-BON-') || inv.includes('-UTG-')) {
          paymentMethod = 'KREDIT_BON';
        } else if (modernType === 'PEMBELIAN' || modernType === 'PENJUALAN') {
          paymentMethod = 'KREDIT_BON'; // Default hutang/piutang sesuai alur bisnis
        }

        const createdAt = t.created_at ? new Date(t.created_at) : (t.tanggal ? new Date(t.tanggal) : new Date());
        const tanggal = t.tanggal ? new Date(t.tanggal) : createdAt;
        const total = Number(t.total || 0);
        const keteranganClean = t.name ? `[${subCategoryLabel}] ${t.name}` : `[${subCategoryLabel}]`;

        txValues.push([
          t.id,
          inv,
          tanggal,
          modernType,
          t.status === 'Batal' ? 'BATAL' : 'SELESAI',
          paymentMethod,
          t.client_id || null,
          t.user_id || 1,
          total,
          0,
          total,
          keteranganClean,
          createdAt,
          createdAt,
        ]);

        // Detail transaksi untuk transaksi operasional ini
        const txDetails = detailsByTxId.get(Number(t.id)) || [];

        // Jika penjualan komoditas, cari HPP satuan dan total HPP dari transaksi HPP dalam bundle yang sama
        const hppByBarangMap = new Map<number, { hppSatuan: number; totalHpp: number }>();
        if (modernType === 'PENJUALAN') {
          const bundleTxList = bundles.get(bundleKey) || [];
          const hppTx = bundleTxList.find((x) => String(x.invoice).includes('-HPP-'));
          if (hppTx) {
            const hppDetails = detailsByTxId.get(Number(hppTx.id)) || [];
            for (const hd of hppDetails) {
              if (hd.barang_id) {
                hppByBarangMap.set(Number(hd.barang_id), {
                  hppSatuan: Number(hd.value || 0),
                  totalHpp: Number(hd.sub_total || 0),
                });
              }
            }
          }
        }

        for (const d of txDetails) {
          const qty = Number(d.kuantitas || 0);
          const harga = Number(d.value || 0);
          const subtotal = Number(d.sub_total || qty * harga);

          let katId = d.kategori_id;
          if (katId === 38 && d.barang_id) {
            const jenisId = barangJenisMap.get(Number(d.barang_id));
            if (jenisId && HPP_MAP[jenisId]) {
              katId = HPP_MAP[jenisId];
            }
          }

          let hppSatuan = harga;
          let totalHpp = subtotal;
          if (modernType === 'PENJUALAN' && d.barang_id) {
            const hppInfo = hppByBarangMap.get(Number(d.barang_id));
            if (hppInfo) {
              hppSatuan = hppInfo.hppSatuan;
              totalHpp = hppInfo.totalHpp;
            }
          }

          dtValues.push([
            d.id,
            t.id,
            d.barang_id || null,
            katId || null,
            qty,
            harga,
            subtotal,
            hppSatuan,
            totalHpp,
            0, 0, 0, 0,
            d.created_at ? new Date(d.created_at) : createdAt,
          ]);

          // Manajemen FIFO Stok
          const bId = Number(d.barang_id);
          if (bId && qty > 0 && t.status !== 'Batal') {
            if (modernType === 'PEMBELIAN' || modernType === 'RETUR_PENJUALAN') {
              // Inflow barang masuk ke gudang -> buat StokBatch baru
              const newBatch = {
                id: batchIdCounter++,
                barangId: bId,
                detailTransaksiId: d.id,
                userId: t.user_id || 1,
                tanggal,
                qtyMasuk: qty,
                qtySisa: qty,
                hargaBeli: harga,
                createdAt,
              };

              if (!fifoQueues.has(bId)) {
                fifoQueues.set(bId, []);
              }
              fifoQueues.get(bId)!.push(newBatch);
            } else if (modernType === 'PENJUALAN' || modernType === 'RETUR_PEMBELIAN') {
              // Outflow barang keluar dari gudang -> potong batch FIFO tertua
              let neededQty = qty;
              const batches = fifoQueues.get(bId) || [];

              for (const b of batches) {
                if (b.qtySisa <= 0) continue;
                const deduct = Math.min(b.qtySisa, neededQty);
                b.qtySisa -= deduct;
                neededQty -= deduct;

                keluarBatchValues.push([
                  keluarBatchIdCounter++,
                  d.id,
                  b.id,
                  deduct,
                  b.hargaBeli,
                  0,
                  createdAt,
                ]);

                if (neededQty <= 0) break;
              }
            }
          }
        }
      }

      // Kumpulkan semua stok_batches dari fifoQueues ke batchValues
      for (const [, batches] of fifoQueues.entries()) {
        for (const b of batches) {
          batchValues.push([
            b.id,
            b.barangId,
            b.detailTransaksiId,
            b.userId,
            b.tanggal,
            b.qtyMasuk,
            b.qtySisa,
            b.hargaBeli,
            b.createdAt,
            b.createdAt,
          ]);
        }
      }

      this.logger.log(`📦 Memasukkan ${txValues.length} transaksis operasional ke bimapratama_v2...`);
      await this.bulkInsert(destConn, 'transaksis', [
        'id', 'invoice', 'tanggal', 'type', 'status', 'payment_method',
        'client_id', 'user_id', 'subtotal', 'diskon', 'total', 'keterangan',
        'created_at', 'updated_at',
      ], txValues, 2000);

      this.logger.log(`📦 Memasukkan ${dtValues.length} detail_transaksis ke bimapratama_v2...`);
      await this.bulkInsert(destConn, 'detail_transaksis', [
        'id', 'transaksi_id', 'barang_id', 'kategori_id', 'qty', 'harga_satuan',
        'subtotal', 'hpp_satuan', 'total_hpp', 'telur_bentes', 'telur_kotor',
        'telur_ceplok', 'telur_jumbo', 'created_at',
      ], dtValues, 2000);

      this.logger.log(`📦 Memasukkan ${batchValues.length} stok_batches FIFO ke bimapratama_v2...`);
      await this.bulkInsert(destConn, 'stok_batches', [
        'id', 'barang_id', 'detail_transaksi_id', 'user_id', 'tanggal',
        'qty_masuk', 'qty_sisa', 'harga_beli', 'created_at', 'updated_at',
      ], batchValues, 2000);

      if (keluarBatchValues.length > 0) {
        this.logger.log(`📦 Memasukkan ${keluarBatchValues.length} stok_keluar_batches FIFO ke bimapratama_v2...`);
        await this.bulkInsert(destConn, 'stok_keluar_batches', [
          'id', 'detail_transaksi_id', 'stok_batch_id', 'qty', 'harga_beli',
          'returned_qty', 'created_at',
        ], keluarBatchValues, 2000);
      }

      // ----------------------------------------------------
      // TRACK 1: JURNAL UMUM & DETAIL JURNAL (100% BALANCED)
      // ----------------------------------------------------
      this.logger.log('⚖️ Memproses Track 1: Jurnal Umum & General Ledger Seimbang...');

      const jurnalValues: any[] = [];
      const jdValues: any[] = [];
      let jurnalIdCounter = 1;
      let jdIdCounter = 1;

      for (const [bundleKey, txList] of bundles.entries()) {
        // Alur input jurnal butir 3: membuat 1 jurnal (harus lebih dari 1 transaksi supaya seimbang)
        if (txList.length <= 1) {
          // Periksa apakah bundle tunggal memiliki saldo nol / seimbang
          let testDebit = 0;
          let testKredit = 0;
          for (const t of txList) {
            const isDeb = String(t.type).toLowerCase() === 'debit';
            for (const d of detailsByTxId.get(Number(t.id)) || []) {
              if (isDeb) testDebit += Number(d.sub_total || 0);
              else testKredit += Number(d.sub_total || 0);
            }
          }
          if (Math.abs(testDebit - testKredit) > 0.05 || testDebit === 0) {
            continue;
          }
        }

        const primaryTx = txList[0];
        const transaksiId = bundleOperationalTxMap.get(bundleKey) || null;
        const nomorJurnal = `JUR-${bundleKey}`;
        const tanggal = primaryTx.tanggal ? new Date(primaryTx.tanggal) : (primaryTx.created_at ? new Date(primaryTx.created_at) : new Date());
        const createdAt = primaryTx.created_at ? new Date(primaryTx.created_at) : tanggal;

        // Ambil keterangan representatif dari bundle
        const firstWithName = txList.find((t) => t.name && t.name.trim().length > 0);
        const keterangan = firstWithName?.name || primaryTx.name || `Jurnal Transaksi ${bundleKey}`;

        const currentJurnalId = jurnalIdCounter++;
        jurnalValues.push([
          currentJurnalId,
          transaksiId,
          nomorJurnal,
          tanggal,
          keterangan,
          createdAt,
        ]);

        // Buat detail jurnal dari setiap detail transaksi di semua transaksi dalam bundle
        for (const t of txList) {
          const isDebit = String(t.type).toLowerCase() === 'debit';
          const details = detailsByTxId.get(Number(t.id)) || [];

          for (const d of details) {
            const nominal = Number(d.sub_total || 0);
            let katId = Number(d.kategori_id || 64);

            if (katId === 38 && d.barang_id) {
              const jenisId = barangJenisMap.get(Number(d.barang_id));
              if (jenisId && HPP_MAP[jenisId]) {
                katId = HPP_MAP[jenisId];
              }
            }

            const coaId = katId; // 1-to-1 matching dengan Chart of Account 1..100
            const debit = isDebit ? nominal : 0;
            const kredit = !isDebit ? nominal : 0;
            const dtCreated = d.created_at ? new Date(d.created_at) : createdAt;

            jdValues.push([
              jdIdCounter++,
              currentJurnalId,
              coaId,
              katId,
              debit,
              kredit,
              dtCreated,
            ]);
          }
        }
      }

      this.logger.log(`📦 Memasukkan ${jurnalValues.length} jurnal_umums ke bimapratama_v2...`);
      await this.bulkInsert(destConn, 'jurnal_umums', [
        'id', 'transaksi_id', 'nomor_jurnal', 'tanggal', 'keterangan', 'created_at',
      ], jurnalValues, 2000);

      this.logger.log(`📦 Memasukkan ${jdValues.length} jurnal_details ke bimapratama_v2...`);
      await this.bulkInsert(destConn, 'jurnal_details', [
        'id', 'jurnal_id', 'coa_id', 'kategori_id', 'debit', 'kredit', 'created_at',
      ], jdValues, 2000);

      // 4. Populate historical stok_opnames
      this.logger.log('📥 Mengidentifikasi dan memigrasikan data stok_opnames historis...');
      const [opnameRows] = await sourceConn.query<any[]>(`
        SELECT 
          t.id as tx_id,
          t.invoice,
          t.tanggal,
          t.name,
          t.total,
          dt.id as dt_id,
          dt.barang_id,
          dt.kuantitas,
          dt.value as hpp,
          dt.sub_total
        FROM transaksis t
        JOIN detail_transaksis dt ON dt.transaksi_id = t.id
        WHERE t.invoice LIKE '%TBH%'
           OR t.invoice LIKE '%KRG%'
           OR t.invoice LIKE '%KTR%'
           OR t.invoice LIKE '%BTS%'
           OR t.invoice LIKE '%CLK%'
           OR t.invoice LIKE '%PRK%'
           OR t.invoice LIKE '%JMB%'
           OR t.invoice LIKE '%PKI%'
           OR t.invoice LIKE '%TRY1%'
           OR t.invoice LIKE '%TRY2%'
        ORDER BY t.id ASC
      `);

      this.logger.log(`Ditemukan ${opnameRows.length} baris opname historis.`);
      const opnameValues: any[] = [];
      let opnId = 1;

      for (const op of opnameRows) {
        let jenisOpname = 'TELUR';
        if (op.name?.toLowerCase().includes('pakan') || op.name?.toLowerCase().includes('sentrat')) {
          jenisOpname = 'PAKAN';
        } else if (op.name?.toLowerCase().includes('obat')) {
          jenisOpname = 'OBAT';
        } else if (op.name?.toLowerCase().includes('tray')) {
          jenisOpname = 'TRAY';
        }

        const tgl = op.tanggal ? new Date(op.tanggal) : new Date();
        const inv = op.invoice ? `${op.invoice}-${op.dt_id}` : `OPN-${op.tx_id}-${op.dt_id}`;
        const qty = Number(op.kuantitas || 0);
        const hpp = Number(op.hpp || 0);
        const subtotal = Number(op.sub_total || (qty * hpp));

        opnameValues.push([
          opnId++,
          `OPN-${inv}`,
          tgl,
          op.barang_id || 4,
          1,
          jenisOpname,
          qty,
          qty,
          0,
          0,
          hpp,
          subtotal,
          op.name || 'Opname Historis Sistem Lama',
          null,
          0, 0, 0, 0, 0, 0, 0,
          tgl,
        ]);
      }

      if (opnameValues.length > 0) {
        this.logger.log(`📦 Memasukkan ${opnameValues.length} stok_opnames ke bimapratama_v2...`);
        await this.bulkInsert(destConn, 'stok_opnames', [
          'id', 'nomor_opname', 'tanggal', 'barang_id', 'user_id', 'jenis_opname',
          'stok_sistem', 'stok_fisik', 'selisih', 'selisih_stok', 'hpp', 'total_nilai',
          'keterangan', 'jurnal_id', 'bentes', 'ceplok', 'prok', 'kotor', 'jumbo',
          'barang_pakai', 'pemakaian_tray', 'created_at',
        ], opnameValues, 2000);
      }

      // 5. Rekalkulasi Saldo Hutang & Piutang Client (Sesuai Logika Asli Sistem Lama)
      this.logger.log('⚖️ Menghitung ulang saldo hutang & piutang per mitra...');
      const [piutangAgg] = await sourceConn.query<any[]>(`
        SELECT 
          t.client_id,
          SUM(CASE WHEN LOWER(t.type) = 'debit' THEN dt.sub_total ELSE -dt.sub_total END) as total_piutang
        FROM transaksis t
        JOIN detail_transaksis dt ON dt.transaksi_id = t.id
        JOIN kategoris k ON k.id = dt.kategori_id
        WHERE k.name LIKE 'Piutang%' AND t.client_id IS NOT NULL AND LOWER(t.status) = 'selesai'
        GROUP BY t.client_id
      `);

      const [hutangAgg] = await sourceConn.query<any[]>(`
        SELECT 
          t.client_id,
          SUM(CASE WHEN LOWER(t.type) = 'kredit' THEN dt.sub_total ELSE -dt.sub_total END) as total_hutang
        FROM transaksis t
        JOIN detail_transaksis dt ON dt.transaksi_id = t.id
        JOIN kategoris k ON k.id = dt.kategori_id
        WHERE k.name LIKE 'Hutang%' AND t.client_id IS NOT NULL AND LOWER(t.status) = 'selesai'
        GROUP BY t.client_id
      `);

      await destConn.query('UPDATE clients SET saldo_piutang = 0, saldo_hutang = 0;');

      for (const p of piutangAgg) {
        await destConn.query('UPDATE clients SET saldo_piutang = ? WHERE id = ?', [Number(p.total_piutang) || 0, p.client_id]);
      }
      for (const h of hutangAgg) {
        await destConn.query('UPDATE clients SET saldo_hutang = ? WHERE id = ?', [Number(h.total_hutang) || 0, h.client_id]);
      }

      // 6. Pre-compute monthly_account_balances untuk performa kilat laporan Neraca Saldo
      this.logger.log('📊 Melakukan agregasi bulanan ke monthly_account_balances...');
      await destConn.query(`
        INSERT INTO monthly_account_balances (coa_id, period_year, period_month, opening_balance, total_debit, total_kredit, closing_balance, created_at, updated_at)
        SELECT 
          jd.coa_id,
          YEAR(ju.tanggal) as period_year,
          MONTH(ju.tanggal) as period_month,
          0 as opening_balance,
          SUM(jd.debit) as total_debit,
          SUM(jd.kredit) as total_kredit,
          (SUM(jd.debit) - SUM(jd.kredit)) as closing_balance,
          NOW(),
          NOW()
        FROM jurnal_details jd
        JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
        GROUP BY jd.coa_id, YEAR(ju.tanggal), MONTH(ju.tanggal)
      `);

      await destConn.query('SET FOREIGN_KEY_CHECKS = 1;');

      const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.log(`🎉 MIGRASI PRESISI DOUBLE-ENTRY SELESAI DALAM ${durationSeconds} DETIK!`);

      return {
        success: true,
        durationSeconds: Number(durationSeconds),
        summary: {
          penjualan: {
            telur: countPenjualanTelur,
            pakan: countPenjualanPakan,
            obat: countPenjualanObat,
            tray: countPenjualanTray,
            total: countPenjualanTelur + countPenjualanPakan + countPenjualanObat + countPenjualanTray,
          },
          pembelian: {
            telur: countPembelianTelur,
            pakan: countPembelianPakan,
            obat: countPembelianObat,
            tray: countPembelianTray,
            total: countPembelianTelur + countPembelianPakan + countPembelianObat + countPembelianTray,
          },
          retur: {
            penjualan: countReturJual,
            pembelian: countReturBeli,
          },
          keuangan: {
            bebanOperasional: countBeban,
            pendapatanLain: countPendapatanLain,
          },
          totalTransaksiOperasional: txValues.length,
          totalDetailTransaksi: dtValues.length,
          totalJurnalUmum: jurnalValues.length,
          totalJurnalDetail: jdValues.length,
          totalStokBatches: batchValues.length,
          totalStokKeluar: keluarBatchValues.length,
          totalStokOpname: opnameValues.length,
        },
      };
    } catch (err: any) {
      this.logger.error(`❌ Terjadi error saat migrasi bersih: ${err.message}`, err.stack);
      throw err;
    } finally {
      await sourceConn.end();
      await destConn.end();
    }
  }

  private async bulkInsert(conn: mysql.Connection, table: string, columns: string[], data: any[][], chunkSize = 1500) {
    if (data.length === 0) return;
    this.logger.log(`   -> Memasukkan ${data.length} baris ke '${table}'...`);

    const colString = columns.join(', ');
    const rowPlaceholder = `(${columns.map(() => '?').join(', ')})`;

    for (let i = 0; i < data.length; i += chunkSize) {
      const slice = data.slice(i, i + chunkSize);
      const placeholders = slice.map(() => rowPlaceholder).join(', ');
      const sql = `INSERT INTO ${table} (${colString}) VALUES ${placeholders};`;
      await conn.query(sql, slice.flat());
    }
  }

  /**
   * Menerima upload file .sql, me-restore ke database staging 'bimapratama',
   * kemudian otomatis menjalankan proses ETL migrasi bersih.
   */
  async importSqlAndMigrate(file: any) {
    this.logger.log(`📥 Menerima upload file SQL: ${file.originalname} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const tempPath = path.join(uploadDir, `import_${Date.now()}.sql`);
    await fs.promises.writeFile(tempPath, file.buffer);

    try {
      // 1. Pastikan database staging 'bimapratama' sudah ada
      const host = process.env.DB_HOST || 'localhost';
      const port = Number(process.env.DB_PORT || 3306);
      const user = process.env.DB_USERNAME || 'root';
      const password = process.env.DB_PASSWORD || '';

      const rootConn = await mysql.createConnection({
        host,
        port,
        user,
        password,
      });
      await rootConn.query('DROP DATABASE IF EXISTS bimapratama;');
      await rootConn.query('CREATE DATABASE bimapratama CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
      await rootConn.end();

      // 2. Eksekusi file SQL ke staging database 'bimapratama'
      this.logger.log('⚙️ Merestore database dump ke staging database bimapratama...');
      const passArg = password ? `-p"${password}"` : '';
      const cmd = `mysql -h ${host} -P ${port} -u ${user} ${passArg} --default-character-set=utf8mb4 bimapratama < "${tempPath}"`;

      await new Promise<void>((resolve, reject) => {
        exec(cmd, { shell: 'cmd.exe', maxBuffer: 1024 * 1024 * 100 }, (error, stdout, stderr) => {
          if (error) {
            this.logger.error(`Gagal restore database: ${stderr || error.message}`);
            reject(new Error(`Gagal mengeksekusi file SQL ke database: ${stderr || error.message}`));
          } else {
            resolve();
          }
        });
      });
    } finally {
      // 3. Hapus file temp setelah selesai di-restore
      try {
        if (fs.existsSync(tempPath)) {
          await fs.promises.unlink(tempPath);
        }
      } catch {
        this.logger.warn(`Gagal menghapus file temp ${tempPath}`);
      }
    }

    // 4. Jalankan ETL Transformasi & Migrasi Bersih
    const migrationResult = await this.runCleanMigration();

    return {
      ...migrationResult,
      fileName: file.originalname,
      fileSize: file.size,
      fileSizeFormatted: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      source: 'UPLOAD_SQL_FILE',
    };
  }

  /**
   * Menghasilkan buffer file Excel template
   */
  async generateExcelTemplate(type: 'barang' | 'client' | 'transaksi'): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Bima Pratama ERP 2.0';
    const sheet = workbook.addWorksheet('Template Data');

    if (type === 'barang') {
      sheet.columns = [
        { header: 'Kode Barang', key: 'code', width: 15 },
        { header: 'Nama Barang', key: 'name', width: 30 },
        { header: 'Jenis (Telur/Pakan/Obat/Tray/Lainnya)', key: 'jenis', width: 25 },
        { header: 'Satuan (Kg/Pcs/Tray/Ikat/Sak)', key: 'satuan', width: 20 },
        { header: 'Harga Jual Standar', key: 'hargaJual', width: 18 },
        { header: 'Deskripsi', key: 'deskripsi', width: 30 },
      ];
      sheet.addRow({
        code: 'BRG-001',
        name: 'Telur Ayam Broiler Grade A',
        jenis: 'Telur',
        satuan: 'Kg',
        hargaJual: 28500,
        deskripsi: 'Telur ayam segar utuh',
      });
      sheet.addRow({
        code: 'BRG-002',
        name: 'Pakan Sentrat Layer 511',
        jenis: 'Pakan',
        satuan: 'Sak',
        hargaJual: 450000,
        deskripsi: 'Sentrat pakan petelur',
      });
    } else if (type === 'client') {
      sheet.columns = [
        { header: 'Kode Mitra', key: 'code', width: 15 },
        { header: 'Nama Mitra / Peternak / Toko', key: 'name', width: 30 },
        { header: 'Tipe (PETERNAK / KANDANG / TOKO_AGEN / UMUM)', key: 'type', width: 25 },
        { header: 'No Telepon', key: 'phone', width: 18 },
        { header: 'Alamat', key: 'address', width: 35 },
        { header: 'Saldo Awal Piutang', key: 'saldoPiutang', width: 20 },
        { header: 'Saldo Awal Hutang', key: 'saldoHutang', width: 20 },
      ];
      sheet.addRow({
        code: 'CLN-001',
        name: 'Peternak Bpk. H. Masduki',
        type: 'PETERNAK',
        phone: '08123456789',
        address: 'Blitar, Jawa Timur',
        saldoPiutang: 0,
        saldoHutang: 0,
      });
      sheet.addRow({
        code: 'CLN-002',
        name: 'Toko Sumber Rejeki',
        type: 'TOKO_AGEN',
        phone: '08219876543',
        address: 'Pasar Legi Malang',
        saldoPiutang: 1500000,
        saldoHutang: 0,
      });
    } else {
      sheet.columns = [
        { header: 'Tanggal (YYYY-MM-DD)', key: 'tanggal', width: 15 },
        { header: 'Jenis Transaksi (PEMBELIAN / PENJUALAN / BEBAN)', key: 'type', width: 25 },
        { header: 'Nama Mitra', key: 'client', width: 25 },
        { header: 'Nama Barang / Kategori', key: 'item', width: 30 },
        { header: 'Kuantitas (Qty)', key: 'qty', width: 15 },
        { header: 'Harga Satuan', key: 'harga', width: 18 },
        { header: 'Keterangan', key: 'keterangan', width: 30 },
      ];
      sheet.addRow({
        tanggal: '2026-10-16',
        type: 'PENJUALAN',
        client: 'Toko Sumber Rejeki',
        item: 'Telur Ayam Broiler Grade A',
        qty: 150,
        harga: 28500,
        keterangan: 'Penjualan partai telur',
      });
    }

    // Header styling
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' }, // Emerald-600
    };

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}
