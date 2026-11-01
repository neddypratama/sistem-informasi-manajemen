import { PrismaService } from '../../database/prisma.service.js';
export declare class MigrationService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private getDbConfig;
    private parseUrlConfig;
    getStatus(): Promise<{
        legacy: {
            available: boolean;
            totalTransactions: number;
        };
        modern: {
            totalTransactions: number;
            breakdown: {
                penjualan: number;
                pembelian: number;
                pendapatanLain: number;
                returPenjualan: number;
                returPembelian: number;
                kasDanBeban: number;
            };
            totalJurnals: number;
            totalJurnalDetails: number;
            totalStokBatches: number;
            totalClients: number;
            totalBarangs: number;
        };
    }>;
    runCleanMigration(): Promise<{
        success: boolean;
        durationSeconds: number;
        summary: {
            penjualan: {
                telur: number;
                pakan: number;
                obat: number;
                tray: number;
                total: number;
            };
            pembelian: {
                telur: number;
                pakan: number;
                obat: number;
                tray: number;
                total: number;
            };
            retur: {
                penjualan: number;
                pembelian: number;
            };
            keuangan: {
                bebanOperasional: number;
                pendapatanLain: number;
            };
            penjualanMurni: number;
            pembelianPeternakMurni: number;
            opnameStok: number;
            totalTransaksiOperasional: number;
            totalDetailTransaksi: number;
            totalJurnalUmum: number;
            totalJurnalDetail: number;
            totalStokBatches: number;
            totalStokKeluar: number;
            totalStokOpname: number;
        };
    }>;
    private bulkInsert;
    private detectDumpType;
    private executeSqlDumpStream;
    private syncMasterDataIfMissing;
    private dropLegacyStagingTables;
    importSqlAndMigrate(file: any): Promise<{
        success: boolean;
        durationSeconds: number;
        summary: {
            totalTransaksiOperasional: number;
            totalJurnalUmum: number;
            totalJurnalDetail: number;
            totalStokBatches: number;
            totalClients: number;
            totalBarangs: number;
            penjualanMurni: number;
            pembelianPeternakMurni: number;
            opnameStok: number;
        };
        fileName: any;
        fileSizeFormatted: string;
        source: string;
    } | {
        fileName: any;
        fileSize: any;
        fileSizeFormatted: string;
        source: string;
        success: boolean;
        durationSeconds: number;
        summary: {
            penjualan: {
                telur: number;
                pakan: number;
                obat: number;
                tray: number;
                total: number;
            };
            pembelian: {
                telur: number;
                pakan: number;
                obat: number;
                tray: number;
                total: number;
            };
            retur: {
                penjualan: number;
                pembelian: number;
            };
            keuangan: {
                bebanOperasional: number;
                pendapatanLain: number;
            };
            penjualanMurni: number;
            pembelianPeternakMurni: number;
            opnameStok: number;
            totalTransaksiOperasional: number;
            totalDetailTransaksi: number;
            totalJurnalUmum: number;
            totalJurnalDetail: number;
            totalStokBatches: number;
            totalStokKeluar: number;
            totalStokOpname: number;
        };
    }>;
    generateExcelTemplate(type: 'barang' | 'client' | 'transaksi'): Promise<Buffer>;
}
