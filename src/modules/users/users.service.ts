import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { PrismaService } from 'src/common/services/prisma.service';
import BcryptAdapter from 'src/config/bcrypt.adapter';
import { Prisma, Role, User } from '@prisma/client';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { AuthorizationService } from '../auth/services/authorization.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async create(createUserDto: CreateUserDto, reqUserRoles: Role[]) {
    // Validate if the email is already registered
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const { roleId, ...userData } = createUserDto;
    // Validate the role before creating the user (if provided)
    if (roleId) {
      if (reqUserRoles.length === 0) {
        throw new ForbiddenException(
          'You must have a role in order to set one',
        );
      }

      if (
        !(await this.authorizationService.isAuthUserBestRoleHigherOrEqual(
          roleId,
        ))
      ) {
        throw new ForbiddenException(
          'You cannot assign a role with a higher hierarchy level than yours',
        );
      }
    }

    try {
      const password = BcryptAdapter.hash(userData.password);

      // Create the user
      const user = await this.prismaService.user.create({
        data: {
          ...userData,
          password,
        },
      });

      // Assign the role only after the user is created successfully
      if (roleId) {
        await this.prismaService.userRole.create({
          data: {
            userId: user.id,
            roleId,
          },
        });
      }

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      };
    } catch (error: unknown) {
      throw new InternalServerErrorException(error, 'Error creating the user');
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    try {
      // Fetch users and total count in parallel
      const [total, users] = await Promise.all([
        this.prismaService.user.count(),
        this.prismaService.user.findMany({
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          // Exclude the password field
          select: Object.fromEntries(
            Object.keys(Prisma.UserScalarFieldEnum)
              .filter((key) => key !== 'password')
              .map((key) => [key, true]),
          ),
        }),
      ]);

      const totalPages = Math.ceil(total / limit);
      const response: PaginatedResponse = {
        data: users,
        pagination: {
          page,
          limit,
          totalItems: total,
          totalPages,
          next:
            page < totalPages ? `/users?page=${page + 1}&limit=${limit}` : null,
          prev: page > 1 ? `/users?page=${page - 1}&limit=${limit}` : null,
          first: `/users?page=1&limit=${limit}`,
          last: `/users?page=${totalPages}&limit=${limit}`,
        },
      };
      return response;
    } catch (error: unknown) {
      throw new InternalServerErrorException(error, 'Error fetching users');
    }
  }

  async findOne(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      // Exclude the password field
      select: Object.fromEntries(
        Object.keys(Prisma.UserScalarFieldEnum)
          .filter((key) => key !== 'password')
          .map((key) => [key, true]),
      ),
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    reqUser: User,
    reqUserRoles: Role[],
  ) {
    // Validate if the target user exists and include their roles
    const user = await this.prismaService.user.findUnique({
      where: { id },
      include: {
        userRoles: { include: { role: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const isSelfUpdate = id === reqUser.id;

    // Validate role update if a new role is provided
    if (updateUserDto.roleId) {
      if (isSelfUpdate) {
        throw new ConflictException(
          'You cannot update your own role. Please contact an administrator',
        );
      }
      if (reqUserRoles.length === 0) {
        throw new ForbiddenException(
          'You must have a role in order to set one',
        );
      }

      // Check if the target user already has roles
      const userRoles = user.userRoles.map((userRole) => userRole.role);

      const targetRole = userRoles.length
        ? this.authorizationService.getBestHierarchyRole(userRoles)! // Get highest role if user has roles
        : updateUserDto.roleId; // Otherwise, use the role to be assigned

      // Validate if the authenticated user has a higher or equal hierarchy level
      const isAuthorized =
        await this.authorizationService.isAuthUserBestRoleHigherOrEqual(
          targetRole,
        );

      if (!isAuthorized) {
        throw new ForbiddenException(
          'You cannot update a user with a higher hierarchy level than yours',
        );
      }
    }

    // Validate if the email is already registered by another user
    if (updateUserDto.email) {
      const existingUser = await this.prismaService.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (existingUser && existingUser.id !== id)
        throw new ConflictException('Email already registered');
    }

    // Hash password if it's being updated
    if (updateUserDto.password) {
      updateUserDto = {
        ...updateUserDto,
        password: BcryptAdapter.hash(updateUserDto.password),
      };
    }

    try {
      const updatedUser = await this.prismaService.user.update({
        where: { id },
        data: { ...updateUserDto },
        select: Object.fromEntries(
          Object.keys(Prisma.UserScalarFieldEnum)
            .filter((key) => key !== 'password')
            .map((key) => [key, true]),
        ),
      });
      return updatedUser;
    } catch (error: unknown) {
      throw new InternalServerErrorException(error, 'Error updating the user');
    }
  }

  async remove(id: number, reqUser: User, reqUserRoles: Role[]) {
    // Allow self-deletion without hierarchy check
    if (id === reqUser.id) {
      return this.deleteUser(id);
    }

    const userToDelete = await this.prismaService.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });
    if (!userToDelete) throw new NotFoundException('User not found');

    const userToDeleteRoles: Role[] = userToDelete.userRoles.map(
      (ur) => ur.role,
    );

    // Validate permissions based on roles for deletion
    if (reqUserRoles.length === 0) {
      throw new ForbiddenException(
        'You do not have the necessary permissions to delete this user',
      );
    }

    // Case 3: Target user has no roles, but the requesting user does → Allow deletion
    if (reqUserRoles.length > 0 && userToDeleteRoles.length === 0) {
      return this.deleteUser(id);
    }

    // Case 4: Both users have roles → Validate hierarchy
    const userToDeleteHighestRole =
      this.authorizationService.getBestHierarchyRole(userToDeleteRoles)!;

    if (
      !(await this.authorizationService.isAuthUserBestRoleHigherOrEqual(
        userToDeleteHighestRole,
      ))
    ) {
      throw new ForbiddenException(
        'You cannot delete a user with a higher hierarchy level than yours',
      );
    }

    return this.deleteUser(id);
  }

  /**
   * Helper method to delete a user by id
   */
  private async deleteUser(id: number) {
    try {
      await this.prismaService.user.delete({ where: { id } });
      return { message: 'User deleted successfully' };
    } catch (error: unknown) {
      throw new InternalServerErrorException(error, 'Error deleting the user');
    }
  }
}
