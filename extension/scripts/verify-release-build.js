const fs = require("fs")
const path = require("path")

const buildDir = path.join(__dirname, "..", "build", "chrome-mv3-prod")
const manifestPath = path.join(buildDir, "manifest.json")
if (!fs.existsSync(manifestPath)) throw new Error("Release manifest was not produced")

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
const interceptor = manifest.content_scripts?.find((entry) =>
  entry.js?.some((file) => file.includes("main-world-interceptor"))
)
if (!interceptor || interceptor.world !== "MAIN" || interceptor.run_at !== "document_start") {
  throw new Error("MAIN-world submission interceptor is missing from the release manifest")
}
if (manifest.host_permissions?.includes("http://localhost:8080/*")) {
  throw new Error("Release manifest still includes localhost backend permission")
}
if (!manifest.host_permissions?.some((permission) => permission.startsWith("https://") && !permission.includes("leetcode.com") && !permission.includes("github.com") && !permission.includes("entranthub.com") && !permission.includes("zerotrac.github.io"))) {
  throw new Error("Release manifest is missing the configured HTTPS backend permission")
}

console.log("Release manifest verified")
