import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto.js';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAllUsers(search?: string, roleId?: string, isActive?: string, page?: string, limit?: string): Promise<{
        items: {
            id: number;
            name: string;
            username: string;
            email: string | null;
            roleId: number;
            roleName: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findUserById(id: number): Promise<{
        id: number;
        name: string;
        username: string;
        email: string | null;
        roleId: number;
        roleName: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        permissions: string[];
    }>;
    createUser(dto: CreateUserDto): Promise<{
        id: number;
        name: string;
        username: string;
        email: string | null;
        roleId: number;
        roleName: string;
        isActive: boolean;
        createdAt: Date;
    }>;
    updateUser(id: number, dto: UpdateUserDto): Promise<{
        id: number;
        name: string;
        username: string;
        email: string | null;
        roleId: number;
        roleName: string;
        isActive: boolean;
        updatedAt: Date;
    }>;
    toggleUserActive(id: number): Promise<{
        id: number;
        name: string;
        isActive: boolean;
    }>;
    findAllRoles(): Promise<{
        id: number;
        name: string;
        description: string | null;
        userCount: number;
        permissionCount: number;
        createdAt: Date;
    }[]>;
    findRoleById(id: number): Promise<{
        id: number;
        name: string;
        description: string | null;
        userCount: number;
        permissionIds: number[];
        permissions: {
            id: number;
            name: string;
            group: string;
            description: string | null;
        }[];
        createdAt: Date;
    }>;
    createRole(dto: CreateRoleDto): Promise<{
        id: number;
        name: string;
        description: string | null;
        createdAt: Date;
    }>;
    updateRole(id: number, dto: CreateRoleDto): Promise<{
        id: number;
        name: string;
        description: string | null;
    }>;
    deleteRole(id: number): Promise<{
        success: boolean;
        message: string;
    }>;
    findAllPermissions(): Promise<{
        total: number;
        grouped: {
            group: string;
            permissions: any[];
        }[];
        all: {
            id: number;
            name: string;
            group: string;
            description: string | null;
        }[];
    }>;
    updateRolePermissions(id: number, dto: UpdateRolePermissionsDto): Promise<{
        roleId: number;
        roleName: string;
        assignedPermissionsCount: number;
    }>;
    getActivityLogs(page?: string, limit?: string, module?: string, search?: string, startDate?: string, endDate?: string): Promise<{
        items: {
            id: number;
            userId: number | null;
            userName: string;
            userRole: string;
            action: string;
            module: string;
            description: string;
            ipAddress: string | null;
            details: import("@prisma/client/runtime/library").JsonValue;
            createdAt: Date;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
}
