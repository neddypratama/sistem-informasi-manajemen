import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TransaksiService } from './transaksi.service.js';
import { CreateTransaksiDto } from './dto/create-transaksi.dto.js';
import { QueryTransaksiDto } from './dto/query-transaksi.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard)
@Controller('transaksi')
export class TransaksiController {
  constructor(private readonly transaksiService: TransaksiService) {}

  @Get()
  async findAll(@Query() query: QueryTransaksiDto) {
    return this.transaksiService.findAll(query);
  }

  @Get('client-ledger/:clientId')
  async getClientLedger(@Param('clientId') clientId: string) {
    return this.transaksiService.getClientLedger(Number(clientId));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.transaksiService.findOne(Number(id));
  }

  @Post('penjualan')
  async createPenjualan(
    @Body() createDto: CreateTransaksiDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.transaksiService.createPenjualan(createDto, userId || 1);
  }

  @Post('pembelian')
  async createPembelian(
    @Body() createDto: CreateTransaksiDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.transaksiService.createPembelian(createDto, userId || 1);
  }

  @Post('retur-penjualan')
  async createReturPenjualan(
    @Body() createDto: CreateTransaksiDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.transaksiService.createReturPenjualan(createDto, userId || 1);
  }

  @Post('retur-pembelian')
  async createReturPembelian(
    @Body() createDto: CreateTransaksiDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.transaksiService.createReturPembelian(createDto, userId || 1);
  }

  @Post('beban')
  async createBeban(
    @Body()
    body: {
      kategoriId: number;
      nominal: number;
      keterangan?: string;
      tanggal?: string;
      kasBankKategoriId?: number;
      type?: 'Debit' | 'Kredit';
    },
    @CurrentUser('id') userId: number,
  ) {
    return this.transaksiService.createBeban(body, userId || 1);
  }

  @Post('pendapatan-lain')
  async createPendapatanLain(
    @Body()
    body: {
      kategoriId: number;
      nominal: number;
      keterangan?: string;
      tanggal?: string;
      paymentMethod?: 'TUNAI' | 'TRANSFER';
      clientId?: number;
      kasBankKategoriId?: number;
    },
    @CurrentUser('id') userId: number,
  ) {
    return this.transaksiService.createPendapatanLain(body, userId || 1);
  }

  @Post('hutang')
  async createHutang(
    @Body()
    body: {
      clientId: number;
      kategoriId: number;
      nominal: number;
      type: 'TAMBAH' | 'BAYAR';
      paymentMethod?: 'TUNAI' | 'TRANSFER' | 'KAS';
      kasBankKategoriId?: number;
      keterangan?: string;
      tanggal?: string;
    },
    @CurrentUser('id') userId: number,
  ) {
    return this.transaksiService.createHutangMutasi(body, userId || 1);
  }

  @Post('piutang')
  async createPiutang(
    @Body()
    body: {
      clientId: number;
      kategoriId: number;
      nominal: number;
      type: 'TAMBAH' | 'BAYAR';
      paymentMethod?: 'TUNAI' | 'TRANSFER' | 'KAS';
      kasBankKategoriId?: number;
      keterangan?: string;
      tanggal?: string;
    },
    @CurrentUser('id') userId: number,
  ) {
    return this.transaksiService.createPiutangMutasi(body, userId || 1);
  }

  @Post('kas-mutasi')
  async createKasMutasi(
    @Body()
    body: {
      type: 'MASUK' | 'KELUAR' | 'TRANSFER';
      kasAccountId: number;
      lawanAccountId: number;
      nominal: number;
      keterangan?: string;
      tanggal?: string;
    },
    @CurrentUser('id') userId: number,
  ) {
    return this.transaksiService.createKasMutasi(body, userId || 1);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      keterangan?: string;
      tanggal?: string;
      clientId?: number;
      paymentAccountId?: number;
      paymentMethod?: any;
      diskon?: number;
      items?: Array<{
        detailId?: number;
        barangId: number;
        qty: number;
        hargaSatuan: number;
        telurBentes?: number;
        telurKotor?: number;
        telurCeplok?: number;
        telurJumbo?: number;
      }>;
    },
    @CurrentUser('id') userId: number,
  ) {
    return this.transaksiService.update(Number(id), body, userId || 1);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.transaksiService.remove(Number(id));
  }
}
