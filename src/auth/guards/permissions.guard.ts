import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../../role/schemas/role.schema';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    this.logger.debug(`Required permissions: ${JSON.stringify(requiredPermissions)}`);
    this.logger.debug(`User: ${JSON.stringify(user?._id)}`);
    this.logger.debug(`User object: ${JSON.stringify(user)}`);
    this.logger.debug(`User permissions: ${JSON.stringify(user?.permissions)}`);
    this.logger.debug(`User permissions type: ${typeof user?.permissions}`);
    this.logger.debug(`User permissions is array: ${Array.isArray(user?.permissions)}`);

    if (!user) {
      this.logger.warn('No user in request');
      throw new ForbiddenException('Không có quyền truy cập');
    }

    // Nếu user không có permissions array (legacy users), cho phép truy cập
    if (!user.permissions || !Array.isArray(user.permissions)) {
      this.logger.warn(`User ${user._id} has no permissions array, allowing access`);
      return true;
    }

    // Kiểm tra xem user có quyền yêu cầu không
    const hasPermission = requiredPermissions.some((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasPermission) {
      this.logger.warn(`User ${user._id} missing required permissions. Has: ${user.permissions.join(', ')}, Needs: ${requiredPermissions.join(', ')}`);
      throw new ForbiddenException('Bạn không có quyền thực hiện hành động này');
    }

    this.logger.debug(`User ${user._id} has required permissions`);
    return true;
  }
}
