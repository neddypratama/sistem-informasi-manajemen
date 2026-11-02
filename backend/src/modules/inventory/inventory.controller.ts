import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InventoryService, CreateOpnameDto, CreateKonversiDto } from './inventory.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('summary')
  async getStockSummary(@Query('jenisId') jenisId?: string) {
    return this.inventoryService.getStockSummary(jenisId ? Number(jenisId) : undefined);
  }

  @Get('batches')
  async getBatches(@Query('barangId') barangId?: string) {
    return this.inventoryService.getBatches(barangId ? Number(barangId) : undefined);
  }

  @Get('opname')
  async findAllOpname(
    @Query('jenisOpname') jenisOpname?: string,
    @Query('barangId') barangId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.findAllOpname({
      jenisOpname,
      barangId: barangId ? Number(barangId) : undefined,
      startDate,
      endDate,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('opname')
  async createOpname(
    @Body() dto: CreateOpnameDto,
    @CurrentUser('id') userId?: number,
  ) {
    return this.inventoryService.createOpname(dto, Number(userId) || 1);
  }

  @Put('opname/:id')
  async updateOpname(
    @Param('id') id: string,
    @Body() dto: Partial<CreateOpnameDto>,
    @CurrentUser('id') userId?: number,
  ) {
    return this.inventoryService.updateOpname(Number(id), dto, Number(userId) || 1);
  }

  @Delete('opname/:id')
  async deleteOpname(@Param('id') id: string) {
    return this.inventoryService.deleteOpname(Number(id));
  }

  // ==========================================
  // KONVERSI & REPROSES BARANG
  // ==========================================
  @Get('konversi')
  async findAllKonversi(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.findAllKonversi({
      startDate,
      endDate,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('konversi')
  async createKonversi(
    @Body() dto: CreateKonversiDto,
    @CurrentUser('id') userId?: number,
  ) {
    return this.inventoryService.createKonversi(dto, Number(userId) || 1);
  }

  @Put('konversi/:id')
  async updateKonversi(
    @Param('id') id: string,
    @Body() dto: Partial<CreateKonversiDto>,
    @CurrentUser('id') userId?: number,
  ) {
    return this.inventoryService.updateKonversi(Number(id), dto, Number(userId) || 1);
  }

  @Delete('konversi/:id')
  async deleteKonversi(
    @Param('id') id: string,
    @CurrentUser('id') userId?: number,
  ) {
    return this.inventoryService.deleteKonversi(Number(id), Number(userId) || 1);
  }
}
