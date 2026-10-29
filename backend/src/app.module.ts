import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './database/prisma.module.js';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { MasterModule } from './modules/master/master.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { TransaksiModule } from './modules/transaksi/transaksi.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { MigrationModule } from './modules/migration/migration.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    MasterModule,
    InventoryModule,
    TransaksiModule,
    ReportsModule,
    MigrationModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
