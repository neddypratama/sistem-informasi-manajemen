import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    const limit = Math.min(5000, Math.max(1, Number(query.limit || 25)));
    const skip = (page - 1) * limit;

    const where: any = {};
    const andClauses: any[] = [];

    if (query.type) {
      const qType = String(query.type);
      if (qType === 'Debit') {
        where.type = 'KAS_KELUAR';
      } else if (qType === 'Kredit') {
        where.type = 'KAS_MASUK';
      } else {
        where.type = query.type;
      }
    }
    if (query.status) {
      const qStatus = String(query.status).trim();
      if (qStatus === 'ALL' || qStatus === 'SEMUA') {
        // Tampilkan semua status jika eksplisit diminta
      } else if (qStatus === 'BATAL') {
        where.status = 'BATAL';
      } else if (qStatus === 'DRAFT') {
        where.status = 'DRAFT';
      } else {
        where.status = 'SELESAI';
      }
    } else {
      // DEFAULT: Sembunyikan transaksi BATAL / Dihapus di seluruh modul
      where.status = { not: 'BATAL' };
    }
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
    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
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

    const sStr = query.startDate && query.startDate.trim().length > 0 ? query.startDate.trim() : null;
    const eStr = query.endDate && query.endDate.trim().length > 0 ? query.endDate.trim() : null;

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

    const [items, total, aggregateTotal] = await Promise.all([
      this.prisma.transaksi.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, type: true } },
          user: { select: { id: true, name: true } },
          details: {
            include: {
              barang: { select: { id: true, name: true, jenisId: true, jenis: true, satuan: true } },
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
      this.prisma.transaksi.aggregate({
        where,
        _sum: { total: true },
      }),
    ]);

    const mappedItems = items.map((it) => {
      let posisi: 'Debit' | 'Kredit' = 'Debit';
      if (it.type === 'KAS_MASUK' || it.type === 'PENJUALAN') {
        posisi = 'Kredit';
      } else if (it.type === 'KAS_KELUAR' || it.type === 'PEMBELIAN') {
        posisi = 'Debit';
      }
      return {
        ...it,
        posisi,
      };
    });

    const totalKeseluruhan = Number(aggregateTotal._sum?.total || 0);

    return {
      items: mappedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        totalKeseluruhan,
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

        const barang = await tx.barang.findUnique({
          where: { id: BigInt(item.barangId) },
          include: { jenis: true },
        });
        const jenisName = barang?.jenis?.name?.toLowerCase() || '';
        const barangName = barang?.name?.toLowerCase() || '';
        let itemKategoriId = BigInt(1);
        const isCurah = barang?.jenisId === 9n || jenisName.includes('curah') || barangName.includes('curah');
        if (isCurah) {
          itemKategoriId = BigInt(8); // Penjualan Pakan Curah
        } else if (jenisName.includes('hijauan')) {
          itemKategoriId = BigInt(101); // Penjualan Hijauan
        } else if (jenisName.includes('konsentrat')) {
          itemKategoriId = BigInt(102); // Penjualan Konsentrat
        } else if (jenisName.includes('bahan baku')) {
          itemKategoriId = BigInt(103); // Penjualan Bahan Baku Konsentrat
        } else if (jenisName.includes('premix')) {
          itemKategoriId = BigInt(104); // Penjualan Premix
        } else if (jenisName.includes('rmn')) {
          itemKategoriId = BigInt(105); // Penjualan Obat-Obatan RMN
        } else if (jenisName.includes('barang') || barang?.jenisId === 16n) {
          itemKategoriId = BigInt(107); // Penjualan Barang
        } else if (jenisName.includes('pakan') || jenisName.includes('sentrat')) {
          itemKategoriId = (barangName.includes('kucing') || barang?.jenisId === 10n) ? BigInt(7) : BigInt(6);
        } else if (jenisName.includes('obat')) {
          itemKategoriId = BigInt(9);
        } else if (jenisName.includes('tray')) {
          itemKategoriId = BigInt(10);
        } else {
          if (barangName.includes('bebek')) itemKategoriId = BigInt(2);
          else if (barangName.includes('puyuh')) itemKategoriId = BigInt(3);
          else if (barangName.includes('arab')) itemKategoriId = BigInt(4);
          else if (barangName.includes('asin')) itemKategoriId = BigInt(5);
          else itemKategoriId = BigInt(1);
        }

        const detail = await tx.detailTransaksi.create({
          data: {
            transaksiId: transaksi.id,
            barangId: BigInt(item.barangId),
            kategoriId: itemKategoriId,
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
        const isCurah = barang?.jenisId === 9n || jenisName.includes('curah') || barangName.includes('curah');

        if (isCurah) {
          akunPersediaanId = BigInt(89); // Stok Curah
          akunPendapatanId = BigInt(8);  // Penjualan Pakan Curah
          akunHppId = BigInt(96);         // HPP Pakan Curah
        } else if (jenisName.includes('pakan') || jenisName.includes('sentrat')) {
          akunPersediaanId = BigInt(60); // Stok Pakan Sentrat
          if (barangName.includes('kucing') || barang?.jenisId === 10n) {
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
    let firstItemBarang: any = null;
    let firstItemJenisName = '';
    let firstItemName = '';
    const firstItem = createDto.items[0];
    if (firstItem) {
      firstItemBarang = await this.prisma.barang.findUnique({
        where: { id: BigInt(firstItem.barangId) },
        include: { jenis: true },
      });
      firstItemJenisName = firstItemBarang?.jenis?.name?.toLowerCase() || '';
      firstItemName = firstItemBarang?.name?.toLowerCase() || '';
      const isTokoItem =
        (firstItemBarang?.jenisId && firstItemBarang.jenisId >= 11n && firstItemBarang.jenisId <= 17n) ||
        firstItemJenisName.includes('konsentrat') ||
        firstItemJenisName.includes('hijauan') ||
        firstItemJenisName.includes('premix') ||
        firstItemJenisName.includes('bahan baku') ||
        firstItemJenisName.includes('rmn');

      if (isTokoItem) {
        prefix = 'TKO';
      } else if (
        firstItemJenisName.includes('pakan') ||
        firstItemJenisName.includes('sentrat') ||
        firstItemJenisName.includes('curah')
      ) {
        prefix = 'STR';
      } else if (firstItemJenisName.includes('obat')) {
        prefix = 'OBT';
      } else if (firstItemJenisName.includes('tray')) {
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
      // Telur: 72 (Hutang Peternak), Pakan: 83 (Hutang Sentrat SK) / 76 (Hutang Bp. Supriyadi), Obat: 80 (Hutang Obat SK), Tray: 77 (Hutang Tray Diamond)
      const isFirstItemCurah = firstItemBarang?.jenisId === 9n || firstItemJenisName.includes('curah') || firstItemName.includes('curah');
      let defaultHutangId = 72;
      if (prefix === 'TKO') {
        defaultHutangId = 127; // Hutang Supplier Toko
      } else if (prefix === 'STR') {
        defaultHutangId = ((createDto.clientId && Number(createDto.clientId) === 241) || isFirstItemCurah) ? 76 : 83;
      }
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
        } else if (katName.includes('hutang') || katName.includes('saldo') || akunKreditId === 76n) {
          paymentMethod = 'KREDIT_BON';
        }
      }

      let clientId = createDto.clientId ? BigInt(createDto.clientId) : null;
      if (!clientId && akunKreditId === 76n) {
        clientId = 241n; // Auto-assign supplier Bp.Supriyadi
      }

      const transaksi = await tx.transaksi.create({
        data: {
          invoice,
          tanggal,
          type: 'PEMBELIAN',
          status: 'SELESAI',
          paymentMethod,
          clientId,
          userId: BigInt(userId),
          subtotal,
          diskon,
          total,
          keterangan: createDto.keterangan,
        },
      });

      for (const item of createDto.items) {
        const itemSubtotal = item.qty * item.hargaSatuan;

        const barang = await tx.barang.findUnique({
          where: { id: BigInt(item.barangId) },
          include: { jenis: true },
        });
        const jenisName = barang?.jenis?.name?.toLowerCase() || '';
        const isCurah = barang?.jenisId === 9n || jenisName.includes('curah') || (barang?.name || '').toLowerCase().includes('curah');
        let itemKategoriId = BigInt(59);
        if (isCurah) itemKategoriId = BigInt(89);
        else if (jenisName.includes('hijauan') || barang?.jenisId === 11n) itemKategoriId = BigInt(117);
        else if (jenisName.includes('konsentrat') || barang?.jenisId === 12n) itemKategoriId = BigInt(118);
        else if (jenisName.includes('bahan baku') || barang?.jenisId === 13n) itemKategoriId = BigInt(119);
        else if (jenisName.includes('premix') || barang?.jenisId === 14n) itemKategoriId = BigInt(120);
        else if (barang?.jenisId === 10n || jenisName.includes('kucing')) itemKategoriId = BigInt(121);
        else if (barang?.jenisId === 15n || (jenisName.includes('obat') && jenisName.includes('rmn'))) itemKategoriId = BigInt(122);
        else if (barang?.jenisId === 17n || (jenisName.includes('obat') && jenisName.includes('unggas'))) itemKategoriId = BigInt(123);
        else if (jenisName.includes('barang') || barang?.jenisId === 16n) itemKategoriId = BigInt(124);
        else if (jenisName.includes('pakan') || jenisName.includes('sentrat')) itemKategoriId = BigInt(60);
        else if (jenisName.includes('obat')) itemKategoriId = BigInt(61);
        else if (jenisName.includes('tray')) itemKategoriId = BigInt(62);

        const detail = await tx.detailTransaksi.create({
          data: {
            transaksiId: transaksi.id,
            barangId: BigInt(item.barangId),
            kategoriId: itemKategoriId,
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
      if (paymentMethod === 'KREDIT_BON' && clientId) {
        await tx.client.update({
          where: { id: clientId },
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
      if (firstItemBarang?.jenisId === 11n) akunPersediaanId = BigInt(117);
      else if (firstItemBarang?.jenisId === 12n) akunPersediaanId = BigInt(118);
      else if (firstItemBarang?.jenisId === 13n) akunPersediaanId = BigInt(119);
      else if (firstItemBarang?.jenisId === 14n) akunPersediaanId = BigInt(120);
      else if (firstItemBarang?.jenisId === 10n) akunPersediaanId = BigInt(121);
      else if (firstItemBarang?.jenisId === 15n) akunPersediaanId = BigInt(122);
      else if (firstItemBarang?.jenisId === 17n) akunPersediaanId = BigInt(123);
      else if (firstItemBarang?.jenisId === 16n) akunPersediaanId = BigInt(124);
      else if (prefix === 'STR') {
        akunPersediaanId = isFirstItemCurah ? BigInt(89) : BigInt(60); // 89: Stok Curah, 60: Stok Pakan Sentrat
      } else if (prefix === 'OBT') akunPersediaanId = BigInt(61); // Stok Obat
      else if (prefix === 'TRY') akunPersediaanId = BigInt(62); // Stok Tray
      else if (prefix === 'TKO') akunPersediaanId = BigInt(118); // Stok Konsentrat Toko

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
      nominal?: number;
      kategoriId?: number;
      kasBankKategoriId?: number;
      type?: string;
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
              kategori: { include: { detailKategori: true } },
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
      let newPaymentMethod = body.paymentMethod || oldPaymentMethod;
      if (!body.paymentMethod && body.paymentAccountId) {
        const pId = Number(body.paymentAccountId);
        if ([72, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85].includes(pId)) {
          newPaymentMethod = 'KREDIT_BON';
        } else if ([64, 71].includes(pId)) {
          newPaymentMethod = 'TUNAI';
        } else if ([65, 66, 67, 68, 69, 70].includes(pId)) {
          newPaymentMethod = 'TRANSFER';
        }
      }

      const inv = existingTx.invoice || '';
      const firstDetail = existingTx.details[0];
      const dkType = firstDetail?.kategori?.detailKategori?.type || '';

      const isBeban = inv.includes('PGN') || dkType === 'Pengeluaran';
      const isPendapatanLain = inv.includes('LNY') || (dkType === 'Pendapatan' && Number(firstDetail?.kategoriId) > 10);
      const isHutang = inv.includes('UTG') || dkType === 'Liabilitas';
      const isPiutang = inv.includes('BON') || (dkType === 'Aset' && (firstDetail?.kategori?.name || '').toLowerCase().includes('piutang'));

      // ==========================================
      // A. EDIT BEBAN OPERASIONAL
      // ==========================================
      if (isBeban) {
        const nominal = body.nominal !== undefined ? Number(body.nominal) : (body.items?.[0] ? Number(body.items[0].hargaSatuan) : oldTotal);
        const kategoriId = body.kategoriId ? BigInt(body.kategoriId) : (firstDetail?.kategoriId || BigInt(22));
        const kasBankId = BigInt(body.kasBankKategoriId || body.paymentAccountId || (newPaymentMethod === 'TRANSFER' ? 66 : 64));
        const isKembalian = body.type ? body.type === 'Kredit' : existingTx.type === 'KAS_MASUK';
        const txType = isKembalian ? 'KAS_MASUK' : 'KAS_KELUAR';
        const paymentMethod = Number(kasBankId) === 64 ? 'TUNAI' : 'TRANSFER';

        const updatedTx = await tx.transaksi.update({
          where: { id: existingTx.id },
          data: {
            tanggal,
            type: txType,
            paymentMethod,
            subtotal: nominal,
            total: nominal,
            keterangan: body.keterangan !== undefined ? body.keterangan : existingTx.keterangan,
          },
          include: {
            client: true,
            details: { include: { kategori: true } },
          },
        });

        if (firstDetail) {
          await tx.detailTransaksi.update({
            where: { id: firstDetail.id },
            data: {
              kategoriId,
              qty: 1,
              hargaSatuan: nominal,
              subtotal: nominal,
              totalHpp: 0,
            },
          });
        }

        const existingJurnal = existingTx.jurnalUmums[0];
        if (existingJurnal) {
          await tx.jurnalUmum.update({
            where: { id: existingJurnal.id },
            data: {
              tanggal,
              keterangan: body.keterangan || (isKembalian ? 'Kembalian Beban Operasional' : 'Pengeluaran Beban Operasional'),
            },
          });
          await tx.jurnalDetail.deleteMany({ where: { jurnalId: existingJurnal.id } });
          await tx.jurnalDetail.createMany({
            data: isKembalian
              ? [
                  { jurnalId: existingJurnal.id, coaId: kasBankId, kategoriId: kasBankId, debit: nominal, kredit: 0 },
                  { jurnalId: existingJurnal.id, coaId: kategoriId, kategoriId, debit: 0, kredit: nominal },
                ]
              : [
                  { jurnalId: existingJurnal.id, coaId: kategoriId, kategoriId, debit: nominal, kredit: 0 },
                  { jurnalId: existingJurnal.id, coaId: kasBankId, kategoriId: kasBankId, debit: 0, kredit: nominal },
                ],
          });
        }

        return updatedTx;
      }

      // ==========================================
      // B. EDIT PENDAPATAN LAIN-LAIN
      // ==========================================
      if (isPendapatanLain) {
        const nominal = body.nominal !== undefined ? Number(body.nominal) : (body.items?.[0] ? Number(body.items[0].hargaSatuan) : oldTotal);
        const kategoriId = body.kategoriId ? BigInt(body.kategoriId) : (firstDetail?.kategoriId || BigInt(19));
        const kasBankId = BigInt(body.kasBankKategoriId || body.paymentAccountId || (newPaymentMethod === 'TRANSFER' ? 66 : 64));
        const paymentMethod = Number(kasBankId) === 64 ? 'TUNAI' : 'TRANSFER';

        const updatedTx = await tx.transaksi.update({
          where: { id: existingTx.id },
          data: {
            tanggal,
            clientId: newClientId,
            paymentMethod,
            subtotal: nominal,
            total: nominal,
            keterangan: body.keterangan !== undefined ? body.keterangan : existingTx.keterangan,
          },
          include: {
            client: true,
            details: { include: { kategori: true } },
          },
        });

        if (firstDetail) {
          await tx.detailTransaksi.update({
            where: { id: firstDetail.id },
            data: {
              kategoriId,
              qty: 1,
              hargaSatuan: nominal,
              subtotal: nominal,
              totalHpp: 0,
            },
          });
        }

        const existingJurnal = existingTx.jurnalUmums[0];
        if (existingJurnal) {
          await tx.jurnalUmum.update({
            where: { id: existingJurnal.id },
            data: {
              tanggal,
              clientId: newClientId,
              keterangan: body.keterangan || 'Pemasukan Pendapatan Lainnya',
            },
          });
          await tx.jurnalDetail.deleteMany({ where: { jurnalId: existingJurnal.id } });
          await tx.jurnalDetail.createMany({
            data: [
              { jurnalId: existingJurnal.id, coaId: kasBankId, kategoriId: kasBankId, debit: nominal, kredit: 0 },
              { jurnalId: existingJurnal.id, coaId: kategoriId, kategoriId, debit: 0, kredit: nominal },
            ],
          });
        }

        return updatedTx;
      }

      // ==========================================
      // C. EDIT MUTASI HUTANG USAHA
      // ==========================================
      if (isHutang) {
        const nominal = body.nominal !== undefined ? Number(body.nominal) : oldTotal;
        const kategoriId = body.kategoriId ? BigInt(body.kategoriId) : (firstDetail?.kategoriId || BigInt(72));
        const kasBankId = BigInt(body.kasBankKategoriId || body.paymentAccountId || (newPaymentMethod === 'TRANSFER' ? 65 : 64));
        const oldIsBayar = existingTx.type === 'KAS_KELUAR';
        const isBayar = body.type ? body.type === 'BAYAR' : oldIsBayar;
        const txType = isBayar ? 'KAS_KELUAR' : 'KAS_MASUK';
        const paymentMethod = Number(kasBankId) === 64 ? 'TUNAI' : 'TRANSFER';

        // Revert efek saldo mitra lama
        if (oldClientId) {
          if (oldIsBayar) {
            await tx.client.update({
              where: { id: oldClientId },
              data: { saldoHutang: { increment: oldTotal } },
            });
          } else {
            await tx.client.update({
              where: { id: oldClientId },
              data: { saldoHutang: { decrement: oldTotal } },
            });
          }
        }

        // Terapkan efek saldo mitra baru
        if (newClientId) {
          if (isBayar) {
            await tx.client.update({
              where: { id: newClientId },
              data: { saldoHutang: { decrement: nominal } },
            });
          } else {
            await tx.client.update({
              where: { id: newClientId },
              data: { saldoHutang: { increment: nominal } },
            });
          }
        }

        const updatedTx = await tx.transaksi.update({
          where: { id: existingTx.id },
          data: {
            tanggal,
            clientId: newClientId,
            type: txType,
            paymentMethod,
            subtotal: nominal,
            total: nominal,
            keterangan: body.keterangan !== undefined ? body.keterangan : existingTx.keterangan,
          },
          include: {
            client: true,
            details: { include: { kategori: true } },
          },
        });

        if (firstDetail) {
          await tx.detailTransaksi.update({
            where: { id: firstDetail.id },
            data: {
              kategoriId,
              qty: 1,
              hargaSatuan: nominal,
              subtotal: nominal,
              totalHpp: 0,
            },
          });
        }

        const existingJurnal = existingTx.jurnalUmums[0];
        if (existingJurnal) {
          await tx.jurnalUmum.update({
            where: { id: existingJurnal.id },
            data: {
              tanggal,
              clientId: newClientId,
              keterangan: body.keterangan || (isBayar ? 'Pembayaran / Pelunasan Hutang' : 'Penambahan Hutang Usaha'),
            },
          });
          await tx.jurnalDetail.deleteMany({ where: { jurnalId: existingJurnal.id } });
          await tx.jurnalDetail.createMany({
            data: isBayar
              ? [
                  { jurnalId: existingJurnal.id, coaId: kategoriId, kategoriId, debit: nominal, kredit: 0 },
                  { jurnalId: existingJurnal.id, coaId: kasBankId, kategoriId: kasBankId, debit: 0, kredit: nominal },
                ]
              : [
                  { jurnalId: existingJurnal.id, coaId: kasBankId, kategoriId: kasBankId, debit: nominal, kredit: 0 },
                  { jurnalId: existingJurnal.id, coaId: kategoriId, kategoriId, debit: 0, kredit: nominal },
                ],
          });
        }

        return updatedTx;
      }

      // ==========================================
      // D. EDIT MUTASI PIUTANG USAHA
      // ==========================================
      if (isPiutang) {
        const nominal = body.nominal !== undefined ? Number(body.nominal) : oldTotal;
        const kategoriId = body.kategoriId ? BigInt(body.kategoriId) : (firstDetail?.kategoriId || BigInt(46));
        const kasBankId = BigInt(body.kasBankKategoriId || body.paymentAccountId || (newPaymentMethod === 'TRANSFER' ? 65 : 64));
        const oldIsBayar = existingTx.type === 'KAS_MASUK';
        const isBayar = body.type ? body.type === 'BAYAR' : oldIsBayar;
        const txType = isBayar ? 'KAS_MASUK' : 'KAS_KELUAR';
        const paymentMethod = Number(kasBankId) === 64 ? 'TUNAI' : 'TRANSFER';

        // Revert efek saldo mitra lama
        if (oldClientId) {
          if (oldIsBayar) {
            await tx.client.update({
              where: { id: oldClientId },
              data: { saldoPiutang: { increment: oldTotal } },
            });
          } else {
            await tx.client.update({
              where: { id: oldClientId },
              data: { saldoPiutang: { decrement: oldTotal } },
            });
          }
        }

        // Terapkan efek saldo mitra baru
        if (newClientId) {
          if (isBayar) {
            await tx.client.update({
              where: { id: newClientId },
              data: { saldoPiutang: { decrement: nominal } },
            });
          } else {
            await tx.client.update({
              where: { id: newClientId },
              data: { saldoPiutang: { increment: nominal } },
            });
          }
        }

        const updatedTx = await tx.transaksi.update({
          where: { id: existingTx.id },
          data: {
            tanggal,
            clientId: newClientId,
            type: txType,
            paymentMethod,
            subtotal: nominal,
            total: nominal,
            keterangan: body.keterangan !== undefined ? body.keterangan : existingTx.keterangan,
          },
          include: {
            client: true,
            details: { include: { kategori: true } },
          },
        });

        if (firstDetail) {
          await tx.detailTransaksi.update({
            where: { id: firstDetail.id },
            data: {
              kategoriId,
              qty: 1,
              hargaSatuan: nominal,
              subtotal: nominal,
              totalHpp: 0,
            },
          });
        }

        const existingJurnal = existingTx.jurnalUmums[0];
        if (existingJurnal) {
          await tx.jurnalUmum.update({
            where: { id: existingJurnal.id },
            data: {
              tanggal,
              clientId: newClientId,
              keterangan: body.keterangan || (isBayar ? 'Penerimaan Pembayaran Piutang' : 'Penambahan Piutang Usaha'),
            },
          });
          await tx.jurnalDetail.deleteMany({ where: { jurnalId: existingJurnal.id } });
          await tx.jurnalDetail.createMany({
            data: isBayar
              ? [
                  { jurnalId: existingJurnal.id, coaId: kasBankId, kategoriId: kasBankId, debit: nominal, kredit: 0 },
                  { jurnalId: existingJurnal.id, coaId: kategoriId, kategoriId, debit: 0, kredit: nominal },
                ]
              : [
                  { jurnalId: existingJurnal.id, coaId: kategoriId, kategoriId, debit: nominal, kredit: 0 },
                  { jurnalId: existingJurnal.id, coaId: kasBankId, kategoriId: kasBankId, debit: 0, kredit: nominal },
                ],
          });
        }

        return updatedTx;
      }

      // ==========================================
      // E. EDIT TRANSAKSI KOMODITAS (PEMBELIAN & PENJUALAN)
      // ==========================================
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

            const barang = await tx.barang.findUnique({
              where: { id: BigInt(item.barangId) },
              include: { jenis: true },
            });
            const jenisName = barang?.jenis?.name?.toLowerCase() || '';
            const isCurah = barang?.jenisId === 9n || jenisName.includes('curah') || (barang?.name || '').toLowerCase().includes('curah');
            let itemKategoriId = BigInt(59);
            if (isCurah) itemKategoriId = BigInt(89);
            else if (jenisName.includes('pakan') || jenisName.includes('sentrat')) itemKategoriId = BigInt(60);
            else if (jenisName.includes('obat')) itemKategoriId = BigInt(61);
            else if (jenisName.includes('tray')) itemKategoriId = BigInt(62);

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
                    barangId: BigInt(item.barangId),
                    qtyMasuk: itemQty,
                    qtySisa: newQtySisa,
                    hargaBeli: itemHarga,
                    tanggal,
                  },
                });
              } else {
                await tx.stokBatch.create({
                  data: {
                    barangId: BigInt(item.barangId),
                    detailTransaksiId: oldDetail.id,
                    userId: BigInt(userId),
                    tanggal,
                    qtyMasuk: itemQty,
                    qtySisa: itemQty,
                    hargaBeli: itemHarga,
                  },
                });
              }

              await tx.detailTransaksi.update({
                where: { id: oldDetail.id },
                data: {
                  barangId: BigInt(item.barangId),
                  kategoriId: itemKategoriId,
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
                  kategoriId: itemKategoriId,
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
        } else if (existingTx.type === 'PENJUALAN') {
          newSubtotal = 0;
          const oldDetails = existingTx.details;
          const oldDetailIds = oldDetails.map((d) => d.id);

          // A. Rollback alokasi stok keluar FIFO yang lama
          const oldStokKeluars = await tx.stokKeluarBatch.findMany({
            where: { detailTransaksiId: { in: oldDetailIds } },
          });
          for (const sk of oldStokKeluars) {
            await tx.stokBatch.update({
              where: { id: sk.stokBatchId },
              data: { qtySisa: { increment: sk.qty } },
            });
          }
          await tx.stokKeluarBatch.deleteMany({
            where: { detailTransaksiId: { in: oldDetailIds } },
          });

          // B. Update / Tambah baris detail transaksi baru & alokasikan FIFO ulang
          const matchedDetailIds = new Set<string>();

          for (const item of body.items) {
            const itemQty = Number(item.qty);
            const itemHarga = Number(item.hargaSatuan);
            const itemSubtotal = itemQty * itemHarga;
            newSubtotal += itemSubtotal;

            const barang = await tx.barang.findUnique({
              where: { id: BigInt(item.barangId) },
              include: { jenis: true },
            });
            const jenisName = barang?.jenis?.name?.toLowerCase() || '';
            const barangName = barang?.name?.toLowerCase() || '';
            let itemKategoriId = BigInt(1);
            const isCurah = barang?.jenisId === 9n || jenisName.includes('curah') || barangName.includes('curah');
            if (isCurah) {
              itemKategoriId = BigInt(8); // Penjualan Pakan Curah
            } else if (jenisName.includes('pakan') || jenisName.includes('sentrat')) {
              itemKategoriId = (barangName.includes('kucing') || barang?.jenisId === 10n) ? BigInt(7) : BigInt(6);
            } else if (jenisName.includes('obat')) {
              itemKategoriId = BigInt(9);
            } else if (jenisName.includes('tray')) {
              itemKategoriId = BigInt(10);
            } else {
              if (barangName.includes('bebek')) itemKategoriId = BigInt(2);
              else if (barangName.includes('puyuh')) itemKategoriId = BigInt(3);
              else if (barangName.includes('arab')) itemKategoriId = BigInt(4);
              else if (barangName.includes('asin')) itemKategoriId = BigInt(5);
              else itemKategoriId = BigInt(1);
            }

            let detailId: bigint;
            let oldDetail = item.detailId
              ? oldDetails.find((d) => d.id === BigInt(item.detailId!))
              : null;

            if (oldDetail) {
              matchedDetailIds.add(String(oldDetail.id));
              detailId = oldDetail.id;
              await tx.detailTransaksi.update({
                where: { id: oldDetail.id },
                data: {
                  barangId: BigInt(item.barangId),
                  kategoriId: itemKategoriId,
                  qty: itemQty,
                  hargaSatuan: itemHarga,
                  subtotal: itemSubtotal,
                },
              });
            } else {
              const newDetail = await tx.detailTransaksi.create({
                data: {
                  transaksiId: existingTx.id,
                  barangId: BigInt(item.barangId),
                  kategoriId: itemKategoriId,
                  qty: itemQty,
                  hargaSatuan: itemHarga,
                  subtotal: itemSubtotal,
                  telurBentes: 0,
                  telurKotor: 0,
                  telurCeplok: 0,
                  telurJumbo: 0,
                },
              });
              detailId = newDetail.id;
            }

            // Alokasikan FIFO baru
            const fifoResult = await this.fifoService.allocateFifoStock(
              tx,
              item.barangId,
              itemQty,
              detailId,
            );

            await tx.detailTransaksi.update({
              where: { id: detailId },
              data: {
                hppSatuan: fifoResult.hppSatuan,
                totalHpp: fifoResult.totalHpp,
              },
            });
          }

          // C. Hapus old details yang dihapus dari modal edit
          for (const oldDetail of oldDetails) {
            if (!matchedDetailIds.has(String(oldDetail.id))) {
              await tx.detailTransaksi.delete({ where: { id: oldDetail.id } });
            }
          }

          newTotal = Math.max(0, newSubtotal - newDiskon);
        } else if (existingTx.type === 'RETUR_PENJUALAN' || existingTx.type === 'RETUR_PEMBELIAN') {
          newSubtotal = 0;
          for (const item of body.items) {
            const itemQty = Number(item.qty);
            const itemHarga = Number(item.hargaSatuan);
            newSubtotal += itemQty * itemHarga;
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
        const txActionLabel = existingTx.type === 'PENJUALAN' ? 'Penjualan' : 'Pembelian';
        await tx.jurnalUmum.update({
          where: { id: existingJurnal.id },
          data: {
            tanggal,
            clientId: newClientId,
            keterangan: body.keterangan
              ? `${txActionLabel} ${existingTx.invoice} - ${body.keterangan}`
              : existingJurnal.keterangan,
          },
        });

        // Hapus rincian debit-kredit jurnal lama
        await tx.jurnalDetail.deleteMany({
          where: { jurnalId: existingJurnal.id },
        });

        const firstBarang = updatedTx.details[0]?.barang;
        const jenisName = firstBarang?.jenis?.name?.toLowerCase() || '';
        const barangName = firstBarang?.name?.toLowerCase() || '';
        const isCurah = firstBarang?.jenisId === 9n || jenisName.includes('curah') || barangName.includes('curah');

        if (existingTx.type === 'PEMBELIAN') {
          let akunPersediaanId = BigInt(59); // Telur
          let defaultHutangId = BigInt(72); // Hutang Peternak
          if (jenisName.includes('pakan') || jenisName.includes('sentrat') || isCurah) {
            akunPersediaanId = isCurah ? BigInt(89) : BigInt(60); // 89: Stok Curah, 60: Stok Pakan Sentrat
            const cName = updatedTx.client?.name?.toLowerCase() || '';
            defaultHutangId = (cName.includes('supriyadi') || isCurah) ? BigInt(76) : BigInt(83); // Hutang Bp. Supriyadi / Hutang Sentrat SK
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
          let akunPersediaanId = BigInt(59); // Stok Telur
          let akunPendapatanId = BigInt(1);  // Penjualan Telur Horn
          let akunHppId = BigInt(90);        // HPP Telur Horn
          let defaultPiutangId = BigInt(48); // Piutang Pedagang

          if (isCurah) {
            akunPersediaanId = BigInt(89); // Stok Curah
            defaultPiutangId = BigInt(46); // Piutang Peternak
            akunPendapatanId = BigInt(8);  // Penjualan Pakan Curah
            akunHppId = BigInt(96);         // HPP Pakan Curah
          } else if (jenisName.includes('pakan') || jenisName.includes('sentrat')) {
            akunPersediaanId = BigInt(60);
            defaultPiutangId = BigInt(46);
            if (barangName.includes('kucing') || firstBarang?.jenisId === 10n) {
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
      } else if (existingTx.type === 'RETUR_PENJUALAN') {
        // Rollback stok batch yang dibuat saat retur penjualan
        for (const detail of existingTx.details) {
          for (const batch of detail.stokBatches) {
            const consumed = Number(batch.qtyMasuk) - Number(batch.qtySisa);
            if (consumed > 0) {
              const bName = detail.barang?.name || 'Barang';
              throw new BadRequestException(
                `Transaksi retur penjualan ini tidak dapat dibatalkan karena ${consumed} stok "${bName}" sudah terjual kembali.`,
              );
            }
          }
        }
        const detailIds = existingTx.details.map((d) => d.id);
        await tx.stokBatch.deleteMany({
          where: { detailTransaksiId: { in: detailIds } },
        });

        // Rollback piutang: pembatalan retur mengembalikan piutang (increment)
        if (existingTx.paymentMethod === 'KREDIT_BON' && existingTx.clientId) {
          await tx.client.update({
            where: { id: existingTx.clientId },
            data: { saldoPiutang: { increment: existingTx.total } },
          });
        }
      } else if (existingTx.type === 'RETUR_PEMBELIAN') {
        // Rollback alokasi stok keluar FIFO saat retur ke supplier
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

        // Rollback hutang: pembatalan retur mengembalikan hutang (increment)
        if (existingTx.paymentMethod === 'KREDIT_BON' && existingTx.clientId) {
          await tx.client.update({
            where: { id: existingTx.clientId },
            data: { saldoHutang: { increment: existingTx.total } },
          });
        }
      }

      // Rollback mutasi Hutang / Piutang jika transaksi berasal dari modul Keuangan Hutang/Piutang
      if (existingTx.clientId) {
        if (existingTx.invoice.includes('UTG')) {
          if (existingTx.type === 'KAS_KELUAR') {
            // Pembatalan pembayaran hutang -> saldo hutang bertambah kembali
            await tx.client.update({
              where: { id: existingTx.clientId },
              data: { saldoHutang: { increment: existingTx.total } },
            });
          } else if (existingTx.type === 'KAS_MASUK') {
            // Pembatalan penambahan hutang -> saldo hutang berkurang kembali
            await tx.client.update({
              where: { id: existingTx.clientId },
              data: { saldoHutang: { decrement: existingTx.total } },
            });
          }
        } else if (existingTx.invoice.includes('BON')) {
          if (existingTx.type === 'KAS_MASUK') {
            // Pembatalan pelunasan piutang -> saldo piutang bertambah kembali
            await tx.client.update({
              where: { id: existingTx.clientId },
              data: { saldoPiutang: { increment: existingTx.total } },
            });
          } else if (existingTx.type === 'KAS_KELUAR') {
            // Pembatalan penambahan piutang -> saldo piutang berkurang kembali
            await tx.client.update({
              where: { id: existingTx.clientId },
              data: { saldoPiutang: { decrement: existingTx.total } },
            });
          }
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

  /**
   * Ringkasan Finansial, Kas Tunai vs Transfer, dan Monitoring Saldo Khusus Bpk. Supriyadi (Pakan Curah)
   */
  async getCurahSummary(startDate?: string, endDate?: string) {
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
      dateFilter = Prisma.sql`WHERE (t.status IS NULL OR t.status != 'BATAL') AND t.tanggal BETWEEN ${dStart} AND ${dEnd}`;
    } else if (sStr) {
      const dStart = new Date(`${sStr} 00:00:00`);
      dateFilter = Prisma.sql`WHERE (t.status IS NULL OR t.status != 'BATAL') AND t.tanggal >= ${dStart}`;
    } else if (eStr) {
      const dEnd = new Date(`${eStr} 23:59:59`);
      dateFilter = Prisma.sql`WHERE (t.status IS NULL OR t.status != 'BATAL') AND t.tanggal <= ${dEnd}`;
    }

    // 1. Agregat Penjualan Curah (jenis_id = 9 atau dt.kategori_id = 8)
    const salesCurah = await this.prisma.$queryRaw<
      {
        total_penjualan: string | number;
        total_hpp: string | number;
        total_qty_kg: string | number;
        total_tunai: string | number;
        total_transfer: string | number;
        total_bon: string | number;
      }[]
    >`
      SELECT 
        COALESCE(SUM(dt.subtotal), 0) as total_penjualan,
        COALESCE(SUM(dt.total_hpp), 0) as total_hpp,
        COALESCE(SUM(dt.qty), 0) as total_qty_kg,
        COALESCE(SUM(CASE WHEN t.payment_method = 'TUNAI' THEN dt.subtotal ELSE 0 END), 0) as total_tunai,
        COALESCE(SUM(CASE WHEN t.payment_method = 'TRANSFER' THEN dt.subtotal ELSE 0 END), 0) as total_transfer,
        COALESCE(SUM(CASE WHEN t.payment_method = 'KREDIT_BON' THEN dt.subtotal ELSE 0 END), 0) as total_bon
      FROM transaksis t
      JOIN detail_transaksis dt ON dt.transaksi_id = t.id
      JOIN barangs b ON b.id = dt.barang_id
      ${dateFilter}
        AND t.type = 'PENJUALAN'
        AND (b.jenis_id = 9 OR dt.kategori_id = 8)
    `;

    // 2. Agregat Pembelian Bahan Curah
    const buyCurah = await this.prisma.$queryRaw<
      {
        total_pembelian: string | number;
        total_tunai: string | number;
        total_transfer: string | number;
        total_bon: string | number;
      }[]
    >`
      SELECT 
        COALESCE(SUM(dt.subtotal), 0) as total_pembelian,
        COALESCE(SUM(CASE WHEN t.payment_method = 'TUNAI' THEN dt.subtotal ELSE 0 END), 0) as total_tunai,
        COALESCE(SUM(CASE WHEN t.payment_method = 'TRANSFER' THEN dt.subtotal ELSE 0 END), 0) as total_transfer,
        COALESCE(SUM(CASE WHEN t.payment_method = 'KREDIT_BON' THEN dt.subtotal ELSE 0 END), 0) as total_bon
      FROM transaksis t
      JOIN detail_transaksis dt ON dt.transaksi_id = t.id
      JOIN barangs b ON b.id = dt.barang_id
      ${dateFilter}
        AND t.type = 'PEMBELIAN'
        AND (b.jenis_id = 9 OR dt.kategori_id = 89)
    `;

    // 3. Stok Fisik Saat Ini
    const stokCurah = await this.prisma.$queryRaw<
      {
        total_qty_sisa: string | number;
        total_nilai_stok: string | number;
      }[]
    >`
      SELECT 
        COALESCE(SUM(sb.qty_sisa), 0) as total_qty_sisa,
        COALESCE(SUM(sb.qty_sisa * sb.harga_beli), 0) as total_nilai_stok
      FROM stok_batches sb
      JOIN barangs b ON b.id = sb.barang_id
      WHERE (b.jenis_id = 9)
        AND sb.qty_sisa > 0
    `;

    // 4. Client Mitra Bpk. Supriyadi (ID 241)
    const clientSupriyadi = await this.prisma.client.findFirst({
      where: {
        OR: [{ id: 241n }, { name: { contains: 'Supriyadi' } }],
      },
      select: {
        id: true,
        name: true,
        saldoHutang: true,
        saldoPiutang: true,
      },
    });

    const s = salesCurah[0] || {
      total_penjualan: 0,
      total_hpp: 0,
      total_qty_kg: 0,
      total_tunai: 0,
      total_transfer: 0,
      total_bon: 0,
    };
    const b = buyCurah[0] || {
      total_pembelian: 0,
      total_tunai: 0,
      total_transfer: 0,
      total_bon: 0,
    };
    const stk = stokCurah[0] || { total_qty_sisa: 0, total_nilai_stok: 0 };

    const pen = Number(s.total_penjualan || 0);
    const hp = Number(s.total_hpp || 0);
    const laba = pen - hp;
    const margin = pen > 0 ? (laba / pen) * 100 : 0;

    const saldoHutang = Number(clientSupriyadi?.saldoHutang || 0);
    const saldoPiutang = Number(clientSupriyadi?.saldoPiutang || 0);

    return {
      penjualanCurah: pen,
      hppCurah: hp,
      labaKotorCurah: laba,
      marginCurah: margin,
      qtyTerjualKg: Number(s.total_qty_kg || 0),
      tunaiMasuk: Number(s.total_tunai || 0),
      transferMasuk: Number(s.total_transfer || 0),
      bonPiutang: Number(s.total_bon || 0),
      pembelianBahan: Number(b.total_pembelian || 0),
      pembelianTunai: Number(b.total_tunai || 0),
      pembelianTransfer: Number(b.total_transfer || 0),
      pembelianBon: Number(b.total_bon || 0),
      stokFisikTotal: {
        qtyKg: Number(stk.total_qty_sisa || 0),
        nilaiRupiah: Number(stk.total_nilai_stok || 0),
      },
      mitraSupriyadi: {
        id: clientSupriyadi ? Number(clientSupriyadi.id) : 241,
        name: clientSupriyadi?.name || 'Bp. Supriyadi',
        saldoHutang,
        saldoPiutang,
        saldoNet: saldoPiutang - saldoHutang,
      },
    };
  }
}
