var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, ValidateNested, ArrayMinSize, } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, TransaksiType } from '@prisma/client';
export class CreateItemDto {
    detailId;
    originalDetailId;
    barangId;
    qty;
    hargaSatuan;
    telurBentes = 0;
    telurKotor = 0;
    telurCeplok = 0;
    telurJumbo = 0;
}
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], CreateItemDto.prototype, "detailId", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], CreateItemDto.prototype, "originalDetailId", void 0);
__decorate([
    IsNumber(),
    IsPositive(),
    __metadata("design:type", Number)
], CreateItemDto.prototype, "barangId", void 0);
__decorate([
    IsNumber(),
    IsPositive(),
    __metadata("design:type", Number)
], CreateItemDto.prototype, "qty", void 0);
__decorate([
    IsNumber(),
    IsPositive(),
    __metadata("design:type", Number)
], CreateItemDto.prototype, "hargaSatuan", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], CreateItemDto.prototype, "telurBentes", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], CreateItemDto.prototype, "telurKotor", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], CreateItemDto.prototype, "telurCeplok", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], CreateItemDto.prototype, "telurJumbo", void 0);
export class CreateTransaksiDto {
    type;
    paymentMethod;
    paymentAccountId;
    clientId;
    tanggal;
    diskon = 0;
    keterangan;
    items;
}
__decorate([
    IsOptional(),
    IsEnum(TransaksiType),
    __metadata("design:type", String)
], CreateTransaksiDto.prototype, "type", void 0);
__decorate([
    IsEnum(PaymentMethod),
    __metadata("design:type", String)
], CreateTransaksiDto.prototype, "paymentMethod", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], CreateTransaksiDto.prototype, "paymentAccountId", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], CreateTransaksiDto.prototype, "clientId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateTransaksiDto.prototype, "tanggal", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], CreateTransaksiDto.prototype, "diskon", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateTransaksiDto.prototype, "keterangan", void 0);
__decorate([
    ValidateNested({ each: true }),
    Type(() => CreateItemDto),
    ArrayMinSize(1, { message: 'Transaksi minimal harus memiliki 1 item barang' }),
    __metadata("design:type", Array)
], CreateTransaksiDto.prototype, "items", void 0);
//# sourceMappingURL=create-transaksi.dto.js.map