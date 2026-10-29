import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<(string | number)[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Akses ditolak: Pengguna tidak terautentikasi.');
    }

    const userRoleId = Number(user.roleId);
    const userRoleName = user.role?.name;

    const hasRole = requiredRoles.some((role) => {
      if (typeof role === 'number') {
        return role === userRoleId;
      }
      return role === userRoleName;
    });

    if (!hasRole) {
      throw new ForbiddenException('Akses ditolak: Anda tidak memiliki izin untuk mengakses resource ini.');
    }

    return true;
  }
}
