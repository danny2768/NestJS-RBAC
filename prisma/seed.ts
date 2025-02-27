import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed Permissions
  const permissions = await prisma.permission.createMany({
    data: [
      // User Permissions
      { name: 'create_user', displayName: 'Create User' },
      { name: 'read_user', displayName: 'Read User' },
      { name: 'update_user', displayName: 'Update User' },
      { name: 'delete_user', displayName: 'Delete User' },

      // Role Permissions
      { name: 'create_role', displayName: 'Create Role' },
      { name: 'read_role', displayName: 'Read Role' },
      { name: 'update_role', displayName: 'Update Role' },
      { name: 'delete_role', displayName: 'Delete Role' },
    ],
    skipDuplicates: true, // Skip if permissions already exist
  });

  console.log('Seeded permissions:', permissions);

  // Seed Roles
  const roles = await prisma.role.createMany({
    data: [
      { name: 'Super Admin', hierarchy: 1 },
      { name: 'Admin', hierarchy: 2 },
    ],
    skipDuplicates: true, // Skip if roles already exist
  });

  console.log('Seeded roles:', roles);

  // Seed Users
  const users = await prisma.user.createMany({
    data: [
      {
        firstName: 'Super',
        lastName: 'Admin',
        email: 'super@admin.com',
        password: '$2b$10$cvjuw6Vl3bYoiaNflYXfu.NgdWJF5X0161GP4kymSgM9Ti/3kQ/7S', // superadmin
      },
      {
        firstName: 'Admin',
        lastName: 'Admin',
        email: 'admin@admin.com',
        password: '$2b$10$./Bi0NYvxrD8kdyMyfoGwuvsrQE/wNKBbnY8KjxZUlrT5QDInikT2', // adminadmin
      },
    ],
    skipDuplicates: true, // Skip if users already exist
  });

  console.log('Seeded users:', users);

  // Assign Roles to Users (UserRole)
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
  const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });

  const superAdminUser = await prisma.user.findUnique({ where: { email: 'super@admin.com' } });
  const adminAdminUser = await prisma.user.findUnique({ where: { email: 'admin@admin.com' } });

  if (superAdminRole && superAdminUser) {
    await prisma.userRole.create({
      data: {
        userId: superAdminUser.id,
        roleId: superAdminRole.id,
      },
    });
  }

  if (adminRole && adminAdminUser) {
    await prisma.userRole.create({
      data: {
        userId: adminAdminUser.id,
        roleId: adminRole.id,
      },
    });
  }

  console.log('Assigned roles to users');

  // Assign Permissions to Roles (RolePermission)
  const createUserPermission = await prisma.permission.findUnique({ where: { name: 'create_user' } });
  const readUserPermission = await prisma.permission.findUnique({ where: { name: 'read_user' } });
  const updateUserPermission = await prisma.permission.findUnique({ where: { name: 'update_user' } });
  const deleteUserPermission = await prisma.permission.findUnique({ where: { name: 'delete_user' } });

  const createRolePermission = await prisma.permission.findUnique({ where: { name: 'create_role' } });
  const readRolePermission = await prisma.permission.findUnique({ where: { name: 'read_role' } });
  const updateRolePermission = await prisma.permission.findUnique({ where: { name: 'update_role' } });
  const deleteRolePermission = await prisma.permission.findUnique({ where: { name: 'delete_role' } });

  // Assign all permissions to Super Admin
  if (
    superAdminRole &&
    createUserPermission &&
    readUserPermission &&
    updateUserPermission &&
    deleteUserPermission &&
    createRolePermission &&
    readRolePermission &&
    updateRolePermission &&
    deleteRolePermission
  ) {
    await prisma.rolePermission.createMany({
      data: [
        // User Permissions
        { roleId: superAdminRole.id, permissionId: createUserPermission.id },
        { roleId: superAdminRole.id, permissionId: readUserPermission.id },
        { roleId: superAdminRole.id, permissionId: updateUserPermission.id },
        { roleId: superAdminRole.id, permissionId: deleteUserPermission.id },

        // Role Permissions
        { roleId: superAdminRole.id, permissionId: createRolePermission.id },
        { roleId: superAdminRole.id, permissionId: readRolePermission.id },
        { roleId: superAdminRole.id, permissionId: updateRolePermission.id },
        { roleId: superAdminRole.id, permissionId: deleteRolePermission.id },
      ],
      skipDuplicates: true,
    });
  }

    // Assign limited permissions to Admin
  if (
    adminRole &&
    createUserPermission &&
    readUserPermission &&
    updateUserPermission &&
    createRolePermission &&
    readRolePermission &&
    updateRolePermission
  ) {
    await prisma.rolePermission.createMany({
      data: [
        // User Permissions
        { roleId: adminRole.id, permissionId: createUserPermission.id },
        { roleId: adminRole.id, permissionId: readUserPermission.id },
        { roleId: adminRole.id, permissionId: updateUserPermission.id },

        // Role Permissions
        { roleId: adminRole.id, permissionId: createRolePermission.id },
        { roleId: adminRole.id, permissionId: readRolePermission.id },
        { roleId: adminRole.id, permissionId: updateRolePermission.id },
      ],
      skipDuplicates: true,
    });
  }

  console.log('Assigned permissions to roles');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });