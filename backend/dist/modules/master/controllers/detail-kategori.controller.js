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
import { DetailKategoriService } from '../services/detail-kategori.service.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
let DetailKategoriController = class DetailKategoriController {
    detailKategoriService;
    constructor(detailKategoriService) {
        this.detailKategoriService = detailKategoriService;
    }
    async findAll(type) {
        return this.detailKategoriService.findAll(type);
    }
    async findOne(id) {
        return this.detailKategoriService.findOne(Number(id));
    }
    async create(body) {
        return this.detailKategoriService.create(body);
    }
    async update(id, body) {
        return this.detailKategoriService.update(Number(id), body);
    }
    async remove(id) {
        return this.detailKategoriService.remove(Number(id));
    }
};
__decorate([
    Get(),
    __param(0, Query('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DetailKategoriController.prototype, "findAll", null);
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DetailKategoriController.prototype, "findOne", null);
__decorate([
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DetailKategoriController.prototype, "create", null);
__decorate([
    Put(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DetailKategoriController.prototype, "update", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DetailKategoriController.prototype, "remove", null);
DetailKategoriController = __decorate([
    UseGuards(JwtAuthGuard),
    Controller('master/detail-kategoris'),
    __metadata("design:paramtypes", [DetailKategoriService])
], DetailKategoriController);
export { DetailKategoriController };
//# sourceMappingURL=detail-kategori.controller.js.map