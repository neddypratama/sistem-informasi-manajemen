import { TransaksiService } from './transaksi.service.js';
import { CreateTransaksiDto } from './dto/create-transaksi.dto.js';
import { QueryTransaksiDto } from './dto/query-transaksi.dto.js';
export declare class TransaksiController {
    private readonly transaksiService;
    constructor(transaksiService: TransaksiService);
    findAll(query: QueryTransaksiDto): Promise<{
        items: {
            posisi: "Debit" | "Kredit";
            user: {
                id: bigint;
                name: string;
            };
            client: {
                id: bigint;
                name: string;
                type: import("@prisma/client").$Enums.ClientType;
            } | null;
            details: ({
                barang: {
                    satuan: {
                        id: bigint;
                        createdAt: Date;
                        name: string;
                    } | null;
                    id: bigint;
                    name: string;
                    jenis: {
                        id: bigint;
                        createdAt: Date;
                        name: string;
                    };
                } | null;
                kategori: {
                    detailKategori: {
                        id: bigint;
                        name: string;
                        type: string;
                    };
                    id: bigint;
                    name: string;
                    code: string | null;
                } | null;
            } & {
                id: bigint;
                createdAt: Date;
                totalHpp: import("@prisma/client/runtime/library").Decimal;
                hppSatuan: import("@prisma/client/runtime/library").Decimal;
                barangId: bigint | null;
                qty: import("@prisma/client/runtime/library").Decimal;
                transaksiId: bigint;
                kategoriId: bigint | null;
                hargaSatuan: import("@prisma/client/runtime/library").Decimal;
                telurBentes: import("@prisma/client/runtime/library").Decimal;
                telurKotor: import("@prisma/client/runtime/library").Decimal;
                telurCeplok: import("@prisma/client/runtime/library").Decimal;
                telurJumbo: import("@prisma/client/runtime/library").Decimal;
                subtotal: import("@prisma/client/runtime/library").Decimal;
            })[];
            jurnalUmums: {
                id: bigint;
                details: {
                    kategoriId: bigint | null;
                    debit: import("@prisma/client/runtime/library").Decimal;
                    kredit: import("@prisma/client/runtime/library").Decimal;
                }[];
            }[];
            id: bigint;
            createdAt: Date;
            userId: bigint;
            updatedAt: Date;
            total: import("@prisma/client/runtime/library").Decimal;
            type: import("@prisma/client").$Enums.TransaksiType;
            keterangan: string | null;
            tanggal: Date;
            clientId: bigint | null;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            diskon: import("@prisma/client/runtime/library").Decimal;
            status: import("@prisma/client").$Enums.TransaksiStatus;
            invoice: string;
            subtotal: import("@prisma/client/runtime/library").Decimal;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            totalKeseluruhan: number;
        };
    }>;
    getClientLedger(clientId: string): Promise<{
        client: {
            id: string;
            code: string | null;
            name: string;
            type: import("@prisma/client").$Enums.ClientType;
            phone: string | null;
            saldoPiutang: number;
            saldoHutang: number;
            sisa: number;
        };
        items: any[];
        totalCount: number;
    }>;
    findOne(id: string): Promise<{
        user: {
            id: bigint;
            createdAt: Date;
            name: string;
            username: string;
            password: string;
            email: string | null;
            roleId: bigint;
            isActive: boolean;
            updatedAt: Date;
        };
        client: {
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
        } | null;
        details: ({
            barang: ({
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
            }) | null;
            kategori: ({
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
            }) | null;
            stokKeluarBatches: {
                id: bigint;
                createdAt: Date;
                detailTransaksiId: bigint;
                hargaBeli: import("@prisma/client/runtime/library").Decimal;
                qty: import("@prisma/client/runtime/library").Decimal;
                returnedQty: import("@prisma/client/runtime/library").Decimal;
                stokBatchId: bigint;
            }[];
        } & {
            id: bigint;
            createdAt: Date;
            totalHpp: import("@prisma/client/runtime/library").Decimal;
            hppSatuan: import("@prisma/client/runtime/library").Decimal;
            barangId: bigint | null;
            qty: import("@prisma/client/runtime/library").Decimal;
            transaksiId: bigint;
            kategoriId: bigint | null;
            hargaSatuan: import("@prisma/client/runtime/library").Decimal;
            telurBentes: import("@prisma/client/runtime/library").Decimal;
            telurKotor: import("@prisma/client/runtime/library").Decimal;
            telurCeplok: import("@prisma/client/runtime/library").Decimal;
            telurJumbo: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
        })[];
        jurnalUmums: ({
            details: ({
                coa: {
                    id: bigint;
                    createdAt: Date;
                    name: string;
                    isActive: boolean;
                    code: string;
                    type: import("@prisma/client").$Enums.CoaType;
                    normalBalance: string;
                    parentId: bigint | null;
                };
            } & {
                id: bigint;
                createdAt: Date;
                jurnalId: bigint;
                coaId: bigint;
                kategoriId: bigint | null;
                debit: import("@prisma/client/runtime/library").Decimal;
                kredit: import("@prisma/client/runtime/library").Decimal;
            })[];
        } & {
            id: bigint;
            createdAt: Date;
            keterangan: string | null;
            tanggal: Date;
            transaksiId: bigint | null;
            clientId: bigint | null;
            nomorJurnal: string;
        })[];
    } & {
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        total: import("@prisma/client/runtime/library").Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: import("@prisma/client/runtime/library").Decimal;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        invoice: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
    }>;
    createPenjualan(createDto: CreateTransaksiDto, userId: number): Promise<{
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        total: import("@prisma/client/runtime/library").Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: import("@prisma/client/runtime/library").Decimal;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        invoice: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
    }>;
    createPembelian(createDto: CreateTransaksiDto, userId: number): Promise<{
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        total: import("@prisma/client/runtime/library").Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: import("@prisma/client/runtime/library").Decimal;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        invoice: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
    }>;
    createReturPenjualan(createDto: CreateTransaksiDto, userId: number): Promise<{
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        total: import("@prisma/client/runtime/library").Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: import("@prisma/client/runtime/library").Decimal;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        invoice: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
    }>;
    createReturPembelian(createDto: CreateTransaksiDto, userId: number): Promise<{
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        total: import("@prisma/client/runtime/library").Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: import("@prisma/client/runtime/library").Decimal;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        invoice: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
    }>;
    createBeban(body: {
        kategoriId: number;
        nominal: number;
        keterangan?: string;
        tanggal?: string;
        kasBankKategoriId?: number;
        type?: 'Debit' | 'Kredit';
    }, userId: number): Promise<{
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        total: import("@prisma/client/runtime/library").Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: import("@prisma/client/runtime/library").Decimal;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        invoice: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
    }>;
    createPendapatanLain(body: {
        kategoriId: number;
        nominal: number;
        keterangan?: string;
        tanggal?: string;
        paymentMethod?: 'TUNAI' | 'TRANSFER';
        clientId?: number;
        kasBankKategoriId?: number;
    }, userId: number): Promise<{
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        total: import("@prisma/client/runtime/library").Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: import("@prisma/client/runtime/library").Decimal;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        invoice: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
    }>;
    createHutang(body: {
        clientId: number;
        kategoriId: number;
        nominal: number;
        type: 'TAMBAH' | 'BAYAR';
        paymentMethod?: 'TUNAI' | 'TRANSFER' | 'KAS';
        kasBankKategoriId?: number;
        keterangan?: string;
        tanggal?: string;
    }, userId: number): Promise<{
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        total: import("@prisma/client/runtime/library").Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: import("@prisma/client/runtime/library").Decimal;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        invoice: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
    }>;
    createPiutang(body: {
        clientId: number;
        kategoriId: number;
        nominal: number;
        type: 'TAMBAH' | 'BAYAR';
        paymentMethod?: 'TUNAI' | 'TRANSFER' | 'KAS';
        kasBankKategoriId?: number;
        keterangan?: string;
        tanggal?: string;
    }, userId: number): Promise<{
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        total: import("@prisma/client/runtime/library").Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: import("@prisma/client/runtime/library").Decimal;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        invoice: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
    }>;
    createKasMutasi(body: {
        type: 'MASUK' | 'KELUAR' | 'TRANSFER';
        kasAccountId: number;
        lawanAccountId: number;
        nominal: number;
        keterangan?: string;
        tanggal?: string;
    }, userId: number): Promise<{
        id: number;
        nomorJurnal: string;
        tanggal: Date;
        nominal: number;
        type: "TRANSFER" | "MASUK" | "KELUAR";
    }>;
    update(id: string, body: {
        keterangan?: string;
        tanggal?: string;
        clientId?: number;
        paymentAccountId?: number;
        paymentMethod?: any;
        diskon?: number;
        items?: Array<{
            detailId?: number;
            barangId: number;
            qty: number;
            hargaSatuan: number;
            telurBentes?: number;
            telurKotor?: number;
            telurCeplok?: number;
            telurJumbo?: number;
        }>;
    }, userId: number): Promise<{
        client: {
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
        } | null;
        details: ({
            barang: ({
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
            }) | null;
        } & {
            id: bigint;
            createdAt: Date;
            totalHpp: import("@prisma/client/runtime/library").Decimal;
            hppSatuan: import("@prisma/client/runtime/library").Decimal;
            barangId: bigint | null;
            qty: import("@prisma/client/runtime/library").Decimal;
            transaksiId: bigint;
            kategoriId: bigint | null;
            hargaSatuan: import("@prisma/client/runtime/library").Decimal;
            telurBentes: import("@prisma/client/runtime/library").Decimal;
            telurKotor: import("@prisma/client/runtime/library").Decimal;
            telurCeplok: import("@prisma/client/runtime/library").Decimal;
            telurJumbo: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
        })[];
    } & {
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        total: import("@prisma/client/runtime/library").Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: import("@prisma/client/runtime/library").Decimal;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        invoice: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
    }>;
    remove(id: string): Promise<{
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        total: import("@prisma/client/runtime/library").Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: import("@prisma/client/runtime/library").Decimal;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        invoice: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
    }>;
}
