export const Permissions = {
  // User permissions
  CREATE_USER: 'create_user',
  READ_USER: 'read_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',

  // Role permissions
  CREATE_ROLE: 'create_role',
  READ_ROLE: 'read_role',
  UPDATE_ROLE: 'update_role',
  DELETE_ROLE: 'delete_role',
} as const;

export type PermissionsEnum = (typeof Permissions)[keyof typeof Permissions];
