import Constants from "expo-constants"

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>

// EXPO_PUBLIC_API_URL takes priority so you can point a local build at a
// local backend (e.g. `EXPO_PUBLIC_API_URL=http://localhost:3000 npm run ios`)
// without editing app.json's extra.apiUrl.
export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? ""
export const AUTH0_DOMAIN: string =
  extra.auth0Domain ?? process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? ""
export const AUTH0_CLIENT_ID: string =
  extra.auth0ClientId ?? process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID ?? ""
