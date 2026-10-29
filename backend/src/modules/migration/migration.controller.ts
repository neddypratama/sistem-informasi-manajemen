import {
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Param,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { MigrationService } from './migration.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Get('status')
  async getStatus() {
    return this.migrationService.getStatus();
  }

  @Post('run-clean')
  async runCleanMigration() {
    return this.migrationService.runCleanMigration();
  }

  @Post('upload-sql')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 250 * 1024 * 1024 }, // Max 250 MB
    }),
  )
  async uploadSqlFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('File .sql wajib diunggah!');
    }
    if (!file.originalname.match(/\.(sql|txt)$/i)) {
      throw new BadRequestException('Hanya file berformat .sql yang diperbolehkan!');
    }
    return this.migrationService.importSqlAndMigrate(file);
  }

  @Get('template/:type')
  async downloadTemplate(
    @Param('type') type: 'barang' | 'client' | 'transaksi',
    @Res() res: Response,
  ) {
    const buffer = await this.migrationService.generateExcelTemplate(type);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="template_import_${type}.xlsx"`,
    );
    res.send(buffer);
  }
}

