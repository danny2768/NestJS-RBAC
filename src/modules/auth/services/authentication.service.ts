import { Injectable, UnauthorizedException } from '@nestjs/common';
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
import { JwtUser, RoleWithPermissions } from '../interfaces/jwt-user.interface';

/**
 * Options for generating a JWT token.
 * @property id The user ID.
 * @property user The full JwtUser object to embed in the token payload.
 * @property refreshExpiresAt Optional expiration timestamp for the refresh token.
 */
interface GenerateTokenOptions {
  id: number;
  user: JwtUser;
  refreshExpiresAt?: number;
}

/**
 * AuthenticationService handles user authentication logic,
 * including registration, login, and token management.
 *
 * - Registers new users.
 * - Authenticates users and issues JWT tokens.
 * - Handles token refresh logic.
 * - Integrates with authorization and user services.
 */
@Injectable()
export class AuthenticationService {
  /**
   * Constructs the AuthenticationService.
   * @param configService ConfigService instance for environment variables.
   * @param prismaService PrismaService instance for database access.
   * @param authorizationService AuthorizationService for user context.
   * @param jwtService JwtService for signing tokens.
   * @param usersService UsersService for user management.
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Registers a new user.
   * @param registerUserDto Data for registering the user.
   * @returns The created user.
   */
  async register(registerUserDto: RegisterUserDto) {
    const createUserDto = registerUserDto as CreateUserDto;

    return await this.usersService.create(
      createUserDto,
      this.authorizationService.getUser()?.roles ?? [],
    );
  }

  /**
   * Authenticates a user and returns a JWT token and user info.
   * @param loginUserDto Login credentials.
   * @returns An object containing the token, user info, roles, and highest role.
   * @throws UnauthorizedException if credentials are invalid.
   */
  async login(loginUserDto: LoginUserDto) {
    // Validate if the email exists
    const user = await this.prismaService.user.findUnique({
      where: { email: loginUserDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate if the password is correct
    const isMatch = BcryptAdapter.compare(loginUserDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
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

    // Get user permissions
    const rolesPermissions = await this.prismaService.rolePermission.findMany({
      where: { roleId: { in: roles.map((role) => role.id) } },
      include: { permission: true },
    });

    // Use a Set to store unique permissions
    const permissions = Array.from(
      new Set(
        rolesPermissions.map((rolePermission) => rolePermission.permission),
      ),
    );

    // Get the user permissions to a string array
    const userPermissions = permissions.map((permission) => permission.name);

    // Remove the password from the user object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    const roleWithPermissions: RoleWithPermissions = {
      ...highestRole,
      permissions: userPermissions,
    };

    const jwtUser: JwtUser = {
      ...userWithoutPassword,
      role: roleWithPermissions,
    };

    // Generate the JWT token
    const options: GenerateTokenOptions = {
      id: user.id,
      user: jwtUser,
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

  /**
   * Refreshes the JWT token for the currently authenticated user.
   * @returns An object containing the new token.
   * @throws UnauthorizedException if user is not logged in or refresh token expired.
   */
  public refreshToken() {
    const loadedUser: LoadedUser | null = this.authorizationService.getUser();

    if (!loadedUser) {
      throw new UnauthorizedException('You must be logged in');
    }

    // Check if the refresh period is still valid
    if (
      loadedUser.jwtPayload.refreshExpiresAt < Math.floor(Date.now() / 1000)
    ) {
      const expiredDate = new Date(
        loadedUser.jwtPayload.refreshExpiresAt * 1000,
      ).toISOString();
      throw new UnauthorizedException(
        `Refresh token expired on ${expiredDate}.`,
      );
    }

    // Remove the password from the user object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = loadedUser.info;

    // Get user highest role
    const userHighestRole =
      this.authorizationService.getAuthUserBestHierarchyRole();

    // Get user permissions
    const permissions = loadedUser.permissions;

    // Get the user permissions to a string array
    const userPermissions = permissions.map((permission) => permission.name);

    // Create JwtUser object
    const rolewithPermissions: RoleWithPermissions = {
      ...userHighestRole,
      permissions: userPermissions,
    };

    const jwtUser: JwtUser = {
      ...userWithoutPassword,
      role: rolewithPermissions,
    };

    // Generate a new token
    return {
      token: this.generateToken({
        id: loadedUser.info.id,
        user: jwtUser,
        refreshExpiresAt: loadedUser.jwtPayload.refreshExpiresAt,
      }),
    };
  }

  /**
   * Signs and returns a JWT token for the given payload.
   * @param payload The JWT payload.
   * @returns The signed JWT token.
   */
  private getJwtToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }

  /**
   * Generates a JWT token for the given options.
   * @param options Options for generating the token.
   * @returns The signed JWT token.
   */
  private generateToken(options: GenerateTokenOptions): string {
    const { id: userId, user, refreshExpiresAt } = options;

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
      user,
      refreshExpiresAt: expiresAt,
    };

    return this.getJwtToken(payload);
  }
}
