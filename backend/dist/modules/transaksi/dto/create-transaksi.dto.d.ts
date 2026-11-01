import { PaymentMethod, TransaksiType } from '@prisma/client';
export declare class CreateItemDto {
    detailId?: number;
    originalDetailId?: number;
    barangId: number;
    qty: number;
    hargaSatuan: number;
    telurBentes?: number;
    telurKotor?: number;
    telurCeplok?: number;
    telurJumbo?: number;
}
export declare class CreateTransaksiDto {
    type?: TransaksiType;
    paymentMethod: PaymentMethod;
    paymentAccountId?: number;
    clientId?: number;
    tanggal?: string;
    diskon?: number;
    keterangan?: string;
    items: CreateItemDto[];
}
