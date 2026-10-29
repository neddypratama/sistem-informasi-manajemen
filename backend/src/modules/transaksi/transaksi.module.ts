import { Module } from '@nestjs/common';
import { TransaksiController } from './transaksi.controller.js';
import { TransaksiService } from './transaksi.service.js';
import { InventoryModule } from '../inventory/inventory.module.js';

@Module({
  imports: [InventoryModule],
  controllers: [TransaksiController],
  providers: [TransaksiService],
  exports: [TransaksiService],
})
export class TransaksiModule {}
