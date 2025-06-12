import { Role, User } from '@prisma/client';

export type RoleWithPermissions = Partial<Role> & { permissions: string[] };

export interface JwtUser extends Omit<User, 'password'> {
  role: RoleWithPermissions;
}
