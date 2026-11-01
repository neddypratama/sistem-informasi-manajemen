import { DetailKategoriService } from '../services/detail-kategori.service.js';
export declare class DetailKategoriController {
    private readonly detailKategoriService;
    constructor(detailKategoriService: DetailKategoriService);
    findAll(type?: string): Promise<({
        _count: {
            kategoris: number;
        };
    } & {
        id: bigint;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        type: string;
        deskripsi: string | null;
    })[]>;
    findOne(id: string): Promise<{
        kategoris: {
            id: bigint;
            createdAt: Date;
            name: string;
            isActive: boolean;
            updatedAt: Date;
            code: string | null;
            deskripsi: string | null;
            detailKategoriId: bigint;
        }[];
    } & {
        id: bigint;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        type: string;
        deskripsi: string | null;
    }>;
    create(body: {
        name: string;
        type: string;
        deskripsi?: string;
    }): Promise<{
        id: bigint;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        type: string;
        deskripsi: string | null;
    }>;
    update(id: string, body: {
        name?: string;
        type?: string;
        deskripsi?: string;
        isActive?: boolean;
    }): Promise<{
        id: bigint;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        type: string;
        deskripsi: string | null;
    }>;
    remove(id: string): Promise<{
        id: bigint;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        type: string;
        deskripsi: string | null;
    }>;
}
