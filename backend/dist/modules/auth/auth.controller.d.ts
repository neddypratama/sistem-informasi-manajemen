import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto, req: Request): Promise<{
        message: string;
        accessToken: string;
        user: {
            id: number;
            name: string;
            username: string;
            email: string | null;
            roleId: number;
            role: string;
            permissions: any[];
        };
    }>;
    getProfile(userId: number): Promise<{
        id: number;
        name: string;
        username: string;
        email: string | null;
        roleId: number;
        role: string;
        permissions: any[];
        createdAt: Date;
    }>;
}
