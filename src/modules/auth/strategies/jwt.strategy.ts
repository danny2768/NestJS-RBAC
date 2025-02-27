import { PassportStrategy } from '@nestjs/passport';
// import { User } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { PrismaService } from 'src/common/services/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtValidateResponse } from '../interfaces/jwt-validate-response.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prismaService: PrismaService,
    configService: ConfigService,
  ) {
    super({
      secretOrKey: configService.get<string>('JWT_SECRET')!,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtValidateResponse> {
    const { email, id } = payload;

    const user = await this.prismaService.user.findUnique({ where: { id } });

    if (!user || user.email !== email) throw new UnauthorizedException();

    const authInfo: JwtValidateResponse = {
      user,
      payload,
    };

    return authInfo;
  }
}
