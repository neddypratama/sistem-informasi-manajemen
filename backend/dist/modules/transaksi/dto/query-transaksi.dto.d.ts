import { TransaksiStatus } from '@prisma/client';
export declare class QueryTransaksiDto {
    type?: string;
    status?: TransaksiStatus;
    module?: string;
    paymentMethod?: string;
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
