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
let KategoriService = class KategoriService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const where = {};
        if (query?.status === 'aktif') {
            where.isActive = true;
        }
        else if (query?.status === 'dihapus') {
            where.isActive = false;
        }
        if (query?.detailKategoriId) {
            where.detailKategoriId = BigInt(query.detailKategoriId);
        }
        if (query?.type) {
            where.detailKategori = {
                type: query.type,
            };
        }
        if (query?.search) {
            where.name = {
                contains: query.search,
            };
        }
        return this.prisma.kategori.findMany({
            where,
            include: {
                detailKategori: true,
            },
            orderBy: { id: 'asc' },
        });
    }
    async findOne(id) {
        const item = await this.prisma.kategori.findUnique({
            where: { id: BigInt(id) },
            include: {
                detailKategori: true,
            },
        });
        if (!item) {
            throw new NotFoundException(`Kategori #${id} tidak ditemukan`);
        }
        return item;
    }
    async create(data) {
        return this.prisma.kategori.create({
            data: {
                name: data.name,
                detailKategoriId: BigInt(data.detailKategoriId),
                code: data.code || null,
                deskripsi: data.deskripsi || null,
                isActive: true,
            },
            include: {
                detailKategori: true,
            },
        });
    }
    async update(id, data) {
        await this.findOne(id);
        return this.prisma.kategori.update({
            where: { id: BigInt(id) },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.detailKategoriId && { detailKategoriId: BigInt(data.detailKategoriId) }),
                ...(data.code !== undefined && { code: data.code }),
                ...(data.deskripsi !== undefined && { deskripsi: data.deskripsi }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
            include: {
                detailKategori: true,
            },
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.kategori.update({
            where: { id: BigInt(id) },
            data: { isActive: false },
        });
    }
};
KategoriService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], KategoriService);
export { KategoriService };
//# sourceMappingURL=kategori.service.js.map