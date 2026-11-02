import { PrismaService } from '../../database/prisma.service.js';
export declare const COMMODITY_MAP: {
    key: string;
    name: string;
    salesKatId: number;
    hppKatId: number;
}[];
export declare class ReportsService {
    private prisma;
    constructor(prisma: PrismaService);
    getLabaRugi(startDate?: string, endDate?: string): Promise<{
        periode: {
            startDate: string | undefined;
            endDate: string | undefined;
        };
        totalPendapatan: number;
        totalHpp: number;
        labaKotor: number;
        marginKotorPersen: number;
        bebanOperasional: number;
        totalPendapatanLain: number;
        labaBersih: number;
        perKomoditas: {
            key: string;
            komoditas: string;
            salesKatId: number;
            penjualan: number;
            hpp: number;
            labaKotor: number;
            marginPersen: number;
            items: any[];
        }[];
        rincianBeban: {
            kategoriId: number;
            nama: string;
            group: string;
            total: number;
        }[];
        bebanGroups: {
            group: string;
            total: number;
            details: any[];
        }[];
        rincianPendapatanLain: {
            kategoriId: number;
            nama: string;
            group: string;
            total: number;
        }[];
        pendapatanLainGroups: {
            group: string;
            total: number;
            details: any[];
        }[];
    }>;
    getLabaRugiCurah(startDate?: string, endDate?: string): Promise<{
        periode: {
            startDate: string | undefined;
            endDate: string | undefined;
        };
        penjualanCurah: number;
        hppCurah: number;
        labaKotorCurah: number;
        marginCurah: number;
        qtyTerjualKg: number;
        stokFisikTotalCurah: {
            totalQtyKg: number;
            totalNilaiRupiah: number;
        };
        rincianBarang: {
            barang: string;
            qtyKg: number;
            penjualan: number;
            hpp: number;
            labaKotor: number;
            marginPersen: number;
        }[];
    }>;
    getBonTitipan(search?: string, type?: string): Promise<{
        ringkasan: {
            totalMitra: number;
            totalPiutang: number;
            totalHutang: number;
            totalNet: number;
        };
        items: {
            id: bigint;
            code: string | null;
            name: string;
            type: import("@prisma/client").$Enums.ClientType;
            phone: string | null;
            bon: number;
            titipan: number;
            sisa: number;
            statusSaldo: string;
        }[];
    }>;
    getNeracaSaldo(startDate?: string, endDate?: string, mode?: string): Promise<{
        periode: {
            startDate: string | null;
            endDate: string | null;
        };
        mode: string;
        pendapatan: {
            type: string;
            groups: any[];
            totalDebit: any;
            totalKredit: any;
        };
        pengeluaran: {
            type: string;
            groups: any[];
            totalDebit: any;
            totalKredit: any;
        };
        aset: {
            type: string;
            groups: any[];
            totalDebit: any;
            totalKredit: any;
        };
        liabilitas: {
            type: string;
            groups: any[];
            totalDebit: any;
            totalKredit: any;
        };
        ekuitas: {
            type: string;
            groups: any[];
            totalDebit: any;
            totalKredit: any;
        };
        totalDebit: number;
        totalKredit: number;
        selisih: number;
        isBalanced: boolean;
        summary: {
            mode: string;
            gross: {
                totalDebit: number;
                totalKredit: number;
            };
            net: {
                totalDebit: number;
                totalKredit: number;
            };
        };
    }>;
    getLaporanAset(startDate?: string, endDate?: string): Promise<{
        periode: {
            startDate: string | null;
            endDate: string | null;
        };
        totalAset: any;
        totalLiabilitas: any;
        totalModal: number;
        asetGroups: any[];
        liabilitasGroups: any[];
    }>;
    getNeraca(startDate?: string, endDate?: string): Promise<{
        periode: {
            startDate: string | null;
            endDate: string | null;
        };
        totalAset: any;
        totalLiabilitas: any;
        totalModal: number;
        asetGroups: any[];
        liabilitasGroups: any[];
    }>;
    getLaporanKas(startDate: string, endDate: string, search?: string, kasAccountId?: number, type?: string, limit?: number): Promise<{
        periode: {
            startDate: string;
            endDate: string;
        };
        totalSaldoAwal: number;
        totalPemasukan: number;
        totalPengeluaran: number;
        totalSaldoAkhir: number;
        rekapAkun: {
            id: number;
            nama: string;
            saldoAwal: number;
            pemasukan: number;
            pengeluaran: number;
            saldoAkhir: number;
        }[];
        mutasiRinci: any[];
    }>;
    getJurnalUmum(query?: {
        page?: number;
        limit?: number;
        search?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{
        items: {
            id: number;
            nomorJurnal: string;
            tanggal: Date;
            keterangan: string | null;
            transaksiId: number | null;
            invoice: string | null;
            transaksiType: import("@prisma/client").$Enums.TransaksiType | null;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
            totalDebit: number;
            totalKredit: number;
            isBalanced: boolean;
            details: {
                id: number;
                coaId: number;
                coaCode: string;
                coaName: string;
                coaType: import("@prisma/client").$Enums.CoaType;
                kategoriName: string | null;
                debit: number;
                kredit: number;
            }[];
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getDashboardAnalytics(): Promise<{
        financials: {
            totalOmzet: number;
            totalHpp: number;
            labaKotor: number;
            marginKotorPersen: number;
            bebanOperasional: number;
            pendapatanLain: number;
            labaBersih: number;
            totalKasBank: number;
            totalPiutang: number;
            totalHutang: number;
            totalNilaiStok: number;
            itemsDibawahMinimum: number;
            totalItems: number;
        };
        perKomoditas: {
            key: string;
            komoditas: string;
            salesKatId: number;
            penjualan: number;
            hpp: number;
            labaKotor: number;
            marginPersen: number;
            items: any[];
        }[];
        monthlyTrends: {
            bulan: string;
            label: string;
            omzet: number;
            pendapatan: number;
            pendapatanLain: number;
            hpp: number;
            beban: number;
            pengeluaranBeban: number;
            totalPengeluaran: number;
            grossProfit: number;
            netProfit: number;
            kasMasuk: number;
            kasKeluar: number;
        }[];
        stokPerJenis: {
            jenis: string;
            totalNilai: number;
            totalQty: number;
        }[];
        topDebitur: {
            id: number;
            name: string;
            type: import("@prisma/client").$Enums.ClientType;
            saldoPiutang: number;
            phone: string | null;
        }[];
        topKreditur: {
            id: number;
            name: string;
            type: import("@prisma/client").$Enums.ClientType;
            saldoHutang: number;
            phone: string | null;
        }[];
        recentTransactions: {
            id: number;
            invoice: string;
            tanggal: Date;
            type: import("@prisma/client").$Enums.TransaksiType;
            status: import("@prisma/client").$Enums.TransaksiStatus;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            clientName: string;
            total: number;
        }[];
    }>;
}
