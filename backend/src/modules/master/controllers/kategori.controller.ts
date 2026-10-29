import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { KategoriService } from '../services/kategori.service.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('master/kategoris')
export class KategoriController {
  constructor(private readonly kategoriService: KategoriService) {}

  @Get()
  async findAll(
    @Query('detailKategoriId') detailKategoriId?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.kategoriService.findAll({
      detailKategoriId: detailKategoriId ? Number(detailKategoriId) : undefined,
      type,
      search,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.kategoriService.findOne(Number(id));
  }

  @Post()
  async create(
    @Body() body: { name: string; detailKategoriId: number; code?: string; deskripsi?: string },
  ) {
    return this.kategoriService.create(body);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: { name?: string; detailKategoriId?: number; code?: string; deskripsi?: string; isActive?: boolean },
  ) {
    return this.kategoriService.update(Number(id), body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.kategoriService.remove(Number(id));
  }
}
