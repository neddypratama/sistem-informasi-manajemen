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
let ClientService = class ClientService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const page = Math.max(1, Number(query.page || 1));
        const limit = Math.min(10000, Math.max(1, Number(query.limit || 25)));
        const skip = (page - 1) * limit;
        const andConditions = [];
        if (query.type) {
            andConditions.push({ type: query.type });
        }
        if (query.search) {
            andConditions.push({
                OR: [
                    { name: { contains: query.search } },
                    { code: { contains: query.search } },
                    { alamat: { contains: query.search } },
                ],
            });
        }
        if (query.status === 'nonaktif') {
            andConditions.push({ keterangan: { contains: '[NONAKTIF]' } });
        }
        else if (query.status === 'aktif') {
            andConditions.push({
                OR: [
                    { keterangan: null },
                    { keterangan: { not: { contains: '[NONAKTIF]' } } },
                ],
            });
        }
        const where = andConditions.length > 0 ? { AND: andConditions } : {};
        const [items, total] = await Promise.all([
            this.prisma.client.findMany({
                where,
                orderBy: { name: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.client.count({ where }),
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
        const client = await this.prisma.client.findUnique({
            where: { id: BigInt(id) },
        });
        if (!client) {
            throw new NotFoundException(`Client dengan ID ${id} tidak ditemukan.`);
        }
        return client;
    }
    async create(data) {
        const code = data.code || `CLI-${Date.now().toString().slice(-4)}`;
        return this.prisma.client.create({
            data: {
                name: data.name,
                type: data.type || 'Peternak',
                phone: data.phone || null,
                alamat: data.alamat || null,
                keterangan: data.keterangan || null,
                code,
                saldoPiutang: 0,
                saldoHutang: 0,
            },
        });
    }
    async update(id, data) {
        await this.findOne(id);
        return this.prisma.client.update({
            where: { id: BigInt(id) },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.type && { type: data.type }),
                ...(data.phone !== undefined && { phone: data.phone }),
                ...(data.alamat !== undefined && { alamat: data.alamat }),
                ...(data.keterangan !== undefined && { keterangan: data.keterangan }),
                ...(data.code && { code: data.code }),
            },
        });
    }
    async remove(id) {
        const client = await this.findOne(id);
        const txCount = await this.prisma.transaksi.count({
            where: { clientId: BigInt(id) },
        });
        if (txCount > 0) {
            return this.prisma.client.update({
                where: { id: BigInt(id) },
                data: { keterangan: `[NONAKTIF] ${client.keterangan || ''}`.trim() },
            });
        }
        return this.prisma.client.delete({
            where: { id: BigInt(id) },
        });
    }
};
ClientService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], ClientService);
export { ClientService };
//# sourceMappingURL=client.service.js.map