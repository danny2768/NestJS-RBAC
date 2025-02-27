import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import BcryptAdapter from 'src/config/bcrypt.adapter';
import { LoginUserDto } from '../dtos/login-user.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/common/services/prisma.service';
import { AuthorizationService } from './authorization.service';
import { LoadedUser } from '../interfaces/loaded-user.interface';
import { RegisterUserDto } from '../dtos/register-user.dto';
import { CreateUserDto } from 'src/modules/users/dtos/create-user.dto';
import { UsersService } from 'src/modules/users/users.service';
import { ConfigService } from '@nestjs/config';
import { TimeAdapter } from 'src/config/time.adapter';

interface GenerateTokenOptions {
  id: number;
  email: string;
  refreshExpiresAt?: number;
}

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async register(registerUserDto: RegisterUserDto) {
    const createUserDto = registerUserDto as CreateUserDto;

    return await this.usersService.create(
      createUserDto,
      this.authorizationService.getUser()?.roles ?? [],
    );
  }

  async login(loginUserDto: LoginUserDto) {
    // Validate if the email exists
    const user = await this.prismaService.user.findUnique({
      where: { email: loginUserDto.email },
    });

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    // Validate if the password is correct
    const isMatch = BcryptAdapter.compare(loginUserDto.password, user.password);
    if (!isMatch) {
      throw new BadRequestException('Invalid credentials');
    }

    // Get the user roles
    const userRoles = await this.prismaService.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    // Map the user roles to extract the role details
    const roles: Role[] = userRoles.map((userRole) => userRole.role);

    // Compute the highest hierarchy role
    const highestRole = this.authorizationService.getBestHierarchyRole(roles);

    // Generate the JWT token
    const options: GenerateTokenOptions = {
      id: user.id,
      email: user.email,
    };

    return {
      token: this.generateToken(options),
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      roles,
      highestRole,
    };
  }

  refreshToken() {
    const user: LoadedUser | null = this.authorizationService.getUser();

    if (!user) {
      throw new UnauthorizedException('You must be logged in');
    }

    // Check if the refresh period is still valid
    if (user.jwtPayload.refreshExpiresAt < Math.floor(Date.now() / 1000)) {
      const expiredDate = new Date(
        user.jwtPayload.refreshExpiresAt * 1000,
      ).toISOString();
      throw new UnauthorizedException(
        `Refresh token expired on ${expiredDate}.`,
      );
    }

    // Generate a new token
    return {
      token: this.generateToken({
        id: user.info.id,
        email: user.info.email,
        refreshExpiresAt: user.jwtPayload.refreshExpiresAt,
      }),
    };
  }

  private getJwtToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }

  private generateToken(options: GenerateTokenOptions): string {
    const { id: userId, email: userEmail, refreshExpiresAt } = options;

    // Get refresh expiration from environment variable (e.g., "7d")
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
    )!;

    // Calculate expiration if not provided
    const expiresAt =
      refreshExpiresAt ??
      Math.floor(Date.now() / 1000) + TimeAdapter.toSeconds(refreshExpiresIn);

    const payload: JwtPayload = {
      id: userId,
      email: userEmail,
      refreshExpiresAt: expiresAt,
    };

    return this.getJwtToken(payload);
  }
}
