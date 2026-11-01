import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
export interface FifoAllocationResult {
    stokBatchId: bigint;
    qty: number;
    hargaBeli: number;
}
export declare class FifoService {
    private prisma;
    constructor(prisma: PrismaService);
    allocateFifoStock(tx: Prisma.TransactionClient, barangId: number, qtyDibutuhkan: number, detailTransaksiId: bigint): Promise<{
        allocations: FifoAllocationResult[];
        totalHpp: number;
        hppSatuan: number;
    }>;
}
