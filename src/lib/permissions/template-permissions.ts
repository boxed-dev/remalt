/**
 * Template Publishing Permissions
 *
 * Only authorized administrators can publish workflows as public templates.
 * This module provides both client and server-side permission checking.
 */

/**
 * List of email addresses authorized to publish public templates
 */
export const TEMPLATE_ADMIN_EMAILS = [
  'ackash@remalt.com',
  'rishabh@connectivity.cx',
  'aakash.bhalla9792@gmail.com',
] as const;

/**
 * Check if a user email has permission to publish templates
 * @param email - User's email address
 * @returns true if user can publish templates, false otherwise
 */
export function canPublishTemplates(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase();
  return TEMPLATE_ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === normalizedEmail);
}

/**
 * Validate template publishing permission, throwing an error if unauthorized
 * @param email - User's email address
 * @throws Error if user is not authorized to publish templates
 */
export function requirePublishPermission(email: string | null | undefined): void {
  if (!canPublishTemplates(email)) {
    throw new Error('Unauthorized: Only template administrators can publish templates');
  }
}

/**
 * Check if a user can manage (publish/unpublish) a specific template
 * @param email - User's email address
 * @param templateUserId - The user ID who owns the template
 * @param currentUserId - The current user's ID
 * @returns true if user can manage the template
 */
export function canManageTemplate(
  email: string | null | undefined,
  templateUserId: string,
  currentUserId: string
): boolean {
  // User must be both the owner and have admin permissions
  return currentUserId === templateUserId && canPublishTemplates(email);
}
