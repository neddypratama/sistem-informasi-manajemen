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
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TransaksiService } from './transaksi.service.js';
import { CreateTransaksiDto } from './dto/create-transaksi.dto.js';
import { QueryTransaksiDto } from './dto/query-transaksi.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
let TransaksiController = class TransaksiController {
    transaksiService;
    constructor(transaksiService) {
        this.transaksiService = transaksiService;
    }
    async findAll(query) {
        return this.transaksiService.findAll(query);
    }
    async getClientLedger(clientId) {
        return this.transaksiService.getClientLedger(Number(clientId));
    }
    async getCurahSummary(startDate, endDate) {
        return this.transaksiService.getCurahSummary(startDate, endDate);
    }
    async findOne(id) {
        return this.transaksiService.findOne(Number(id));
    }
    async createPenjualan(createDto, userId) {
        return this.transaksiService.createPenjualan(createDto, userId || 1);
    }
    async createPembelian(createDto, userId) {
        return this.transaksiService.createPembelian(createDto, userId || 1);
    }
    async createReturPenjualan(createDto, userId) {
        return this.transaksiService.createReturPenjualan(createDto, userId || 1);
    }
    async createReturPembelian(createDto, userId) {
        return this.transaksiService.createReturPembelian(createDto, userId || 1);
    }
    async createBeban(body, userId) {
        return this.transaksiService.createBeban(body, userId || 1);
    }
    async createPendapatanLain(body, userId) {
        return this.transaksiService.createPendapatanLain(body, userId || 1);
    }
    async createHutang(body, userId) {
        return this.transaksiService.createHutangMutasi(body, userId || 1);
    }
    async createPiutang(body, userId) {
        return this.transaksiService.createPiutangMutasi(body, userId || 1);
    }
    async createKasMutasi(body, userId) {
        return this.transaksiService.createKasMutasi(body, userId || 1);
    }
    async update(id, body, userId) {
        return this.transaksiService.update(Number(id), body, userId || 1);
    }
    async remove(id) {
        return this.transaksiService.remove(Number(id));
    }
};
__decorate([
    Get(),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [QueryTransaksiDto]),
    __metadata("design:returntype", Promise)
], TransaksiController.prototype, "findAll", null);
__decorate([
    Get('client-ledger/:clientId'),
    __param(0, Param('clientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TransaksiController.prototype, "getClientLedger", null);
__decorate([
    Get('curah/summary'),
    __param(0, Query('startDate')),
    __param(1, Query('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TransaksiController.prototype, "getCurahSummary", null);
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TransaksiController.prototype, "findOne", null);
__decorate([
    Post('penjualan'),
    __param(0, Body()),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateTransaksiDto, Number]),
    __metadata("design:returntype", Promise)
], TransaksiController.prototype, "createPenjualan", null);
__decorate([
    Post('pembelian'),
    __param(0, Body()),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateTransaksiDto, Number]),
    __metadata("design:returntype", Promise)
], TransaksiController.prototype, "createPembelian", null);
__decorate([
    Post('retur-penjualan'),
    __param(0, Body()),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateTransaksiDto, Number]),
    __metadata("design:returntype", Promise)
], TransaksiController.prototype, "createReturPenjualan", null);
__decorate([
    Post('retur-pembelian'),
    __param(0, Body()),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateTransaksiDto, Number]),
    __metadata("design:returntype", Promise)
], TransaksiController.prototype, "createReturPembelian", null);
__decorate([
    Post('beban'),
    __param(0, Body()),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], TransaksiController.prototype, "createBeban", null);
__decorate([
    Post('pendapatan-lain'),
    __param(0, Body()),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], TransaksiController.prototype, "createPendapatanLain", null);
__decorate([
    Post('hutang'),
    __param(0, Body()),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], TransaksiController.prototype, "createHutang", null);
__decorate([
    Post('piutang'),
    __param(0, Body()),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], TransaksiController.prototype, "createPiutang", null);
__decorate([
    Post('kas-mutasi'),
    __param(0, Body()),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], TransaksiController.prototype, "createKasMutasi", null);
__decorate([
    Put(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __param(2, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Number]),
    __metadata("design:returntype", Promise)
], TransaksiController.prototype, "update", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TransaksiController.prototype, "remove", null);
TransaksiController = __decorate([
    UseGuards(JwtAuthGuard),
    Controller('transaksi'),
    __metadata("design:paramtypes", [TransaksiService])
], TransaksiController);
export { TransaksiController };
//# sourceMappingURL=transaksi.controller.js.map