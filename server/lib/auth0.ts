import { redis } from "./redis"

const auth0Domain = process.env.AUTH0_DOMAIN

if (!auth0Domain) {
  console.warn("AUTH0_DOMAIN not configured. Auth0 integration disabled.")
}

export interface Auth0UserInfo {
  sub: string
  email?: string
  name?: string
  picture?: string
}

// Cache TTL: 5 minutes (300 seconds for Redis)
const CACHE_TTL_SECONDS = 5 * 60

/**
 * Gets a simple hash of the token for caching (first 50 chars should be unique enough)
 */
function getTokenHash(token: string): string {
  // Use first part of token as cache key (it contains header info that changes per token)
  return token.substring(0, 50)
}

/**
 * Gets the Redis cache key for a token hash
 */
function getCacheKey(tokenHash: string): string {
  return `auth:token:${tokenHash}`
}

/**
 * Validates an opaque token via Auth0's /userinfo endpoint and extracts the `sub` claim.
 * Results are cached in Redis to reduce API calls.
 */
export async function getSubFromToken(accessToken: string): Promise<string> {
  if (!auth0Domain) {
    throw new Error("Auth0 not configured")
  }

  const tokenHash = getTokenHash(accessToken)
  const cacheKey = getCacheKey(tokenHash)

  // Check Redis cache first
  const cachedSub = await redis.get<string>(cacheKey)
  if (cachedSub) {
    return cachedSub
  }

  // Validate token via Auth0 /userinfo endpoint (validates opaque tokens)
  const userInfo = await getUserFromAccessToken(accessToken)

  // Cache the result in Redis
  await redis.set(cacheKey, userInfo.sub, {
    ex: CACHE_TTL_SECONDS,
  })

  return userInfo.sub
}

/**
 * Fetches user info from Auth0's /userinfo endpoint using an access token.
 * Use this only when you need full user info (email, name, picture).
 * For authentication checks, use getSubFromToken() instead.
 */
export async function getUserFromAccessToken(
  accessToken: string
): Promise<Auth0UserInfo> {
  if (!auth0Domain) {
    throw new Error("Auth0 not configured")
  }

  const url = `https://${auth0Domain}/userinfo`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Invalid or expired token")
    }
    const text = await res.text()
    throw new Error(`Auth0 userinfo failed: ${res.status} ${text}`)
  }

  const json = (await res.json()) as Auth0UserInfo
  if (!json?.sub) {
    throw new Error("Invalid userinfo response: missing sub")
  }
  return json
}
