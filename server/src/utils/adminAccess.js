import { config } from '../config/index.js';
import { AdminLog } from '../models/AdminLog.js';

// Who can do what in the admin panel. ADMIN_EMAILS are super admins; others get a role.
export const ADMIN_ROLES = ['super', 'moderator', 'support', 'finance'];

const PERMS = {
  super: ['*'],
  moderator: ['view', 'users.manage', 'verify', 'jobs', 'review', 'reports', 'chats'],
  support: ['view', 'users.edit', 'reports', 'tickets'],
  finance: ['view', 'credits', 'payments', 'export'],
};
// Every permission, for the client (sidebar) and documentation.
export const ALL_PERMS = [
  'view', 'users.manage', 'users.edit', 'users.delete', 'verify', 'jobs', 'review', 'reports', 'chats', 'tickets',
  'credits', 'payments', 'export', 'announce', 'settings', 'admins', 'logs',
];

export const isAdminEmail = (email) => config.adminEmails.includes(String(email).toLowerCase());

// The admin role of a user (null = not an admin). An unverified email never counts.
export function adminRoleOf(user) {
  if (!user || user.emailVerified === false) return null;
  if (isAdminEmail(user.email)) return 'super';
  return user.adminRole || null;
}

export const permsOf = (role) => (!role ? [] : PERMS[role].includes('*') ? ALL_PERMS : PERMS[role]);
export const can = (role, perm) => Boolean(role) && (PERMS[role].includes('*') || PERMS[role].includes(perm));

// Records an admin action. Never fails the request.
export async function logAdmin(req, action, { targetType, targetId, summary } = {}) {
  try {
    await AdminLog.create({ admin: req.user.id, adminEmail: req.admin?.email, action, targetType, targetId: targetId && String(targetId), summary: summary?.slice(0, 500) });
  } catch (err) {
    console.error('[admin log] failed:', err.message);
  }
}
