var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { TransaksiStatus } from '@prisma/client';
export class QueryTransaksiDto {
    type;
    status;
    module;
    search;
    clientId;
    jenisId;
    jenisIds;
    kategoriId;
    startDate;
    endDate;
    page = 1;
    limit = 25;
}
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], QueryTransaksiDto.prototype, "type", void 0);
__decorate([
    IsOptional(),
    IsEnum(TransaksiStatus),
    __metadata("design:type", String)
], QueryTransaksiDto.prototype, "status", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], QueryTransaksiDto.prototype, "module", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], QueryTransaksiDto.prototype, "search", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsNumber(),
    __metadata("design:type", Number)
], QueryTransaksiDto.prototype, "clientId", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsNumber(),
    __metadata("design:type", Number)
], QueryTransaksiDto.prototype, "jenisId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], QueryTransaksiDto.prototype, "jenisIds", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsNumber(),
    __metadata("design:type", Number)
], QueryTransaksiDto.prototype, "kategoriId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], QueryTransaksiDto.prototype, "startDate", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], QueryTransaksiDto.prototype, "endDate", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsNumber(),
    __metadata("design:type", Number)
], QueryTransaksiDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsNumber(),
    __metadata("design:type", Number)
], QueryTransaksiDto.prototype, "limit", void 0);
//# sourceMappingURL=query-transaksi.dto.js.map