import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { AuthorizationService } from '../auth/services/authorization.service';
import { RolePolicy } from 'src/common/policies/role.policy';

@ApiBearerAuth()
@Controller({ path: 'roles', version: '1' })
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly rolesService: RolesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  async create(@Body() createRoleDto: CreateRoleDto) {
    await this.authorizationService.authorize(RolePolicy, 'create');

    return this.rolesService.create(
      createRoleDto,
      this.authorizationService.getUser()!,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ status: 200, description: 'Return all roles' })
  async findAll(@Query() paginationDto: PaginationDto) {
    await this.authorizationService.authorize(RolePolicy, 'viewAny');

    return this.rolesService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiResponse({ status: 200, description: 'Return a role by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    await this.authorizationService.authorize(RolePolicy, 'view');

    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a role by ID' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    await this.authorizationService.authorize(RolePolicy, 'update');

    return this.rolesService.update(
      id,
      updateRoleDto,
      this.authorizationService.getUser()!,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a role by ID' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.authorizationService.authorize(RolePolicy, 'delete');

    return this.rolesService.remove(id);
  }
}
