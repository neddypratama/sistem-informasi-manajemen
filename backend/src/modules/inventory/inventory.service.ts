import { Injectable, NotFoundException } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../../database/prisma.service.js';

export class CreateOpnameDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  barangId!: number;

  @IsOptional()
  @IsString()
  tanggal?: string;

  @IsOptional()
  @IsString()
  keterangan?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stokFisik?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  selisihStok?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bentes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ceplok?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  prok?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  kotor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  jumbo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  barangPakai?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pemakaianTray?: number;
}

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Menampilkan posisi stok real-time per barang beserta sisa kuantitas.
   */
  async getStockSummary(jenisId?: number) {
    const where: any = { isActive: true };
    if (jenisId) {
      where.jenisId = BigInt(jenisId);
    }

    const barangs = await this.prisma.barang.findMany({
      where,
      include: {
        jenis: true,
        satuan: true,
        stokBatches: {
          where: { qtySisa: { gt: 0 } },
          select: {
            id: true,
            tanggal: true,
            qtyMasuk: true,
            qtySisa: true,
            hargaBeli: true,
          },
          orderBy: { tanggal: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return barangs.map((b) => {
      const totalSisa = b.stokBatches.reduce((acc, curr) => acc + Number(curr.qtySisa), 0);
      const totalNilaiStok = b.stokBatches.reduce(
        (acc, curr) => acc + Number(curr.qtySisa) * Number(curr.hargaBeli),
        0,
      );
      const hargaRataRata = totalSisa > 0 ? totalNilaiStok / totalSisa : 0;

      return {
        id: Number(b.id),
        barangId: Number(b.id),
        code: b.code,
        name: b.name,
        jenisId: Number(b.jenisId),
        jenis: b.jenis.name,
        satuan: b.satuan?.name || 'Kg',
        totalStok: totalSisa,
        totalQty: totalSisa,
        nilaiStok: totalNilaiStok,
        hargaRataRata,
        stokMinimum: Number(b.stokMinimum),
        isDibawahMinimum: totalSisa <= Number(b.stokMinimum),
        batches: b.stokBatches.map((sb) => ({
          id: Number(sb.id),
          tanggal: sb.tanggal,
          qtyMasuk: Number(sb.qtyMasuk),
          qtySisa: Number(sb.qtySisa),
          hargaBeli: Number(sb.hargaBeli),
        })),
      };
    });
  }

  /**
   * Mengambil daftar batch aktif per barang
   */
  async getBatches(barangId?: number) {
    const where: any = { qtySisa: { gt: 0 } };
    if (barangId) {
      where.barangId = BigInt(barangId);
    }

    return this.prisma.stokBatch.findMany({
      where,
      include: {
        barang: {
          include: { jenis: true, satuan: true },
        },
      },
      orderBy: [{ tanggal: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * Mengambil riwayat daftar stok opname terpaginasi
   */
  async findAllOpname(query: {
    jenisOpname?: string;
    barangId?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit || 25)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.jenisOpname) where.jenisOpname = query.jenisOpname;
    if (query.barangId) where.barangId = BigInt(query.barangId);
    if (query.search) {
      where.OR = [
        { nomorOpname: { contains: query.search } },
        { keterangan: { contains: query.search } },
        { barang: { name: { contains: query.search } } },
      ];
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

    const [items, total] = await Promise.all([
      this.prisma.stokOpname.findMany({
        where,
        include: {
          barang: { include: { jenis: true, satuan: true } },
          user: { select: { id: true, name: true } },
          jurnal: {
            include: { details: { include: { coa: true, kategori: true } } },
          },
        },
        orderBy: { tanggal: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.stokOpname.count({ where }),
    ]);

    return {
      items: items.map((op) => ({
        id: Number(op.id),
        nomorOpname: op.nomorOpname,
        tanggal: op.tanggal,
        jenisOpname: op.jenisOpname,
        barangId: Number(op.barangId),
        barangName: op.barang.name,
        satuan: op.barang.satuan?.name || 'Kg',
        userName: op.user.name,
        stokSistem: Number(op.stokSistem),
        stokFisik: Number(op.stokFisik),
        selisih: Number(op.selisih),
        hpp: Number(op.hpp),
        totalNilai: Number(op.totalNilai),
        keterangan: op.keterangan,
        selisihStok: Number(op.selisihStok || 0),
        bentes: Number(op.bentes),
        ceplok: Number(op.ceplok),
        prok: Number(op.prok),
        kotor: Number(op.kotor),
        jumbo: Number(op.jumbo),
        barangPakai: Number(op.barangPakai),
        pemakaianTray: Number(op.pemakaianTray),
        nomorJurnal: op.jurnal?.nomorJurnal || null,
        jurnalDetails: op.jurnal?.details.map((d) => ({
          kategoriName: d.kategori?.name || d.coa.name,
          debit: Number(d.debit),
          kredit: Number(d.kredit),
        })) || [],
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mencatat Stok Opname baru secara atomik
   * Otomatis memotong stok_batches dan memposting Jurnal Penyesuaian Akuntansi
   */
  async createOpname(dto: CreateOpnameDto, userId: number) {
    try {
      const barang = await this.prisma.barang.findUnique({
        where: { id: BigInt(dto.barangId) },
        include: { jenis: true, satuan: true },
      });
      if (!barang) {
        throw new NotFoundException(`Barang dengan ID ${dto.barangId} tidak ditemukan.`);
      }

    const jenisName = (barang.jenis?.name || '').toLowerCase();
    let jenisOpname: 'TELUR' | 'PAKAN' | 'OBAT' | 'TRAY' = 'TELUR';
    let persediaanKategoriId = 59; // Stok Telur

    if (jenisName.includes('pakan') || jenisName.includes('sentrat') || jenisName.includes('curah')) {
      jenisOpname = 'PAKAN';
      persediaanKategoriId = 60; // Stok Pakan
    } else if (jenisName.includes('obat')) {
      jenisOpname = 'OBAT';
      persediaanKategoriId = 61; // Stok Obat-Obatan
    } else if (jenisName.includes('tray')) {
      jenisOpname = 'TRAY';
      persediaanKategoriId = 62; // Stok Tray
    }

    const tanggal = dto.tanggal ? new Date(dto.tanggal) : new Date();
    const dateStr = tanggal.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    // Mapping legacy opname:
    // 26. stok telur opname : "TLR%"
    // 29. stok pakan opname : "STR%"
    // 30. stok obat : "OBT%"
    // 31. stok tray opname : "TRY%"
    let opnameCode = 'TLR';
    if (jenisOpname === 'PAKAN') opnameCode = 'STR';
    else if (jenisOpname === 'OBAT') opnameCode = 'OBT';
    else if (jenisOpname === 'TRAY') opnameCode = 'TRY';

    const nomorOpname = `OPN-${dateStr}-${opnameCode}-${randomSuffix}`;
    const nomorJurnal = `JUR-${nomorOpname}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Ambil stok sistem & batch aktif
      const batches = await tx.stokBatch.findMany({
        where: { barangId: barang.id, qtySisa: { gt: 0 } },
        orderBy: [{ tanggal: 'asc' }, { id: 'asc' }],
      });

      const stokSistem = batches.reduce((acc, curr) => acc + Number(curr.qtySisa), 0);
      const totalNilaiBatches = batches.reduce(
        (acc, curr) => acc + Number(curr.qtySisa) * Number(curr.hargaBeli),
        0,
      );
      let hpp = stokSistem > 0 ? totalNilaiBatches / stokSistem : 0;

      // Jika belum ada batch aktif, cari harga beli terakhir yang > 0
      if (hpp === 0) {
        const lastBatch = await tx.stokBatch.findFirst({
          where: { barangId: barang.id, hargaBeli: { gt: 0 } },
          orderBy: { id: 'desc' },
        });
        if (lastBatch) {
          hpp = Number(lastBatch.hargaBeli);
        }
      }

      // 2. Parse kuantitas susut / pemakaian / selisih stok (bisa positif atau negatif)
      const selisihStok = Number(dto.selisihStok || 0);
      const bentes = Number(dto.bentes || 0);
      const ceplok = Number(dto.ceplok || 0);
      const prok = Number(dto.prok || 0);
      const kotor = Number(dto.kotor || 0);
      const jumbo = Number(dto.jumbo || 0);
      const barangPakai = Number(dto.barangPakai || 0);
      const pemakaianTray = Number(dto.pemakaianTray || 0);

      const jurnalLines: { coaId: bigint; kategoriId: bigint; debit: number; kredit: number }[] = [];

      // Helper untuk menambahkan baris debit & kredit yang seimbang
      const addBalancedPair = (debitKatId: number, kreditKatId: number, amount: number) => {
        if (amount <= 0) return;
        jurnalLines.push({
          coaId: BigInt(debitKatId),
          kategoriId: BigInt(debitKatId),
          debit: amount,
          kredit: 0,
        });
        jurnalLines.push({
          coaId: BigInt(kreditKatId),
          kategoriId: BigInt(kreditKatId),
          debit: 0,
          kredit: amount,
        });
      };

      let totalQtyPenguranganBatch = 0;
      let totalQtyPenambahanBatch = 0;

      // 1. Selisih Stok Fisik vs Sistem Umum (Kat. 88 Penyesuaian Stok vs Persediaan Komoditas)
      if (selisihStok < 0) {
        // Selisih kurang: Potong stok, Beban Penyesuaian bertambah (Debit 88, Kredit Persediaan)
        const qty = Math.abs(selisihStok);
        totalQtyPenguranganBatch += qty;
        addBalancedPair(88, persediaanKategoriId, qty * hpp);
      } else if (selisihStok > 0) {
        // Selisih tambah/lebih: Tambah stok, Penyesuaian Stok di kredit (Debit Persediaan, Kredit 88)
        totalQtyPenambahanBatch += selisihStok;
        addBalancedPair(persediaanKategoriId, 88, selisihStok * hpp);
      }

      // 2. Susut / Kondisi Khusus per Komoditas
      if (jenisOpname === 'TELUR') {
        // A. Telur Bentes (Kat. 27)
        if (bentes > 0) {
          totalQtyPenguranganBatch += bentes;
          addBalancedPair(27, persediaanKategoriId, bentes * hpp);
        } else if (bentes < 0) {
          const qty = Math.abs(bentes);
          totalQtyPenambahanBatch += qty;
          addBalancedPair(persediaanKategoriId, 27, qty * hpp);
        }

        // B. Telur Ceplok (Kat. 28)
        if (ceplok > 0) {
          totalQtyPenguranganBatch += ceplok;
          addBalancedPair(28, persediaanKategoriId, ceplok * hpp);
        } else if (ceplok < 0) {
          const qty = Math.abs(ceplok);
          totalQtyPenambahanBatch += qty;
          addBalancedPair(persediaanKategoriId, 28, qty * hpp);
        }

        // C. Telur Prok (Kat. 29)
        if (prok > 0) {
          totalQtyPenguranganBatch += prok;
          addBalancedPair(29, persediaanKategoriId, prok * hpp);
        } else if (prok < 0) {
          const qty = Math.abs(prok);
          totalQtyPenambahanBatch += qty;
          addBalancedPair(persediaanKategoriId, 29, qty * hpp);
        }

        // D. Telur Kotor (Kat. 40)
        if (kotor > 0) {
          totalQtyPenguranganBatch += kotor;
          addBalancedPair(40, persediaanKategoriId, kotor * hpp);
        } else if (kotor < 0) {
          const qty = Math.abs(kotor);
          totalQtyPenambahanBatch += qty;
          addBalancedPair(persediaanKategoriId, 40, qty * hpp);
        }

        // E. Telur Jumbo (Kat. 45)
        if (jumbo > 0) {
          totalQtyPenguranganBatch += jumbo;
          addBalancedPair(45, persediaanKategoriId, jumbo * hpp);
        } else if (jumbo < 0) {
          const qty = Math.abs(jumbo);
          totalQtyPenambahanBatch += qty;
          addBalancedPair(persediaanKategoriId, 45, qty * hpp);
        }
      } else if (jenisOpname === 'PAKAN' || jenisOpname === 'OBAT') {
        if (barangPakai > 0) {
          totalQtyPenguranganBatch += barangPakai;
          addBalancedPair(30, persediaanKategoriId, barangPakai * hpp);
        } else if (barangPakai < 0) {
          const qty = Math.abs(barangPakai);
          totalQtyPenambahanBatch += qty;
          addBalancedPair(persediaanKategoriId, 30, qty * hpp);
        }
      } else if (jenisOpname === 'TRAY') {
        if (pemakaianTray > 0) {
          totalQtyPenguranganBatch += pemakaianTray;
          addBalancedPair(42, 62, pemakaianTray * hpp);
        } else if (pemakaianTray < 0) {
          const qty = Math.abs(pemakaianTray);
          totalQtyPenambahanBatch += qty;
          addBalancedPair(62, 42, qty * hpp);
        }
      }

      // 3. Update Batch Fisik
      // 3a. Potong batch fisik via FIFO untuk pengurangan
      if (totalQtyPenguranganBatch > 0) {
        let sisaPotong = totalQtyPenguranganBatch;
        for (const b of batches) {
          if (sisaPotong <= 0) break;
          const sisaBatch = Number(b.qtySisa);
          const potong = Math.min(sisaBatch, sisaPotong);
          await tx.stokBatch.update({
            where: { id: b.id },
            data: { qtySisa: { decrement: potong } },
          });
          sisaPotong -= potong;
        }
      }

      // 3b. Tambah batch baru untuk penambahan / koreksi pembalikan stok
      if (totalQtyPenambahanBatch > 0) {
        await tx.stokBatch.create({
          data: {
            barangId: barang.id,
            userId: BigInt(userId || 1),
            qtyMasuk: totalQtyPenambahanBatch,
            qtySisa: totalQtyPenambahanBatch,
            hargaBeli: hpp,
            tanggal,
          },
        });
      }

      // 4. Buat Jurnal Akuntansi jika ada penyesuaian bernilai
      let jurnalId: bigint | null = null;
      const totalNilaiOpname = (totalQtyPenguranganBatch + totalQtyPenambahanBatch) * hpp;

      if (jurnalLines.length > 0 && totalNilaiOpname > 0) {
        const jurnal = await tx.jurnalUmum.create({
          data: {
            nomorJurnal,
            tanggal,
            keterangan: `Stok Opname ${barang.name} - ${dto.keterangan || 'Penyesuaian Fisik Berkala'}`,
          },
        });
        jurnalId = jurnal.id;

        await tx.jurnalDetail.createMany({
          data: jurnalLines.map((line) => ({
            jurnalId: jurnal.id,
            coaId: line.coaId,
            kategoriId: line.kategoriId,
            debit: line.debit,
            kredit: line.kredit,
          })),
        });
      }

      // 5. Catat record ke tabel stok_opnames
      const netPerubahan = totalQtyPenambahanBatch - totalQtyPenguranganBatch;
      const stokFisik =
        dto.stokFisik !== undefined
          ? Number(dto.stokFisik)
          : Math.max(0, stokSistem + netPerubahan);
      const selisih = stokFisik - stokSistem;

      const opname = await tx.stokOpname.create({
        data: {
          nomorOpname,
          tanggal,
          barangId: barang.id,
          userId: BigInt(userId || 1),
          jenisOpname,
          stokSistem,
          stokFisik,
          selisih,
          hpp,
          totalNilai: totalNilaiOpname,
          keterangan: dto.keterangan,
          jurnalId,
          selisihStok,
          bentes,
          ceplok,
          prok,
          kotor,
          jumbo,
          barangPakai,
          pemakaianTray,
        },
      });

      return {
        id: Number(opname.id),
        nomorOpname: opname.nomorOpname,
        tanggal: opname.tanggal,
        jenisOpname: opname.jenisOpname,
        stokSistem: Number(opname.stokSistem),
        stokFisik: Number(opname.stokFisik),
        selisih: Number(opname.selisih),
        selisihStok: Number(opname.selisihStok),
        totalNilai: Number(opname.totalNilai),
        jurnalId: jurnalId ? Number(jurnalId) : null,
      };
    });
  } catch (err: any) {
    console.error('[createOpname ERROR STACK]:', err);
    throw err;
  }
}
}
