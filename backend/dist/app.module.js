var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
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
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map