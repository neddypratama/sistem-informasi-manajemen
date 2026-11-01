import type { Response } from 'express';
import { MigrationService } from './migration.service.js';
export declare class MigrationController {
    private readonly migrationService;
    constructor(migrationService: MigrationService);
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
    uploadSqlFile(file: any): Promise<{
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
    downloadTemplate(type: 'barang' | 'client' | 'transaksi', res: Response): Promise<void>;
}
