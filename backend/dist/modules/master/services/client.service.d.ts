import { PrismaService } from '../../../database/prisma.service.js';
import { QueryClientDto } from '../dto/query-client.dto.js';
export declare class ClientService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(query: QueryClientDto): Promise<{
        items: {
            id: bigint;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            code: string | null;
            type: import("@prisma/client").$Enums.ClientType;
            alamat: string | null;
            phone: string | null;
            keterangan: string | null;
            saldoPiutang: import("@prisma/client/runtime/library").Decimal;
            saldoHutang: import("@prisma/client/runtime/library").Decimal;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    findOne(id: number): Promise<{
        id: bigint;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        code: string | null;
        type: import("@prisma/client").$Enums.ClientType;
        alamat: string | null;
        phone: string | null;
        keterangan: string | null;
        saldoPiutang: import("@prisma/client/runtime/library").Decimal;
        saldoHutang: import("@prisma/client/runtime/library").Decimal;
    }>;
    create(data: {
        name: string;
        type: any;
        phone?: string;
        alamat?: string;
        keterangan?: string;
        code?: string;
    }): Promise<{
        id: bigint;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        code: string | null;
        type: import("@prisma/client").$Enums.ClientType;
        alamat: string | null;
        phone: string | null;
        keterangan: string | null;
        saldoPiutang: import("@prisma/client/runtime/library").Decimal;
        saldoHutang: import("@prisma/client/runtime/library").Decimal;
    }>;
    update(id: number, data: {
        name?: string;
        type?: any;
        phone?: string;
        alamat?: string;
        keterangan?: string;
        code?: string;
    }): Promise<{
        id: bigint;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        code: string | null;
        type: import("@prisma/client").$Enums.ClientType;
        alamat: string | null;
        phone: string | null;
        keterangan: string | null;
        saldoPiutang: import("@prisma/client/runtime/library").Decimal;
        saldoHutang: import("@prisma/client/runtime/library").Decimal;
    }>;
    remove(id: number): Promise<{
        id: bigint;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        code: string | null;
        type: import("@prisma/client").$Enums.ClientType;
        alamat: string | null;
        phone: string | null;
        keterangan: string | null;
        saldoPiutang: import("@prisma/client/runtime/library").Decimal;
        saldoHutang: import("@prisma/client/runtime/library").Decimal;
    }>;
}
