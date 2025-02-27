import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { PrismaService } from 'src/common/services/prisma.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthorizationService } from './services/authorization.service';
import { AuthenticationService } from './services/authentication.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    PrismaService,
    AuthorizationService,
    AuthenticationService,
    JwtAuthGuard,
    UsersService,
  ],
  imports: [
    ConfigModule,

    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRATION_TIME') },
      }),
    }),
  ],
  exports: [JwtAuthGuard, AuthorizationService],
})
export class AuthModule {}
