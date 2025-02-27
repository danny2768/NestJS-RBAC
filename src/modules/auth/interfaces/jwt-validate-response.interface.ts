import { User } from '@prisma/client';
import { JwtPayload } from './jwt-payload.interface';

export interface JwtValidateResponse {
  user: User;
  payload: JwtPayload;
}
