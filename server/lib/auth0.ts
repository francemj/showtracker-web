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

/**
 * Fetches user info from Auth0's /userinfo endpoint using an access token.
 * The token is validated by Auth0; a 401 from /userinfo means the token is invalid.
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
