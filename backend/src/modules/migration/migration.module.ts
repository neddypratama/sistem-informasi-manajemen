import { Module } from '@nestjs/common';
import { MigrationController } from './migration.controller.js';
import { MigrationService } from './migration.service.js';
import { PrismaModule } from '../../database/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [MigrationController],
  providers: [MigrationService],
  exports: [MigrationService],
})
export class MigrationModule {}
