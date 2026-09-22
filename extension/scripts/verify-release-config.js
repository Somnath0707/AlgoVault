const fs = require("fs")
const path = require("path")

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  return Object.fromEntries(
    fs.readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trimStart().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=")
        return index < 0 ? [line, ""] : [line.slice(0, index).trim(), line.slice(index + 1).trim()]
      })
  )
}

const values = { ...readEnvFile(path.join(__dirname, "..", ".env")), ...process.env }
const backendUrl = values.PLASMO_PUBLIC_BACKEND_URL

if (!backendUrl) {
  throw new Error("PLASMO_PUBLIC_BACKEND_URL is required for a release build")
}

let url
try {
  url = new URL(backendUrl)
} catch {
  throw new Error("PLASMO_PUBLIC_BACKEND_URL must be a valid absolute URL")
}

if (url.protocol !== "https:") {
  throw new Error("Release builds require an HTTPS PLASMO_PUBLIC_BACKEND_URL")
}
if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
  throw new Error("Release builds cannot target localhost")
}
if (!values.PLASMO_PUBLIC_GITHUB_CLIENT_ID || /your-github-oauth-client-id/i.test(values.PLASMO_PUBLIC_GITHUB_CLIENT_ID)) {
  throw new Error("PLASMO_PUBLIC_GITHUB_CLIENT_ID must be configured for a release build")
}

console.log(`Release configuration verified for ${url.origin}`)
