import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const rawIp = req.headers['x-forwarded-for'] || req.ip || '127.0.0.1';
    const clientIp = Array.isArray(rawIp)
      ? rawIp[0]
      : typeof rawIp === 'string'
        ? rawIp.split(',')[0].trim()
        : '127.0.0.1';
    return this.authService.login(loginDto, clientIp);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser('id') userId: number) {
    return this.authService.getProfile(userId);
  }
}
