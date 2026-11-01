var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service.js';
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllUsers(params) {
        const page = Number(params.page) || 1;
        const limit = Number(params.limit) || 25;
        const skip = (page - 1) * limit;
        const where = {};
        if (params.search) {
            where.OR = [
                { name: { contains: params.search } },
                { username: { contains: params.search } },
                { email: { contains: params.search } },
            ];
        }
        if (params.roleId) {
            where.roleId = BigInt(params.roleId);
        }
        if (params.isActive !== undefined && params.isActive !== '') {
            where.isActive = params.isActive === 'true' || params.isActive === true;
        }
        const [total, users] = await Promise.all([
            this.prisma.user.count({ where }),
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { id: 'asc' },
                include: {
                    role: {
                        select: { id: true, name: true, description: true },
                    },
                },
            }),
        ]);
        return {
            items: users.map((u) => ({
                id: Number(u.id),
                name: u.name,
                username: u.username,
                email: u.email,
                roleId: Number(u.roleId),
                roleName: u.role.name,
                isActive: u.isActive,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        };
    }
    async findUserById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id: BigInt(id) },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: { permission: true },
                        },
                    },
                },
            },
        });
        if (!user) {
            throw new NotFoundException(`Pengguna dengan ID ${id} tidak ditemukan.`);
        }
        return {
            id: Number(user.id),
            name: user.name,
            username: user.username,
            email: user.email,
            roleId: Number(user.roleId),
            roleName: user.role.name,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            permissions: user.role.permissions.map((p) => p.permission.name),
        };
    }
    async createUser(dto) {
        const existing = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { username: dto.username },
                    ...(dto.email ? [{ email: dto.email }] : []),
                ],
            },
        });
        if (existing) {
            throw new BadRequestException('Username atau email sudah digunakan oleh pengguna lain.');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                username: dto.username,
                email: dto.email || null,
                password: hashedPassword,
                roleId: BigInt(dto.roleId),
                isActive: dto.isActive !== undefined ? dto.isActive : true,
            },
            include: { role: true },
        });
        return {
            id: Number(user.id),
            name: user.name,
            username: user.username,
            email: user.email,
            roleId: Number(user.roleId),
            roleName: user.role.name,
            isActive: user.isActive,
            createdAt: user.createdAt,
        };
    }
    async updateUser(id, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: BigInt(id) } });
        if (!user) {
            throw new NotFoundException(`Pengguna dengan ID ${id} tidak ditemukan.`);
        }
        if (dto.email && dto.email !== user.email) {
            const emailTaken = await this.prisma.user.findFirst({
                where: { email: dto.email, NOT: { id: BigInt(id) } },
            });
            if (emailTaken) {
                throw new BadRequestException('Email sudah digunakan.');
            }
        }
        const data = {};
        if (dto.name !== undefined)
            data.name = dto.name;
        if (dto.email !== undefined)
            data.email = dto.email || null;
        if (dto.roleId !== undefined)
            data.roleId = BigInt(dto.roleId);
        if (dto.isActive !== undefined)
            data.isActive = dto.isActive;
        if (dto.password && dto.password.trim() !== '') {
            data.password = await bcrypt.hash(dto.password, 10);
        }
        const updated = await this.prisma.user.update({
            where: { id: BigInt(id) },
            data,
            include: { role: true },
        });
        return {
            id: Number(updated.id),
            name: updated.name,
            username: updated.username,
            email: updated.email,
            roleId: Number(updated.roleId),
            roleName: updated.role.name,
            isActive: updated.isActive,
            updatedAt: updated.updatedAt,
        };
    }
    async toggleUserActive(id) {
        if (id === 1) {
            throw new BadRequestException('Akun Administrator utama tidak dapat dinonaktifkan.');
        }
        const user = await this.prisma.user.findUnique({ where: { id: BigInt(id) } });
        if (!user)
            throw new NotFoundException('Pengguna tidak ditemukan.');
        const updated = await this.prisma.user.update({
            where: { id: BigInt(id) },
            data: { isActive: !user.isActive },
            include: { role: true },
        });
        return {
            id: Number(updated.id),
            name: updated.name,
            isActive: updated.isActive,
        };
    }
    async findAllRoles() {
        const roles = await this.prisma.role.findMany({
            orderBy: { id: 'asc' },
            include: {
                _count: {
                    select: { users: true, permissions: true },
                },
            },
        });
        return roles.map((r) => ({
            id: Number(r.id),
            name: r.name,
            description: r.description,
            userCount: r._count.users,
            permissionCount: r._count.permissions,
            createdAt: r.createdAt,
        }));
    }
    async findRoleById(id) {
        const role = await this.prisma.role.findUnique({
            where: { id: BigInt(id) },
            include: {
                permissions: {
                    include: { permission: true },
                },
                _count: { select: { users: true } },
            },
        });
        if (!role) {
            throw new NotFoundException(`Role dengan ID ${id} tidak ditemukan.`);
        }
        return {
            id: Number(role.id),
            name: role.name,
            description: role.description,
            userCount: role._count.users,
            permissionIds: role.permissions.map((p) => Number(p.permissionId)),
            permissions: role.permissions.map((p) => ({
                id: Number(p.permission.id),
                name: p.permission.name,
                group: p.permission.group,
                description: p.permission.description,
            })),
            createdAt: role.createdAt,
        };
    }
    async createRole(dto) {
        const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
        if (existing) {
            throw new BadRequestException(`Role dengan nama "${dto.name}" sudah ada.`);
        }
        const role = await this.prisma.role.create({
            data: {
                name: dto.name,
                description: dto.description || null,
            },
        });
        return {
            id: Number(role.id),
            name: role.name,
            description: role.description,
            createdAt: role.createdAt,
        };
    }
    async updateRole(id, dto) {
        const role = await this.prisma.role.findUnique({ where: { id: BigInt(id) } });
        if (!role)
            throw new NotFoundException('Role tidak ditemukan.');
        const updated = await this.prisma.role.update({
            where: { id: BigInt(id) },
            data: {
                name: dto.name,
                description: dto.description || null,
            },
        });
        return {
            id: Number(updated.id),
            name: updated.name,
            description: updated.description,
        };
    }
    async deleteRole(id) {
        if (id <= 2) {
            throw new BadRequestException('Role sistem bawaan (Admin / Manager) tidak dapat dihapus.');
        }
        const countUsers = await this.prisma.user.count({ where: { roleId: BigInt(id) } });
        if (countUsers > 0) {
            throw new BadRequestException(`Tidak dapat menghapus role ini karena masih memiliki ${countUsers} pengguna terkait.`);
        }
        await this.prisma.role.delete({ where: { id: BigInt(id) } });
        return { success: true, message: 'Role berhasil dihapus.' };
    }
    async findAllPermissions() {
        const perms = await this.prisma.permission.findMany({
            orderBy: [{ group: 'asc' }, { id: 'asc' }],
        });
        const groupsMap = new Map();
        for (const p of perms) {
            const g = p.group || 'Umum';
            if (!groupsMap.has(g))
                groupsMap.set(g, []);
            groupsMap.get(g).push({
                id: Number(p.id),
                name: p.name,
                group: p.group,
                description: p.description,
            });
        }
        const grouped = Array.from(groupsMap.entries()).map(([group, permissions]) => ({
            group,
            permissions,
        }));
        return {
            total: perms.length,
            grouped,
            all: perms.map((p) => ({
                id: Number(p.id),
                name: p.name,
                group: p.group,
                description: p.description,
            })),
        };
    }
    async updateRolePermissions(roleId, permissionIds) {
        const role = await this.prisma.role.findUnique({ where: { id: BigInt(roleId) } });
        if (!role)
            throw new NotFoundException('Role tidak ditemukan.');
        return this.prisma.$transaction(async (tx) => {
            await tx.rolePermission.deleteMany({
                where: { roleId: BigInt(roleId) },
            });
            if (permissionIds && permissionIds.length > 0) {
                const data = permissionIds.map((pId) => ({
                    roleId: BigInt(roleId),
                    permissionId: BigInt(pId),
                }));
                await tx.rolePermission.createMany({ data });
            }
            const count = await tx.rolePermission.count({
                where: { roleId: BigInt(roleId) },
            });
            return {
                roleId,
                roleName: role.name,
                assignedPermissionsCount: count,
            };
        });
    }
    async logActivity(data) {
        try {
            return await this.prisma.activityLog.create({
                data: {
                    userId: data.userId ? BigInt(data.userId) : null,
                    action: data.action,
                    module: data.module,
                    description: data.description,
                    ipAddress: data.ipAddress || null,
                    details: data.details || undefined,
                },
            });
        }
        catch (e) {
            console.error('Failed to log activity:', e);
        }
    }
    async getActivityLogs(query) {
        const page = query?.page || 1;
        const limit = query?.limit || 25;
        const skip = (page - 1) * limit;
        const existingCount = await this.prisma.activityLog.count();
        if (existingCount === 0) {
            const recentTx = await this.prisma.transaksi.findMany({
                take: 20,
                orderBy: { id: 'desc' },
                include: { user: true, client: true },
            });
            for (const tx of recentTx) {
                await this.prisma.activityLog.create({
                    data: {
                        userId: tx.userId,
                        action: `TRANSAKSI_${tx.type}`,
                        module: 'TRANSAKSI',
                        description: `Mencatat transaksi ${tx.type} (${tx.invoice}) - ${tx.client?.name || 'Umum'} senilai Rp ${Number(tx.total).toLocaleString('id-ID')}`,
                        createdAt: tx.createdAt,
                        details: { invoice: tx.invoice, total: Number(tx.total) },
                    },
                });
            }
            const recentOpnames = await this.prisma.stokOpname.findMany({
                take: 10,
                orderBy: { id: 'desc' },
                include: { user: true, barang: true },
            });
            for (const op of recentOpnames) {
                await this.prisma.activityLog.create({
                    data: {
                        userId: op.userId,
                        action: 'STOK_OPNAME',
                        module: 'INVENTORY',
                        description: `Melakukan stok opname barang ${op.barang.name} (${op.nomorOpname || 'OPN'})`,
                        createdAt: op.createdAt,
                        details: { opnameId: Number(op.id), barang: op.barang.name },
                    },
                });
            }
        }
        const where = {};
        if (query?.module && query.module !== 'ALL') {
            where.module = query.module;
        }
        if (query?.search) {
            where.OR = [
                { action: { contains: query.search } },
                { description: { contains: query.search } },
                { user: { name: { contains: query.search } } },
            ];
        }
        if (query?.startDate && query?.endDate) {
            where.createdAt = {
                gte: new Date(query.startDate),
                lte: new Date(`${query.endDate} 23:59:59`),
            };
        }
        const [logs, total] = await Promise.all([
            this.prisma.activityLog.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, name: true, username: true, role: { select: { name: true } } },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.activityLog.count({ where }),
        ]);
        return {
            items: logs.map((l) => ({
                id: Number(l.id),
                userId: l.userId ? Number(l.userId) : null,
                userName: l.user?.name || 'Sistem',
                userRole: l.user?.role?.name || 'Admin',
                action: l.action,
                module: l.module,
                description: l.description,
                ipAddress: l.ipAddress,
                details: l.details,
                createdAt: l.createdAt,
            })),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
};
UsersService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], UsersService);
export { UsersService };
//# sourceMappingURL=users.service.js.map