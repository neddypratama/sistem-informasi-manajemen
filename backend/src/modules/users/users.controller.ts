import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto.js';

@UseGuards(JwtAuthGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // =========================================================================
  // 1. PENGGUNA (USERS)
  // =========================================================================

  @Get('users')
  async findAllUsers(
    @Query('search') search?: string,
    @Query('roleId') roleId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findAllUsers({
      search,
      roleId: roleId ? Number(roleId) : undefined,
      isActive,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('users/:id')
  async findUserById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findUserById(id);
  }

  @Post('users')
  async createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Put('users/:id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, dto);
  }

  @Patch('users/:id/toggle-active')
  async toggleUserActive(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.toggleUserActive(id);
  }

  // =========================================================================
  // 2. ROLE & AKSES (ROLES)
  // =========================================================================

  @Get('roles')
  async findAllRoles() {
    return this.usersService.findAllRoles();
  }

  @Get('roles/:id')
  async findRoleById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findRoleById(id);
  }

  @Post('roles')
  async createRole(@Body() dto: CreateRoleDto) {
    return this.usersService.createRole(dto);
  }

  @Put('roles/:id')
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateRoleDto,
  ) {
    return this.usersService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  async deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteRole(id);
  }

  // =========================================================================
  // 3. PERMISSIONS & ROLE PERMISSIONS MATRIX
  // =========================================================================

  @Get('permissions')
  async findAllPermissions() {
    return this.usersService.findAllPermissions();
  }

  @Put('roles/:id/permissions')
  async updateRolePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.usersService.updateRolePermissions(id, dto.permissionIds);
  }

  // =========================================================================
  // 4. USER ACTIVITY LOGS (AUDIT TRAIL)
  // =========================================================================

  @Get('logs')
  async getActivityLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('module') module?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.usersService.getActivityLogs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      module,
      search,
      startDate,
      endDate,
    });
  }
}
