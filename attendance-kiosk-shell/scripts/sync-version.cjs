const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const versionJsonPath = path.join(rootDir, 'version.json');
const mainPath = path.join(rootDir, 'src', 'main.cjs');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const mainSource = fs.readFileSync(mainPath, 'utf8');
const defaultUrlMatch = mainSource.match(/const DEFAULT_KIOSK_URL = '([^']+)'/);

const manifest = {
  appId: packageJson.build?.appId || '',
  name: packageJson.name,
  productName: packageJson.build?.productName || packageJson.name,
  version: packageJson.version,
  defaultKioskUrl: defaultUrlMatch?.[1] || '',
};

fs.writeFileSync(versionJsonPath, `${JSON.stringify(manifest, null, 2)}\n`);

const distSrc = path.join(rootDir, '..', 'attendance', 'dist');
const distDest = path.join(rootDir, 'dist');
if (fs.existsSync(distSrc)) {
  fs.cpSync(distSrc, distDest, { recursive: true });
  console.log(`Synced attendance web build to kiosk shell dist folder.`);
}

console.log(`Synced kiosk shell version manifest: ${manifest.productName} ${manifest.version}`);
