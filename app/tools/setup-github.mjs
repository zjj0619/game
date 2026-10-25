import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const config=JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url)));
const directory=fileURLToPath(new URL('../../keystore/',import.meta.url));
const properties=Object.fromEntries(fs.readFileSync(directory+'keystore.properties','utf8').split(/\r?\n/).filter(line=>line.includes('=')).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
execFileSync('gh',['auth','status'],{stdio:'ignore'});
const key=properties.storeFile.startsWith('/')?properties.storeFile:directory+properties.storeFile;
const secrets={ANDROID_KEYSTORE_BASE64:fs.readFileSync(key).toString('base64'),ANDROID_STORE_PASSWORD:properties.storePassword,ANDROID_KEY_PASSWORD:properties.keyPassword,ANDROID_KEY_ALIAS:properties.keyAlias};
for(const [name,value] of Object.entries(secrets)) {
  if(!value)throw new Error(`Missing ${name}`);
  execFileSync('gh',['secret','set',name,'--repo',config.repository],{input:value,stdio:['pipe','pipe','pipe']});
  console.log(`${name} configured`);
}
console.log('Signing secrets configured. No secret values were printed or added to Git.');
