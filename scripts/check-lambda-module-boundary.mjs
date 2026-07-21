// Guards against a Vercel Lambda crash we hit in production: `server/` and
// `api/` are CommonJS ("type": "commonjs"), but vercel.json's
// `includeFiles` copies them (and anything they reach into, e.g.
// packages/shared) as separate files rather than bundling them into the
// function. If a CommonJS file under server/ or api/ imports a relative
// path that resolves into a directory declaring "type": "module", the
// compiled require() crashes at runtime with ERR_REQUIRE_ESM — a failure
// mode `tsc` and local `tsx` dev/start don't surface, since both handle
// ESM/CJS interop transparently. This statically catches that boundary
// violation before it ships.
import { readFileSync, existsSync, statSync, readdirSync } from "fs"
import { join, dirname, resolve, relative } from "path"
import { fileURLToPath } from "url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SCAN_DIRS = ["server", "api"]
const RESOLVE_EXTS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]

const IMPORT_RE = /(?:from\s+|require\()\s*["'](\.\.?\/[^"']+)["']/g

const packageTypeCache = new Map()

function nearestPackageType(startDir) {
  if (packageTypeCache.has(startDir)) return packageTypeCache.get(startDir)
  let dir = startDir
  while (true) {
    const pkgPath = join(dir, "package.json")
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
      const type = pkg.type === "module" ? "module" : "commonjs"
      packageTypeCache.set(startDir, type)
      return type
    }
    const parent = dirname(dir)
    if (parent === dir) {
      packageTypeCache.set(startDir, "commonjs")
      return "commonjs"
    }
    dir = parent
  }
}

function resolveRelativeImport(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier)
  for (const ext of RESOLVE_EXTS) {
    const candidate = base + ext
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

function walkTsFiles(dir) {
  const results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkTsFiles(full))
    } else if (/\.tsx?$/.test(entry.name)) {
      results.push(full)
    }
  }
  return results
}

const files = SCAN_DIRS.flatMap((dir) => walkTsFiles(join(repoRoot, dir)))

const violations = []

for (const file of files) {
  const source = readFileSync(file, "utf8")
  const importerType = nearestPackageType(dirname(file))
  for (const match of source.matchAll(IMPORT_RE)) {
    const specifier = match[1]
    const resolved = resolveRelativeImport(file, specifier)
    if (!resolved) continue // unresolved (e.g. .json, asset) — not our concern here
    const targetType = nearestPackageType(dirname(resolved))
    if (importerType !== "module" && targetType === "module") {
      violations.push({
        file: relative(repoRoot, file),
        specifier,
        resolved: relative(repoRoot, resolved),
      })
    }
  }
}

if (violations.length > 0) {
  console.error(
    "✖ Found relative import(s) from a CommonJS file (server/, api/) into an ESM-declared package.\n" +
      "  This crashes on Vercel with ERR_REQUIRE_ESM (server/api are copied as separate\n" +
      "  files, not bundled — see vercel.json's includeFiles), even though it works fine\n" +
      "  locally under tsx/tsc. Duplicate the needed code into server/lib instead of\n" +
      "  importing across this boundary.\n"
  )
  for (const v of violations) {
    console.error(
      `  ${v.file}: imports "${v.specifier}" -> ${v.resolved} (type: "module")`
    )
  }
  process.exit(1)
}

console.log(
  `✓ No CommonJS -> ESM boundary violations found (${files.length} files scanned).`
)
