var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { BarangController } from './controllers/barang.controller.js';
import { ClientController } from './controllers/client.controller.js';
import { DetailKategoriController } from './controllers/detail-kategori.controller.js';
import { KategoriController } from './controllers/kategori.controller.js';
import { BarangService } from './services/barang.service.js';
import { ClientService } from './services/client.service.js';
import { DetailKategoriService } from './services/detail-kategori.service.js';
import { KategoriService } from './services/kategori.service.js';
let MasterModule = class MasterModule {
};
MasterModule = __decorate([
    Module({
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
], MasterModule);
export { MasterModule };
//# sourceMappingURL=master.module.js.map