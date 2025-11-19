import { ManagementClient, AuthenticationClient } from "auth0";

const auth0Domain = process.env.AUTH0_DOMAIN;
const auth0ClientId = process.env.AUTH0_CLIENT_ID;
const auth0ClientSecret = process.env.AUTH0_CLIENT_SECRET;

if (!auth0Domain || !auth0ClientId || !auth0ClientSecret) {
  console.warn("Auth0 credentials not configured. Auth0 integration disabled.");
}

export interface Auth0SignupResult {
  auth0Id: string;
  email: string;
  name?: string;
}

export interface Auth0LoginResult {
  auth0Id: string;
  email: string;
  name?: string;
}

export interface Auth0MigrationResult {
  auth0Id: string;
  wasCreated: boolean;
}

export async function signupWithAuth0(
  email: string,
  password: string,
  name: string
): Promise<Auth0SignupResult> {
  if (!auth0Domain || !auth0ClientId || !auth0ClientSecret) {
    throw new Error("Auth0 not configured");
  }

  const management = new ManagementClient({
    domain: auth0Domain,
    clientId: auth0ClientId,
    clientSecret: auth0ClientSecret,
  });

  try {
    const user = await management.users.create({
      connection: "Username-Password-Authentication",
      email,
      password,
      name,
      email_verified: false,
    });

    return {
      auth0Id: user.user_id!,
      email: user.email!,
      name: user.name,
    };
  } catch (error: any) {
    throw new Error(`Auth0 signup failed: ${error.message}`);
  }
}

export async function loginWithAuth0(
  email: string,
  password: string
): Promise<Auth0LoginResult> {
  if (!auth0Domain || !auth0ClientId || !auth0ClientSecret) {
    throw new Error("Auth0 not configured");
  }

  const auth = new AuthenticationClient({
    domain: auth0Domain,
    clientId: auth0ClientId,
    clientSecret: auth0ClientSecret,
  });

  const management = new ManagementClient({
    domain: auth0Domain,
    clientId: auth0ClientId,
    clientSecret: auth0ClientSecret,
  });

  try {
    const tokenResponse = await auth.oauth.passwordGrant({
      username: email,
      password,
      realm: "Username-Password-Authentication",
      scope: "openid profile email",
    });
    
    const users = await management.users.list({
      search_engine: 'v3',
      q: `email:"${email}"`,
      per_page: 1
    });
    
    if (users.data.length === 0) {
      throw new Error("User not found");
    }

    const user = users.data[0];

    return {
      auth0Id: user.user_id!,
      email: user.email!,
      name: user.name,
    };
  } catch (error: any) {
    throw new Error(`Auth0 login failed: ${error.message}`);
  }
}

export async function migrateUserToAuth0(
  userId: string,
  email: string,
  password: string,
  name: string
): Promise<Auth0MigrationResult> {
  if (!auth0Domain || !auth0ClientId || !auth0ClientSecret) {
    throw new Error("Auth0 not configured");
  }

  const management = new ManagementClient({
    domain: auth0Domain,
    clientId: auth0ClientId,
    clientSecret: auth0ClientSecret,
  });

  try {
    const user = await management.users.create({
      connection: "Username-Password-Authentication",
      email,
      password,
      name,
      email_verified: true,
    });

    return {
      auth0Id: user.user_id!,
      wasCreated: true
    };
  } catch (error: any) {
    // Check if user already exists (from a previous failed migration attempt)
    if (error.statusCode === 409 || error.message?.includes("already exists")) {
      console.log(`Auth0 user already exists for ${email}, fetching existing ID`);
      
      try {
        const existingUsers = await management.users.list({
          search_engine: 'v3',
          q: `email:"${email}"`,
          per_page: 1
        });

        if (existingUsers.data.length > 0 && existingUsers.data[0].user_id) {
          return {
            auth0Id: existingUsers.data[0].user_id,
            wasCreated: false
          };
        }
      } catch (fetchError) {
        console.error("Failed to fetch existing Auth0 user:", fetchError);
      }
    }
    
    throw new Error(`Auth0 migration failed: ${error.message}`);
  }
}
