import { PrismaService } from '../../../database/prisma.service.js';
export declare class KategoriService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query?: {
        detailKategoriId?: number;
        type?: string;
        search?: string;
    }): Promise<({
        detailKategori: {
            id: bigint;
            createdAt: Date;
            name: string;
            isActive: boolean;
            updatedAt: Date;
            type: string;
            deskripsi: string | null;
        };
    } & {
        id: bigint;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        code: string | null;
        deskripsi: string | null;
        detailKategoriId: bigint;
    })[]>;
    findOne(id: number): Promise<{
        detailKategori: {
            id: bigint;
            createdAt: Date;
            name: string;
            isActive: boolean;
            updatedAt: Date;
            type: string;
            deskripsi: string | null;
        };
    } & {
        id: bigint;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        code: string | null;
        deskripsi: string | null;
        detailKategoriId: bigint;
    }>;
    create(data: {
        name: string;
        detailKategoriId: number;
        code?: string;
        deskripsi?: string;
    }): Promise<{
        detailKategori: {
            id: bigint;
            createdAt: Date;
            name: string;
            isActive: boolean;
            updatedAt: Date;
            type: string;
            deskripsi: string | null;
        };
    } & {
        id: bigint;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        code: string | null;
        deskripsi: string | null;
        detailKategoriId: bigint;
    }>;
    update(id: number, data: {
        name?: string;
        detailKategoriId?: number;
        code?: string;
        deskripsi?: string;
        isActive?: boolean;
    }): Promise<{
        detailKategori: {
            id: bigint;
            createdAt: Date;
            name: string;
            isActive: boolean;
            updatedAt: Date;
            type: string;
            deskripsi: string | null;
        };
    } & {
        id: bigint;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        code: string | null;
        deskripsi: string | null;
        detailKategoriId: bigint;
    }>;
    remove(id: number): Promise<{
        id: bigint;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        code: string | null;
        deskripsi: string | null;
        detailKategoriId: bigint;
    }>;
}
