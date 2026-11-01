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
import { BarangService } from '../services/barang.service.js';
import { QueryBarangDto } from '../dto/query-barang.dto.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
let BarangController = class BarangController {
    barangService;
    constructor(barangService) {
        this.barangService = barangService;
    }
    async findAll(query) {
        return this.barangService.findAll(query);
    }
    async getJenisBarang() {
        return this.barangService.getJenisBarang();
    }
    async getSatuans() {
        return this.barangService.getSatuans();
    }
    async findOne(id) {
        return this.barangService.findOne(Number(id));
    }
    async create(body) {
        return this.barangService.create(body);
    }
    async update(id, body) {
        return this.barangService.update(Number(id), body);
    }
    async remove(id) {
        return this.barangService.remove(Number(id));
    }
};
__decorate([
    Get(),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [QueryBarangDto]),
    __metadata("design:returntype", Promise)
], BarangController.prototype, "findAll", null);
__decorate([
    Get('jenis'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BarangController.prototype, "getJenisBarang", null);
__decorate([
    Get('satuans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BarangController.prototype, "getSatuans", null);
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BarangController.prototype, "findOne", null);
__decorate([
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BarangController.prototype, "create", null);
__decorate([
    Put(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BarangController.prototype, "update", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BarangController.prototype, "remove", null);
BarangController = __decorate([
    UseGuards(JwtAuthGuard),
    Controller('master/barangs'),
    __metadata("design:paramtypes", [BarangService])
], BarangController);
export { BarangController };
//# sourceMappingURL=barang.controller.js.map