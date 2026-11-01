var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../database/prisma.service.js';
let AuditLogInterceptor = class AuditLogInterceptor {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    intercept(context, next) {
        const req = context.switchToHttp().getRequest();
        const method = req.method ? req.method.toUpperCase() : 'GET';
        if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') {
            return next.handle();
        }
        const url = req.originalUrl || req.url || '';
        if (url.includes('/auth/login')) {
            return next.handle();
        }
        return next.handle().pipe(tap(async (response) => {
            try {
                const user = req.user;
                const ipAddress = req.headers['x-forwarded-for'] ||
                    req.ip ||
                    req.connection?.remoteAddress ||
                    null;
                const logInfo = this.resolveLogInfo(method, url, req.body, response);
                await this.prisma.activityLog.create({
                    data: {
                        userId: user?.id ? BigInt(user.id) : null,
                        action: logInfo.action,
                        module: logInfo.module,
                        description: logInfo.description,
                        ipAddress: typeof ipAddress === 'string' ? ipAddress.slice(0, 45) : null,
                        details: logInfo.details || undefined,
                    },
                });
            }
            catch (err) {
                console.error('[AuditLogInterceptor] Gagal menyimpan log aktivitas:', err);
            }
        }));
    }
    resolveLogInfo(method, url, body = {}, response = {}) {
        const cleanUrl = url.replace(/\/api\/v1\/?/, '').split('?')[0];
        const segments = cleanUrl.split('/').filter(Boolean);
        const mainResource = segments[0] || 'SYSTEM';
        const fmtRp = (num) => Number(num || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
        const safeBody = { ...body };
        delete safeBody.password;
        delete safeBody.token;
        if (mainResource === 'transaksi') {
            const subResource = segments[1] || '';
            if (subResource === 'penjualan') {
                const inv = response?.invoice || response?.data?.invoice || body?.invoice || 'INV';
                const total = response?.total || response?.data?.total || body?.total || 0;
                return {
                    module: 'TRANSAKSI',
                    action: 'PENJUALAN',
                    description: `Mencatat Penjualan (${inv}) senilai Rp ${fmtRp(total)}`,
                    details: { invoice: inv, total: Number(total) },
                };
            }
            if (subResource === 'pembelian') {
                const inv = response?.invoice || response?.data?.invoice || body?.invoice || 'INV';
                const total = response?.total || response?.data?.total || body?.total || 0;
                return {
                    module: 'TRANSAKSI',
                    action: 'PEMBELIAN',
                    description: `Mencatat Pembelian (${inv}) senilai Rp ${fmtRp(total)}`,
                    details: { invoice: inv, total: Number(total) },
                };
            }
            if (subResource === 'retur') {
                const inv = response?.invoice || response?.data?.invoice || body?.invoice || 'INV';
                return {
                    module: 'TRANSAKSI',
                    action: 'RETUR',
                    description: `Mencatat Retur Transaksi (${inv})`,
                    details: { invoice: inv },
                };
            }
            if (subResource === 'beban') {
                const ket = body?.keterangan || 'Operasional';
                const nominal = body?.nominal || response?.total || 0;
                return {
                    module: 'KEUANGAN',
                    action: 'PENGELUARAN_BEBAN',
                    description: `Mencatat pengeluaran beban: ${ket} senilai Rp ${fmtRp(nominal)}`,
                    details: { keterangan: ket, nominal: Number(nominal) },
                };
            }
            if (subResource === 'pendapatan-lain') {
                const ket = body?.keterangan || 'Pendapatan Lain';
                const nominal = body?.nominal || response?.total || 0;
                return {
                    module: 'KEUANGAN',
                    action: 'PENDAPATAN_LAIN',
                    description: `Mencatat pendapatan lain: ${ket} senilai Rp ${fmtRp(nominal)}`,
                    details: { keterangan: ket, nominal: Number(nominal) },
                };
            }
            if (subResource === 'kas-mutasi') {
                const tipe = body?.type || 'MUTASI';
                const ket = body?.keterangan || 'Arus Kas';
                const nominal = body?.nominal || 0;
                return {
                    module: 'KEUANGAN',
                    action: `KAS_${tipe}`,
                    description: `Mencatat transaksi kas [${tipe}]: ${ket} senilai Rp ${fmtRp(nominal)}`,
                    details: { type: tipe, keterangan: ket, nominal: Number(nominal) },
                };
            }
            if (method === 'PUT' && segments[1]) {
                return {
                    module: 'TRANSAKSI',
                    action: 'UPDATE_TRANSAKSI',
                    description: `Memperbarui transaksi #${segments[1]} (${body?.keterangan || 'Update'})`,
                    details: safeBody,
                };
            }
            if (method === 'DELETE' && segments[1]) {
                return {
                    module: 'TRANSAKSI',
                    action: 'BATAL_TRANSAKSI',
                    description: `Membatalkan / menghapus transaksi #${segments[1]}`,
                    details: { id: segments[1] },
                };
            }
            const inv = response?.invoice || body?.invoice || body?.type || 'Transaksi';
            const tot = response?.total || body?.total || 0;
            return {
                module: 'TRANSAKSI',
                action: `TRANSAKSI_${body?.type || method}`,
                description: `Mencatat transaksi ${body?.type || ''} (${inv}) senilai Rp ${fmtRp(tot)}`,
                details: safeBody,
            };
        }
        if (mainResource === 'inventory') {
            const sub = segments[1] || '';
            if (sub === 'opname') {
                const opnNum = response?.nomorOpname || body?.nomorOpname || 'OPN';
                return {
                    module: 'INVENTORY',
                    action: 'STOK_OPNAME',
                    description: `Mencatat stok opname fisik (${opnNum})`,
                    details: safeBody,
                };
            }
            return {
                module: 'INVENTORY',
                action: `${method}_INVENTORY`,
                description: `Pembaruan inventory pada ${cleanUrl}`,
                details: safeBody,
            };
        }
        if (mainResource === 'master') {
            const entity = segments[1] || 'DATA';
            const entityName = entity === 'barangs'
                ? 'Barang'
                : entity === 'clients'
                    ? 'Mitra / Client'
                    : entity === 'kategoris'
                        ? 'Kategori Akun'
                        : entity === 'detail-kategoris'
                            ? 'Detail Kategori'
                            : entity;
            const actPrefix = method === 'POST' ? 'TAMBAH' : method === 'PUT' ? 'UPDATE' : 'HAPUS';
            const targetLabel = body?.name || body?.code || (segments[2] ? `#${segments[2]}` : '');
            return {
                module: 'MASTER',
                action: `${actPrefix}_${entity.toUpperCase()}`,
                description: `${actPrefix === 'TAMBAH' ? 'Menambahkan' : actPrefix === 'UPDATE' ? 'Memperbarui' : 'Menghapus'} master ${entityName}: ${targetLabel}`.trim(),
                details: safeBody,
            };
        }
        if (mainResource === 'users') {
            const act = method === 'POST' ? 'TAMBAH_USER' : method === 'PUT' ? 'UPDATE_USER' : 'HAPUS_USER';
            const uName = body?.name || body?.username || (segments[1] ? `#${segments[1]}` : '');
            return {
                module: 'USERS',
                action: act,
                description: `${act === 'TAMBAH_USER' ? 'Membuat akun pengguna' : act === 'UPDATE_USER' ? 'Memperbarui akun pengguna' : 'Menghapus akun pengguna'}: ${uName}`,
                details: safeBody,
            };
        }
        if (mainResource === 'roles') {
            if (segments[2] === 'permissions') {
                return {
                    module: 'USERS',
                    action: 'UPDATE_HAK_AKSES',
                    description: `Mengonfigurasi ulang hak akses modul untuk role #${segments[1]}`,
                    details: safeBody,
                };
            }
            const act = method === 'POST' ? 'TAMBAH_ROLE' : method === 'PUT' ? 'UPDATE_ROLE' : 'HAPUS_ROLE';
            return {
                module: 'USERS',
                action: act,
                description: `${act === 'TAMBAH_ROLE' ? 'Menambah peran jabatan baru' : 'Memperbarui peran jabatan'}: ${body?.name || segments[1] || ''}`,
                details: safeBody,
            };
        }
        return {
            module: mainResource.toUpperCase(),
            action: `${method}_${mainResource.toUpperCase()}`,
            description: `Tindakan ${method} pada layanan /${cleanUrl}`,
            details: safeBody,
        };
    }
};
AuditLogInterceptor = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], AuditLogInterceptor);
export { AuditLogInterceptor };
//# sourceMappingURL=audit-log.interceptor.js.map