import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DetailKategoriService } from '../services/detail-kategori.service.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('master/detail-kategoris')
export class DetailKategoriController {
  constructor(private readonly detailKategoriService: DetailKategoriService) {}

  @Get()
  async findAll(@Query('type') type?: string) {
    return this.detailKategoriService.findAll(type);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.detailKategoriService.findOne(Number(id));
  }

  @Post()
  async create(@Body() body: { name: string; type: string; deskripsi?: string }) {
    return this.detailKategoriService.create(body);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; type?: string; deskripsi?: string; isActive?: boolean },
  ) {
    return this.detailKategoriService.update(Number(id), body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.detailKategoriService.remove(Number(id));
  }
}
