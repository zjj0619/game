import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { compareVersions } from '../src/engine/update-policy.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const info = JSON.parse(fs.readFileSync(path.join(root, 'version.json')));
compareVersions(info.version, info.version);
if (!Number.isSafeInteger(info.versionCode) || info.versionCode < 1) throw new Error('versionCode must be a positive integer');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json')));
if (process.argv[2] === 'bump') {
  const version=process.argv[3], versionCode=process.argv[4] ? Number(process.argv[4]) : info.versionCode+1;
  if(compareVersions(version,info.version)<=0 || !Number.isSafeInteger(versionCode) || versionCode<=info.versionCode) throw new Error('Both release version and Android versionCode must increase');
  info.version=version; info.versionCode=versionCode; pkg.version=version; lock.version=version; lock.packages[''].version=version;
  for(const [name,data] of [['version.json',info],['package.json',pkg],['package-lock.json',lock]]) fs.writeFileSync(path.join(root,name),JSON.stringify(data,null,2)+'\n');
  console.log(`Version updated to ${version} (${versionCode})`); process.exit(0);
}
if (pkg.version !== info.version || lock.version !== info.version || lock.packages[''].version !== info.version) throw new Error('package.json, package-lock.json and version.json must use the same version');
if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== `v${info.version}`) throw new Error('Release tag must match version.json');
if (process.argv[2] === 'check') {
  console.log(`Version ${info.version} (${info.versionCode}) verified`);
} else if (process.argv[2] === 'manifest') {
  const apk = path.resolve(process.argv[3] || '');
  const size = fs.statSync(apk).size;
  if (!apk.endsWith('.apk') || !size || size > 1024 ** 3) throw new Error('A valid APK is required');
  const sha256 = await new Promise((resolve, reject) => {
    const digest = crypto.createHash('sha256');
    fs.createReadStream(apk).on('error', reject).on('data', chunk => digest.update(chunk)).on('end', () => resolve(digest.digest('hex')));
  });
  const manifest = { schema: 1, appId: info.appId, version: info.version, versionCode: info.versionCode, file: path.basename(apk), size, sha256 };
  fs.writeFileSync(path.join(path.dirname(apk), 'update.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(path.dirname(apk), 'SHA256SUMS.txt'), `${sha256}  ${path.basename(apk)}\n`);
  console.log(`Update manifest generated for ${manifest.file}`);
} else throw new Error('Usage: node tools/release.mjs check | manifest <apk>');
