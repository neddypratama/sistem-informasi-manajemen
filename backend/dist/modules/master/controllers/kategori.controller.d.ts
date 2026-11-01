import { KategoriService } from '../services/kategori.service.js';
export declare class KategoriController {
    private readonly kategoriService;
    constructor(kategoriService: KategoriService);
    findAll(detailKategoriId?: string, type?: string, search?: string): Promise<({
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
    findOne(id: string): Promise<{
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
    create(body: {
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
    update(id: string, body: {
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
    remove(id: string): Promise<{
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
