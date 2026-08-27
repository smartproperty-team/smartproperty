// ===========================================
// SmartProperty - Permission Utilities
// ===========================================
// Single source of truth for all role-based
// permission checks. Import these helpers
// instead of doing inline role comparisons
// across components.
// ===========================================

import type { User } from "@/types/auth";
import { UserRole } from "@/types/auth";

/**
 * Roles that can create, update, and delete properties.
 * Tenant is intentionally excluded — read-only.
 */
const PROPERTY_MANAGERS: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.OWNER,
  UserRole.BRANCH_MANAGER,
  UserRole.REAL_ESTATE_AGENT,
  UserRole.RENTAL_MANAGER,
];

/**
 * Roles that can create properties.
 */
const PROPERTY_CREATORS: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.OWNER,
  UserRole.REAL_ESTATE_AGENT,
];

/**
 * Roles that can access user administration.
 */
const USER_ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN];

/**
 * Roles that can review verifications.
 */
const VERIFICATION_REVIEW_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.BRANCH_MANAGER,
];

const APPLICATION_REVIEW_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.BRANCH_MANAGER,
  UserRole.REAL_ESTATE_AGENT,
  UserRole.RENTAL_MANAGER,
];

const LEASE_MANAGEMENT_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.OWNER,
  UserRole.BRANCH_MANAGER,
  UserRole.REAL_ESTATE_AGENT,
  UserRole.RENTAL_MANAGER,
];

const LEASE_PARTICIPANT_ROLES: UserRole[] = [
  UserRole.TENANT,
  ...LEASE_MANAGEMENT_ROLES,
];

const MAINTENANCE_INTAKE_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.BRANCH_MANAGER,
];

const MAINTENANCE_PROVIDER_ROLES: UserRole[] = [UserRole.SERVICE_PROVIDER];

const AGENCY_ONBOARDING_ROLES: UserRole[] = [UserRole.BRANCH_MANAGER];

const FAVORITES_ROLES: UserRole[] = [UserRole.TENANT];

const REVIEW_MODERATION_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.OWNER,
  UserRole.BRANCH_MANAGER,
  UserRole.REAL_ESTATE_AGENT,
  UserRole.RENTAL_MANAGER,
];

const ACCOUNTING_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ACCOUNTANT_ADMIN_ASSISTANT,
];

function hasRole(
  user: User | null | undefined,
  allowedRoles: UserRole[],
): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role as UserRole);
}

/**
 * Can the user add, edit, or delete a property?
 *
 * @example
 * const canManage = canManageProperties(user);
 * {canManage && <Link to="/properties/new">Add</Link>}
 */
export function canManageProperties(user: User | null | undefined): boolean {
  return hasRole(user, PROPERTY_MANAGERS);
}

/**
 * Can the user create a property?
 */
export function canCreateProperties(user: User | null | undefined): boolean {
  return hasRole(user, PROPERTY_CREATORS);
}

/**
 * Is the user a tenant (read-only access to properties)?
 */
export function isTenant(user: User | null | undefined): boolean {
  return user?.role === UserRole.TENANT;
}

/**
 * Is the user a platform super administrator?
 */
export function isPlatformAdmin(user: User | null | undefined): boolean {
  return hasRole(user, USER_ADMIN_ROLES);
}

/**
 * Backward-compatible alias.
 */
export function isAdmin(user: User | null | undefined): boolean {
  return isPlatformAdmin(user);
}

/**
 * Can access super administrator users page.
 */
export function canAccessAdminUsers(user: User | null | undefined): boolean {
  return hasRole(user, USER_ADMIN_ROLES);
}

/**
 * Can access verification review pages.
 */
export function canReviewVerifications(user: User | null | undefined): boolean {
  return hasRole(user, VERIFICATION_REVIEW_ROLES);
}

/**
 * Can review and process rental applications.
 */
export function canReviewApplications(user: User | null | undefined): boolean {
  return hasRole(user, APPLICATION_REVIEW_ROLES);
}

/**
 * Can access lease workspace pages.
 */
export function canAccessLeases(user: User | null | undefined): boolean {
  return hasRole(user, LEASE_PARTICIPANT_ROLES);
}

/**
 * Can perform lease management actions.
 */
export function canManageLeases(user: User | null | undefined): boolean {
  return hasRole(user, LEASE_MANAGEMENT_ROLES);
}

/**
 * Can submit owner/branch manager maintenance intake requests.
 */
export function canCreateMaintenanceRequest(
  user: User | null | undefined,
): boolean {
  return hasRole(user, MAINTENANCE_INTAKE_ROLES);
}

/**
 * Can view status of own maintenance requests.
 */
export function canTrackMaintenanceRequests(
  user: User | null | undefined,
): boolean {
  return hasRole(user, MAINTENANCE_INTAKE_ROLES);
}

/**
 * Can access service provider maintenance management.
 */
export function canManageAssignedMaintenance(
  user: User | null | undefined,
): boolean {
  return hasRole(user, MAINTENANCE_PROVIDER_ROLES);
}

/**
 * Can access agency onboarding workflow.
 */
export function canManageAgencyOnboarding(
  user: User | null | undefined,
): boolean {
  return hasRole(user, AGENCY_ONBOARDING_ROLES);
}

/**
 * Can access favorites workspace.
 */
export function canManageFavorites(user: User | null | undefined): boolean {
  return hasRole(user, FAVORITES_ROLES);
}

/**
 * Can access review moderation workflows.
 */
export function canModerateReviews(user: User | null | undefined): boolean {
  return hasRole(user, REVIEW_MODERATION_ROLES);
}

/**
 * Can access the accountant dashboard (income reports, analytics, exports).
 */
export function canAccessAccounting(user: User | null | undefined): boolean {
  return hasRole(user, ACCOUNTING_ROLES);
}

/**
 * Is the user an owner?
 */
export function isOwner(user: User | null | undefined): boolean {
  return user?.role === UserRole.OWNER;
}

/**
 * Is the user a manager?
 */
export function isManager(user: User | null | undefined): boolean {
  return (
    user?.role === UserRole.REAL_ESTATE_AGENT ||
    user?.role === UserRole.BRANCH_MANAGER ||
    user?.role === UserRole.RENTAL_MANAGER
  );
}
