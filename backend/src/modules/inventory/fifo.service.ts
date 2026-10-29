import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

export interface FifoAllocationResult {
  stokBatchId: bigint;
  qty: number;
  hargaBeli: number;
}

@Injectable()
export class FifoService {
  constructor(private prisma: PrismaService) {}

  /**
   * Alokasi batch stok FIFO secara atomik dengan row-level lock.
   */
  async allocateFifoStock(
    tx: Prisma.TransactionClient,
    barangId: number,
    qtyDibutuhkan: number,
    detailTransaksiId: bigint,
  ): Promise<{ allocations: FifoAllocationResult[]; totalHpp: number; hppSatuan: number }> {
    if (qtyDibutuhkan <= 0) {
      return { allocations: [], totalHpp: 0, hppSatuan: 0 };
    }

    // 1. Kunci baris batch secara berurutan (Pessimistic Locking FIFO)
    const batches = await tx.$queryRaw<
      { id: bigint; qty_sisa: string | number; harga_beli: string | number }[]
    >`
      SELECT id, qty_sisa, harga_beli 
      FROM stok_batches 
      WHERE barang_id = ${barangId} AND qty_sisa > 0 
      ORDER BY tanggal ASC, id ASC 
      FOR UPDATE
    `;

    let sisaKebutuhan = qtyDibutuhkan;
    let totalHpp = 0;
    const allocations: FifoAllocationResult[] = [];

    for (const batch of batches) {
      if (sisaKebutuhan <= 0) break;

      const qtySisa = Number(batch.qty_sisa);
      const hargaBeli = Number(batch.harga_beli);
      const pakai = Math.min(qtySisa, sisaKebutuhan);

      // 2. Kurangi qty_sisa di batch
      await tx.stokBatch.update({
        where: { id: batch.id },
        data: {
          qtySisa: { decrement: pakai },
        },
      });

      // 3. Catat ke stok_keluar_batches
      await tx.stokKeluarBatch.create({
        data: {
          detailTransaksiId,
          stokBatchId: batch.id,
          qty: pakai,
          hargaBeli,
          returnedQty: 0,
        },
      });

      allocations.push({
        stokBatchId: batch.id,
        qty: pakai,
        hargaBeli,
      });

      totalHpp += pakai * hargaBeli;
      sisaKebutuhan -= pakai;
    }

    if (sisaKebutuhan > 0) {
      throw new BadRequestException(
        `Stok barang ID ${barangId} tidak mencukupi untuk memenuhi pesanan (kekurangan: ${sisaKebutuhan.toFixed(2)} unit).`,
      );
    }

    const hppSatuan = qtyDibutuhkan > 0 ? totalHpp / qtyDibutuhkan : 0;
    return { allocations, totalHpp, hppSatuan };
  }
}
