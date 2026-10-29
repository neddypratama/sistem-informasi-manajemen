import { Module } from '@nestjs/common';
import { FifoService } from './fifo.service.js';
import { InventoryService } from './inventory.service.js';
import { InventoryController } from './inventory.controller.js';

@Module({
  controllers: [InventoryController],
  providers: [FifoService, InventoryService],
  exports: [FifoService, InventoryService],
})
export class InventoryModule {}
