import { ClientType } from '@prisma/client';
export declare class QueryClientDto {
    search?: string;
    type?: ClientType;
    page?: number;
    limit?: number;
    status?: string;
}
