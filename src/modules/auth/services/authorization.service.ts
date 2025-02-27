import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Scope,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/common/services/prisma.service';
import { LoadedUser } from '../interfaces/loaded-user.interface';
import { PermissionsEnum } from 'src/common/constants/permissions';
import { BasePolicy } from 'src/common/policies/base.policy';

@Injectable({ scope: Scope.REQUEST })
export class AuthorizationService {
  private user: LoadedUser | null = null;

  constructor(private readonly prismaService: PrismaService) {}

  getUser(): LoadedUser | null {
    return this.user;
  }

  setUser(user: LoadedUser): void {
    this.user = user;
  }

  hasPermission(permission: PermissionsEnum): boolean {
    if (!this.user) return false;
    return this.user.permissions.some((p) => p.name === permission);
  }

  getBestHierarchyRole(roles: Role[]): Role | null {
    if (!roles.length) return null;

    return roles.reduce((prev, current) =>
      prev.hierarchy > current.hierarchy ? prev : current,
    );
  }

  getAuthUserBestHierarchyRole(): Role | null {
    if (!this.user) return null;

    return this.getBestHierarchyRole(this.user.roles);
  }

  async isAuthUserBestRoleHigherOrEqual(role: number | Role): Promise<boolean> {
    let roleToCompare: Role | null;

    // Narrows the type and roleToCompare will always be a role or null.
    if (typeof role === 'number') {
      roleToCompare = await this.prismaService.role.findUnique({
        where: { id: role },
      });
    } else {
      roleToCompare = role;
    }

    const userHighestRole = this.getAuthUserBestHierarchyRole();

    if (!roleToCompare || !userHighestRole) return false;

    return userHighestRole.hierarchy <= roleToCompare.hierarchy;
  }

  async authorize<T extends BasePolicy, K extends keyof T>(
    policy: new (authorizationService: AuthorizationService) => T,
    action: K,
    params: unknown = {},
  ): Promise<void> {
    const instance = new policy(this);

    // Check if the key is indeed a function.
    if (typeof instance[action] === 'function') {
      const response = await (
        instance[action] as (...args: unknown[]) => boolean | Promise<boolean>
      )(this.user?.info, params);
      if (!response) {
        throw new ForbiddenException();
      }
    } else {
      throw new InternalServerErrorException(
        `Method ${String(action)} is not a function on ${policy.name}`,
      );
    }
  }
}
