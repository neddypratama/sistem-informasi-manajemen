import { Module } from '@nestjs/common';
import { BarangController } from './controllers/barang.controller.js';
import { ClientController } from './controllers/client.controller.js';
import { DetailKategoriController } from './controllers/detail-kategori.controller.js';
import { KategoriController } from './controllers/kategori.controller.js';
import { BarangService } from './services/barang.service.js';
import { ClientService } from './services/client.service.js';
import { DetailKategoriService } from './services/detail-kategori.service.js';
import { KategoriService } from './services/kategori.service.js';

@Module({
  controllers: [
    BarangController,
    ClientController,
    DetailKategoriController,
    KategoriController,
  ],
  providers: [
    BarangService,
    ClientService,
    DetailKategoriService,
    KategoriService,
  ],
  exports: [
    BarangService,
    ClientService,
    DetailKategoriService,
    KategoriService,
  ],
})
export class MasterModule {}
