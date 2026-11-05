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
import { InventoryService, CreateOpnameDto, CreateKonversiDto, CreatePenyesuaianNonJurnalDto, RollbackOpnameDto, } from './inventory.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
let InventoryController = class InventoryController {
    inventoryService;
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    async getStockSummary(jenisId, jenisIds, search, page, limit) {
        const parsedJenisIds = jenisIds
            ? jenisIds
                .split(',')
                .map((id) => Number(id.trim()))
                .filter((n) => !isNaN(n) && n > 0)
            : undefined;
        return this.inventoryService.getStockSummary({
            jenisId: jenisId ? Number(jenisId) : undefined,
            jenisIds: parsedJenisIds,
            search,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }
    async getBatches(barangId) {
        return this.inventoryService.getBatches(barangId ? Number(barangId) : undefined);
    }
    async findAllOpname(jenisOpname, barangId, startDate, endDate, search, page, limit) {
        return this.inventoryService.findAllOpname({
            jenisOpname,
            barangId: barangId ? Number(barangId) : undefined,
            startDate,
            endDate,
            search,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }
    async createOpname(dto, userId) {
        return this.inventoryService.createOpname(dto, Number(userId) || 1);
    }
    async updateOpname(id, dto, userId) {
        return this.inventoryService.updateOpname(Number(id), dto, Number(userId) || 1);
    }
    async deleteOpname(id) {
        return this.inventoryService.deleteOpname(Number(id));
    }
    async createPenyesuaianNonJurnal(dto, userId) {
        return this.inventoryService.createPenyesuaianNonJurnal(dto, Number(userId) || 1);
    }
    async rollbackOpname(id, dto, userId) {
        return this.inventoryService.rollbackOpname(Number(id), dto?.revertStock ?? false, Number(userId) || 1);
    }
    async findAllKonversi(startDate, endDate, search, page, limit) {
        return this.inventoryService.findAllKonversi({
            startDate,
            endDate,
            search,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }
    async createKonversi(dto, userId) {
        return this.inventoryService.createKonversi(dto, Number(userId) || 1);
    }
    async updateKonversi(id, dto, userId) {
        return this.inventoryService.updateKonversi(Number(id), dto, Number(userId) || 1);
    }
    async deleteKonversi(id, userId) {
        return this.inventoryService.deleteKonversi(Number(id), Number(userId) || 1);
    }
};
__decorate([
    Get('summary'),
    __param(0, Query('jenisId')),
    __param(1, Query('jenisIds')),
    __param(2, Query('search')),
    __param(3, Query('page')),
    __param(4, Query('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getStockSummary", null);
__decorate([
    Get('batches'),
    __param(0, Query('barangId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getBatches", null);
__decorate([
    Get('opname'),
    __param(0, Query('jenisOpname')),
    __param(1, Query('barangId')),
    __param(2, Query('startDate')),
    __param(3, Query('endDate')),
    __param(4, Query('search')),
    __param(5, Query('page')),
    __param(6, Query('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "findAllOpname", null);
__decorate([
    Post('opname'),
    __param(0, Body()),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateOpnameDto, Number]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "createOpname", null);
__decorate([
    Put('opname/:id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __param(2, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Number]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "updateOpname", null);
__decorate([
    Delete('opname/:id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "deleteOpname", null);
__decorate([
    Post('penyesuaian-non-jurnal'),
    __param(0, Body()),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreatePenyesuaianNonJurnalDto, Number]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "createPenyesuaianNonJurnal", null);
__decorate([
    Post('opname/:id/rollback'),
    __param(0, Param('id')),
    __param(1, Body()),
    __param(2, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RollbackOpnameDto, Number]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "rollbackOpname", null);
__decorate([
    Get('konversi'),
    __param(0, Query('startDate')),
    __param(1, Query('endDate')),
    __param(2, Query('search')),
    __param(3, Query('page')),
    __param(4, Query('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "findAllKonversi", null);
__decorate([
    Post('konversi'),
    __param(0, Body()),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateKonversiDto, Number]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "createKonversi", null);
__decorate([
    Put('konversi/:id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __param(2, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Number]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "updateKonversi", null);
__decorate([
    Delete('konversi/:id'),
    __param(0, Param('id')),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "deleteKonversi", null);
InventoryController = __decorate([
    UseGuards(JwtAuthGuard),
    Controller('inventory'),
    __metadata("design:paramtypes", [InventoryService])
], InventoryController);
export { InventoryController };
//# sourceMappingURL=inventory.controller.js.map