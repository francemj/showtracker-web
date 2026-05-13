import { QueryClient, type QueryFunction } from "@tanstack/react-query"

let getApiToken: () => Promise<string | null> = async () => null
let apiBaseUrl = ""

export function setApiTokenGetter(fn: () => Promise<string | null>) {
  getApiToken = fn
}

// Mobile apps need an absolute base URL; web app passes "" (uses relative paths)
export function setApiBaseUrl(url: string) {
  apiBaseUrl = url.replace(/\/$/, "")
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText
    throw new Error(`${res.status}: ${text}`)
  }
}

function resolveUrl(url: string): string {
  return url.startsWith("http") ? url : `${apiBaseUrl}${url}`
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const token = await getApiToken()
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await fetch(resolveUrl(url), {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  })

  await throwIfResNotOk(res)
  return res
}

type UnauthorizedBehavior = "returnNull" | "throw"

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = await getApiToken()
    const res = await fetch(resolveUrl(queryKey.join("/") as string), {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null
    }

    await throwIfResNotOk(res)
    return await res.json()
  }

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        queryFn: getQueryFn({ on401: "throw" }),
        refetchInterval: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
