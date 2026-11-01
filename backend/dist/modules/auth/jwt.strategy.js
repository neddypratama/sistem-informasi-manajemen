var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var JwtStrategy_1;
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
let JwtStrategy = JwtStrategy_1 = class JwtStrategy extends PassportStrategy(Strategy) {
    prisma;
    logger = new Logger(JwtStrategy_1.name);
    constructor(configService, prisma) {
        const secret = configService.get('JWT_SECRET');
        const isProd = process.env.NODE_ENV === 'production';
        if (!secret && isProd) {
            throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not defined!');
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret || 'dev-fallback-key-for-local-development-only-change-in-production',
        });
        this.prisma = prisma;
        if (!secret) {
            this.logger.warn('⚠️ WARNING: JWT_SECRET is not set in environment. Using development fallback secret.');
        }
    }
    async validate(payload) {
        const user = await this.prisma.user.findUnique({
            where: { id: BigInt(payload.sub) },
            include: { role: true },
        });
        if (!user || !user.isActive) {
            throw new UnauthorizedException('Pengguna tidak ditemukan atau dinonaktifkan.');
        }
        return {
            id: Number(user.id),
            name: user.name,
            username: user.username,
            email: user.email,
            roleId: Number(user.roleId),
            role: user.role,
        };
    }
};
JwtStrategy = JwtStrategy_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService,
        PrismaService])
], JwtStrategy);
export { JwtStrategy };
//# sourceMappingURL=jwt.strategy.js.map