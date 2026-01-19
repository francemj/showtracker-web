import { config } from "dotenv"
import { existsSync } from "fs"
import { resolve } from "path"

// Determine the current environment
export const NODE_ENV = process.env.NODE_ENV || "development"

// Load environment-specific configuration
function loadEnvironmentConfig() {
  const envFile = `.env.${NODE_ENV}`
  const envPath = resolve(process.cwd(), envFile)

  // Check if environment-specific file exists
  if (existsSync(envPath)) {
    config({ path: envPath })
    console.log(`Loaded environment config from ${envFile}`)
  } else {
    // Fall back to default .env file
    config()
    console.error(`Environment file ${envFile} not found, falling back to .env`)
  }
}

// Load the configuration
loadEnvironmentConfig()

// Helper functions
export const isDevelopment = () => NODE_ENV === "development"
export const isProduction = () => NODE_ENV === "production"
export const isTest = () => NODE_ENV === "test"
