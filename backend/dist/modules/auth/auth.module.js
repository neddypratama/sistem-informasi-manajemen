var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './jwt.strategy.js';
let AuthModule = class AuthModule {
};
AuthModule = __decorate([
    Module({
        imports: [
            PassportModule.register({ defaultStrategy: 'jwt' }),
            JwtModule.registerAsync({
                inject: [ConfigService],
                useFactory: (config) => {
                    const secret = config.get('JWT_SECRET');
                    const isProd = process.env.NODE_ENV === 'production';
                    if (!secret && isProd) {
                        throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not defined!');
                    }
                    return {
                        secret: secret || 'dev-fallback-key-for-local-development-only-change-in-production',
                        signOptions: {
                            expiresIn: (config.get('JWT_EXPIRES_IN') || '1d'),
                        },
                    };
                },
            }),
        ],
        controllers: [AuthController],
        providers: [AuthService, JwtStrategy],
        exports: [AuthService, JwtModule],
    })
], AuthModule);
export { AuthModule };
//# sourceMappingURL=auth.module.js.map