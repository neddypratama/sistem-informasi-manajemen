import { PrismaService } from '../../../database/prisma.service.js';
import { QueryBarangDto } from '../dto/query-barang.dto.js';
export declare class BarangService {
    private prisma;
    constructor(prisma: PrismaService);
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
    findOne(id: number): Promise<{
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
    create(data: {
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
    update(id: number, data: {
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
    remove(id: number): Promise<{
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
