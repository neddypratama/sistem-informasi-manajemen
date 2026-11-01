import { PrismaService } from '../../database/prisma.service.js';
export declare class CreateOpnameDto {
    barangId: number;
    tanggal?: string;
    keterangan?: string;
    stokFisik?: number;
    selisihStok?: number;
    bentes?: number;
    ceplok?: number;
    prok?: number;
    kotor?: number;
    jumbo?: number;
    barangPakai?: number;
    pemakaianTray?: number;
}
export declare class InventoryService {
    private prisma;
    constructor(prisma: PrismaService);
    getStockSummary(jenisId?: number): Promise<{
        id: number;
        barangId: number;
        code: string | null;
        name: string;
        jenisId: number;
        jenis: string;
        satuan: string;
        totalStok: number;
        totalQty: number;
        nilaiStok: number;
        hargaRataRata: number;
        stokMinimum: number;
        isDibawahMinimum: boolean;
        batches: {
            id: number;
            tanggal: Date;
            qtyMasuk: number;
            qtySisa: number;
            hargaBeli: number;
        }[];
    }[]>;
    getBatches(barangId?: number): Promise<({
        barang: {
            satuan: {
                id: bigint;
                createdAt: Date;
                name: string;
            } | null;
            jenis: {
                id: bigint;
                createdAt: Date;
                name: string;
            };
        } & {
            id: bigint;
            createdAt: Date;
            name: string;
            isActive: boolean;
            updatedAt: Date;
            jenisId: bigint;
            code: string | null;
            satuanId: bigint | null;
            stokMinimum: import("@prisma/client/runtime/library").Decimal;
        };
    } & {
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        barangId: bigint;
        detailTransaksiId: bigint | null;
        tanggal: Date;
        qtyMasuk: import("@prisma/client/runtime/library").Decimal;
        qtySisa: import("@prisma/client/runtime/library").Decimal;
        hargaBeli: import("@prisma/client/runtime/library").Decimal;
    })[]>;
    findAllOpname(query: {
        jenisOpname?: string;
        barangId?: number;
        startDate?: string;
        endDate?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        items: {
            id: number;
            nomorOpname: string;
            tanggal: Date;
            jenisOpname: string;
            barangId: number;
            barangName: string;
            satuan: string;
            userName: string;
            stokSistem: number;
            stokFisik: number;
            selisih: number;
            hpp: number;
            totalNilai: number;
            keterangan: string | null;
            selisihStok: number;
            bentes: number;
            ceplok: number;
            prok: number;
            kotor: number;
            jumbo: number;
            barangPakai: number;
            pemakaianTray: number;
            nomorJurnal: string | null;
            jurnalDetails: {
                kategoriName: string;
                debit: number;
                kredit: number;
            }[];
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    createOpname(dto: CreateOpnameDto, userId: number): Promise<{
        id: number;
        nomorOpname: string;
        tanggal: Date;
        jenisOpname: string;
        stokSistem: number;
        stokFisik: number;
        selisih: number;
        selisihStok: number;
        totalNilai: number;
        jurnalId: number | null;
    }>;
}
