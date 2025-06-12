import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { PrismaService } from 'src/common/services/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtValidateResponse } from '../interfaces/jwt-validate-response.interface';

/**
 * JwtStrategy is a Passport strategy for validating JWT tokens in NestJS.
 *
 * - Uses the JWT secret from configuration.
 * - Extracts JWT from the Authorization Bearer header.
 * - Validates the user by checking the payload and querying the database.
 * - Throws UnauthorizedException if validation fails.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Constructs the JwtStrategy.
   * @param prismaService PrismaService instance for database access.
   * @param configService ConfigService instance to access environment variables.
   */
  constructor(
    private readonly prismaService: PrismaService,
    configService: ConfigService,
  ) {
    super({
      secretOrKey: configService.get<string>('JWT_SECRET')!,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  /**
   * Validates the JWT payload.
   * @param payload The decoded JWT payload.
   * @returns JwtValidateResponse containing the user and payload.
   * @throws UnauthorizedException if user is not found or email does not match.
   */
  async validate(payload: JwtPayload): Promise<JwtValidateResponse> {
    const { user, id } = payload;

    const existingUser = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!existingUser) throw new UnauthorizedException();

    if (!user || user.id != id || user.id != existingUser.id)
      throw new UnauthorizedException();

    const authInfo: JwtValidateResponse = {
      user: existingUser,
      payload,
    };

    return authInfo;
  }
}
