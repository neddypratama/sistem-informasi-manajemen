var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
let ReportsController = class ReportsController {
    reportsService;
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    async getLabaRugi(startDate, endDate) {
        const today = new Date().toISOString().slice(0, 10);
        const start = startDate || '2026-01-01';
        const end = endDate || today;
        return this.reportsService.getLabaRugi(start, end);
    }
    async getLabaRugiCurah(startDate, endDate) {
        const today = new Date().toISOString().slice(0, 10);
        const start = startDate || '2026-01-01';
        const end = endDate || today;
        return this.reportsService.getLabaRugiCurah(start, end);
    }
    async getBonTitipan(search, type) {
        return this.reportsService.getBonTitipan(search, type);
    }
    async getNeracaSaldo(startDate, endDate) {
        return this.reportsService.getNeracaSaldo(startDate, endDate);
    }
    async getLaporanAset(startDate, endDate) {
        return this.reportsService.getLaporanAset(startDate, endDate);
    }
    async getNeraca(startDate, endDate) {
        return this.reportsService.getLaporanAset(startDate, endDate);
    }
    async getLaporanKas(startDate, endDate, search, kasAccountId, type, limit) {
        const today = new Date().toISOString().slice(0, 10);
        const start = startDate || today;
        const end = endDate || today;
        return this.reportsService.getLaporanKas(start, end, search, kasAccountId ? Number(kasAccountId) : undefined, type, limit ? Number(limit) : 200);
    }
    async getJurnalUmum(page, limit, search, startDate, endDate) {
        return this.reportsService.getJurnalUmum({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            search,
            startDate,
            endDate,
        });
    }
    async getDashboardAnalytics() {
        return this.reportsService.getDashboardAnalytics();
    }
};
__decorate([
    Get('laba-rugi'),
    __param(0, Query('startDate')),
    __param(1, Query('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getLabaRugi", null);
__decorate([
    Get('laba-rugi/curah'),
    __param(0, Query('startDate')),
    __param(1, Query('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getLabaRugiCurah", null);
__decorate([
    Get('bon-titipan'),
    __param(0, Query('search')),
    __param(1, Query('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getBonTitipan", null);
__decorate([
    Get('neraca-saldo'),
    __param(0, Query('startDate')),
    __param(1, Query('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getNeracaSaldo", null);
__decorate([
    Get('aset'),
    __param(0, Query('startDate')),
    __param(1, Query('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getLaporanAset", null);
__decorate([
    Get('neraca'),
    __param(0, Query('startDate')),
    __param(1, Query('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getNeraca", null);
__decorate([
    Get('laporan-kas'),
    __param(0, Query('startDate')),
    __param(1, Query('endDate')),
    __param(2, Query('search')),
    __param(3, Query('kasAccountId')),
    __param(4, Query('type')),
    __param(5, Query('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getLaporanKas", null);
__decorate([
    Get('jurnal-umum'),
    __param(0, Query('page')),
    __param(1, Query('limit')),
    __param(2, Query('search')),
    __param(3, Query('startDate')),
    __param(4, Query('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getJurnalUmum", null);
__decorate([
    Get('dashboard-analytics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getDashboardAnalytics", null);
ReportsController = __decorate([
    UseGuards(JwtAuthGuard),
    Controller('reports'),
    __metadata("design:paramtypes", [ReportsService])
], ReportsController);
export { ReportsController };
//# sourceMappingURL=reports.controller.js.map