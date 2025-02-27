import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from 'src/common/services/prisma.service';
import { AuthorizationService } from '../services/authorization.service';
import { Request } from 'express';
import { JwtValidateResponse } from '../interfaces/jwt-validate-response.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Call the parent class's canActivate method to validate the JWT
    const canActivate = await super.canActivate(context);
    if (!canActivate) return false;

    // Get the request object
    const request = context.switchToHttp().getRequest<Request>();

    // console.log('Request:', request);

    const jwtValidateResponse = request.user as JwtValidateResponse;
    if (!jwtValidateResponse) return false;

    // Fetch the user from the request (set by the JwtStrategy)
    const user = jwtValidateResponse.user;
    if (!user) return false;

    // Fetch the user roles
    const userRoles = await this.prismaService.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    // Fetch the permissions for each role
    const roleIds = userRoles.map((userRole) => userRole.roleId);
    const rolePermissions = await this.prismaService.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: { permission: true },
    });

    // Use a Set to store unique permissions
    const uniquePermissions = new Set(
      rolePermissions.map((rolePermission) => rolePermission.permission),
    );

    this.authorizationService.setUser({
      info: user,
      roles: userRoles.map((userRole) => userRole.role),
      permissions: Array.from(uniquePermissions),
      jwtPayload: jwtValidateResponse.payload,
    });

    return true;
  }
}
