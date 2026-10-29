import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { QueryClientDto } from '../dto/query-client.dto.js';

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryClientDto) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(2000, Math.max(1, Number(query.limit || 25)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { code: { contains: query.search } },
        { alamat: { contains: query.search } },
      ];
    }

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

  async findOne(id: number) {
    const client = await this.prisma.client.findUnique({
      where: { id: BigInt(id) },
    });

    if (!client) {
      throw new NotFoundException(`Client dengan ID ${id} tidak ditemukan.`);
    }

    return client;
  }

  async create(data: { name: string; type: any; phone?: string; alamat?: string; keterangan?: string; code?: string }) {
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

  async update(
    id: number,
    data: { name?: string; type?: any; phone?: string; alamat?: string; keterangan?: string; code?: string },
  ) {
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

  async remove(id: number) {
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
}
