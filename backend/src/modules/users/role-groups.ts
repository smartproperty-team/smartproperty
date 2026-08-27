import { UserRole } from './entities/user.entity';

export const PLATFORM_ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN];

export const TENANT_ONLY_ROLES: UserRole[] = [UserRole.TENANT];

export const PROPERTY_CREATOR_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.BRANCH_MANAGER,
  UserRole.REAL_ESTATE_AGENT,
  UserRole.RENTAL_MANAGER,
  ...PLATFORM_ADMIN_ROLES,
];

export const PROPERTY_MANAGEMENT_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.BRANCH_MANAGER,
  UserRole.REAL_ESTATE_AGENT,
  UserRole.RENTAL_MANAGER,
  ...PLATFORM_ADMIN_ROLES,
];

// Listing media uploads are restricted to publishing actors.
export const PROPERTY_MEDIA_UPLOAD_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.BRANCH_MANAGER,
  UserRole.REAL_ESTATE_AGENT,
  ...PLATFORM_ADMIN_ROLES,
];

export const STORAGE_FILE_DELETE_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.BRANCH_MANAGER,
  UserRole.REAL_ESTATE_AGENT,
  UserRole.RENTAL_MANAGER,
  ...PLATFORM_ADMIN_ROLES,
];

export const VERIFICATION_REVIEW_ROLES: UserRole[] = [
  UserRole.BRANCH_MANAGER,
  ...PLATFORM_ADMIN_ROLES,
];

export const APPLICATION_REVIEW_ROLES: UserRole[] = [
  UserRole.BRANCH_MANAGER,
  UserRole.REAL_ESTATE_AGENT,
  UserRole.RENTAL_MANAGER,
  ...PLATFORM_ADMIN_ROLES,
];

export const ACCOUNTING_ROLES: UserRole[] = [
  UserRole.ACCOUNTANT_ADMIN_ASSISTANT,
  ...PLATFORM_ADMIN_ROLES,
];

export const LEASE_MANAGEMENT_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.BRANCH_MANAGER,
  UserRole.REAL_ESTATE_AGENT,
  UserRole.RENTAL_MANAGER,
  ...PLATFORM_ADMIN_ROLES,
];

export const LEASE_PARTICIPANT_ROLES: UserRole[] = [
  UserRole.TENANT,
  ...LEASE_MANAGEMENT_ROLES,
];

export const FAVORITES_ROLES: UserRole[] = [UserRole.TENANT];

export const REVIEW_AUTHOR_ROLES: UserRole[] = [UserRole.TENANT];

export const REVIEW_MODERATION_ROLES: UserRole[] = [
  UserRole.OWNER,
  ...APPLICATION_REVIEW_ROLES,
];

export const SELF_REGISTRABLE_ROLES: UserRole[] = [
  UserRole.TENANT,
  UserRole.OWNER,
  UserRole.REAL_ESTATE_AGENT,
  UserRole.SERVICE_PROVIDER,
];

export const DEFAULT_REGISTRATION_ROLE = UserRole.TENANT;

export function hasPlatformAdminRole(role?: UserRole | string): boolean {
  if (!role) {
    return false;
  }

  return PLATFORM_ADMIN_ROLES.includes(role as UserRole);
}
