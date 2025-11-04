import { SignJWT } from 'jose';

/**
 * Generates a JWT token for FeatureBase authentication
 * @param userId - The user's unique identifier
 * @param email - The user's email address
 * @param name - The user's full name (optional)
 * @returns Promise<string> - The signed JWT token
 */
export async function generateFeaturebaseJWT(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  const secret = process.env.FEATUREBASE_JWT_SECRET;

  if (!secret) {
    throw new Error('FEATUREBASE_JWT_SECRET is not configured');
  }

  // Convert secret to Uint8Array for jose
  const secretKey = new TextEncoder().encode(secret);

  // Create JWT payload according to FeatureBase requirements
  const payload = {
    userId,
    email,
    ...(name && { name }),
  };

  // Sign the JWT with HS256 algorithm
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('24h') // Token expires in 24 hours
    .sign(secretKey);

  return jwt;
}
