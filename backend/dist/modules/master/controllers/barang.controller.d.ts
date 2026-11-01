import { BarangService } from '../services/barang.service.js';
import { QueryBarangDto } from '../dto/query-barang.dto.js';
export declare class BarangController {
    private readonly barangService;
    constructor(barangService: BarangService);
    findAll(query: QueryBarangDto): Promise<{
        items: ({
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
        })[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getJenisBarang(): Promise<{
        id: bigint;
        createdAt: Date;
        name: string;
    }[]>;
    getSatuans(): Promise<{
        id: bigint;
        createdAt: Date;
        name: string;
    }[]>;
    findOne(id: string): Promise<{
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
    }>;
    create(body: {
        name: string;
        jenisId: number;
        satuanId?: number;
        code?: string;
        stokMinimum?: number;
    }): Promise<{
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
    }>;
    update(id: string, body: {
        name?: string;
        jenisId?: number;
        satuanId?: number;
        code?: string;
        stokMinimum?: number;
        isActive?: boolean;
    }): Promise<{
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
    }>;
    remove(id: string): Promise<{
        id: bigint;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        jenisId: bigint;
        code: string | null;
        satuanId: bigint | null;
        stokMinimum: import("@prisma/client/runtime/library").Decimal;
    }>;
}
