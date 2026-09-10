import express, { type Request, Response, NextFunction } from "express"
import fileUpload from "express-fileupload"
import cors from "cors"
import "../server/env-config"
import { APP_URL } from "../server/lib/app-url"
import { registerRoutes } from "../server/routes"

// Detect if running on Vercel
const isVercel = !!process.env.VERCEL

// Simple log function that works everywhere
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
  console.log(`${formattedTime} [${source}] ${message}`)
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Create and configure Express app
const app = express()

// CORS middleware.
//
// This used to reflect any origin, which was harmless while every request
// carried a bearer token. Now that web sessions ride in a cookie, reflecting
// arbitrary origins with credentials:true would leave SameSite=Lax as the only
// thing standing between a hostile page and an authenticated response — so the
// allowlist is the second lock.
//
// A request with no Origin is allowed through: that is the native mobile app,
// where CORS is not a control that exists. It carries a bearer token and is
// authorised on that basis, not on its origin.
const allowedOrigins = new Set([APP_URL])

app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, !origin || allowedOrigins.has(origin)),
    credentials: true,
  })
)

// JSON body parser
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf
    },
  })
)
app.use(express.urlencoded({ extended: false }))

// File upload middleware
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  })
)

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now()
  const path = req.path
  let capturedJsonResponse: Record<string, any> | undefined = undefined

  const originalResJson = res.json
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson
    return originalResJson.apply(res, [bodyJson, ...args])
  }

  res.on("finish", () => {
    const duration = Date.now() - start
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…"
      }

      log(logLine)
    }
  })

  next()
})

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500
  const message = err.message || "Internal Server Error"

  res.status(status).json({ message })
})

// Vercel serverless: init state and handler (export must be top-level)
let appInitialized = false
let initPromise: Promise<void> | null = null

async function initializeApp() {
  if (appInitialized) return
  if (initPromise) return initPromise
  initPromise = (async () => {
    await registerRoutes(app)
    appInitialized = true
  })()
  return initPromise
}

// @vercel/node uses this when deployed; converts between Vercel and Express req/res
export default async function handler(req: any, res: any) {
  await initializeApp()
  return new Promise<void>((resolve) => {
    app(req, res, () => resolve())
  })
}

if (!isVercel) {
  // Local development/production server mode
  ;(async () => {
    const server = await registerRoutes(app)

    // Dynamically import vite module only for local dev (uses import.meta which doesn't work in CommonJS)
    // vite.ts is in dev/ directory (not server/) because it needs ESM for @tailwindcss/vite
    const { setupVite, serveStatic } = await import("../dev/vite")

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server)
    } else {
      serveStatic(app)
    }

    const port = parseInt(process.env.PORT || "3000", 10)
    server.listen(
      {
        port,
        host: "0.0.0.0",
      },
      () => {
        log(`serving on port ${port}`)
      }
    )
  })()
}
