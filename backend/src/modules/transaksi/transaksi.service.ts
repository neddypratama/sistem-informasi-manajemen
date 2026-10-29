import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { FifoService } from '../inventory/fifo.service.js';
import { CreateTransaksiDto } from './dto/create-transaksi.dto.js';
import { QueryTransaksiDto } from './dto/query-transaksi.dto.js';

@Injectable()
export class TransaksiService {
  constructor(
    private prisma: PrismaService,
    private fifoService: FifoService,
  ) {}

  /**
   * Mengambil daftar transaksi terpaginasi dengan performa tinggi
   */
  async findAll(query: QueryTransaksiDto) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit || 25)));
    const skip = (page - 1) * limit;

    const where: any = {};
    const andClauses: any[] = [];

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = BigInt(query.clientId);
    if (query.jenisIds) {
      const ids = String(query.jenisIds)
        .split(',')
        .map((n) => Number(n.trim()))
        .filter((n) => !isNaN(n) && n > 0);
      if (ids.length > 0) {
        where.details = {
          some: {
            barang: {
              jenisId: { in: ids.map((id) => BigInt(id)) },
            },
          },
        };
      }
    } else if (query.jenisId) {
      where.details = {
        some: {
          barang: {
            jenisId: BigInt(query.jenisId),
          },
        },
      };
    }
    if (query.module === 'HUTANG') {
      where.details = {
        some: {
          kategori: {
            detailKategori: {
              type: 'Liabilitas',
            },
          },
        },
      };
    } else if (query.module === 'PIUTANG') {
      where.details = {
        some: {
          kategori: {
            detailKategoriId: {
              in: [19n, 20n, 21n, 22n, 23n],
            },
          },
        },
      };
    } else if (query.module === 'KAS') {
      where.details = {
        some: {
          kategori: {
            detailKategoriId: {
              in: [25n, 26n, 27n, 28n],
            },
          },
        },
      };
    } else if (query.module === 'BEBAN') {
      andClauses.push({
        OR: [
          { invoice: { contains: 'PGN' } },
          { invoice: { contains: 'BBN' } },
          {
            details: {
              some: {
                OR: [
                  { kategoriId: { gte: 22n, lte: 45n } },
                  { kategori: { detailKategori: { type: 'Pengeluaran' } } },
                ],
              },
            },
          },
        ],
      });
    } else if (query.module === 'PENDAPATAN_LAIN') {
      andClauses.push({
        OR: [
          { invoice: { contains: 'LNY' } },
          {
            details: {
              some: {
                kategoriId: { gte: 11n, lte: 21n },
              },
            },
          },
        ],
      });
    }

    if (query.kategoriId) {
      where.details = {
        ...where.details,
        some: {
          ...where.details?.some,
          kategoriId: BigInt(query.kategoriId),
        },
      };
    }

    if (query.startDate && query.endDate) {
      where.tanggal = {
        gte: new Date(query.startDate),
        lte: new Date(`${query.endDate} 23:59:59`),
      };
    } else if (query.startDate) {
      where.tanggal = { gte: new Date(query.startDate) };
    } else if (query.endDate) {
      where.tanggal = { lte: new Date(`${query.endDate} 23:59:59`) };
    }

    if (query.search) {
      andClauses.push({
        OR: [
          { invoice: { contains: query.search } },
          { keterangan: { contains: query.search } },
          { client: { name: { contains: query.search } } },
          {
            details: {
              some: {
                barang: {
                  OR: [
                    { name: { contains: query.search } },
                    { code: { contains: query.search } },
                  ],
                },
              },
            },
          },
        ],
      });
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const [items, total] = await Promise.all([
      this.prisma.transaksi.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, type: true } },
          user: { select: { id: true, name: true } },
          details: {
            include: {
              barang: { select: { id: true, name: true, jenis: true, satuan: true } },
              kategori: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  detailKategori: { select: { id: true, name: true, type: true } },
                },
              },
            },
          },
          jurnalUmums: {
            select: {
              id: true,
              details: {
                select: {
                  kategoriId: true,
                  debit: true,
                  kredit: true,
                },
              },
            },
          },
        },
        orderBy: { tanggal: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaksi.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const tx = await this.prisma.transaksi.findUnique({
      where: { id: BigInt(id) },
      include: {
        client: true,
        user: true,
        details: {
          include: {
            barang: { include: { jenis: true, satuan: true } },
            kategori: {
              include: {
                detailKategori: true,
              },
            },
            stokKeluarBatches: true,
          },
        },
        jurnalUmums: {
          include: {
            details: { include: { coa: true } },
          },
        },
      },
    });

    if (!tx) {
      throw new NotFoundException(`Transaksi dengan ID ${id} tidak ditemukan.`);
    }

    return tx;
  }

  /**
   * Membuat transaksi penjualan baru secara atomik
   */
  async createPenjualan(createDto: CreateTransaksiDto, userId: number) {
    const tanggal = createDto.tanggal ? new Date(createDto.tanggal) : new Date();
    const dateStr = tanggal.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoice = `INV-${dateStr}-DPT-${randomSuffix}`;

    const subtotal = createDto.items.reduce((acc, it) => acc + it.qty * it.hargaSatuan, 0);
    const diskon = Number(createDto.diskon || 0);
    const total = subtotal - diskon;

    return this.prisma.$transaction(async (tx) => {
      // Tentukan paymentMethod dan akunDebitId dari paymentAccountId
      let paymentMethod = createDto.paymentMethod || 'TUNAI';
      let akunDebitId = BigInt(64); // Default Kas Tunai

      if (createDto.paymentAccountId) {
        akunDebitId = BigInt(createDto.paymentAccountId);
        const paymentKat = await tx.kategori.findUnique({
          where: { id: akunDebitId },
        });
        if (paymentKat) {
          const katName = paymentKat.name.toLowerCase();
          if (katName.startsWith('kas') || katName.includes('kas ')) {
            paymentMethod = 'TUNAI';
          } else if (katName.startsWith('bank') || katName.includes('bank ')) {
            paymentMethod = 'TRANSFER';
          } else if (katName.includes('piutang')) {
            paymentMethod = 'KREDIT_BON';
          }
        }
      } else if (createDto.paymentMethod === 'KREDIT_BON') {
        akunDebitId = BigInt(48); // Piutang Pedagang
      } else if (createDto.paymentMethod === 'TRANSFER') {
        akunDebitId = BigInt(66); // Bank BCA Masduki
      }

      // 1. Buat Header Transaksi
      const transaksi = await tx.transaksi.create({
        data: {
          invoice,
          tanggal,
          type: 'PENJUALAN',
          status: 'SELESAI',
          paymentMethod,
          clientId: createDto.clientId ? BigInt(createDto.clientId) : null,
          userId: BigInt(userId),
          subtotal,
          diskon,
          total,
          keterangan: createDto.keterangan,
        },
      });

      let grandTotalHpp = 0;

      // 2. Alokasi FIFO & simpan baris detail transaksi
      for (const item of createDto.items) {
        const itemSubtotal = item.qty * item.hargaSatuan;

        const detail = await tx.detailTransaksi.create({
          data: {
            transaksiId: transaksi.id,
            barangId: BigInt(item.barangId),
            qty: item.qty,
            hargaSatuan: item.hargaSatuan,
            subtotal: itemSubtotal,
            telurBentes: item.telurBentes || 0,
            telurKotor: item.telurKotor || 0,
            telurCeplok: item.telurCeplok || 0,
            telurJumbo: item.telurJumbo || 0,
          },
        });

        // Jalankan alokasi FIFO
        const fifoResult = await this.fifoService.allocateFifoStock(
          tx,
          item.barangId,
          item.qty,
          detail.id,
        );

        // Update HPP di detail transaksi
        await tx.detailTransaksi.update({
          where: { id: detail.id },
          data: {
            hppSatuan: fifoResult.hppSatuan,
            totalHpp: fifoResult.totalHpp,
          },
        });

        grandTotalHpp += fifoResult.totalHpp;
      }

      // 3. Update saldo piutang client jika Bon Kredit / Piutang
      if (paymentMethod === 'KREDIT_BON' && createDto.clientId) {
        await tx.client.update({
          where: { id: BigInt(createDto.clientId) },
          data: { saldoPiutang: { increment: total } },
        });
      }

      // Posting Jurnal Umum Akuntansi (Double-Entry Balance)
      const jurnal = await tx.jurnalUmum.create({
        data: {
          transaksiId: transaksi.id,
          nomorJurnal: `JUR-${invoice}`,
          tanggal,
          keterangan: `Penjualan ${invoice} (${paymentMethod === 'KREDIT_BON' ? 'PIUTANG' : paymentMethod})`,
        },
      });

      // Tentukan akun COA / Kategori sesuai komoditas barang
      let akunPendapatanId = BigInt(1); // Default Penjualan Telur Horn
      let akunHppId = BigInt(90);        // Default HPP Telur Horn
      let akunPersediaanId = BigInt(59); // Default Stok Telur

      const firstItem = createDto.items[0];
      if (firstItem) {
        const barang = await tx.barang.findUnique({
          where: { id: BigInt(firstItem.barangId) },
          include: { jenis: true },
        });
        const jenisName = barang?.jenis?.name?.toLowerCase() || '';
        const barangName = barang?.name?.toLowerCase() || '';

        if (jenisName.includes('pakan') || jenisName.includes('sentrat') || jenisName.includes('curah')) {
          akunPersediaanId = BigInt(60); // Stok Pakan
          if (barangName.includes('curah')) {
            akunPendapatanId = BigInt(8); // Penjualan Pakan Curah
            akunHppId = BigInt(96);        // HPP Pakan Curah
          } else if (barangName.includes('kucing')) {
            akunPendapatanId = BigInt(7); // Penjualan Pakan Kucing
            akunHppId = BigInt(97);        // HPP Pakan Kucing
          } else {
            akunPendapatanId = BigInt(6); // Penjualan Pakan Sentrat/Pabrikan
            akunHppId = BigInt(95);        // HPP Pakan Sentrat/Pabrikan
          }
        } else if (jenisName.includes('obat')) {
          akunPersediaanId = BigInt(61); // Stok Obat
          akunPendapatanId = BigInt(9);  // Penjualan Obat-Obatan
          akunHppId = BigInt(98);         // HPP Obat-Obatan
        } else if (jenisName.includes('tray')) {
          akunPersediaanId = BigInt(62); // Stok Tray
          akunPendapatanId = BigInt(10); // Penjualan EggTray
          akunHppId = BigInt(99);         // HPP EggTray
        } else {
          // Telur
          akunPersediaanId = BigInt(59); // Stok Telur
          if (barangName.includes('bebek')) {
            akunPendapatanId = BigInt(2);
            akunHppId = BigInt(91);
          } else if (barangName.includes('puyuh')) {
            akunPendapatanId = BigInt(3);
            akunHppId = BigInt(92);
          } else if (barangName.includes('arab')) {
            akunPendapatanId = BigInt(4);
            akunHppId = BigInt(93);
          } else if (barangName.includes('asin')) {
            akunPendapatanId = BigInt(5);
            akunHppId = BigInt(94);
          } else {
            akunPendapatanId = BigInt(1);
            akunHppId = BigInt(90);
          }
        }
      }

      await tx.jurnalDetail.createMany({
        data: [
          { jurnalId: jurnal.id, coaId: akunDebitId, kategoriId: akunDebitId, debit: total, kredit: 0 },
          { jurnalId: jurnal.id, coaId: akunPendapatanId, kategoriId: akunPendapatanId, debit: 0, kredit: total },
          { jurnalId: jurnal.id, coaId: akunHppId, kategoriId: akunHppId, debit: grandTotalHpp, kredit: 0 },
          { jurnalId: jurnal.id, coaId: akunPersediaanId, kategoriId: akunPersediaanId, debit: 0, kredit: grandTotalHpp },
        ],
      });

      return transaksi;
    });
  }

  /**
   * Membuat transaksi pembelian baru (Stok Masuk)
   */
  async createPembelian(createDto: CreateTransaksiDto, userId: number) {
    const tanggal = createDto.tanggal ? new Date(createDto.tanggal) : new Date();
    const dateStr = tanggal.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    // Tentukan prefix pembelian sesuai mapping resmi: TLR (Telur), STR (Pakan), OBT (Obat), TRY (Tray)
    let prefix = 'TLR';
    const firstItem = createDto.items[0];
    if (firstItem) {
      const barang = await this.prisma.barang.findUnique({
        where: { id: BigInt(firstItem.barangId) },
        include: { jenis: true },
      });
      const jenisName = barang?.jenis?.name?.toLowerCase() || '';
      if (jenisName.includes('pakan') || jenisName.includes('sentrat') || jenisName.includes('curah')) {
        prefix = 'STR';
      } else if (jenisName.includes('obat')) {
        prefix = 'OBT';
      } else if (jenisName.includes('tray')) {
        prefix = 'TRY';
      } else {
        prefix = 'TLR';
      }
    }
    const invoice = `INV-${dateStr}-${prefix}-${randomSuffix}`;

    const subtotal = createDto.items.reduce((acc, it) => acc + it.qty * it.hargaSatuan, 0);
    const diskon = Number(createDto.diskon || 0);
    const total = subtotal - diskon;

    return this.prisma.$transaction(async (tx) => {
      // Tentukan paymentAccountId & paymentMethod otomatis berdasarkan nama kategori
      // Kas % -> TUNAI, Bank % -> TRANSFER, Hutang % -> KREDIT_BON (Hutang)
      // Default: Akun Kategori Hutang per komoditas:
      // Telur: 72 (Hutang Peternak), Pakan: 83 (Hutang Sentrat SK), Obat: 80 (Hutang Obat SK), Tray: 77 (Hutang Tray Diamond)
      let defaultHutangId = 72;
      if (prefix === 'STR') defaultHutangId = 83;
      else if (prefix === 'OBT') defaultHutangId = 80;
      else if (prefix === 'TRY') defaultHutangId = 77;

      let akunKreditId = BigInt(createDto.paymentAccountId || defaultHutangId);
      let paymentMethod = createDto.paymentMethod || 'KREDIT_BON';

      const paymentKat = await tx.kategori.findUnique({
        where: { id: akunKreditId },
      });
      if (paymentKat) {
        const katName = paymentKat.name.toLowerCase();
        if (katName.startsWith('kas') || katName.includes('kas ')) {
          paymentMethod = 'TUNAI';
        } else if (katName.startsWith('bank') || katName.includes('bank ')) {
          paymentMethod = 'TRANSFER';
        } else if (katName.includes('hutang')) {
          paymentMethod = 'KREDIT_BON';
        }
      }

      const transaksi = await tx.transaksi.create({
        data: {
          invoice,
          tanggal,
          type: 'PEMBELIAN',
          status: 'SELESAI',
          paymentMethod,
          clientId: createDto.clientId ? BigInt(createDto.clientId) : null,
          userId: BigInt(userId),
          subtotal,
          diskon,
          total,
          keterangan: createDto.keterangan,
        },
      });

      for (const item of createDto.items) {
        const itemSubtotal = item.qty * item.hargaSatuan;

        const detail = await tx.detailTransaksi.create({
          data: {
            transaksiId: transaksi.id,
            barangId: BigInt(item.barangId),
            qty: item.qty,
            hargaSatuan: item.hargaSatuan,
            subtotal: itemSubtotal,
            hppSatuan: item.hargaSatuan,
            totalHpp: itemSubtotal,
            telurBentes: 0,
            telurKotor: 0,
            telurCeplok: 0,
            telurJumbo: 0,
          },
        });

        // Buat batch stok baru
        await tx.stokBatch.create({
          data: {
            barangId: BigInt(item.barangId),
            detailTransaksiId: detail.id,
            userId: BigInt(userId),
            tanggal,
            qtyMasuk: item.qty,
            qtySisa: item.qty,
            hargaBeli: item.hargaSatuan,
          },
        });
      }

      // Update saldo hutang jika pembelian kredit/hutang
      if (paymentMethod === 'KREDIT_BON' && createDto.clientId) {
        await tx.client.update({
          where: { id: BigInt(createDto.clientId) },
          data: { saldoHutang: { increment: total } },
        });
      }

      // Posting Jurnal Pembelian (Double-Entry Balance)
      const jurnal = await tx.jurnalUmum.create({
        data: {
          transaksiId: transaksi.id,
          nomorJurnal: `JUR-${invoice}`,
          tanggal,
          keterangan: `Pembelian ${invoice} (${paymentMethod === 'KREDIT_BON' ? 'HUTANG' : paymentMethod})`,
        },
      });

      let akunPersediaanId = BigInt(59); // Stok Telur
      if (prefix === 'STR') akunPersediaanId = BigInt(60); // Stok Pakan
      else if (prefix === 'OBT') akunPersediaanId = BigInt(61); // Stok Obat
      else if (prefix === 'TRY') akunPersediaanId = BigInt(62); // Stok Tray

      await tx.jurnalDetail.createMany({
        data: [
          { jurnalId: jurnal.id, coaId: akunPersediaanId, kategoriId: akunPersediaanId, debit: total, kredit: 0 },
          { jurnalId: jurnal.id, coaId: akunKreditId, kategoriId: akunKreditId, debit: 0, kredit: total },
        ],
      });

      return transaksi;
    });
  }

  /**
   * Membuat transaksi Retur Penjualan (Pengembalian dari Pelanggan)
   */
  async createReturPenjualan(createDto: CreateTransaksiDto, userId: number) {
    const tanggal = createDto.tanggal ? new Date(createDto.tanggal) : new Date();
    const dateStr = tanggal.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoice = `INV-${dateStr}-RTN-${randomSuffix}`;

    const subtotal = createDto.items.reduce((acc, it) => acc + it.qty * it.hargaSatuan, 0);
    const diskon = Number(createDto.diskon || 0);
    const total = subtotal - diskon;

    return this.prisma.$transaction(async (tx) => {
      const transaksi = await tx.transaksi.create({
        data: {
          invoice,
          tanggal,
          type: 'RETUR_PENJUALAN',
          status: 'SELESAI',
          paymentMethod: createDto.paymentMethod,
          clientId: createDto.clientId ? BigInt(createDto.clientId) : null,
          userId: BigInt(userId),
          subtotal,
          diskon,
          total,
          keterangan: createDto.keterangan || 'Retur Penjualan Barang',
        },
      });

      for (const item of createDto.items) {
        const itemSubtotal = item.qty * item.hargaSatuan;
        const detail = await tx.detailTransaksi.create({
          data: {
            transaksiId: transaksi.id,
            barangId: BigInt(item.barangId),
            qty: item.qty,
            hargaSatuan: item.hargaSatuan,
            subtotal: itemSubtotal,
            hppSatuan: item.hargaSatuan,
            totalHpp: itemSubtotal,
          },
        });

        // Kembalikan ke stok batch
        await tx.stokBatch.create({
          data: {
            barangId: BigInt(item.barangId),
            detailTransaksiId: detail.id,
            userId: BigInt(userId),
            tanggal,
            qtyMasuk: item.qty,
            qtySisa: item.qty,
            hargaBeli: item.hargaSatuan,
          },
        });
      }

      // Potong piutang jika bon
      if (createDto.paymentMethod === 'KREDIT_BON' && createDto.clientId) {
        await tx.client.update({
          where: { id: BigInt(createDto.clientId) },
          data: { saldoPiutang: { decrement: total } },
        });
      }

      // Posting Jurnal Retur Penjualan (Double-Entry Balance)
      const jurnal = await tx.jurnalUmum.create({
        data: {
          transaksiId: transaksi.id,
          nomorJurnal: `JUR-${invoice}`,
          tanggal,
          keterangan: `Retur Penjualan ${invoice} (${createDto.paymentMethod})`,
        },
      });

      let akunPiutangKasId = createDto.paymentMethod === 'KREDIT_BON' ? BigInt(46) : BigInt(64);
      if (createDto.paymentAccountId) {
        akunPiutangKasId = BigInt(createDto.paymentAccountId);
      } else if (createDto.paymentMethod === 'TRANSFER') {
        akunPiutangKasId = BigInt(66);
      }

      let akunReturPenjualanId = BigInt(1);
      let akunPersediaanId = BigInt(59);
      let akunHppId = BigInt(90);

      const firstItem = createDto.items[0];
      if (firstItem) {
        const barang = await tx.barang.findUnique({
          where: { id: BigInt(firstItem.barangId) },
          include: { jenis: true },
        });
        const jenisName = barang?.jenis?.name?.toLowerCase() || '';
        if (jenisName.includes('pakan') || jenisName.includes('sentrat') || jenisName.includes('curah')) {
          akunPersediaanId = BigInt(60);
          akunReturPenjualanId = BigInt(6);
          akunHppId = BigInt(95);
        } else if (jenisName.includes('obat')) {
          akunPersediaanId = BigInt(61);
          akunReturPenjualanId = BigInt(9);
          akunHppId = BigInt(98);
        } else if (jenisName.includes('tray')) {
          akunPersediaanId = BigInt(62);
          akunReturPenjualanId = BigInt(10);
          akunHppId = BigInt(99);
        }
      }

      await tx.jurnalDetail.createMany({
        data: [
          { jurnalId: jurnal.id, coaId: akunReturPenjualanId, kategoriId: akunReturPenjualanId, debit: total, kredit: 0 },
          { jurnalId: jurnal.id, coaId: akunPiutangKasId, kategoriId: akunPiutangKasId, debit: 0, kredit: total },
          { jurnalId: jurnal.id, coaId: akunPersediaanId, kategoriId: akunPersediaanId, debit: total, kredit: 0 },
          { jurnalId: jurnal.id, coaId: akunHppId, kategoriId: akunHppId, debit: 0, kredit: total },
        ],
      });

      return transaksi;
    });
  }

  /**
   * Membuat transaksi Retur Pembelian (Pengembalian ke Supplier)
   */
  async createReturPembelian(createDto: CreateTransaksiDto, userId: number) {
    const tanggal = createDto.tanggal ? new Date(createDto.tanggal) : new Date();
    const dateStr = tanggal.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoice = `INV-${dateStr}-RTR-${randomSuffix}`;

    const subtotal = createDto.items.reduce((acc, it) => acc + it.qty * it.hargaSatuan, 0);
    const diskon = Number(createDto.diskon || 0);
    const total = subtotal - diskon;

    return this.prisma.$transaction(async (tx) => {
      const transaksi = await tx.transaksi.create({
        data: {
          invoice,
          tanggal,
          type: 'RETUR_PEMBELIAN',
          status: 'SELESAI',
          paymentMethod: createDto.paymentMethod,
          clientId: createDto.clientId ? BigInt(createDto.clientId) : null,
          userId: BigInt(userId),
          subtotal,
          diskon,
          total,
          keterangan: createDto.keterangan || 'Retur Pembelian Barang ke Supplier',
        },
      });

      for (const item of createDto.items) {
        const itemSubtotal = item.qty * item.hargaSatuan;
        const detail = await tx.detailTransaksi.create({
          data: {
            transaksiId: transaksi.id,
            barangId: BigInt(item.barangId),
            qty: item.qty,
            hargaSatuan: item.hargaSatuan,
            subtotal: itemSubtotal,
            hppSatuan: item.hargaSatuan,
            totalHpp: itemSubtotal,
          },
        });

        // Alokasikan pengurangan stok secara spesifik per batch jika ada originalDetailId
        if (item.originalDetailId) {
          const specificBatch = await tx.stokBatch.findFirst({
            where: { detailTransaksiId: BigInt(item.originalDetailId) },
          });
          if (specificBatch) {
            const qtySisa = Number(specificBatch.qtySisa);
            const pakai = Math.min(qtySisa, item.qty);
            if (pakai > 0) {
              await tx.stokBatch.update({
                where: { id: specificBatch.id },
                data: { qtySisa: { decrement: pakai } },
              });
              await tx.stokKeluarBatch.create({
                data: {
                  detailTransaksiId: detail.id,
                  stokBatchId: specificBatch.id,
                  qty: pakai,
                  hargaBeli: specificBatch.hargaBeli,
                },
              });
            }
            const sisa = item.qty - pakai;
            if (sisa > 0) {
              await this.fifoService.allocateFifoStock(tx, Number(item.barangId), sisa, detail.id);
            }
          } else {
            await this.fifoService.allocateFifoStock(tx, Number(item.barangId), item.qty, detail.id);
          }
        } else {
          await this.fifoService.allocateFifoStock(
            tx,
            Number(item.barangId),
            item.qty,
            detail.id,
          );
        }
      }

      // Potong hutang jika bon
      if (createDto.paymentMethod === 'KREDIT_BON' && createDto.clientId) {
        await tx.client.update({
          where: { id: BigInt(createDto.clientId) },
          data: { saldoHutang: { decrement: total } },
        });
      }

      // Posting Jurnal Retur Pembelian
      const jurnalBeli = await tx.jurnalUmum.create({
        data: {
          transaksiId: transaksi.id,
          nomorJurnal: `JUR-${invoice}`,
          tanggal,
          keterangan: `Retur Pembelian ${invoice} (${createDto.paymentMethod})`,
        },
      });

      let akunHutangKasId = createDto.paymentMethod === 'KREDIT_BON' ? BigInt(72) : BigInt(64);
      if (createDto.paymentAccountId) {
        akunHutangKasId = BigInt(createDto.paymentAccountId);
      } else if (createDto.paymentMethod === 'TRANSFER') {
        akunHutangKasId = BigInt(66);
      }

      let akunPersediaanBeliId = BigInt(59);
      const firstItem = createDto.items[0];
      if (firstItem) {
        const barang = await tx.barang.findUnique({
          where: { id: BigInt(firstItem.barangId) },
          include: { jenis: true },
        });
        const jenisName = barang?.jenis?.name?.toLowerCase() || '';
        if (jenisName.includes('pakan') || jenisName.includes('sentrat') || jenisName.includes('curah')) {
          akunPersediaanBeliId = BigInt(60);
        } else if (jenisName.includes('obat')) {
          akunPersediaanBeliId = BigInt(61);
        } else if (jenisName.includes('tray')) {
          akunPersediaanBeliId = BigInt(62);
        }
      }

      await tx.jurnalDetail.createMany({
        data: [
          { jurnalId: jurnalBeli.id, coaId: akunHutangKasId, kategoriId: akunHutangKasId, debit: total, kredit: 0 },
          { jurnalId: jurnalBeli.id, coaId: akunPersediaanBeliId, kategoriId: akunPersediaanBeliId, debit: 0, kredit: total },
        ],
      });

      return transaksi;
    });
  }

  /**
   * Membuat Pengeluaran Beban Operasional / Kembalian Beban
   */
  async createBeban(
    body: {
      kategoriId: number;
      nominal: number;
      keterangan?: string;
      tanggal?: string;
      kasBankKategoriId?: number;
      type?: 'Debit' | 'Kredit';
    },
    userId: number,
  ) {
    const tanggal = body.tanggal ? new Date(body.tanggal) : new Date();
    const dateStr = tanggal.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoice = `INV-${dateStr}-PGN-${randomSuffix}`;
    const isKembalian = body.type === 'Kredit';
    const txType = isKembalian ? 'KAS_MASUK' : 'KAS_KELUAR';
    const akunKasId = BigInt(body.kasBankKategoriId || 64);
    const akunBebanId = BigInt(body.kategoriId);

    return this.prisma.$transaction(async (tx) => {
      const transaksi = await tx.transaksi.create({
        data: {
          invoice,
          tanggal,
          type: txType,
          status: 'SELESAI',
          paymentMethod: Number(akunKasId) === 64 ? 'TUNAI' : 'TRANSFER',
          userId: BigInt(userId),
          subtotal: body.nominal,
          diskon: 0,
          total: body.nominal,
          keterangan: body.keterangan || (isKembalian ? 'Kembalian Beban Operasional' : 'Pengeluaran Beban Operasional'),
        },
      });

      await tx.detailTransaksi.create({
        data: {
          transaksiId: transaksi.id,
          kategoriId: akunBebanId,
          qty: 1,
          hargaSatuan: body.nominal,
          subtotal: body.nominal,
          hppSatuan: 0,
          totalHpp: 0,
        },
      });

      // Posting Jurnal Beban
      const jurnal = await tx.jurnalUmum.create({
        data: {
          transaksiId: transaksi.id,
          nomorJurnal: `JUR-${invoice}`,
          tanggal,
          keterangan: body.keterangan || (isKembalian ? 'Kembalian Beban Operasional' : 'Pengeluaran Beban Operasional'),
        },
      });

      // Jika Debit (Pengeluaran): Debit Beban, Kredit Kas/Bank
      // Jika Kredit (Kembalian): Debit Kas/Bank, Kredit Beban
      await tx.jurnalDetail.createMany({
        data: isKembalian
          ? [
              { jurnalId: jurnal.id, coaId: akunKasId, kategoriId: akunKasId, debit: body.nominal, kredit: 0 },
              { jurnalId: jurnal.id, coaId: akunBebanId, kategoriId: akunBebanId, debit: 0, kredit: body.nominal },
            ]
          : [
              { jurnalId: jurnal.id, coaId: akunBebanId, kategoriId: akunBebanId, debit: body.nominal, kredit: 0 },
              { jurnalId: jurnal.id, coaId: akunKasId, kategoriId: akunKasId, debit: 0, kredit: body.nominal },
            ],
      });

      return transaksi;
    });
  }

  /**
   * Membuat Transaksi Pendapatan Lain-Lain (Pemasukan Non-Operasional Komoditas)
   */
  async createPendapatanLain(
    body: {
      kategoriId: number;
      nominal: number;
      keterangan?: string;
      tanggal?: string;
      paymentMethod?: 'TUNAI' | 'TRANSFER';
      clientId?: number;
      kasBankKategoriId?: number;
    },
    userId: number,
  ) {
    const tanggal = body.tanggal ? new Date(body.tanggal) : new Date();
    const dateStr = tanggal.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoice = `INV-${dateStr}-LNY-${randomSuffix}`;
    const paymentMethod = body.paymentMethod || (body.kasBankKategoriId && body.kasBankKategoriId !== 64 ? 'TRANSFER' : 'TUNAI');
    const akunKasId = BigInt(body.kasBankKategoriId || (paymentMethod === 'TRANSFER' ? 66 : 64));
    const akunPendapatanLainId = BigInt(body.kategoriId);

    return this.prisma.$transaction(async (tx) => {
      const transaksi = await tx.transaksi.create({
        data: {
          invoice,
          tanggal,
          type: 'KAS_MASUK',
          status: 'SELESAI',
          paymentMethod,
          clientId: body.clientId ? BigInt(body.clientId) : null,
          userId: BigInt(userId),
          subtotal: body.nominal,
          diskon: 0,
          total: body.nominal,
          keterangan: body.keterangan || 'Pendapatan Lain-Lain',
        },
      });

      await tx.detailTransaksi.create({
        data: {
          transaksiId: transaksi.id,
          kategoriId: akunPendapatanLainId,
          qty: 1,
          hargaSatuan: body.nominal,
          subtotal: body.nominal,
          hppSatuan: 0,
          totalHpp: 0,
        },
      });

      // Posting Jurnal Pendapatan Lain-Lain (Debit Kas/Bank, Kredit Kategori Pendapatan Lain)
      const jurnal = await tx.jurnalUmum.create({
        data: {
          transaksiId: transaksi.id,
          nomorJurnal: `JUR-${invoice}`,
          tanggal,
          keterangan: body.keterangan || 'Pemasukan Pendapatan Lainnya',
        },
      });

      await tx.jurnalDetail.createMany({
        data: [
          { jurnalId: jurnal.id, coaId: akunKasId, kategoriId: akunKasId, debit: body.nominal, kredit: 0 },
          { jurnalId: jurnal.id, coaId: akunPendapatanLainId, kategoriId: akunPendapatanLainId, debit: 0, kredit: body.nominal },
        ],
      });

      return transaksi;
    });
  }

  /**
   * Catat Mutasi Hutang (Hutang Bertambah / Pelunasan Hutang Mitra)
   */
  async createHutangMutasi(
    body: {
      clientId: number;
      kategoriId: number;
      nominal: number;
      type: 'TAMBAH' | 'BAYAR'; // TAMBAH = Hutang Bertambah (Kredit), BAYAR = Pelunasan (Debit)
      paymentMethod?: 'TUNAI' | 'TRANSFER' | 'KAS';
      kasBankKategoriId?: number;
      keterangan?: string;
      tanggal?: string;
    },
    userId: number,
  ) {
    const tanggal = body.tanggal ? new Date(body.tanggal) : new Date();
    const dateStr = tanggal.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoice = `INV-${dateStr}-UTG-${randomSuffix}`;
    const paymentMethod = body.paymentMethod === 'TRANSFER' ? 'TRANSFER' : 'TUNAI';
    const isBayar = body.type === 'BAYAR';
    const txType = isBayar ? 'KAS_KELUAR' : 'KAS_MASUK';

    return this.prisma.$transaction(async (tx) => {
      const transaksi = await tx.transaksi.create({
        data: {
          invoice,
          tanggal,
          type: txType,
          status: 'SELESAI',
          paymentMethod,
          clientId: BigInt(body.clientId),
          userId: BigInt(userId),
          subtotal: body.nominal,
          diskon: 0,
          total: body.nominal,
          keterangan:
            body.keterangan ||
            (isBayar ? 'Pembayaran / Pelunasan Hutang' : 'Penambahan Hutang Usaha'),
        },
      });

      await tx.detailTransaksi.create({
        data: {
          transaksiId: transaksi.id,
          kategoriId: BigInt(body.kategoriId),
          qty: 1,
          hargaSatuan: body.nominal,
          subtotal: body.nominal,
          hppSatuan: 0,
          totalHpp: 0,
        },
      });

      // Update Saldo Hutang Mitra di tabel clients
      if (isBayar) {
        await tx.client.update({
          where: { id: BigInt(body.clientId) },
          data: { saldoHutang: { decrement: body.nominal } },
        });
      } else {
        await tx.client.update({
          where: { id: BigInt(body.clientId) },
          data: { saldoHutang: { increment: body.nominal } },
        });
      }

      // Jurnal Umum Double-Entry
      const jurnal = await tx.jurnalUmum.create({
        data: {
          transaksiId: transaksi.id,
          clientId: BigInt(body.clientId),
          nomorJurnal: `JUR-${invoice}`,
          tanggal,
          keterangan: transaksi.keterangan,
        },
      });

      const akunKasId = BigInt(body.kasBankKategoriId || (paymentMethod === 'TRANSFER' ? 65 : 64));
      const akunHutangId = BigInt(body.kategoriId);

      if (isBayar) {
        // Pelunasan Hutang: Debit Hutang, Kredit Kas/Bank
        await tx.jurnalDetail.createMany({
          data: [
            { jurnalId: jurnal.id, coaId: akunHutangId, kategoriId: akunHutangId, debit: body.nominal, kredit: 0 },
            { jurnalId: jurnal.id, coaId: akunKasId, kategoriId: akunKasId, debit: 0, kredit: body.nominal },
          ],
        });
      } else {
        // Penambahan Hutang: Debit Kas/Bank, Kredit Hutang
        await tx.jurnalDetail.createMany({
          data: [
            { jurnalId: jurnal.id, coaId: akunKasId, kategoriId: akunKasId, debit: body.nominal, kredit: 0 },
            { jurnalId: jurnal.id, coaId: akunHutangId, kategoriId: akunHutangId, debit: 0, kredit: body.nominal },
          ],
        });
      }

      return transaksi;
    });
  }

  /**
   * Catat Mutasi Piutang (Piutang Bertambah / Penerimaan Pembayaran Piutang Mitra)
   */
  async createPiutangMutasi(
    body: {
      clientId: number;
      kategoriId: number;
      nominal: number;
      type: 'TAMBAH' | 'BAYAR'; // TAMBAH = Piutang Bertambah (Debit), BAYAR = Pelunasan (Kredit)
      paymentMethod?: 'TUNAI' | 'TRANSFER' | 'KAS';
      kasBankKategoriId?: number;
      keterangan?: string;
      tanggal?: string;
    },
    userId: number,
  ) {
    const tanggal = body.tanggal ? new Date(body.tanggal) : new Date();
    const dateStr = tanggal.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoice = `INV-${dateStr}-BON-${randomSuffix}`;
    const paymentMethod = body.paymentMethod === 'TRANSFER' ? 'TRANSFER' : 'TUNAI';
    const isBayar = body.type === 'BAYAR';
    const txType = isBayar ? 'KAS_MASUK' : 'KAS_KELUAR';

    return this.prisma.$transaction(async (tx) => {
      const transaksi = await tx.transaksi.create({
        data: {
          invoice,
          tanggal,
          type: txType,
          status: 'SELESAI',
          paymentMethod,
          clientId: BigInt(body.clientId),
          userId: BigInt(userId),
          subtotal: body.nominal,
          diskon: 0,
          total: body.nominal,
          keterangan:
            body.keterangan ||
            (isBayar ? 'Penerimaan Pembayaran / Pelunasan Piutang' : 'Penambahan Piutang (Bon) Mitra'),
        },
      });

      await tx.detailTransaksi.create({
        data: {
          transaksiId: transaksi.id,
          kategoriId: BigInt(body.kategoriId),
          qty: 1,
          hargaSatuan: body.nominal,
          subtotal: body.nominal,
          hppSatuan: 0,
          totalHpp: 0,
        },
      });

      // Update Saldo Piutang Mitra di tabel clients
      if (isBayar) {
        await tx.client.update({
          where: { id: BigInt(body.clientId) },
          data: { saldoPiutang: { decrement: body.nominal } },
        });
      } else {
        await tx.client.update({
          where: { id: BigInt(body.clientId) },
          data: { saldoPiutang: { increment: body.nominal } },
        });
      }

      // Jurnal Umum Double-Entry
      const jurnal = await tx.jurnalUmum.create({
        data: {
          transaksiId: transaksi.id,
          clientId: BigInt(body.clientId),
          nomorJurnal: `JUR-${invoice}`,
          tanggal,
          keterangan: transaksi.keterangan,
        },
      });

      const akunKasId = BigInt(body.kasBankKategoriId || (paymentMethod === 'TRANSFER' ? 65 : 64));
      const akunPiutangId = BigInt(body.kategoriId);

      if (isBayar) {
        // Penerimaan Piutang: Debit Kas/Bank, Kredit Piutang
        await tx.jurnalDetail.createMany({
          data: [
            { jurnalId: jurnal.id, coaId: akunKasId, kategoriId: akunKasId, debit: body.nominal, kredit: 0 },
            { jurnalId: jurnal.id, coaId: akunPiutangId, kategoriId: akunPiutangId, debit: 0, kredit: body.nominal },
          ],
        });
      } else {
        // Penambahan Piutang: Debit Piutang, Kredit Kas/Bank
        await tx.jurnalDetail.createMany({
          data: [
            { jurnalId: jurnal.id, coaId: akunPiutangId, kategoriId: akunPiutangId, debit: body.nominal, kredit: 0 },
            { jurnalId: jurnal.id, coaId: akunKasId, kategoriId: akunKasId, debit: 0, kredit: body.nominal },
          ],
        });
      }

      return transaksi;
    });
  }

  /**
   * Edit / Update Transaksi Lengkap
   * Otomatis sinkronisasi:
   * 1. Mutasi Stok / StokBatch FIFO
   * 2. Keuangan / Saldo Hutang Peternak atau Piutang
   * 3. Jurnal Umum Akuntansi (Double-Entry Balance)
   */
  async update(
    id: number,
    body: {
      keterangan?: string;
      tanggal?: string;
      clientId?: number;
      paymentAccountId?: number;
      paymentMethod?: any;
      diskon?: number;
      items?: Array<{
        detailId?: number;
        barangId: number;
        qty: number;
        hargaSatuan: number;
        telurBentes?: number;
        telurKotor?: number;
        telurCeplok?: number;
        telurJumbo?: number;
      }>;
    },
    userId: number = 1,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const existingTx = await tx.transaksi.findUnique({
        where: { id: BigInt(id) },
        include: {
          client: true,
          details: {
            include: {
              barang: { include: { jenis: true } },
              stokBatches: { include: { stokKeluarBatches: true } },
            },
          },
          jurnalUmums: {
            include: { details: true },
          },
        },
      });

      if (!existingTx) {
        throw new NotFoundException(`Transaksi dengan ID ${id} tidak ditemukan.`);
      }

      const tanggal = body.tanggal ? new Date(body.tanggal) : existingTx.tanggal;
      const oldTotal = Number(existingTx.total);
      const oldClientId = existingTx.clientId;
      const oldPaymentMethod = existingTx.paymentMethod;
      const newClientId = body.clientId !== undefined ? (body.clientId ? BigInt(body.clientId) : null) : oldClientId;
      const newPaymentMethod = body.paymentMethod || oldPaymentMethod;

      let newSubtotal = Number(existingTx.subtotal);
      let newDiskon = body.diskon !== undefined ? Number(body.diskon) : Number(existingTx.diskon);
      let newTotal = oldTotal;

      // 1. UPDATE ITEMS, STOK BATCH, DAN DETAIL TRANSAKSI
      if (body.items && body.items.length > 0) {
        if (existingTx.type === 'PEMBELIAN') {
          newSubtotal = 0;
          const oldDetails = existingTx.details;
          const matchedDetailIds = new Set<string>();

          for (const item of body.items) {
            const itemQty = Number(item.qty);
            const itemHarga = Number(item.hargaSatuan);
            const itemSubtotal = itemQty * itemHarga;
            newSubtotal += itemSubtotal;

            let oldDetail = item.detailId
              ? oldDetails.find((d) => d.id === BigInt(item.detailId!))
              : null;

            if (oldDetail) {
              matchedDetailIds.add(String(oldDetail.id));
              const batch = oldDetail.stokBatches?.[0];
              if (batch) {
                const qtyMasuk = Number(batch.qtyMasuk);
                const qtySisa = Number(batch.qtySisa);
                const consumed = qtyMasuk - qtySisa;

                if (itemQty < consumed) {
                  const bName = oldDetail.barang?.name || 'Barang';
                  throw new BadRequestException(
                    `Kuantitas barang "${bName}" tidak boleh kurang dari ${consumed} karena sudah terjual pada transaksi berikutnya.`,
                  );
                }

                const newQtySisa = itemQty - consumed;
                await tx.stokBatch.update({
                  where: { id: batch.id },
                  data: {
                    qtyMasuk: itemQty,
                    qtySisa: newQtySisa,
                    hargaBeli: itemHarga,
                    tanggal,
                  },
                });
              }

              await tx.detailTransaksi.update({
                where: { id: oldDetail.id },
                data: {
                  barangId: BigInt(item.barangId),
                  qty: itemQty,
                  hargaSatuan: itemHarga,
                  subtotal: itemSubtotal,
                  hppSatuan: itemHarga,
                  totalHpp: itemSubtotal,
                },
              });
            } else {
              // Baris barang baru ditambahkan
              const newDetail = await tx.detailTransaksi.create({
                data: {
                  transaksiId: existingTx.id,
                  barangId: BigInt(item.barangId),
                  qty: itemQty,
                  hargaSatuan: itemHarga,
                  subtotal: itemSubtotal,
                  hppSatuan: itemHarga,
                  totalHpp: itemSubtotal,
                  telurBentes: 0,
                  telurKotor: 0,
                  telurCeplok: 0,
                  telurJumbo: 0,
                },
              });

              await tx.stokBatch.create({
                data: {
                  barangId: BigInt(item.barangId),
                  detailTransaksiId: newDetail.id,
                  userId: BigInt(userId),
                  tanggal,
                  qtyMasuk: itemQty,
                  qtySisa: itemQty,
                  hargaBeli: itemHarga,
                },
              });
            }
          }

          // Hapus old details yang dihapus pengguna di modal edit
          for (const oldDetail of oldDetails) {
            if (!matchedDetailIds.has(String(oldDetail.id))) {
              const batch = oldDetail.stokBatches?.[0];
              if (batch) {
                const consumed = Number(batch.qtyMasuk) - Number(batch.qtySisa);
                if (consumed > 0) {
                  const bName = oldDetail.barang?.name || 'Barang';
                  throw new BadRequestException(
                    `Barang "${bName}" tidak dapat dihapus dari transaksi karena sebanyak ${consumed} sudah terpakai pada penjualan.`,
                  );
                }
                await tx.stokBatch.delete({ where: { id: batch.id } });
              }
              await tx.detailTransaksi.delete({ where: { id: oldDetail.id } });
            }
          }

          newTotal = Math.max(0, newSubtotal - newDiskon);
        }
      } else {
        newTotal = Math.max(0, newSubtotal - newDiskon);
      }

      // 2. UPDATE HEADER TRANSAKSI
      const updatedTx = await tx.transaksi.update({
        where: { id: BigInt(id) },
        data: {
          tanggal,
          keterangan: body.keterangan !== undefined ? body.keterangan : existingTx.keterangan,
          clientId: newClientId,
          subtotal: newSubtotal,
          diskon: newDiskon,
          total: newTotal,
          paymentMethod: newPaymentMethod,
        },
        include: {
          client: true,
          details: { include: { barang: { include: { jenis: true, satuan: true } } } },
        },
      });

      // 3. SINKRONISASI SALDO HUTANG / PIUTANG
      if (existingTx.type === 'PEMBELIAN') {
        if (oldPaymentMethod === 'KREDIT_BON' && oldClientId) {
          await tx.client.update({
            where: { id: oldClientId },
            data: { saldoHutang: { decrement: oldTotal } },
          });
        }
        if (newPaymentMethod === 'KREDIT_BON' && newClientId) {
          await tx.client.update({
            where: { id: newClientId },
            data: { saldoHutang: { increment: newTotal } },
          });
        }
      } else if (existingTx.type === 'PENJUALAN') {
        if (oldPaymentMethod === 'KREDIT_BON' && oldClientId) {
          await tx.client.update({
            where: { id: oldClientId },
            data: { saldoPiutang: { decrement: oldTotal } },
          });
        }
        if (newPaymentMethod === 'KREDIT_BON' && newClientId) {
          await tx.client.update({
            where: { id: newClientId },
            data: { saldoPiutang: { increment: newTotal } },
          });
        }
      }

      // 4. SINKRONISASI JURNAL AKUNTANSI (DOUBLE-ENTRY)
      const existingJurnal = await tx.jurnalUmum.findFirst({
        where: { transaksiId: existingTx.id },
      });

      if (existingJurnal) {
        await tx.jurnalUmum.update({
          where: { id: existingJurnal.id },
          data: {
            tanggal,
            keterangan: body.keterangan
              ? `Pembelian ${existingTx.invoice} - ${body.keterangan}`
              : existingJurnal.keterangan,
          },
        });

        // Hapus rincian debit-kredit jurnal lama
        await tx.jurnalDetail.deleteMany({
          where: { jurnalId: existingJurnal.id },
        });

        if (existingTx.type === 'PEMBELIAN') {
          const firstBarang = updatedTx.details[0]?.barang;
          const jenisName = firstBarang?.jenis?.name?.toLowerCase() || '';
          let akunPersediaanId = BigInt(59); // Telur
          let defaultHutangId = BigInt(72); // Hutang Peternak
          if (jenisName.includes('pakan') || jenisName.includes('sentrat') || jenisName.includes('curah')) {
            akunPersediaanId = BigInt(60); // Stok Pakan
            defaultHutangId = BigInt(83); // Hutang Sentrat SK
          } else if (jenisName.includes('obat') || jenisName.includes('vaksin')) {
            akunPersediaanId = BigInt(61); // Stok Obat-Obatan
            defaultHutangId = BigInt(80); // Hutang Obat SK
          } else if (jenisName.includes('tray')) {
            akunPersediaanId = BigInt(62); // Stok Tray
            defaultHutangId = BigInt(77); // Hutang Tray Diamond
          }

          let akunKreditId = defaultHutangId;
          if (body.paymentAccountId) {
            akunKreditId = BigInt(body.paymentAccountId);
          } else if (newPaymentMethod === 'TUNAI') {
            akunKreditId = BigInt(64); // Kas Pusat
          } else if (newPaymentMethod === 'TRANSFER') {
            akunKreditId = BigInt(66); // Bank BCA Masduki
          }

          await tx.jurnalDetail.createMany({
            data: [
              {
                jurnalId: existingJurnal.id,
                coaId: akunPersediaanId,
                kategoriId: akunPersediaanId,
                debit: newTotal,
                kredit: 0,
              },
              {
                jurnalId: existingJurnal.id,
                coaId: akunKreditId,
                kategoriId: akunKreditId,
                debit: 0,
                kredit: newTotal,
              },
            ],
          });
        } else if (existingTx.type === 'PENJUALAN') {
          const firstBarang = updatedTx.details[0]?.barang;
          const jenisName = firstBarang?.jenis?.name?.toLowerCase() || '';
          const barangName = firstBarang?.name?.toLowerCase() || '';

          let akunPersediaanId = BigInt(59); // Stok Telur
          let akunPendapatanId = BigInt(1);  // Penjualan Telur Horn
          let akunHppId = BigInt(90);        // HPP Telur Horn
          let defaultPiutangId = BigInt(48); // Piutang Pedagang

          if (jenisName.includes('pakan') || jenisName.includes('sentrat') || jenisName.includes('curah')) {
            akunPersediaanId = BigInt(60);
            defaultPiutangId = BigInt(46); // Piutang Peternak
            if (barangName.includes('curah')) {
              akunPendapatanId = BigInt(8);
              akunHppId = BigInt(96);
            } else if (barangName.includes('kucing')) {
              akunPendapatanId = BigInt(7);
              akunHppId = BigInt(97);
            } else {
              akunPendapatanId = BigInt(6);
              akunHppId = BigInt(95);
            }
          } else if (jenisName.includes('obat') || jenisName.includes('vaksin')) {
            akunPersediaanId = BigInt(61);
            defaultPiutangId = BigInt(46);
            akunPendapatanId = BigInt(9);
            akunHppId = BigInt(98);
          } else if (jenisName.includes('tray')) {
            akunPersediaanId = BigInt(62);
            defaultPiutangId = BigInt(46);
            akunPendapatanId = BigInt(10);
            akunHppId = BigInt(99);
          } else {
            // Telur
            defaultPiutangId = BigInt(48);
            if (barangName.includes('bebek')) {
              akunPendapatanId = BigInt(2);
              akunHppId = BigInt(91);
            } else if (barangName.includes('puyuh')) {
              akunPendapatanId = BigInt(3);
              akunHppId = BigInt(92);
            } else if (barangName.includes('arab')) {
              akunPendapatanId = BigInt(4);
              akunHppId = BigInt(93);
            } else if (barangName.includes('asin')) {
              akunPendapatanId = BigInt(5);
              akunHppId = BigInt(94);
            }
          }

          let akunDebitId = defaultPiutangId;
          if (body.paymentAccountId) {
            akunDebitId = BigInt(body.paymentAccountId);
          } else if (newPaymentMethod === 'TUNAI') {
            akunDebitId = BigInt(64); // Kas Pusat
          } else if (newPaymentMethod === 'TRANSFER') {
            akunDebitId = BigInt(66); // Bank BCA Masduki
          }

          const currentTotalHpp = updatedTx.details.reduce((sum, d) => sum + Number(d.totalHpp || 0), 0);

          await tx.jurnalDetail.createMany({
            data: [
              {
                jurnalId: existingJurnal.id,
                coaId: akunDebitId,
                kategoriId: akunDebitId,
                debit: newTotal,
                kredit: 0,
              },
              {
                jurnalId: existingJurnal.id,
                coaId: akunPendapatanId,
                kategoriId: akunPendapatanId,
                debit: 0,
                kredit: newTotal,
              },
              {
                jurnalId: existingJurnal.id,
                coaId: akunHppId,
                kategoriId: akunHppId,
                debit: currentTotalHpp,
                kredit: 0,
              },
              {
                jurnalId: existingJurnal.id,
                coaId: akunPersediaanId,
                kategoriId: akunPersediaanId,
                debit: 0,
                kredit: currentTotalHpp,
              },
            ],
          });
        }
      }

      return updatedTx;
    });
  }

  /**
   * Hapus / Soft Delete Transaksi dengan Rollback Otomatis
   * 1. Kembalikan / Hapus StokBatch jika belum terpakai
   * 2. Rollback saldo hutang/piutang client
   * 3. Hapus jurnal pembukuan terkait
   */
  async remove(id: number) {
    return await this.prisma.$transaction(async (tx) => {
      const existingTx = await tx.transaksi.findUnique({
        where: { id: BigInt(id) },
        include: {
          client: true,
          details: {
            include: {
              barang: true,
              stokBatches: true,
            },
          },
        },
      });

      if (!existingTx) {
        throw new NotFoundException(`Transaksi dengan ID ${id} tidak ditemukan.`);
      }

      if (existingTx.status === 'BATAL') {
        return existingTx;
      }

      // Validasi & Rollback Stok jika PEMBELIAN
      if (existingTx.type === 'PEMBELIAN') {
        for (const detail of existingTx.details) {
          for (const batch of detail.stokBatches) {
            const consumed = Number(batch.qtyMasuk) - Number(batch.qtySisa);
            if (consumed > 0) {
              const bName = detail.barang?.name || 'Barang';
              throw new BadRequestException(
                `Transaksi pembelian ini tidak dapat dihapus/dibatalkan karena ${consumed} stok "${bName}" sudah terjual pada transaksi berikutnya.`,
              );
            }
          }
        }

        const detailIds = existingTx.details.map((d) => d.id);
        await tx.stokBatch.deleteMany({
          where: { detailTransaksiId: { in: detailIds } },
        });

        if (existingTx.paymentMethod === 'KREDIT_BON' && existingTx.clientId) {
          await tx.client.update({
            where: { id: existingTx.clientId },
            data: { saldoHutang: { decrement: existingTx.total } },
          });
        }
      } else if (existingTx.type === 'PENJUALAN') {
        // Rollback alokasi stok keluar FIFO
        const detailIds = existingTx.details.map((d) => d.id);
        const stokKeluars = await tx.stokKeluarBatch.findMany({
          where: { detailTransaksiId: { in: detailIds } },
        });
        for (const sk of stokKeluars) {
          await tx.stokBatch.update({
            where: { id: sk.stokBatchId },
            data: { qtySisa: { increment: sk.qty } },
          });
        }
        await tx.stokKeluarBatch.deleteMany({
          where: { detailTransaksiId: { in: detailIds } },
        });

        // Rollback saldo piutang jika KREDIT_BON / Piutang
        if (existingTx.paymentMethod === 'KREDIT_BON' && existingTx.clientId) {
          await tx.client.update({
            where: { id: existingTx.clientId },
            data: { saldoPiutang: { decrement: existingTx.total } },
          });
        }
      }

      // Hapus jurnal terkait
      await tx.jurnalUmum.deleteMany({
        where: { transaksiId: existingTx.id },
      });

      return tx.transaksi.update({
        where: { id: BigInt(id) },
        data: { status: 'BATAL' },
      });
    });
  }

  /**
   * Catat Mutasi Kas Langsung (Kas Masuk, Kas Keluar, Transfer Antar Kas/Bank)
   * Hanya mencatat ke jurnal_umums dan detail_jurnals (tanpa membuat baris transaksis dagang)
   */
  async createKasMutasi(
    body: {
      type: 'MASUK' | 'KELUAR' | 'TRANSFER';
      kasAccountId: number;
      lawanAccountId: number;
      nominal: number;
      keterangan?: string;
      tanggal?: string;
    },
    _userId: number,
  ) {
    const tanggal = body.tanggal ? new Date(body.tanggal) : new Date();
    const dateStr = tanggal.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    // Mapping resmi transaksi kas legacy:
    // 15. kas tunai : TNI (ID 64)
    // 16. bank transfer : TFR (ID 65-70 atau type TRANSFER)
    // 17. kas deby : DBY (ID 71)
    let kasCode = 'TFR';
    if (Number(body.kasAccountId) === 64) {
      kasCode = 'TNI';
    } else if (Number(body.kasAccountId) === 71) {
      kasCode = 'DBY';
    } else if (body.type === 'TRANSFER' || [65, 66, 67, 68, 69, 70].includes(Number(body.kasAccountId))) {
      kasCode = 'TFR';
    } else {
      const kat = await this.prisma.kategori.findUnique({
        where: { id: BigInt(body.kasAccountId) },
      });
      const name = kat?.name?.toLowerCase() || '';
      if (name.includes('deby')) kasCode = 'DBY';
      else if (name.includes('tunai')) kasCode = 'TNI';
      else kasCode = 'TFR';
    }

    const nomorJurnal = `JUR-${dateStr}-${kasCode}-${randomSuffix}`;

    return this.prisma.$transaction(async (tx) => {
      const jurnal = await tx.jurnalUmum.create({
        data: {
          nomorJurnal,
          tanggal,
          keterangan: body.keterangan || `Mutasi Kas (${body.type})`,
        },
      });

      const kasId = BigInt(body.kasAccountId);
      const lawanId = BigInt(body.lawanAccountId);

      if (body.type === 'MASUK') {
        // Kas Masuk: Debit Kas, Kredit Lawan
        await tx.jurnalDetail.createMany({
          data: [
            { jurnalId: jurnal.id, coaId: kasId, kategoriId: kasId, debit: body.nominal, kredit: 0 },
            { jurnalId: jurnal.id, coaId: lawanId, kategoriId: lawanId, debit: 0, kredit: body.nominal },
          ],
        });
      } else if (body.type === 'KELUAR') {
        // Kas Keluar: Debit Lawan, Kredit Kas
        await tx.jurnalDetail.createMany({
          data: [
            { jurnalId: jurnal.id, coaId: lawanId, kategoriId: lawanId, debit: body.nominal, kredit: 0 },
            { jurnalId: jurnal.id, coaId: kasId, kategoriId: kasId, debit: 0, kredit: body.nominal },
          ],
        });
      } else {
        // Transfer Antar Kas/Bank: Debit Kas Tujuan (lawanId), Kredit Kas Asal (kasId)
        await tx.jurnalDetail.createMany({
          data: [
            { jurnalId: jurnal.id, coaId: lawanId, kategoriId: lawanId, debit: body.nominal, kredit: 0 },
            { jurnalId: jurnal.id, coaId: kasId, kategoriId: kasId, debit: 0, kredit: body.nominal },
          ],
        });
      }

      return {
        id: Number(jurnal.id),
        nomorJurnal: jurnal.nomorJurnal,
        tanggal: jurnal.tanggal,
        nominal: body.nominal,
        type: body.type,
      };
    });
  }

  /**
   * Menghasilkan Buku Besar Pembantu (Mutasi Piutang & Hutang) untuk Klien tertentu
   * Menampilkan seluruh jurnal umum dan transaksi operasional terkait
   */
  async getClientLedger(clientId: number) {
    const client = await this.prisma.client.findUnique({
      where: { id: BigInt(clientId) },
      select: { id: true, name: true, code: true, type: true, phone: true, saldoPiutang: true, saldoHutang: true },
    });

    if (!client) {
      throw new NotFoundException(`Mitra dengan ID ${clientId} tidak ditemukan`);
    }

    // 1. Ambil seluruh Jurnal Umum yang terhubung dengan client ini
    const jurnals = await this.prisma.jurnalUmum.findMany({
      where: { clientId: BigInt(clientId) },
      include: {
        transaksi: {
          include: {
            details: {
              include: {
                barang: { select: { id: true, name: true, satuan: true, jenis: true } },
                kategori: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
        details: {
          include: {
            coa: { select: { id: true, code: true, name: true } },
            kategori: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { tanggal: 'desc' },
    });

    const items: any[] = [];
    const processedTxIds = new Set<string>();

    for (const j of jurnals) {
      if (j.transaksiId) {
        processedTxIds.add(j.transaksiId.toString());
      }

      let foundSpecific = false;
      for (const d of j.details) {
        const coaId = Number(d.coaId);
        const coaName = (d.coa?.name || '').toLowerCase();
        const isPiutang = (coaId >= 46 && coaId <= 58) || coaName.includes('piutang');
        const isHutang = (coaId >= 72 && coaId <= 85) || coaName.includes('hutang');

        if (isPiutang) {
          foundSpecific = true;
          const isDeb = Number(d.debit) > 0;
          const nominal = isDeb ? Number(d.debit) : Number(d.kredit);
          items.push({
            id: j.id.toString(),
            nomorJurnal: j.nomorJurnal,
            invoice: j.transaksi?.invoice || j.nomorJurnal,
            tanggal: j.tanggal,
            keterangan: j.keterangan || j.transaksi?.keterangan || 'Mutasi Piutang',
            pos: 'PIUTANG',
            posisi: isDeb ? 'DEBIT' : 'KREDIT',
            nominal,
            debit: isDeb ? nominal : 0,
            kredit: !isDeb ? nominal : 0,
            akunName: d.coa?.name || 'Piutang Peternak',
            type: j.transaksi?.type || (isDeb ? 'BON_BARU' : 'PELUNASAN_BON'),
            paymentMethod: j.transaksi?.paymentMethod || 'TUNAI',
            details: j.transaksi?.details || [],
          });
        } else if (isHutang) {
          foundSpecific = true;
          const isKred = Number(d.kredit) > 0;
          const nominal = isKred ? Number(d.kredit) : Number(d.debit);
          items.push({
            id: j.id.toString(),
            nomorJurnal: j.nomorJurnal,
            invoice: j.transaksi?.invoice || j.nomorJurnal,
            tanggal: j.tanggal,
            keterangan: j.keterangan || j.transaksi?.keterangan || 'Mutasi Hutang',
            pos: 'HUTANG',
            posisi: isKred ? 'KREDIT' : 'DEBIT',
            nominal,
            debit: !isKred ? nominal : 0,
            kredit: isKred ? nominal : 0,
            akunName: d.coa?.name || 'Hutang Peternak',
            type: j.transaksi?.type || (isKred ? 'TITIPAN_BARU' : 'PELUNASAN_HUTANG'),
            paymentMethod: j.transaksi?.paymentMethod || 'TUNAI',
            details: j.transaksi?.details || [],
          });
        }
      }

      if (!foundSpecific) {
        const totalDebit = j.details.reduce((sum, d) => sum + Number(d.debit), 0);
        items.push({
          id: j.id.toString(),
          nomorJurnal: j.nomorJurnal,
          invoice: j.transaksi?.invoice || j.nomorJurnal,
          tanggal: j.tanggal,
          keterangan: j.keterangan || 'Jurnal Penyesuaian',
          pos: 'PIUTANG',
          posisi: 'DEBIT',
          nominal: totalDebit,
          debit: totalDebit,
          kredit: 0,
          akunName: j.details[0]?.coa?.name || 'Jurnal Umum',
          type: j.transaksi?.type || 'JURNAL_UMUM',
          paymentMethod: j.transaksi?.paymentMethod || 'TUNAI',
          details: j.transaksi?.details || [],
        });
      }
    }

    // 2. Ambil transaksi klien yang belum memiliki JurnalUmum (jika ada)
    const orphanTxs = await this.prisma.transaksi.findMany({
      where: {
        clientId: BigInt(clientId),
        ...(processedTxIds.size > 0
          ? { id: { notIn: Array.from(processedTxIds).map((id) => BigInt(id)) } }
          : {}),
      },
      include: {
        details: {
          include: {
            barang: { select: { id: true, name: true, satuan: true, jenis: true } },
            kategori: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { tanggal: 'desc' },
    });

    for (const tx of orphanTxs) {
      const nominal = Number(tx.total || 0);
      const isPiutang = tx.type === 'PENJUALAN' || tx.type === 'RETUR_PENJUALAN';
      const isDebit = tx.type === 'PENJUALAN' || tx.type === 'RETUR_PEMBELIAN';
      items.push({
        id: `tx-${tx.id}`,
        nomorJurnal: tx.invoice,
        invoice: tx.invoice,
        tanggal: tx.tanggal,
        keterangan: tx.keterangan || tx.type,
        pos: isPiutang ? 'PIUTANG' : 'HUTANG',
        posisi: isDebit ? 'DEBIT' : 'KREDIT',
        nominal,
        debit: isDebit ? nominal : 0,
        kredit: !isDebit ? nominal : 0,
        akunName: isPiutang ? 'Piutang' : 'Hutang',
        type: tx.type,
        paymentMethod: tx.paymentMethod,
        details: tx.details,
      });
    }

    // Sort items by tanggal desc
    items.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

    return {
      client: {
        id: client.id.toString(),
        code: client.code,
        name: client.name,
        type: client.type,
        phone: client.phone,
        saldoPiutang: Number(client.saldoPiutang || 0),
        saldoHutang: Number(client.saldoHutang || 0),
        sisa: Number(client.saldoPiutang || 0) - Number(client.saldoHutang || 0),
      },
      items,
      totalCount: items.length,
    };
  }
}
