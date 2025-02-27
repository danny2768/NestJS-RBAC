import { User } from '@prisma/client';
import { BasePolicy } from './base.policy';
import { Permissions } from '../constants/permissions';

export class RolePolicy extends BasePolicy {
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  viewAny(user: User, params?: unknown): boolean {
    return this.authorizationService.hasPermission(Permissions.READ_ROLE);
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  view(user: User, params?: unknown): boolean {
    return this.authorizationService.hasPermission(Permissions.READ_ROLE);
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  create(user: User, params?: unknown): boolean {
    return this.authorizationService.hasPermission(Permissions.CREATE_ROLE);
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  update(user: User, params?: unknown): boolean {
    return this.authorizationService.hasPermission(Permissions.UPDATE_ROLE);
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  delete(user: User, params?: unknown): boolean {
    return this.authorizationService.hasPermission(Permissions.DELETE_ROLE);
  }
}
