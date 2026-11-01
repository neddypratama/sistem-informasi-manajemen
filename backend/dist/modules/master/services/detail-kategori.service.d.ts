import { PrismaService } from '../../../database/prisma.service.js';
export declare class DetailKategoriService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    findOne(id: number): Promise<{
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
    create(data: {
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
    update(id: number, data: {
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
    remove(id: number): Promise<{
        id: bigint;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        type: string;
        deskripsi: string | null;
    }>;
}
