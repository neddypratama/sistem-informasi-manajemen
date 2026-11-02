import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { FifoService } from '../inventory/fifo.service.js';
import { CreateTransaksiDto } from './dto/create-transaksi.dto.js';
import { QueryTransaksiDto } from './dto/query-transaksi.dto.js';
export declare class TransaksiService {
    private prisma;
    private fifoService;
    constructor(prisma: PrismaService, fifoService: FifoService);
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
                    jenisId: bigint;
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
                totalHpp: Prisma.Decimal;
                hppSatuan: Prisma.Decimal;
                barangId: bigint | null;
                qty: Prisma.Decimal;
                transaksiId: bigint;
                kategoriId: bigint | null;
                hargaSatuan: Prisma.Decimal;
                telurBentes: Prisma.Decimal;
                telurKotor: Prisma.Decimal;
                telurCeplok: Prisma.Decimal;
                telurJumbo: Prisma.Decimal;
                subtotal: Prisma.Decimal;
            })[];
            jurnalUmums: {
                id: bigint;
                details: {
                    kategoriId: bigint | null;
                    debit: Prisma.Decimal;
                    kredit: Prisma.Decimal;
                }[];
            }[];
            id: bigint;
            createdAt: Date;
            userId: bigint;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.TransaksiStatus;
            total: Prisma.Decimal;
            type: import("@prisma/client").$Enums.TransaksiType;
            keterangan: string | null;
            tanggal: Date;
            clientId: bigint | null;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            diskon: Prisma.Decimal;
            invoice: string;
            subtotal: Prisma.Decimal;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            totalKeseluruhan: number;
        };
    }>;
    findOne(id: number): Promise<{
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
            saldoPiutang: Prisma.Decimal;
            saldoHutang: Prisma.Decimal;
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
                stokMinimum: Prisma.Decimal;
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
                hargaBeli: Prisma.Decimal;
                qty: Prisma.Decimal;
                returnedQty: Prisma.Decimal;
                stokBatchId: bigint;
            }[];
        } & {
            id: bigint;
            createdAt: Date;
            totalHpp: Prisma.Decimal;
            hppSatuan: Prisma.Decimal;
            barangId: bigint | null;
            qty: Prisma.Decimal;
            transaksiId: bigint;
            kategoriId: bigint | null;
            hargaSatuan: Prisma.Decimal;
            telurBentes: Prisma.Decimal;
            telurKotor: Prisma.Decimal;
            telurCeplok: Prisma.Decimal;
            telurJumbo: Prisma.Decimal;
            subtotal: Prisma.Decimal;
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
                debit: Prisma.Decimal;
                kredit: Prisma.Decimal;
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
        status: import("@prisma/client").$Enums.TransaksiStatus;
        total: Prisma.Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: Prisma.Decimal;
        invoice: string;
        subtotal: Prisma.Decimal;
    }>;
    createPenjualan(createDto: CreateTransaksiDto, userId: number): Promise<{
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        total: Prisma.Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: Prisma.Decimal;
        invoice: string;
        subtotal: Prisma.Decimal;
    }>;
    createPembelian(createDto: CreateTransaksiDto, userId: number): Promise<{
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        total: Prisma.Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: Prisma.Decimal;
        invoice: string;
        subtotal: Prisma.Decimal;
    }>;
    createReturPenjualan(createDto: CreateTransaksiDto, userId: number): Promise<{
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        total: Prisma.Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: Prisma.Decimal;
        invoice: string;
        subtotal: Prisma.Decimal;
    }>;
    createReturPembelian(createDto: CreateTransaksiDto, userId: number): Promise<{
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        total: Prisma.Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: Prisma.Decimal;
        invoice: string;
        subtotal: Prisma.Decimal;
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
        status: import("@prisma/client").$Enums.TransaksiStatus;
        total: Prisma.Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: Prisma.Decimal;
        invoice: string;
        subtotal: Prisma.Decimal;
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
        status: import("@prisma/client").$Enums.TransaksiStatus;
        total: Prisma.Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: Prisma.Decimal;
        invoice: string;
        subtotal: Prisma.Decimal;
    }>;
    createHutangMutasi(body: {
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
        status: import("@prisma/client").$Enums.TransaksiStatus;
        total: Prisma.Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: Prisma.Decimal;
        invoice: string;
        subtotal: Prisma.Decimal;
    }>;
    createPiutangMutasi(body: {
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
        status: import("@prisma/client").$Enums.TransaksiStatus;
        total: Prisma.Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: Prisma.Decimal;
        invoice: string;
        subtotal: Prisma.Decimal;
    }>;
    update(id: number, body: {
        keterangan?: string;
        tanggal?: string;
        clientId?: number;
        paymentAccountId?: number;
        paymentMethod?: any;
        diskon?: number;
        nominal?: number;
        kategoriId?: number;
        kasBankKategoriId?: number;
        type?: string;
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
    }, userId?: number): Promise<({
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
            saldoPiutang: Prisma.Decimal;
            saldoHutang: Prisma.Decimal;
        } | null;
        details: ({
            kategori: {
                id: bigint;
                createdAt: Date;
                name: string;
                isActive: boolean;
                updatedAt: Date;
                code: string | null;
                deskripsi: string | null;
                detailKategoriId: bigint;
            } | null;
        } & {
            id: bigint;
            createdAt: Date;
            totalHpp: Prisma.Decimal;
            hppSatuan: Prisma.Decimal;
            barangId: bigint | null;
            qty: Prisma.Decimal;
            transaksiId: bigint;
            kategoriId: bigint | null;
            hargaSatuan: Prisma.Decimal;
            telurBentes: Prisma.Decimal;
            telurKotor: Prisma.Decimal;
            telurCeplok: Prisma.Decimal;
            telurJumbo: Prisma.Decimal;
            subtotal: Prisma.Decimal;
        })[];
    } & {
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        total: Prisma.Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: Prisma.Decimal;
        invoice: string;
        subtotal: Prisma.Decimal;
    }) | ({
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
            saldoPiutang: Prisma.Decimal;
            saldoHutang: Prisma.Decimal;
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
                stokMinimum: Prisma.Decimal;
            }) | null;
        } & {
            id: bigint;
            createdAt: Date;
            totalHpp: Prisma.Decimal;
            hppSatuan: Prisma.Decimal;
            barangId: bigint | null;
            qty: Prisma.Decimal;
            transaksiId: bigint;
            kategoriId: bigint | null;
            hargaSatuan: Prisma.Decimal;
            telurBentes: Prisma.Decimal;
            telurKotor: Prisma.Decimal;
            telurCeplok: Prisma.Decimal;
            telurJumbo: Prisma.Decimal;
            subtotal: Prisma.Decimal;
        })[];
    } & {
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        total: Prisma.Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: Prisma.Decimal;
        invoice: string;
        subtotal: Prisma.Decimal;
    })>;
    remove(id: number): Promise<{
        id: bigint;
        createdAt: Date;
        userId: bigint;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TransaksiStatus;
        total: Prisma.Decimal;
        type: import("@prisma/client").$Enums.TransaksiType;
        keterangan: string | null;
        tanggal: Date;
        clientId: bigint | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        diskon: Prisma.Decimal;
        invoice: string;
        subtotal: Prisma.Decimal;
    }>;
    createKasMutasi(body: {
        type: 'MASUK' | 'KELUAR' | 'TRANSFER';
        kasAccountId: number;
        lawanAccountId: number;
        nominal: number;
        keterangan?: string;
        tanggal?: string;
    }, _userId: number): Promise<{
        id: number;
        nomorJurnal: string;
        tanggal: Date;
        nominal: number;
        type: "TRANSFER" | "MASUK" | "KELUAR";
    }>;
    getClientLedger(clientId: number): Promise<{
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
    getCurahSummary(startDate?: string, endDate?: string): Promise<{
        penjualanCurah: number;
        hppCurah: number;
        labaKotorCurah: number;
        marginCurah: number;
        qtyTerjualKg: number;
        tunaiMasuk: number;
        transferMasuk: number;
        bonPiutang: number;
        pembelianBahan: number;
        pembelianTunai: number;
        pembelianTransfer: number;
        pembelianBon: number;
        stokFisikTotal: {
            qtyKg: number;
            nilaiRupiah: number;
        };
        mitraSupriyadi: {
            id: number;
            name: string;
            saldoHutang: number;
            saldoPiutang: number;
            saldoNet: number;
        };
    }>;
}
