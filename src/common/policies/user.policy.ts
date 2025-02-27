import { User } from '@prisma/client';
import { BasePolicy } from './base.policy';
import { Permissions } from '../constants/permissions';

export class UserPolicy extends BasePolicy {
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  viewAny(user: User, params?: { user: User }): boolean {
    return this.authorizationService.hasPermission(Permissions.READ_USER);
  }

  /**
   * Determine whether the user can view the model.
   * Allows user to view their own profile.
   */
  view(user: User, params?: { user: User }): boolean {
    return (
      user.id === params?.user.id ||
      this.authorizationService.hasPermission(Permissions.READ_USER)
    );
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  create(user: User, params?: unknown): boolean {
    return this.authorizationService.hasPermission(Permissions.CREATE_USER);
  }

  /**
   * Determine whether the user can update the model.
   * Allows user to update their own profile.
   */
  update(user: User, params?: { user: User }): boolean {
    return (
      user.id === params?.user.id ||
      this.authorizationService.hasPermission(Permissions.UPDATE_USER)
    );
  }

  /**
   * Determine whether the user can delete a user.
   * Users can delete themselves but not others.
   */
  delete(user: User, params?: { user: User }): boolean {
    return (
      user.id === params?.user.id ||
      this.authorizationService.hasPermission(Permissions.DELETE_USER)
    );
  }
}
