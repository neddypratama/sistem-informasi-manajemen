import { InventoryService, CreateOpnameDto, CreateKonversiDto, CreatePenyesuaianNonJurnalDto, RollbackOpnameDto } from './inventory.service.js';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    getStockSummary(jenisId?: string, jenisIds?: string, search?: string, page?: string, limit?: string): Promise<{
        id: number;
        barangId: number;
        code: string | null;
        name: string;
        jenisId: number;
        jenis: string;
        jenisName: string;
        satuan: string;
        satuanName: string;
        totalStok: number;
        totalQty: number;
        qtySisa: number;
        totalSisa: number;
        nilaiStok: number;
        hargaRataRata: number;
        hpp: number;
        stokMinimum: number;
        isDibawahMinimum: boolean;
        batches: {
            id: number;
            tanggal: Date;
            qtyMasuk: number;
            qtySisa: number;
            hargaBeli: number;
        }[];
    }[] | {
        items: {
            id: number;
            barangId: number;
            code: string | null;
            name: string;
            jenisId: number;
            jenis: string;
            jenisName: string;
            satuan: string;
            satuanName: string;
            totalStok: number;
            totalQty: number;
            qtySisa: number;
            totalSisa: number;
            nilaiStok: number;
            hargaRataRata: number;
            hpp: number;
            stokMinimum: number;
            isDibawahMinimum: boolean;
            batches: {
                id: number;
                tanggal: Date;
                qtyMasuk: number;
                qtySisa: number;
                hargaBeli: number;
            }[];
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getBatches(barangId?: string): Promise<({
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
    findAllOpname(jenisOpname?: string, barangId?: string, startDate?: string, endDate?: string, search?: string, page?: string, limit?: string): Promise<{
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
    createOpname(dto: CreateOpnameDto, userId?: number): Promise<{
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
    updateOpname(id: string, dto: Partial<CreateOpnameDto>, userId?: number): Promise<{
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
    deleteOpname(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    createPenyesuaianNonJurnal(dto: CreatePenyesuaianNonJurnalDto, userId?: number): Promise<{
        success: boolean;
        message: string;
        data: {
            id: bigint;
            createdAt: Date;
            userId: bigint;
            keterangan: string | null;
            barangId: bigint;
            tanggal: Date;
            stokFisik: import("@prisma/client/runtime/library").Decimal;
            selisihStok: import("@prisma/client/runtime/library").Decimal;
            bentes: import("@prisma/client/runtime/library").Decimal;
            ceplok: import("@prisma/client/runtime/library").Decimal;
            prok: import("@prisma/client/runtime/library").Decimal;
            kotor: import("@prisma/client/runtime/library").Decimal;
            jumbo: import("@prisma/client/runtime/library").Decimal;
            barangPakai: import("@prisma/client/runtime/library").Decimal;
            pemakaianTray: import("@prisma/client/runtime/library").Decimal;
            nomorOpname: string;
            jenisOpname: string;
            stokSistem: import("@prisma/client/runtime/library").Decimal;
            selisih: import("@prisma/client/runtime/library").Decimal;
            hpp: import("@prisma/client/runtime/library").Decimal;
            totalNilai: import("@prisma/client/runtime/library").Decimal;
            jurnalId: bigint | null;
        };
    }>;
    rollbackOpname(id: string, dto: RollbackOpnameDto, userId?: number): Promise<{
        success: boolean;
        message: string;
    }>;
    findAllKonversi(startDate?: string, endDate?: string, search?: string, page?: string, limit?: string): Promise<{
        items: {
            id: number;
            nomorKonversi: string;
            tanggal: Date;
            barangAwalId: number;
            barangAwal: {
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
            qtyAwal: number;
            hppAwal: number;
            barangAkhirId: number;
            barangAkhir: {
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
            qtyAkhir: number;
            hppAkhir: number;
            totalNominal: number;
            keterangan: string | null;
            jurnalId: number | null;
            stokBatchId: number | null;
            user: {
                id: bigint;
                name: string;
                username: string;
            };
            batchAllocations: import("@prisma/client/runtime/library").JsonValue;
            createdAt: Date;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    createKonversi(dto: CreateKonversiDto, userId?: number): Promise<{
        id: number;
        barangAwalId: number;
        barangAkhirId: number;
        qtyAwal: number;
        hppAwal: number;
        qtyAkhir: number;
        hppAkhir: number;
        totalNominal: number;
        jurnalId: number;
        stokBatchId: number;
        user: {
            id: bigint;
            name: string;
            username: string;
        };
        barangAkhir: {
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
        barangAwal: {
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
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        keterangan: string | null;
        tanggal: Date;
        nomorKonversi: string;
        batchAllocations: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    updateKonversi(id: string, dto: Partial<CreateKonversiDto>, userId?: number): Promise<{
        id: number;
        barangAwalId: number;
        barangAkhirId: number;
        qtyAwal: number;
        hppAwal: number;
        qtyAkhir: number;
        hppAkhir: number;
        totalNominal: number;
        jurnalId: number | null;
        stokBatchId: number | null;
        user: {
            id: bigint;
            name: string;
            username: string;
        };
        barangAkhir: {
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
        barangAwal: {
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
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        keterangan: string | null;
        tanggal: Date;
        nomorKonversi: string;
        batchAllocations: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    deleteKonversi(id: string, userId?: number): Promise<{
        success: boolean;
        message: string;
    }>;
}
