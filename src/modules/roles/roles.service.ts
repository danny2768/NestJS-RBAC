import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PrismaService } from 'src/common/services/prisma.service';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { LoadedUser } from '../auth/interfaces/loaded-user.interface';
import { AuthorizationService } from '../auth/services/authorization.service';

@Injectable()
export class RolesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async create(createRoleDto: CreateRoleDto, reqUser: LoadedUser) {
    // Validate if the role already exists
    const existingRole = await this.prismaService.role.findUnique({
      where: { name: createRoleDto.name },
    });

    if (existingRole)
      throw new ConflictException('A Role with this name already exists');

    // Validate if the permission IDs are valid
    const permissions = await this.prismaService.permission.findMany({
      where: { id: { in: createRoleDto.permissionIds } },
    });

    if (permissions.length !== createRoleDto.permissionIds.length)
      throw new BadRequestException('Invalid permission IDs');

    // Validate if the permission IDs sent by the user are the ones he has access to
    const userPermissions = reqUser.permissions.map((p) => p.id);
    const invalidPermissions = createRoleDto.permissionIds.filter(
      (id) => !userPermissions.includes(id),
    );

    if (invalidPermissions.length)
      throw new UnauthorizedException(
        'You do not have access to these permissions',
      );

    // Get the highest hierarchy role of the user
    const userHighestRole =
      this.authorizationService.getAuthUserBestHierarchyRole();

    // Validate if the user has a role
    if (!userHighestRole)
      throw new BadRequestException(
        'You need a role in order to create a new one',
      );

    // Validate if the user has a valid hierarchy level
    if (userHighestRole.hierarchy <= 0)
      throw new InternalServerErrorException(
        'Invalid user role hierarchy, please contact the administrator',
      );

    // Validate if the user has a higher hierarchy level than the role he wants to create
    if (createRoleDto.hierarchy <= userHighestRole.hierarchy)
      throw new UnauthorizedException(
        'You cannot create a role with a higher hierarchy level than yours',
      );

    // Fetch all the roles sorted by hierarchy level
    const roles = await this.prismaService.role.findMany({
      orderBy: { hierarchy: 'asc' },
    });

    // Check if the desired hierarchy level is already taken
    const hierarchyExists = roles.some(
      (role) => role.hierarchy === createRoleDto.hierarchy,
    );

    try {
      const newRole = await this.prismaService.$transaction(async (prisma) => {
        // If the hierarchy level is already occupied, shift the roles down
        if (hierarchyExists) {
          await prisma.role.updateMany({
            where: { hierarchy: { gte: createRoleDto.hierarchy } },
            data: { hierarchy: { increment: 1 } },
          });
        }

        // Create the new role
        const createdRole = await prisma.role.create({
          data: {
            name: createRoleDto.name,
            hierarchy: createRoleDto.hierarchy,
          },
        });

        // Create the Role-Permission relationship
        await prisma.rolePermission.createMany({
          data: createRoleDto.permissionIds.map((permissionId) => ({
            roleId: createdRole.id,
            permissionId,
          })),
        });

        // Fetch the role permissions with all fields dynamically
        const createdRolePermissions = await prisma.rolePermission.findMany({
          where: { roleId: createdRole.id },
          include: { permission: true },
        });

        // Dynamically extract all fields from the permissions
        const permissionsResponse = createdRolePermissions.map(
          (rp) => rp.permission,
        );

        return {
          role: createdRole,
          permissions: permissionsResponse,
        };
      });

      return newRole;
    } catch (error: unknown) {
      throw new InternalServerErrorException(error, 'Error creating role');
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit, sortBy, sortOrder } = paginationDto; // Default values are set in the DTO
    const skip = (page - 1) * limit;

    try {
      // Fetch the roles and total count
      const [total, roles] = await Promise.all([
        this.prismaService.role.count(),
        this.prismaService.role.findMany({
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
      ]);

      // Calculate total pages
      const totalPages = Math.ceil(total / limit);

      const response: PaginatedResponse = {
        data: roles,
        pagination: {
          page,
          limit,
          totalItems: total,
          totalPages,
          next:
            page < totalPages ? `/roles?page=${page + 1}&limit=${limit}` : null,
          prev: page > 1 ? `/roles?page=${page - 1}&limit=${limit}` : null,
          first: `/roles?page=1&limit=${limit}`,
          last: `/roles?page=${totalPages}&limit=${limit}`,
        },
      };

      return response;
    } catch (error: unknown) {
      throw new InternalServerErrorException(error, 'Error fetching roles');
    }
  }

  async findOne(id: number) {
    const roleWithPermissions = await this.prismaService.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true }, // Fetch related permissions
        },
      },
    });

    if (!roleWithPermissions) throw new NotFoundException('Role not found');

    // Map response
    const { permissions, ...role } = roleWithPermissions;

    const extractedPermissions = permissions.map((rp) => rp.permission);

    return {
      role,
      permissions: extractedPermissions,
    };
  }

  async update(id: number, updateRoleDto: UpdateRoleDto, reqUser: LoadedUser) {
    // Fetch the role to be updated
    const existingRole = await this.prismaService.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });

    if (!existingRole) throw new NotFoundException('Role not found');

    // Check if the new role name already exists
    if (updateRoleDto.name && updateRoleDto.name !== existingRole.name) {
      const duplicateRole = await this.prismaService.role.findUnique({
        where: { name: updateRoleDto.name },
      });

      if (duplicateRole)
        throw new ConflictException('A Role with this name already exists');
    }

    // Validate permissions
    if (updateRoleDto.permissionIds) {
      const permissions = await this.prismaService.permission.findMany({
        where: { id: { in: updateRoleDto.permissionIds } },
      });

      if (permissions.length !== updateRoleDto.permissionIds.length)
        throw new BadRequestException('Invalid permission IDs');

      // Check if the user has access to these permissions
      const userPermissions = reqUser.permissions.map((p) => p.id);
      const invalidPermissions = updateRoleDto.permissionIds.filter(
        (id) => !userPermissions.includes(id),
      );

      if (invalidPermissions.length)
        throw new UnauthorizedException(
          'You do not have access to these permissions',
        );
    }

    // Get the highest hierarchy role of the user
    const userHighestRole =
      this.authorizationService.getAuthUserBestHierarchyRole();

    if (!userHighestRole)
      throw new BadRequestException('You need a role to update another role');

    if (userHighestRole.hierarchy <= 0)
      throw new InternalServerErrorException(
        'Invalid user role hierarchy, please contact the administrator',
      );

    // Validate hierarchy update
    if (
      updateRoleDto.hierarchy &&
      updateRoleDto.hierarchy <= userHighestRole.hierarchy
    )
      throw new UnauthorizedException(
        'You cannot update a role to have a higher hierarchy than yours',
      );

    // If the hierarchy is changed, shift roles accordingly
    if (
      updateRoleDto.hierarchy !== undefined &&
      updateRoleDto.hierarchy !== existingRole.hierarchy
    ) {
      const roles = await this.prismaService.role.findMany({
        orderBy: { hierarchy: 'asc' },
      });

      const hierarchyExists = roles.some(
        (role) => role.hierarchy === updateRoleDto.hierarchy,
      );

      await this.prismaService.$transaction(async (prisma) => {
        if (hierarchyExists) {
          await prisma.role.updateMany({
            where: { hierarchy: { gte: updateRoleDto.hierarchy } },
            data: { hierarchy: { increment: 1 } },
          });
        }
      });
    }

    try {
      // Perform update in a transaction
      return await this.prismaService.$transaction(async (prisma) => {
        // Update role details
        const updatedRole = await prisma.role.update({
          where: { id },
          data: {
            name: updateRoleDto.name ?? existingRole.name,
            hierarchy: updateRoleDto.hierarchy ?? existingRole.hierarchy,
          },
        });

        // Update Role-Permission relations
        if (updateRoleDto.permissionIds) {
          // Remove old permissions that are not in the new list
          await prisma.rolePermission.deleteMany({
            where: {
              roleId: id,
              permissionId: { notIn: updateRoleDto.permissionIds },
            },
          });

          // Add new permissions that were not previously assigned
          const existingPermissionIds = existingRole.permissions.map(
            (rp) => rp.permission.id,
          );
          const newPermissions = updateRoleDto.permissionIds.filter(
            (p) => !existingPermissionIds.includes(p),
          );

          await prisma.rolePermission.createMany({
            data: newPermissions.map((permissionId) => ({
              roleId: id,
              permissionId,
            })),
          });
        }

        // Fetch the updated role with its permissions
        const updatedRoleWithPermissions = await prisma.role.findUnique({
          where: { id },
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        });

        // Transform the response dynamically
        if (!updatedRoleWithPermissions) {
          throw new InternalServerErrorException(
            'Failed to fetch updated role with permissions',
          );
        }

        const permissionsResponse = updatedRoleWithPermissions.permissions.map(
          (rp) => rp.permission,
        );

        return {
          role: updatedRole,
          permissions: permissionsResponse,
        };
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(error, 'Error updating role');
    }
  }

  async remove(id: number) {
    // Fetch the role with related userRoles
    const roleToDelete = await this.prismaService.role.findUnique({
      where: { id },
      include: { userRoles: true }, // Fetch user-role assignments
    });

    if (!roleToDelete) throw new NotFoundException('Role not found');

    // Get the highest hierarchy role of the user
    const userHighestRole =
      this.authorizationService.getAuthUserBestHierarchyRole();

    if (!userHighestRole)
      throw new BadRequestException('You need a role to delete another role');

    if (userHighestRole.hierarchy <= 0)
      throw new InternalServerErrorException(
        'Invalid user role hierarchy, please contact the administrator',
      );

    // Ensure the user is deleting a role with a lower hierarchy
    if (roleToDelete.hierarchy <= userHighestRole.hierarchy)
      throw new UnauthorizedException(
        'You cannot delete a role with a higher or equal hierarchy than yours',
      );

    // Check if the role is assigned to any users
    if (roleToDelete.userRoles.length > 0)
      throw new ConflictException(
        'Role is assigned to users and cannot be deleted',
      );

    try {
      return await this.prismaService.$transaction(async (prisma) => {
        // Remove the role
        await prisma.role.delete({
          where: { id },
        });

        // Adjust hierarchy of remaining roles
        await prisma.role.updateMany({
          where: { hierarchy: { gt: roleToDelete.hierarchy } },
          data: { hierarchy: { decrement: 1 } },
        });

        return { message: 'Role deleted successfully' };
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(error, 'Error deleting role');
    }
  }
}
