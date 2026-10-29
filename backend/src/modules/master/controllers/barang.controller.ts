import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BarangService } from '../services/barang.service.js';
import { QueryBarangDto } from '../dto/query-barang.dto.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('master/barangs')
export class BarangController {
  constructor(private readonly barangService: BarangService) {}

  @Get()
  async findAll(@Query() query: QueryBarangDto) {
    return this.barangService.findAll(query);
  }

  @Get('jenis')
  async getJenisBarang() {
    return this.barangService.getJenisBarang();
  }

  @Get('satuans')
  async getSatuans() {
    return this.barangService.getSatuans();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.barangService.findOne(Number(id));
  }

  @Post()
  async create(
    @Body() body: { name: string; jenisId: number; satuanId?: number; code?: string; stokMinimum?: number },
  ) {
    return this.barangService.create(body);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: { name?: string; jenisId?: number; satuanId?: number; code?: string; stokMinimum?: number; isActive?: boolean },
  ) {
    return this.barangService.update(Number(id), body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.barangService.remove(Number(id));
  }
}
