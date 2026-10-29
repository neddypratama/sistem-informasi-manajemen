import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class KategoriService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: { detailKategoriId?: number; type?: string; search?: string }) {
    const where: any = {};

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

  async findOne(id: number) {
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

  async create(data: { name: string; detailKategoriId: number; code?: string; deskripsi?: string }) {
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

  async update(
    id: number,
    data: { name?: string; detailKategoriId?: number; code?: string; deskripsi?: string; isActive?: boolean },
  ) {
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

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.kategori.update({
      where: { id: BigInt(id) },
      data: { isActive: false },
    });
  }
}
