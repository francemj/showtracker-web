import Constants from "expo-constants"

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>

export const API_URL: string =
  extra.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? ""
export const AUTH0_DOMAIN: string =
  extra.auth0Domain ?? process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? ""
export const AUTH0_CLIENT_ID: string =
  extra.auth0ClientId ?? process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID ?? ""
