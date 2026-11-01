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
import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, ParseIntPipe, } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto.js';
let UsersController = class UsersController {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async findAllUsers(search, roleId, isActive, page, limit) {
        return this.usersService.findAllUsers({
            search,
            roleId: roleId ? Number(roleId) : undefined,
            isActive,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }
    async findUserById(id) {
        return this.usersService.findUserById(id);
    }
    async createUser(dto) {
        return this.usersService.createUser(dto);
    }
    async updateUser(id, dto) {
        return this.usersService.updateUser(id, dto);
    }
    async toggleUserActive(id) {
        return this.usersService.toggleUserActive(id);
    }
    async findAllRoles() {
        return this.usersService.findAllRoles();
    }
    async findRoleById(id) {
        return this.usersService.findRoleById(id);
    }
    async createRole(dto) {
        return this.usersService.createRole(dto);
    }
    async updateRole(id, dto) {
        return this.usersService.updateRole(id, dto);
    }
    async deleteRole(id) {
        return this.usersService.deleteRole(id);
    }
    async findAllPermissions() {
        return this.usersService.findAllPermissions();
    }
    async updateRolePermissions(id, dto) {
        return this.usersService.updateRolePermissions(id, dto.permissionIds);
    }
    async getActivityLogs(page, limit, module, search, startDate, endDate) {
        return this.usersService.getActivityLogs({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            module,
            search,
            startDate,
            endDate,
        });
    }
};
__decorate([
    Get('users'),
    __param(0, Query('search')),
    __param(1, Query('roleId')),
    __param(2, Query('isActive')),
    __param(3, Query('page')),
    __param(4, Query('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findAllUsers", null);
__decorate([
    Get('users/:id'),
    __param(0, Param('id', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findUserById", null);
__decorate([
    Post('users'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createUser", null);
__decorate([
    Put('users/:id'),
    __param(0, Param('id', ParseIntPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateUser", null);
__decorate([
    Patch('users/:id/toggle-active'),
    __param(0, Param('id', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "toggleUserActive", null);
__decorate([
    Get('roles'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findAllRoles", null);
__decorate([
    Get('roles/:id'),
    __param(0, Param('id', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findRoleById", null);
__decorate([
    Post('roles'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateRoleDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createRole", null);
__decorate([
    Put('roles/:id'),
    __param(0, Param('id', ParseIntPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, CreateRoleDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateRole", null);
__decorate([
    Delete('roles/:id'),
    __param(0, Param('id', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteRole", null);
__decorate([
    Get('permissions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findAllPermissions", null);
__decorate([
    Put('roles/:id/permissions'),
    __param(0, Param('id', ParseIntPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, UpdateRolePermissionsDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateRolePermissions", null);
__decorate([
    Get('logs'),
    __param(0, Query('page')),
    __param(1, Query('limit')),
    __param(2, Query('module')),
    __param(3, Query('search')),
    __param(4, Query('startDate')),
    __param(5, Query('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getActivityLogs", null);
UsersController = __decorate([
    UseGuards(JwtAuthGuard),
    Controller(),
    __metadata("design:paramtypes", [UsersService])
], UsersController);
export { UsersController };
//# sourceMappingURL=users.controller.js.map