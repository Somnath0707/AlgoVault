const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, '../build/chrome-mv3-dev'),
  path.join(__dirname, '../build/chrome-mv3-prod')
];

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

const envValues = { ...readEnvFile(path.join(__dirname, '..', '.env')), ...process.env };

function backendHostPermission() {
  const rawUrl = envValues.PLASMO_PUBLIC_BACKEND_URL;
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return `${url.origin}/*`;
  } catch {
    throw new Error('PLASMO_PUBLIC_BACKEND_URL must be a valid http(s) URL.');
  }
}

const exactBackendPermission = backendHostPermission();

// Sync chrome-mv3-prod to chrome-mv3-dev so both build targets have identical updated files
const prodDir = path.join(__dirname, '../build/chrome-mv3-prod');
const devDir = path.join(__dirname, '../build/chrome-mv3-dev');
if (fs.existsSync(prodDir) && fs.readdirSync(prodDir).length > 2) {
  fs.cpSync(prodDir, devDir, { recursive: true });
  console.log(`Synced build files from chrome-mv3-prod to chrome-mv3-dev`);
}

dirs.forEach(dir => {
  const manifestPath = path.join(dir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      let modified = false;
      if (exactBackendPermission && Array.isArray(manifest.host_permissions)
          && !manifest.host_permissions.includes(exactBackendPermission)) {
        // A production extension must not retain localhost permission after it
        // has been configured for a public HTTPS API.
        manifest.host_permissions = manifest.host_permissions.filter(
          permission => permission !== 'http://localhost:8080/*'
        );
        manifest.host_permissions.push(exactBackendPermission);
        modified = true;
        console.log(`Added exact backend host permission in ${manifestPath}`);
      }
      if (Array.isArray(manifest.host_permissions)) {
        const uniquePermissions = [...new Set(manifest.host_permissions)];
        if (uniquePermissions.length !== manifest.host_permissions.length) {
          manifest.host_permissions = uniquePermissions;
          modified = true;
        }
      }
      if (Array.isArray(manifest.web_accessible_resources)) {
        const seenResources = new Set();
        const uniqueResources = manifest.web_accessible_resources.filter((resource) => {
          const key = JSON.stringify(resource);
          if (seenResources.has(key)) return false;
          seenResources.add(key);
          return true;
        });
        if (uniqueResources.length !== manifest.web_accessible_resources.length) {
          manifest.web_accessible_resources = uniqueResources;
          modified = true;
        }
      }
      if (Array.isArray(manifest.content_scripts)) {
        manifest.content_scripts.forEach(cs => {
          if (Array.isArray(cs.js)) {
            const hasInterceptor = cs.js.some(file => file.includes('main-world-interceptor'));
            if (hasInterceptor && cs.world !== 'MAIN') {
              cs.world = 'MAIN';
              modified = true;
              console.log(`Updated world to MAIN for main-world-interceptor in ${manifestPath}`);
            }
          }
        });
      }
      if (modified) {
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
      }
    } catch (e) {
      console.error(`Error updating manifest at ${manifestPath}:`, e);
    }
  }

});
