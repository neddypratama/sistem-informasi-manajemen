import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { TransaksiType, TransaksiStatus } from '@prisma/client';

export class QueryTransaksiDto {
  @IsOptional()
  @IsEnum(TransaksiType)
  type?: TransaksiType;

  @IsOptional()
  @IsEnum(TransaksiStatus)
  status?: TransaksiStatus;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  clientId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  jenisId?: number;

  @IsOptional()
  @IsString()
  jenisIds?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  kategoriId?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 25;
}
