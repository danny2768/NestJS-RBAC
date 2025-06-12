import { JwtUser } from './jwt-user.interface';

export interface JwtPayload {
  id: number;
  user: JwtUser;
  refreshExpiresAt: number;
}
