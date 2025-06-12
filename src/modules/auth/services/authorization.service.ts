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

/**
 * AuthorizationService handles user authorization logic, including permission checks,
 * role hierarchy evaluation, and policy-based authorization.
 *
 * - Scoped per request to maintain user context.
 * - Stores the currently authenticated user.
 * - Provides methods to check permissions and role hierarchy.
 * - Supports policy-based authorization for fine-grained access control.
 */
@Injectable({ scope: Scope.REQUEST })
export class AuthorizationService {
  /**
   * The currently authenticated user.
   */
  private user: LoadedUser | null = null;

  /**
   * Constructs the AuthorizationService.
   * @param prismaService PrismaService instance for database access.
   */
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Gets the currently authenticated user.
   * @returns The loaded user or null if not set.
   */
  getUser(): LoadedUser | null {
    return this.user;
  }

  /**
   * Sets the currently authenticated user.
   * @param user The loaded user to set.
   */
  setUser(user: LoadedUser): void {
    this.user = user;
  }

  /**
   * Checks if the current user has a specific permission.
   * @param permission The permission to check.
   * @returns True if the user has the permission, false otherwise.
   */
  hasPermission(permission: PermissionsEnum): boolean {
    if (!this.user) return false;
    return this.user.permissions.some((p) => p.name === permission);
  }

  /**
   * Returns the role with the highest hierarchy from a list of roles.
   * @param roles Array of roles.
   * @returns The role with the highest hierarchy or null if roles is empty.
   */
  getBestHierarchyRole(roles: Role[]): Role | null {
    if (!roles.length) return null;

    return roles.reduce((prev, current) =>
      prev.hierarchy > current.hierarchy ? prev : current,
    );
  }

  /**
   * Gets the highest hierarchy role of the authenticated user.
   * @returns The user's highest hierarchy role or null if user is not set.
   */
  getAuthUserBestHierarchyRole(): Role | null {
    if (!this.user) return null;

    return this.getBestHierarchyRole(this.user.roles);
  }

  /**
   * Checks if the authenticated user's highest role is higher or equal in hierarchy
   * to the provided role.
   * @param role Role object or role ID to compare against.
   * @returns True if user's highest role is higher or equal, false otherwise.
   */
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

  /**
   * Authorizes an action using a policy class and action method.
   * Throws ForbiddenException if authorization fails.
   * Throws InternalServerErrorException if the action method does not exist.
   *
   * @param policy The policy class to use for authorization.
   * @param action The action method to invoke on the policy.
   * @param params Optional parameters to pass to the policy method.
   */
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
