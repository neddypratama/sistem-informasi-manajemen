var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
let DetailKategoriService = class DetailKategoriService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(type) {
        const where = {};
        if (type) {
            where.type = type;
        }
        return this.prisma.detailKategori.findMany({
            where,
            include: {
                _count: {
                    select: { kategoris: true },
                },
            },
            orderBy: { id: 'asc' },
        });
    }
    async findOne(id) {
        const item = await this.prisma.detailKategori.findUnique({
            where: { id: BigInt(id) },
            include: {
                kategoris: true,
            },
        });
        if (!item) {
            throw new NotFoundException(`Detail Kategori #${id} tidak ditemukan`);
        }
        return item;
    }
    async create(data) {
        return this.prisma.detailKategori.create({
            data: {
                name: data.name,
                type: data.type,
                deskripsi: data.deskripsi || null,
                isActive: true,
            },
        });
    }
    async update(id, data) {
        await this.findOne(id);
        return this.prisma.detailKategori.update({
            where: { id: BigInt(id) },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.type && { type: data.type }),
                ...(data.deskripsi !== undefined && { deskripsi: data.deskripsi }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.detailKategori.update({
            where: { id: BigInt(id) },
            data: { isActive: false },
        });
    }
};
DetailKategoriService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], DetailKategoriService);
export { DetailKategoriService };
//# sourceMappingURL=detail-kategori.service.js.map