import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../../database/prisma.service.js';

export class CreateKonversiDto {
  @IsOptional()
  @IsString()
  tanggal?: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  barangAwalId!: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  qtyAwal!: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  barangAkhirId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  qtyAkhir?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalNominal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  hppAkhir?: number;

  @IsOptional()
  @IsString()
  keterangan?: string;
}

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

  /**
   * Edit / Update Stok Opname dengan Reversal Jurnal dan Batch Stok Otomatis
   */
  async updateOpname(id: number, dto: Partial<CreateOpnameDto>, userId: number = 1) {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.stokOpname.findUnique({
        where: { id: BigInt(id) },
        include: {
          barang: { include: { jenis: true, satuan: true } },
          jurnal: { include: { details: true } },
        },
      });

      if (!existing) {
        throw new NotFoundException(`Stok opname dengan ID ${id} tidak ditemukan.`);
      }

      const barang = existing.barang;
      const jenisOpname = existing.jenisOpname;
      const hpp = Number(existing.hpp);

      // 1. REVERT EFEK STOK LAMA
      const oldSelisihStok = Number(existing.selisihStok);
      const oldBentes = Number(existing.bentes);
      const oldCeplok = Number(existing.ceplok);
      const oldProk = Number(existing.prok);
      const oldKotor = Number(existing.kotor);
      const oldJumbo = Number(existing.jumbo);
      const oldBarangPakai = Number(existing.barangPakai);
      const oldPemakaianTray = Number(existing.pemakaianTray);

      let oldTotalPengurangan = 0;
      let oldTotalPenambahan = 0;
      if (oldSelisihStok < 0) oldTotalPengurangan += Math.abs(oldSelisihStok);
      else if (oldSelisihStok > 0) oldTotalPenambahan += oldSelisihStok;

      if (jenisOpname === 'TELUR') {
        if (oldBentes > 0) oldTotalPengurangan += oldBentes; else if (oldBentes < 0) oldTotalPenambahan += Math.abs(oldBentes);
        if (oldCeplok > 0) oldTotalPengurangan += oldCeplok; else if (oldCeplok < 0) oldTotalPenambahan += Math.abs(oldCeplok);
        if (oldProk > 0) oldTotalPengurangan += oldProk; else if (oldProk < 0) oldTotalPenambahan += Math.abs(oldProk);
        if (oldKotor > 0) oldTotalPengurangan += oldKotor; else if (oldKotor < 0) oldTotalPenambahan += Math.abs(oldKotor);
        if (oldJumbo > 0) oldTotalPengurangan += oldJumbo; else if (oldJumbo < 0) oldTotalPenambahan += Math.abs(oldJumbo);
      } else if (jenisOpname === 'PAKAN' || jenisOpname === 'OBAT') {
        if (oldBarangPakai > 0) oldTotalPengurangan += oldBarangPakai; else if (oldBarangPakai < 0) oldTotalPenambahan += Math.abs(oldBarangPakai);
      } else if (jenisOpname === 'TRAY') {
        if (oldPemakaianTray > 0) oldTotalPengurangan += oldPemakaianTray; else if (oldPemakaianTray < 0) oldTotalPenambahan += Math.abs(oldPemakaianTray);
      }

      if (oldTotalPengurangan > 0) {
        const latestBatch = await tx.stokBatch.findFirst({
          where: { barangId: existing.barangId },
          orderBy: { id: 'desc' },
        });
        if (latestBatch) {
          await tx.stokBatch.update({
            where: { id: latestBatch.id },
            data: { qtySisa: { increment: oldTotalPengurangan } },
          });
        }
      }

      if (oldTotalPenambahan > 0) {
        let sisaDeduct = oldTotalPenambahan;
        const batches = await tx.stokBatch.findMany({
          where: { barangId: existing.barangId, qtySisa: { gt: 0 } },
          orderBy: { id: 'desc' },
        });
        for (const b of batches) {
          if (sisaDeduct <= 0) break;
          const sisa = Number(b.qtySisa);
          const deduct = Math.min(sisa, sisaDeduct);
          await tx.stokBatch.update({
            where: { id: b.id },
            data: { qtySisa: { decrement: deduct } },
          });
          sisaDeduct -= deduct;
        }
      }

      // 2. PARSE INPUT BARU
      const newSelisihStok = dto.selisihStok !== undefined ? Number(dto.selisihStok) : oldSelisihStok;
      const newBentes = dto.bentes !== undefined ? Number(dto.bentes) : oldBentes;
      const newCeplok = dto.ceplok !== undefined ? Number(dto.ceplok) : oldCeplok;
      const newProk = dto.prok !== undefined ? Number(dto.prok) : oldProk;
      const newKotor = dto.kotor !== undefined ? Number(dto.kotor) : oldKotor;
      const newJumbo = dto.jumbo !== undefined ? Number(dto.jumbo) : oldJumbo;
      const newBarangPakai = dto.barangPakai !== undefined ? Number(dto.barangPakai) : oldBarangPakai;
      const newPemakaianTray = dto.pemakaianTray !== undefined ? Number(dto.pemakaianTray) : oldPemakaianTray;
      const newTanggal = dto.tanggal ? new Date(dto.tanggal) : existing.tanggal;
      const newKeterangan = dto.keterangan !== undefined ? dto.keterangan : existing.keterangan;

      let persediaanKategoriId = 59;
      if (jenisOpname === 'PAKAN') persediaanKategoriId = 60;
      else if (jenisOpname === 'OBAT') persediaanKategoriId = 61;
      else if (jenisOpname === 'TRAY') persediaanKategoriId = 62;

      let newTotalPengurangan = 0;
      let newTotalPenambahan = 0;
      const newJurnalLines: { coaId: bigint; kategoriId: bigint; debit: number; kredit: number }[] = [];
      const addBalancedPair = (debitKatId: number, kreditKatId: number, amount: number) => {
        if (amount <= 0) return;
        newJurnalLines.push({
          coaId: BigInt(debitKatId),
          kategoriId: BigInt(debitKatId),
          debit: amount,
          kredit: 0,
        });
        newJurnalLines.push({
          coaId: BigInt(kreditKatId),
          kategoriId: BigInt(kreditKatId),
          debit: 0,
          kredit: amount,
        });
      };

      if (newSelisihStok < 0) {
        const qty = Math.abs(newSelisihStok);
        newTotalPengurangan += qty;
        addBalancedPair(88, persediaanKategoriId, qty * hpp);
      } else if (newSelisihStok > 0) {
        newTotalPenambahan += newSelisihStok;
        addBalancedPair(persediaanKategoriId, 88, newSelisihStok * hpp);
      }

      if (jenisOpname === 'TELUR') {
        if (newBentes > 0) {
          newTotalPengurangan += newBentes;
          addBalancedPair(27, persediaanKategoriId, newBentes * hpp);
        } else if (newBentes < 0) {
          const qty = Math.abs(newBentes);
          newTotalPenambahan += qty;
          addBalancedPair(persediaanKategoriId, 27, qty * hpp);
        }

        if (newCeplok > 0) {
          newTotalPengurangan += newCeplok;
          addBalancedPair(28, persediaanKategoriId, newCeplok * hpp);
        } else if (newCeplok < 0) {
          const qty = Math.abs(newCeplok);
          newTotalPenambahan += qty;
          addBalancedPair(persediaanKategoriId, 28, qty * hpp);
        }

        if (newProk > 0) {
          newTotalPengurangan += newProk;
          addBalancedPair(29, persediaanKategoriId, newProk * hpp);
        } else if (newProk < 0) {
          const qty = Math.abs(newProk);
          newTotalPenambahan += qty;
          addBalancedPair(persediaanKategoriId, 29, qty * hpp);
        }

        if (newKotor > 0) {
          newTotalPengurangan += newKotor;
          addBalancedPair(40, persediaanKategoriId, newKotor * hpp);
        } else if (newKotor < 0) {
          const qty = Math.abs(newKotor);
          newTotalPenambahan += qty;
          addBalancedPair(persediaanKategoriId, 40, qty * hpp);
        }

        if (newJumbo > 0) {
          newTotalPengurangan += newJumbo;
          addBalancedPair(45, persediaanKategoriId, newJumbo * hpp);
        } else if (newJumbo < 0) {
          const qty = Math.abs(newJumbo);
          newTotalPenambahan += qty;
          addBalancedPair(persediaanKategoriId, 45, qty * hpp);
        }
      } else if (jenisOpname === 'PAKAN' || jenisOpname === 'OBAT') {
        if (newBarangPakai > 0) {
          newTotalPengurangan += newBarangPakai;
          addBalancedPair(30, persediaanKategoriId, newBarangPakai * hpp);
        } else if (newBarangPakai < 0) {
          const qty = Math.abs(newBarangPakai);
          newTotalPenambahan += qty;
          addBalancedPair(persediaanKategoriId, 30, qty * hpp);
        }
      } else if (jenisOpname === 'TRAY') {
        if (newPemakaianTray > 0) {
          newTotalPengurangan += newPemakaianTray;
          addBalancedPair(42, 62, newPemakaianTray * hpp);
        } else if (newPemakaianTray < 0) {
          const qty = Math.abs(newPemakaianTray);
          newTotalPenambahan += qty;
          addBalancedPair(62, 42, qty * hpp);
        }
      }

      // 3. TERAPKAN POTONG / TAMBAH BATCH BARU
      if (newTotalPengurangan > 0) {
        let sisaPotong = newTotalPengurangan;
        const batches = await tx.stokBatch.findMany({
          where: { barangId: barang.id, qtySisa: { gt: 0 } },
          orderBy: [{ tanggal: 'asc' }, { id: 'asc' }],
        });
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

      if (newTotalPenambahan > 0) {
        await tx.stokBatch.create({
          data: {
            barangId: barang.id,
            userId: BigInt(userId || 1),
            qtyMasuk: newTotalPenambahan,
            qtySisa: newTotalPenambahan,
            hargaBeli: hpp,
            tanggal: newTanggal,
          },
        });
      }

      // 4. UPDATE JURNAL UMUM
      let jurnalId = existing.jurnalId;
      const totalNilaiOpname = (newTotalPengurangan + newTotalPenambahan) * hpp;

      if (jurnalId) {
        await tx.jurnalDetail.deleteMany({ where: { jurnalId } });
        if (newJurnalLines.length > 0 && totalNilaiOpname > 0) {
          await tx.jurnalUmum.update({
            where: { id: jurnalId },
            data: {
              tanggal: newTanggal,
              keterangan: `Stok Opname ${barang.name} - ${newKeterangan || 'Penyesuaian Fisik Berkala'}`,
            },
          });
          await tx.jurnalDetail.createMany({
            data: newJurnalLines.map((line) => ({
              jurnalId: jurnalId!,
              coaId: line.coaId,
              kategoriId: line.kategoriId,
              debit: line.debit,
              kredit: line.kredit,
            })),
          });
        }
      } else if (newJurnalLines.length > 0 && totalNilaiOpname > 0) {
        const j = await tx.jurnalUmum.create({
          data: {
            nomorJurnal: `JUR-${existing.nomorOpname}`,
            tanggal: newTanggal,
            keterangan: `Stok Opname ${barang.name} - ${newKeterangan || 'Penyesuaian Fisik Berkala'}`,
          },
        });
        jurnalId = j.id;
        await tx.jurnalDetail.createMany({
          data: newJurnalLines.map((line) => ({
            jurnalId: j.id,
            coaId: line.coaId,
            kategoriId: line.kategoriId,
            debit: line.debit,
            kredit: line.kredit,
          })),
        });
      }

      // 5. UPDATE STOK OPNAME RECORD
      const netPerubahan = newTotalPenambahan - newTotalPengurangan;
      const stokSistem = Number(existing.stokSistem);
      const stokFisik =
        dto.stokFisik !== undefined
          ? Number(dto.stokFisik)
          : Math.max(0, stokSistem + netPerubahan);
      const selisih = stokFisik - stokSistem;

      const updated = await tx.stokOpname.update({
        where: { id: existing.id },
        data: {
          tanggal: newTanggal,
          keterangan: newKeterangan,
          stokFisik,
          selisih,
          totalNilai: totalNilaiOpname,
          jurnalId,
          selisihStok: newSelisihStok,
          bentes: newBentes,
          ceplok: newCeplok,
          prok: newProk,
          kotor: newKotor,
          jumbo: newJumbo,
          barangPakai: newBarangPakai,
          pemakaianTray: newPemakaianTray,
        },
      });

      return {
        id: Number(updated.id),
        nomorOpname: updated.nomorOpname,
        tanggal: updated.tanggal,
        jenisOpname: updated.jenisOpname,
        stokSistem: Number(updated.stokSistem),
        stokFisik: Number(updated.stokFisik),
        selisih: Number(updated.selisih),
        selisihStok: Number(updated.selisihStok),
        totalNilai: Number(updated.totalNilai),
        jurnalId: jurnalId ? Number(jurnalId) : null,
      };
    });
  }

  /**
   * Hapus / Batalkan Stok Opname (Revert Stok & Jurnal)
   */
  async deleteOpname(id: number) {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.stokOpname.findUnique({
        where: { id: BigInt(id) },
        include: { jurnal: true },
      });

      if (!existing) {
        throw new NotFoundException(`Stok opname dengan ID ${id} tidak ditemukan.`);
      }

      // Revert old stock
      const oldSelisihStok = Number(existing.selisihStok);
      const oldBentes = Number(existing.bentes);
      const oldCeplok = Number(existing.ceplok);
      const oldProk = Number(existing.prok);
      const oldKotor = Number(existing.kotor);
      const oldJumbo = Number(existing.jumbo);
      const oldBarangPakai = Number(existing.barangPakai);
      const oldPemakaianTray = Number(existing.pemakaianTray);

      let oldTotalPengurangan = 0;
      let oldTotalPenambahan = 0;
      if (oldSelisihStok < 0) oldTotalPengurangan += Math.abs(oldSelisihStok);
      else if (oldSelisihStok > 0) oldTotalPenambahan += oldSelisihStok;

      if (existing.jenisOpname === 'TELUR') {
        if (oldBentes > 0) oldTotalPengurangan += oldBentes; else if (oldBentes < 0) oldTotalPenambahan += Math.abs(oldBentes);
        if (oldCeplok > 0) oldTotalPengurangan += oldCeplok; else if (oldCeplok < 0) oldTotalPenambahan += Math.abs(oldCeplok);
        if (oldProk > 0) oldTotalPengurangan += oldProk; else if (oldProk < 0) oldTotalPenambahan += Math.abs(oldProk);
        if (oldKotor > 0) oldTotalPengurangan += oldKotor; else if (oldKotor < 0) oldTotalPenambahan += Math.abs(oldKotor);
        if (oldJumbo > 0) oldTotalPengurangan += oldJumbo; else if (oldJumbo < 0) oldTotalPenambahan += Math.abs(oldJumbo);
      } else if (existing.jenisOpname === 'PAKAN' || existing.jenisOpname === 'OBAT') {
        if (oldBarangPakai > 0) oldTotalPengurangan += oldBarangPakai; else if (oldBarangPakai < 0) oldTotalPenambahan += Math.abs(oldBarangPakai);
      } else if (existing.jenisOpname === 'TRAY') {
        if (oldPemakaianTray > 0) oldTotalPengurangan += oldPemakaianTray; else if (oldPemakaianTray < 0) oldTotalPenambahan += Math.abs(oldPemakaianTray);
      }

      if (oldTotalPengurangan > 0) {
        const latestBatch = await tx.stokBatch.findFirst({
          where: { barangId: existing.barangId },
          orderBy: { id: 'desc' },
        });
        if (latestBatch) {
          await tx.stokBatch.update({
            where: { id: latestBatch.id },
            data: { qtySisa: { increment: oldTotalPengurangan } },
          });
        }
      }

      if (oldTotalPenambahan > 0) {
        let sisaDeduct = oldTotalPenambahan;
        const batches = await tx.stokBatch.findMany({
          where: { barangId: existing.barangId, qtySisa: { gt: 0 } },
          orderBy: { id: 'desc' },
        });
        for (const b of batches) {
          if (sisaDeduct <= 0) break;
          const sisa = Number(b.qtySisa);
          const deduct = Math.min(sisa, sisaDeduct);
          await tx.stokBatch.update({
            where: { id: b.id },
            data: { qtySisa: { decrement: deduct } },
          });
          sisaDeduct -= deduct;
        }
      }

      if (existing.jurnalId) {
        await tx.jurnalDetail.deleteMany({ where: { jurnalId: existing.jurnalId } });
        await tx.jurnalUmum.delete({ where: { id: existing.jurnalId } });
      }

      await tx.stokOpname.delete({ where: { id: existing.id } });
      return { success: true, message: `Stok opname ${existing.nomorOpname} berhasil dibatalkan dan stok dikembalikan.` };
    });
  }

  /**
   * Mengambil daftar riwayat konversi barang dengan filter tanggal & pencarian
   */
  async findAllKonversi(query: {
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
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

    if (query.search && query.search.trim().length > 0) {
      const q = query.search.trim();
      where.OR = [
        { nomorKonversi: { contains: q } },
        { keterangan: { contains: q } },
        { barangAwal: { name: { contains: q } } },
        { barangAkhir: { name: { contains: q } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.konversiBarang.findMany({
        where,
        include: {
          barangAwal: { include: { jenis: true, satuan: true } },
          barangAkhir: { include: { jenis: true, satuan: true } },
          user: { select: { id: true, name: true, username: true } },
          jurnal: { include: { details: true } },
          stokBatch: true,
        },
        orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.konversiBarang.count({ where }),
    ]);

    return {
      items: items.map((it) => ({
        id: Number(it.id),
        nomorKonversi: it.nomorKonversi,
        tanggal: it.tanggal,
        barangAwalId: Number(it.barangAwalId),
        barangAwal: it.barangAwal,
        qtyAwal: Number(it.qtyAwal),
        hppAwal: Number(it.hppAwal),
        barangAkhirId: Number(it.barangAkhirId),
        barangAkhir: it.barangAkhir,
        qtyAkhir: Number(it.qtyAkhir),
        hppAkhir: Number(it.hppAkhir),
        totalNominal: Number(it.totalNominal),
        keterangan: it.keterangan,
        jurnalId: it.jurnalId ? Number(it.jurnalId) : null,
        stokBatchId: it.stokBatchId ? Number(it.stokBatchId) : null,
        user: it.user,
        batchAllocations: it.batchAllocations,
        createdAt: it.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Membuat transaksi konversi / reproses barang
   */
  async createKonversi(dto: CreateKonversiDto, userId: number = 1) {
    if (Number(dto.barangAwalId) === Number(dto.barangAkhirId)) {
      throw new BadRequestException('Barang asal dan barang tujuan hasil konversi tidak boleh sama.');
    }
    const qtyAwal = Number(dto.qtyAwal);
    if (!qtyAwal || qtyAwal <= 0) {
      throw new BadRequestException('Kuantitas barang asal harus lebih besar dari 0.');
    }
    const qtyAkhir = dto.qtyAkhir && Number(dto.qtyAkhir) > 0 ? Number(dto.qtyAkhir) : qtyAwal;

    return await this.prisma.$transaction(async (tx) => {
      const barangAwal = await tx.barang.findUnique({
        where: { id: BigInt(dto.barangAwalId) },
        include: { jenis: true, satuan: true },
      });
      if (!barangAwal) {
        throw new NotFoundException(`Barang asal dengan ID ${dto.barangAwalId} tidak ditemukan.`);
      }

      const barangAkhir = await tx.barang.findUnique({
        where: { id: BigInt(dto.barangAkhirId) },
        include: { jenis: true, satuan: true },
      });
      if (!barangAkhir) {
        throw new NotFoundException(`Barang tujuan dengan ID ${dto.barangAkhirId} tidak ditemukan.`);
      }

      const tanggal = dto.tanggal ? new Date(dto.tanggal) : new Date();
      const dateStr = tanggal.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const nomorKonversi = `KNV-${dateStr}-${randomSuffix}`;

      // 1. Ambil batch aktif barangAwal (FIFO)
      const batches = await tx.stokBatch.findMany({
        where: {
          barangId: barangAwal.id,
          qtySisa: { gt: 0 },
        },
        orderBy: [{ tanggal: 'asc' }, { id: 'asc' }],
      });

      const totalSisa = batches.reduce((acc, b) => acc + Number(b.qtySisa), 0);
      if (totalSisa < qtyAwal) {
        throw new BadRequestException(
          `Stok ${barangAwal.name} tidak mencukupi (Tersedia: ${totalSisa.toLocaleString('id-ID')}, Dibutuhkan: ${qtyAwal.toLocaleString('id-ID')}).`
        );
      }

      // 2. Alokasi FIFO & Potong Stok Barang Awal
      let sisaPotong = qtyAwal;
      let totalHppAwal = 0;
      const batchAllocations: Array<{ batchId: number; qty: number; hpp: number }> = [];

      for (const b of batches) {
        if (sisaPotong <= 0) break;
        const bSisa = Number(b.qtySisa);
        const potong = Math.min(bSisa, sisaPotong);
        const bHpp = Number(b.hargaBeli);

        await tx.stokBatch.update({
          where: { id: b.id },
          data: { qtySisa: { decrement: potong } },
        });

        batchAllocations.push({
          batchId: Number(b.id),
          qty: potong,
          hpp: bHpp,
        });

        totalHppAwal += potong * bHpp;
        sisaPotong -= potong;
      }

      const hppAwal = totalHppAwal / qtyAwal;

      // 3. Tentukan Total Nilai Modal & HPP Barang Akhir
      let totalNominal = totalHppAwal;
      let hppAkhir = totalNominal / qtyAkhir;

      if (dto.totalNominal !== undefined && Number(dto.totalNominal) > 0) {
        totalNominal = Number(dto.totalNominal);
        hppAkhir = totalNominal / qtyAkhir;
      } else if (dto.hppAkhir !== undefined && Number(dto.hppAkhir) > 0) {
        hppAkhir = Number(dto.hppAkhir);
        totalNominal = hppAkhir * qtyAkhir;
      }

      // 4. Buat Batch Baru Barang Akhir
      const newBatch = await tx.stokBatch.create({
        data: {
          barangId: barangAkhir.id,
          userId: BigInt(userId),
          tanggal,
          qtyMasuk: qtyAkhir,
          qtySisa: qtyAkhir,
          hargaBeli: hppAkhir,
        },
      });

      // 5. Buat Jurnal Double-Entry (Debit Persediaan Akhir, Kredit Persediaan Awal)
      const getPersediaanCoa = (jenisName: string, jenisId?: number) => {
        const j = jenisName.toLowerCase();
        if (j.includes('telur')) return 59;
        if (jenisId === 9 || j.includes('curah')) return 89; // Stok Curah
        if (j.includes('pakan') || j.includes('sentrat')) return 60; // Stok Pakan Sentrat
        if (j.includes('obat') || j.includes('vaksin')) return 61;
        if (j.includes('tray')) return 62;
        return 60;
      };

      const coaAsal = getPersediaanCoa(barangAwal.jenis?.name || '', Number(barangAwal.jenisId));
      const coaTujuan = getPersediaanCoa(barangAkhir.jenis?.name || '', Number(barangAkhir.jenisId));

      const defaultKeterangan = `Konversi ${barangAwal.name} (${qtyAwal} ${barangAwal.satuan?.name || 'Kg'}) ke ${barangAkhir.name} (${qtyAkhir} ${barangAkhir.satuan?.name || 'Kg'})`;
      const keterangan = dto.keterangan || defaultKeterangan;

      const nomorJurnal = `JUR-${nomorKonversi}`;
      const jurnal = await tx.jurnalUmum.create({
        data: {
          nomorJurnal,
          tanggal,
          keterangan: `Konversi Barang ${nomorKonversi} - ${keterangan}`,
        },
      });

      await tx.jurnalDetail.createMany({
        data: [
          { jurnalId: jurnal.id, coaId: BigInt(coaTujuan), kategoriId: BigInt(coaTujuan), debit: totalNominal, kredit: 0 },
          { jurnalId: jurnal.id, coaId: BigInt(coaAsal), kategoriId: BigInt(coaAsal), debit: 0, kredit: totalNominal },
        ],
      });

      // 6. Simpan Catatan Konversi
      const konversi = await tx.konversiBarang.create({
        data: {
          nomorKonversi,
          tanggal,
          userId: BigInt(userId),
          barangAwalId: barangAwal.id,
          qtyAwal,
          hppAwal,
          barangAkhirId: barangAkhir.id,
          qtyAkhir,
          hppAkhir,
          totalNominal,
          keterangan,
          jurnalId: jurnal.id,
          stokBatchId: newBatch.id,
          batchAllocations: batchAllocations as any,
        },
        include: {
          barangAwal: { include: { jenis: true, satuan: true } },
          barangAkhir: { include: { jenis: true, satuan: true } },
          user: { select: { id: true, name: true, username: true } },
        },
      });

      return {
        ...konversi,
        id: Number(konversi.id),
        barangAwalId: Number(konversi.barangAwalId),
        barangAkhirId: Number(konversi.barangAkhirId),
        qtyAwal: Number(konversi.qtyAwal),
        hppAwal: Number(konversi.hppAwal),
        qtyAkhir: Number(konversi.qtyAkhir),
        hppAkhir: Number(konversi.hppAkhir),
        totalNominal: Number(konversi.totalNominal),
        jurnalId: Number(konversi.jurnalId),
        stokBatchId: Number(konversi.stokBatchId),
      };
    });
  }

  /**
   * Memperbarui / Mengedit Konversi Barang (Revert FIFO lama & re-apply)
   */
  async updateKonversi(id: number, dto: Partial<CreateKonversiDto>, userId: number = 1) {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.konversiBarang.findUnique({
        where: { id: BigInt(id) },
        include: {
          barangAwal: true,
          barangAkhir: true,
          stokBatch: true,
        },
      });
      if (!existing) {
        throw new NotFoundException(`Konversi barang dengan ID ${id} tidak ditemukan.`);
      }

      // Validasi apakah batch tujuan sudah terpakai
      if (existing.stokBatch) {
        const qtyMasuk = Number(existing.stokBatch.qtyMasuk);
        const qtySisa = Number(existing.stokBatch.qtySisa);
        if (qtySisa < qtyMasuk) {
          const terpakai = qtyMasuk - qtySisa;
          throw new BadRequestException(
            `Barang hasil konversi (${existing.barangAkhir.name}) sudah terjual/terpakai sebanyak ${terpakai.toLocaleString('id-ID')}, sehingga transaksi konversi ini tidak dapat diedit.`
          );
        }
      }

      // 1. REVERT STOK LAMA
      // Revert batch allocations pada barang awal
      const oldAllocations = (existing.batchAllocations as any[]) || [];
      for (const alloc of oldAllocations) {
        if (alloc.batchId && alloc.qty) {
          await tx.stokBatch.update({
            where: { id: BigInt(alloc.batchId) },
            data: { qtySisa: { increment: Number(alloc.qty) } },
          });
        }
      }

      // Hapus batch tujuan lama
      if (existing.stokBatchId) {
        await tx.stokBatch.delete({ where: { id: existing.stokBatchId } });
      }

      // Hapus rincian jurnal lama
      if (existing.jurnalId) {
        await tx.jurnalDetail.deleteMany({ where: { jurnalId: existing.jurnalId } });
      }

      // 2. TERAPKAN DATA BARU
      const newBarangAwalId = dto.barangAwalId ? BigInt(dto.barangAwalId) : existing.barangAwalId;
      const newBarangAkhirId = dto.barangAkhirId ? BigInt(dto.barangAkhirId) : existing.barangAkhirId;

      if (newBarangAwalId === newBarangAkhirId) {
        throw new BadRequestException('Barang asal dan barang tujuan hasil konversi tidak boleh sama.');
      }

      const barangAwal = await tx.barang.findUnique({
        where: { id: newBarangAwalId },
        include: { jenis: true, satuan: true },
      });
      const barangAkhir = await tx.barang.findUnique({
        where: { id: newBarangAkhirId },
        include: { jenis: true, satuan: true },
      });

      if (!barangAwal || !barangAkhir) {
        throw new NotFoundException('Barang tidak ditemukan.');
      }

      const tanggal = dto.tanggal ? new Date(dto.tanggal) : existing.tanggal;
      const qtyAwal = dto.qtyAwal !== undefined ? Number(dto.qtyAwal) : Number(existing.qtyAwal);
      const qtyAkhir = dto.qtyAkhir !== undefined ? Number(dto.qtyAkhir) : (dto.qtyAwal !== undefined ? Number(dto.qtyAwal) : Number(existing.qtyAkhir));

      // Ambil batch aktif barang awal
      const batches = await tx.stokBatch.findMany({
        where: { barangId: barangAwal.id, qtySisa: { gt: 0 } },
        orderBy: [{ tanggal: 'asc' }, { id: 'asc' }],
      });

      const totalSisa = batches.reduce((acc, b) => acc + Number(b.qtySisa), 0);
      if (totalSisa < qtyAwal) {
        throw new BadRequestException(
          `Stok ${barangAwal.name} tidak mencukupi (Tersedia: ${totalSisa.toLocaleString('id-ID')}, Dibutuhkan: ${qtyAwal.toLocaleString('id-ID')}).`
        );
      }

      let sisaPotong = qtyAwal;
      let totalHppAwal = 0;
      const newBatchAllocations: Array<{ batchId: number; qty: number; hpp: number }> = [];

      for (const b of batches) {
        if (sisaPotong <= 0) break;
        const bSisa = Number(b.qtySisa);
        const potong = Math.min(bSisa, sisaPotong);
        const bHpp = Number(b.hargaBeli);

        await tx.stokBatch.update({
          where: { id: b.id },
          data: { qtySisa: { decrement: potong } },
        });

        newBatchAllocations.push({
          batchId: Number(b.id),
          qty: potong,
          hpp: bHpp,
        });

        totalHppAwal += potong * bHpp;
        sisaPotong -= potong;
      }

      const hppAwal = totalHppAwal / qtyAwal;

      let totalNominal = totalHppAwal;
      let hppAkhir = totalNominal / qtyAkhir;

      if (dto.totalNominal !== undefined && Number(dto.totalNominal) > 0) {
        totalNominal = Number(dto.totalNominal);
        hppAkhir = totalNominal / qtyAkhir;
      } else if (dto.hppAkhir !== undefined && Number(dto.hppAkhir) > 0) {
        hppAkhir = Number(dto.hppAkhir);
        totalNominal = hppAkhir * qtyAkhir;
      }

      // Buat batch baru untuk barang tujuan
      const newBatch = await tx.stokBatch.create({
        data: {
          barangId: barangAkhir.id,
          userId: BigInt(userId),
          tanggal,
          qtyMasuk: qtyAkhir,
          qtySisa: qtyAkhir,
          hargaBeli: hppAkhir,
        },
      });

      // Update Jurnal
      const getPersediaanCoa = (jenisName: string) => {
        const j = jenisName.toLowerCase();
        if (j.includes('telur')) return 59;
        if (j.includes('pakan') || j.includes('curah')) return 60;
        if (j.includes('obat') || j.includes('vaksin')) return 61;
        if (j.includes('tray')) return 62;
        return 60;
      };

      const coaAsal = getPersediaanCoa(barangAwal.jenis?.name || '');
      const coaTujuan = getPersediaanCoa(barangAkhir.jenis?.name || '');
      const keterangan = dto.keterangan !== undefined ? dto.keterangan : existing.keterangan;

      if (existing.jurnalId) {
        await tx.jurnalUmum.update({
          where: { id: existing.jurnalId },
          data: {
            tanggal,
            keterangan: `Konversi Barang ${existing.nomorKonversi} - ${keterangan}`,
          },
        });
        await tx.jurnalDetail.createMany({
          data: [
            { jurnalId: existing.jurnalId, coaId: BigInt(coaTujuan), kategoriId: BigInt(coaTujuan), debit: totalNominal, kredit: 0 },
            { jurnalId: existing.jurnalId, coaId: BigInt(coaAsal), kategoriId: BigInt(coaAsal), debit: 0, kredit: totalNominal },
          ],
        });
      }

      // Update data konversi
      const updated = await tx.konversiBarang.update({
        where: { id: existing.id },
        data: {
          tanggal,
          barangAwalId: barangAwal.id,
          qtyAwal,
          hppAwal,
          barangAkhirId: barangAkhir.id,
          qtyAkhir,
          hppAkhir,
          totalNominal,
          keterangan,
          stokBatchId: newBatch.id,
          batchAllocations: newBatchAllocations as any,
        },
        include: {
          barangAwal: { include: { jenis: true, satuan: true } },
          barangAkhir: { include: { jenis: true, satuan: true } },
          user: { select: { id: true, name: true, username: true } },
        },
      });

      return {
        ...updated,
        id: Number(updated.id),
        barangAwalId: Number(updated.barangAwalId),
        barangAkhirId: Number(updated.barangAkhirId),
        qtyAwal: Number(updated.qtyAwal),
        hppAwal: Number(updated.hppAwal),
        qtyAkhir: Number(updated.qtyAkhir),
        hppAkhir: Number(updated.hppAkhir),
        totalNominal: Number(updated.totalNominal),
        jurnalId: updated.jurnalId ? Number(updated.jurnalId) : null,
        stokBatchId: updated.stokBatchId ? Number(updated.stokBatchId) : null,
      };
    });
  }

  /**
   * Menghapus / Membatalkan Konversi Barang
   */
  async deleteKonversi(id: number, userId: number = 1) {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.konversiBarang.findUnique({
        where: { id: BigInt(id) },
        include: {
          barangAwal: true,
          barangAkhir: true,
          stokBatch: true,
        },
      });
      if (!existing) {
        throw new NotFoundException(`Konversi barang dengan ID ${id} tidak ditemukan.`);
      }

      // Validasi apakah batch tujuan sudah terpakai
      if (existing.stokBatch) {
        const qtyMasuk = Number(existing.stokBatch.qtyMasuk);
        const qtySisa = Number(existing.stokBatch.qtySisa);
        if (qtySisa < qtyMasuk) {
          const terpakai = qtyMasuk - qtySisa;
          throw new BadRequestException(
            `Barang hasil konversi (${existing.barangAkhir.name}) sudah terjual/terpakai sebanyak ${terpakai.toLocaleString('id-ID')}, sehingga transaksi konversi ini tidak dapat dihapus.`
          );
        }
      }

      // Revert batch allocations pada barang awal
      const oldAllocations = (existing.batchAllocations as any[]) || [];
      for (const alloc of oldAllocations) {
        if (alloc.batchId && alloc.qty) {
          await tx.stokBatch.update({
            where: { id: BigInt(alloc.batchId) },
            data: { qtySisa: { increment: Number(alloc.qty) } },
          });
        }
      }

      // Hapus batch tujuan
      if (existing.stokBatchId) {
        await tx.stokBatch.delete({ where: { id: existing.stokBatchId } });
      }

      // Hapus jurnal & detail
      if (existing.jurnalId) {
        await tx.jurnalDetail.deleteMany({ where: { jurnalId: existing.jurnalId } });
        await tx.jurnalUmum.delete({ where: { id: existing.jurnalId } });
      }

      await tx.konversiBarang.delete({ where: { id: existing.id } });

      return {
        success: true,
        message: `Konversi barang ${existing.nomorKonversi} berhasil dibatalkan dan stok dikembalikan.`,
      };
    });
  }
}
