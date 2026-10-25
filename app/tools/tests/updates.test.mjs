import test from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, validateRelease, validateManifest, releaseAssetUrl, githubError } from '../../src/engine/update-policy.js';

const config = { version:'2.1.0',versionCode:3,appId:'com.jiaqi.zhulongji',repository:'zjj0619/game' };
const base='https://github.com/zjj0619/game/releases/download/v2.2.0/';
function fixture() {
  return {
    release:{tag_name:'v2.2.0',draft:false,prerelease:false,body:'新版本',assets:[
      {name:'update.json',state:'uploaded',browser_download_url:base+'update.json'},
      {name:'zhulongji-2.2.0.apk',state:'uploaded',size:4096,digest:'sha256:'+'a'.repeat(64),browser_download_url:base+'zhulongji-2.2.0.apk'}]},
    manifest:{schema:1,appId:config.appId,version:'2.2.0',versionCode:4,file:'zhulongji-2.2.0.apk',size:4096,sha256:'a'.repeat(64)},
  };
}
test('semantic versions compare numerically, and reject ambiguous tags',()=>{
  assert.equal(compareVersions('v2.10.0','2.9.9'),1);
  assert.equal(compareVersions('2.1.0','v2.1.0'),0);
  assert.throws(()=>compareVersions('latest','2.1.0'));
  assert.throws(()=>compareVersions('2.2.0-beta','2.1.0'));
});
test('a public stable release with matching metadata can update',()=>{
  const {release,manifest}=fixture(); validateRelease(release,config);
  const result=validateManifest(manifest,release,config);
  assert.equal(result.available,true);assert.equal(result.url,base+manifest.file);
});
test('draft, prerelease, and incomplete uploads never install',()=>{
  for(const change of [{draft:true},{prerelease:true},{assets:[]}]) assert.throws(()=>validateRelease({...fixture().release,...change},config));
});
test('foreign repositories, HTTP, credentials and redirects disguised as query strings are rejected',()=>{
  for(const url of [base.replace('/zjj0619/game/','/attacker/game/')+'a.apk',base.replace('https:','http:')+'a.apk',base.replace('github.com','github.com.evil.test')+'a.apk',base+'a.apk?next=evil',base.replace('github.com','x:pass@github.com')+'a.apk'])
    assert.throws(()=>releaseAssetUrl(url,config.repository,'v2.2.0','.apk'));
});
test('identity, tag, size, checksum and monotonic Android version are all checked',()=>{
  for(const change of [{appId:'other.game'},{version:'9.0.0'},{size:123},{sha256:'bad'},{sha256:'b'.repeat(64)},{versionCode:3}]) {
    const {release,manifest}=fixture(); assert.throws(()=>validateManifest({...manifest,...change},release,config));
  }
});
test('equal and older installed versions are never offered as an upgrade',()=>{
  const {release,manifest}=fixture();
  assert.equal(validateManifest(manifest,release,config,{version:'2.2.0',versionCode:4}).available,false);
  assert.equal(validateManifest(manifest,release,config,{version:'3.0.0',versionCode:10}).available,false);
});
test('missing releases and rate limits are understandable without claiming up to date',()=>{
  assert.match(githubError(404),/尚未发布/);assert.match(githubError(403),/稍后/);assert.match(githubError(500),/暂时无法/);
});
