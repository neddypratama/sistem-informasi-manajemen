import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('laba-rugi')
  async getLabaRugi(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    const start = startDate || '2026-01-01';
    const end = endDate || today;
    return this.reportsService.getLabaRugi(start, end);
  }

  @Get('laba-rugi/curah')
  async getLabaRugiCurah(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    const start = startDate || '2026-01-01';
    const end = endDate || today;
    return this.reportsService.getLabaRugiCurah(start, end);
  }

  @Get('bon-titipan')
  async getBonTitipan(
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    return this.reportsService.getBonTitipan(search, type);
  }

  @Get('neraca-saldo')
  async getNeracaSaldo(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getNeracaSaldo(startDate, endDate);
  }

  @Get('aset')
  async getLaporanAset(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getLaporanAset(startDate, endDate);
  }

  @Get('neraca')
  async getNeraca(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getLaporanAset(startDate, endDate);
  }

  @Get('laporan-kas')
  async getLaporanKas(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('kasAccountId') kasAccountId?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    const start = startDate || today;
    const end = endDate || today;
    return this.reportsService.getLaporanKas(
      start,
      end,
      search,
      kasAccountId ? Number(kasAccountId) : undefined,
      type,
      limit ? Number(limit) : 200,
    );
  }

  @Get('jurnal-umum')
  async getJurnalUmum(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getJurnalUmum({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      startDate,
      endDate,
    });
  }

  @Get('dashboard-analytics')
  async getDashboardAnalytics() {
    return this.reportsService.getDashboardAnalytics();
  }
}
