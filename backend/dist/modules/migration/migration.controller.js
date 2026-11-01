var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Param, Res, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MigrationService } from './migration.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
let MigrationController = class MigrationController {
    migrationService;
    constructor(migrationService) {
        this.migrationService = migrationService;
    }
    async getStatus() {
        return this.migrationService.getStatus();
    }
    async runCleanMigration() {
        return this.migrationService.runCleanMigration();
    }
    async uploadSqlFile(file) {
        if (!file) {
            throw new BadRequestException('File .sql wajib diunggah!');
        }
        if (!file.originalname.match(/\.(sql|txt)$/i)) {
            throw new BadRequestException('Hanya file berformat .sql yang diperbolehkan!');
        }
        return this.migrationService.importSqlAndMigrate(file);
    }
    async downloadTemplate(type, res) {
        const buffer = await this.migrationService.generateExcelTemplate(type);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="template_import_${type}.xlsx"`);
        res.send(buffer);
    }
};
__decorate([
    Get('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MigrationController.prototype, "getStatus", null);
__decorate([
    Post('run-clean'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MigrationController.prototype, "runCleanMigration", null);
__decorate([
    Post('upload-sql'),
    UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 250 * 1024 * 1024 },
    })),
    __param(0, UploadedFile()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MigrationController.prototype, "uploadSqlFile", null);
__decorate([
    Get('template/:type'),
    __param(0, Param('type')),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MigrationController.prototype, "downloadTemplate", null);
MigrationController = __decorate([
    UseGuards(JwtAuthGuard),
    Controller('migration'),
    __metadata("design:paramtypes", [MigrationService])
], MigrationController);
export { MigrationController };
//# sourceMappingURL=migration.controller.js.map