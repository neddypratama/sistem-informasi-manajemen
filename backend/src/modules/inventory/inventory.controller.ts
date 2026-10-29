import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { InventoryService, CreateOpnameDto } from './inventory.service.js';
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
}
