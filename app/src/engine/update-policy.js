// Shared, dependency-free validation for GitHub release metadata.
export function compareVersions(a, b) {
  const parse = value => {
    const match = String(value).match(/^v?(\d+)\.(\d+)\.(\d+)$/);
    if (!match) throw new Error('版本号格式无效');
    return match.slice(1).map(Number);
  };
  const left = parse(a), right = parse(b);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
}

export function releaseAssetUrl(value, repository, tag, extension) {
  const url = new URL(value);
  const prefix = `/${repository}/releases/download/${encodeURIComponent(tag)}/`;
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash ||
      !url.pathname.startsWith(prefix) || !url.pathname.endsWith(extension) || url.pathname.slice(prefix.length).includes('/')) {
    throw new Error('更新文件不属于本游戏的 GitHub 发布版本');
  }
  return url.href;
}

export function validateRelease(release, config) {
  if (!release || release.draft || release.prerelease) throw new Error('此版本尚未正式发布');
  compareVersions(release.tag_name, config.version);
  const assets = release.assets || [];
  const manifest = assets.find(a => a.name === 'update.json' && a.state === 'uploaded');
  if (!manifest) throw new Error('该发布版本尚未提供手机更新文件');
  releaseAssetUrl(manifest.browser_download_url, config.repository, release.tag_name, '.json');
  return manifest;
}

export function validateManifest(manifest, release, config, installed = config) {
  if (!manifest || manifest.schema !== 1 || manifest.appId !== config.appId ||
      !Number.isSafeInteger(manifest.versionCode) || manifest.versionCode <= 0 ||
      compareVersions(manifest.version, release.tag_name) !== 0) throw new Error('更新清单与发布版本不一致');
  const apk = release.assets.find(a => a.name === manifest.file && a.state === 'uploaded');
  if (!apk || !/\.apk$/.test(manifest.file) || !Number.isSafeInteger(manifest.size) || manifest.size <= 0 || manifest.size > 1024 ** 3 ||
      manifest.size !== apk.size || !/^[a-f0-9]{64}$/i.test(manifest.sha256)) throw new Error('安装包信息不完整，请等待发布完成');
  const url = releaseAssetUrl(apk.browser_download_url, config.repository, release.tag_name, '.apk');
  if (apk.digest && apk.digest.toLowerCase() !== `sha256:${manifest.sha256.toLowerCase()}`) throw new Error('安装包校验信息不一致');
  const versionOrder = compareVersions(manifest.version, installed.version);
  if (versionOrder > 0 && manifest.versionCode <= installed.versionCode) throw new Error('新版安装序号无效，暂时无法升级');
  return { ...manifest, url, notes: String(release.body || '').slice(0, 12000),
    releaseUrl: `https://github.com/${config.repository}/releases/tag/${encodeURIComponent(release.tag_name)}`,
    available: versionOrder > 0 && manifest.versionCode > installed.versionCode };
}

export function githubError(status) {
  if (status === 404) return '尚未发布可安装的新版本';
  if (status === 403 || status === 429) return 'GitHub 检查次数暂时用完，请稍后再试';
  return '暂时无法连接 GitHub，请检查网络后重试';
}
