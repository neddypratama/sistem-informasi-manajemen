import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, TransaksiType } from '@prisma/client';

export class CreateItemDto {
  @IsOptional()
  @IsNumber()
  detailId?: number;

  @IsOptional()
  @IsNumber()
  originalDetailId?: number;

  @IsNumber()
  @IsPositive()
  barangId: number;

  @IsNumber()
  @IsPositive()
  qty: number;

  @IsNumber()
  @IsPositive()
  hargaSatuan: number;

  @IsOptional()
  @IsNumber()
  telurBentes?: number = 0;

  @IsOptional()
  @IsNumber()
  telurKotor?: number = 0;

  @IsOptional()
  @IsNumber()
  telurCeplok?: number = 0;

  @IsOptional()
  @IsNumber()
  telurJumbo?: number = 0;
}

export class CreateTransaksiDto {
  @IsOptional()
  @IsEnum(TransaksiType)
  type?: TransaksiType;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsNumber()
  paymentAccountId?: number;

  @IsOptional()
  @IsNumber()
  clientId?: number;

  @IsOptional()
  @IsString()
  tanggal?: string;

  @IsOptional()
  @IsNumber()
  diskon?: number = 0;

  @IsOptional()
  @IsString()
  keterangan?: string;

  @ValidateNested({ each: true })
  @Type(() => CreateItemDto)
  @ArrayMinSize(1, { message: 'Transaksi minimal harus memiliki 1 item barang' })
  items: CreateItemDto[];
}
