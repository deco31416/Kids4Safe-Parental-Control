export type InitialUserRole = 'superadmin' | 'admin' | 'viewer';

export interface InitialUser {
  username: string;
  email: string;
  password: string;
  role: InitialUserRole;
  permissions: string[];
}

const adminPermissions = [
  'create_qr',
  'view_qr',
  'edit_qr',
  'delete_qr',
  'view_sessions',
  'view_audit',
  'export_data',
];

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} es requerido para preparar usuarios locales`);
  }
  return value;
}

export function getInitialUsers(): InitialUser[] {
  const sharedLocalPassword = required('ADMIN_PASSWORD');

  return [
    {
      username: 'superadmin',
      email: required('ADMIN_EMAIL'),
      password: sharedLocalPassword,
      role: 'superadmin',
      permissions: [...adminPermissions, 'manage_users', 'system_settings'],
    },
    {
      username: 'admin',
      email: process.env.SEED_ADMIN_EMAIL || 'admin@qr-deco.local',
      password: process.env.SEED_ADMIN_PASSWORD || sharedLocalPassword,
      role: 'admin',
      permissions: adminPermissions,
    },
    {
      username: 'viewer',
      email: process.env.SEED_VIEWER_EMAIL || 'viewer@qr-deco.local',
      password: process.env.SEED_VIEWER_PASSWORD || sharedLocalPassword,
      role: 'viewer',
      permissions: ['view_qr', 'view_sessions'],
    },
  ];
}
