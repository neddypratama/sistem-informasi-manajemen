import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class DetailKategoriService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(type?: string) {
    const where: any = {};
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

  async findOne(id: number) {
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

  async create(data: { name: string; type: string; deskripsi?: string }) {
    return this.prisma.detailKategori.create({
      data: {
        name: data.name,
        type: data.type,
        deskripsi: data.deskripsi || null,
        isActive: true,
      },
    });
  }

  async update(id: number, data: { name?: string; type?: string; deskripsi?: string; isActive?: boolean }) {
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

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.detailKategori.update({
      where: { id: BigInt(id) },
      data: { isActive: false },
    });
  }
}
