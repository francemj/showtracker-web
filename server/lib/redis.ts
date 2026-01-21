import { Redis } from "@upstash/redis"

const upstashRedisUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN

if (!upstashRedisUrl || !upstashRedisToken) {
  throw new Error(
    "Upstash Redis is required. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables."
  )
}

export const redis = new Redis({
  url: upstashRedisUrl,
  token: upstashRedisToken,
})
