/** Stable API path for profile images stored in the database. */
export function profileImageApiPath(userId: string) {
  return `/api/profile/image/${userId}`;
}

/**
 * Normalize profile image URLs for clients (web + mobile).
 * Legacy disk paths are mapped to the DB-backed image API route.
 */
export function resolveProfileImageUrl(
  userId: string | null | undefined,
  profileImage: string | null | undefined,
): string | null {
  if (!profileImage || profileImage === 'null') return null;
  if (
    profileImage.startsWith('data:') ||
    profileImage.startsWith('http://') ||
    profileImage.startsWith('https://')
  ) {
    return profileImage;
  }
  if (!userId) return profileImage;
  if (profileImage.startsWith('/api/profile/image/')) {
    return profileImage;
  }
  return profileImageApiPath(userId);
}
