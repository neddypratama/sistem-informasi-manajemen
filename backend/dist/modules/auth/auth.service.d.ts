import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
export declare class AuthService {
    private prisma;
    private jwtService;
    private readonly logger;
    private readonly rateLimits;
    constructor(prisma: PrismaService, jwtService: JwtService);
    private checkRateLimit;
    private recordFailedAttempt;
    private clearRateLimit;
    login(loginDto: LoginDto, clientIp?: string): Promise<{
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
