import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const directory = fileURLToPath(new URL('../../keystore/', import.meta.url));
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
if (fs.readdirSync(directory).some(name => /\.jks$|keystore\.properties$/.test(name))) throw new Error('Signing files already exist; keep them to preserve update compatibility.');
const password = randomBytes(32).toString('hex');
execFileSync('keytool', ['-genkeypair', '-noprompt', '-storetype', 'PKCS12', '-keystore', directory + 'zhulongji.jks',
  '-alias', 'zhulongji', '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000',
  '-dname', 'CN=Zhulongji, OU=Game, O=Zhulongji', '-storepass:env', 'ZLJ_SIGNING_PASSWORD', '-keypass:env', 'ZLJ_SIGNING_PASSWORD'],
  { env: { ...process.env, ZLJ_SIGNING_PASSWORD: password }, stdio: 'pipe' });
fs.chmodSync(directory + 'zhulongji.jks', 0o600);
fs.writeFileSync(directory + 'keystore.properties', `storeFile=zhulongji.jks\nstorePassword=${password}\nkeyAlias=zhulongji\nkeyPassword=${password}\n`, { mode: 0o600 });
console.log('Signing identity created in ignored keystore/. Back up this folder privately; future APK updates must use this identity.');
