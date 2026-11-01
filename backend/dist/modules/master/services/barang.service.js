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
let BarangService = class BarangService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const page = Math.max(1, Number(query.page || 1));
        const limit = Math.min(2000, Math.max(1, Number(query.limit || 25)));
        const skip = (page - 1) * limit;
        const where = { isActive: true };
        if (query.jenisId) {
            where.jenisId = BigInt(query.jenisId);
        }
        if (query.search) {
            where.OR = [
                { name: { contains: query.search } },
                { code: { contains: query.search } },
            ];
        }
        const [items, total] = await Promise.all([
            this.prisma.barang.findMany({
                where,
                include: {
                    jenis: true,
                    satuan: true,
                },
                orderBy: { name: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.barang.count({ where }),
        ]);
        return {
            items,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id) {
        const barang = await this.prisma.barang.findUnique({
            where: { id: BigInt(id) },
            include: {
                jenis: true,
                satuan: true,
            },
        });
        if (!barang) {
            throw new NotFoundException(`Barang dengan ID ${id} tidak ditemukan.`);
        }
        return barang;
    }
    async getJenisBarang() {
        return this.prisma.jenisBarang.findMany({
            orderBy: { id: 'asc' },
        });
    }
    async getSatuans() {
        return this.prisma.satuan.findMany({
            orderBy: { name: 'asc' },
        });
    }
    async create(data) {
        const code = data.code || `BRG-${Date.now().toString().slice(-6)}`;
        return this.prisma.barang.create({
            data: {
                name: data.name,
                code,
                jenisId: BigInt(data.jenisId),
                satuanId: data.satuanId ? BigInt(data.satuanId) : null,
                stokMinimum: data.stokMinimum || 0,
                isActive: true,
            },
            include: { jenis: true, satuan: true },
        });
    }
    async update(id, data) {
        await this.findOne(id);
        return this.prisma.barang.update({
            where: { id: BigInt(id) },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.code && { code: data.code }),
                ...(data.jenisId && { jenisId: BigInt(data.jenisId) }),
                ...(data.satuanId !== undefined && { satuanId: data.satuanId ? BigInt(data.satuanId) : null }),
                ...(data.stokMinimum !== undefined && { stokMinimum: data.stokMinimum }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
            include: { jenis: true, satuan: true },
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.barang.update({
            where: { id: BigInt(id) },
            data: { isActive: false },
        });
    }
};
BarangService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], BarangService);
export { BarangService };
//# sourceMappingURL=barang.service.js.map