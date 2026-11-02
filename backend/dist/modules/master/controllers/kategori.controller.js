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
import { KategoriService } from '../services/kategori.service.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
let KategoriController = class KategoriController {
    kategoriService;
    constructor(kategoriService) {
        this.kategoriService = kategoriService;
    }
    async findAll(detailKategoriId, type, search, status) {
        return this.kategoriService.findAll({
            detailKategoriId: detailKategoriId ? Number(detailKategoriId) : undefined,
            type,
            search,
            status,
        });
    }
    async findOne(id) {
        return this.kategoriService.findOne(Number(id));
    }
    async create(body) {
        return this.kategoriService.create(body);
    }
    async update(id, body) {
        return this.kategoriService.update(Number(id), body);
    }
    async remove(id) {
        return this.kategoriService.remove(Number(id));
    }
};
__decorate([
    Get(),
    __param(0, Query('detailKategoriId')),
    __param(1, Query('type')),
    __param(2, Query('search')),
    __param(3, Query('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], KategoriController.prototype, "findAll", null);
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KategoriController.prototype, "findOne", null);
__decorate([
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], KategoriController.prototype, "create", null);
__decorate([
    Put(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], KategoriController.prototype, "update", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KategoriController.prototype, "remove", null);
KategoriController = __decorate([
    UseGuards(JwtAuthGuard),
    Controller('master/kategoris'),
    __metadata("design:paramtypes", [KategoriService])
], KategoriController);
export { KategoriController };
//# sourceMappingURL=kategori.controller.js.map