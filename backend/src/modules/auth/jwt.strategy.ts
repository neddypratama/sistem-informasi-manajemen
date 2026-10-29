import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    const isProd = process.env.NODE_ENV === 'production';

    if (!secret && isProd) {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not defined!');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || 'dev-fallback-key-for-local-development-only-change-in-production',
    });

    if (!secret) {
      this.logger.warn('⚠️ WARNING: JWT_SECRET is not set in environment. Using development fallback secret.');
    }
  }

  async validate(payload: { sub: string | number; username: string }) {
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
}
