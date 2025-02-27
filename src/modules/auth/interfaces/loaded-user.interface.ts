import { Permission, Role, User } from '@prisma/client';
import { JwtPayload } from './jwt-payload.interface';

export interface LoadedUser {
  info: User;
  roles: Role[];
  permissions: Permission[];
  jwtPayload: JwtPayload;
}
