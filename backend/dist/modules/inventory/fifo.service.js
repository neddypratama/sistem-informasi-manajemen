var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
let FifoService = class FifoService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async allocateFifoStock(tx, barangId, qtyDibutuhkan, detailTransaksiId) {
        if (qtyDibutuhkan <= 0) {
            return { allocations: [], totalHpp: 0, hppSatuan: 0 };
        }
        const batches = await tx.$queryRaw `
      SELECT id, qty_sisa, harga_beli 
      FROM stok_batches 
      WHERE barang_id = ${barangId} AND qty_sisa > 0 
      ORDER BY tanggal ASC, id ASC 
      FOR UPDATE
    `;
        let sisaKebutuhan = qtyDibutuhkan;
        let totalHpp = 0;
        const allocations = [];
        for (const batch of batches) {
            if (sisaKebutuhan <= 0)
                break;
            const qtySisa = Number(batch.qty_sisa);
            const hargaBeli = Number(batch.harga_beli);
            const pakai = Math.min(qtySisa, sisaKebutuhan);
            await tx.stokBatch.update({
                where: { id: batch.id },
                data: {
                    qtySisa: { decrement: pakai },
                },
            });
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
            throw new BadRequestException(`Stok barang ID ${barangId} tidak mencukupi untuk memenuhi pesanan (kekurangan: ${sisaKebutuhan.toFixed(2)} unit).`);
        }
        const hppSatuan = qtyDibutuhkan > 0 ? totalHpp / qtyDibutuhkan : 0;
        return { allocations, totalHpp, hppSatuan };
    }
};
FifoService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], FifoService);
export { FifoService };
//# sourceMappingURL=fifo.service.js.map