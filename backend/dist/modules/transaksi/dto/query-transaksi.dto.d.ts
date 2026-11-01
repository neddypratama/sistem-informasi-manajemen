import { TransaksiType, TransaksiStatus } from '@prisma/client';
export declare class QueryTransaksiDto {
    type?: TransaksiType;
    status?: TransaksiStatus;
    module?: string;
    search?: string;
    clientId?: number;
    jenisId?: number;
    jenisIds?: string;
    kategoriId?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}
