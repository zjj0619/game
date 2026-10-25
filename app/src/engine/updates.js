import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import config from '../../version.json';
import { settings, saveSettings, S, save, AUTO } from './state.js';
import { h, btn, panel, toast } from './ui.js';
import { validateRelease, validateManifest, githubError, compareVersions } from './update-policy.js';

export const APP_VERSION = config.version;
const native = registerPlugin('AppUpdater');
const android = () => Capacitor.getPlatform() === 'android';
let pendingCheck = null, latest = null, activePanel = null, notified = '', downloading = false;

async function json(url) {
  if (android()) {
    const response = await CapacitorHttp.get({ url, headers: { Accept: 'application/vnd.github+json' }, connectTimeout: 12000, readTimeout: 15000, responseType: 'json' });
    if (response.status !== 200) throw new Error(githubError(response.status));
    return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  }
  const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(githubError(response.status));
  return response.json();
}

export async function checkForUpdate() {
  if (pendingCheck) return pendingCheck;
  pendingCheck = (async () => {
    const installed = android() ? await native.getInfo() : config;
    const release = await json(`https://api.github.com/repos/${config.repository}/releases/latest`);
    const asset = validateRelease(release, config);
    if(!android()) {
      latest={version:release.tag_name.replace(/^v/,''),available:compareVersions(release.tag_name,config.version)>0,
        size:release.assets.find(a=>a.name.endsWith('.apk'))?.size||0,notes:String(release.body||''),releaseUrl:`https://github.com/${config.repository}/releases/tag/${encodeURIComponent(release.tag_name)}`};
      return latest;
    }
    const manifest = await json(asset.browser_download_url);
    latest = validateManifest(manifest, release, config, installed);
    settings.lastUpdateCheck = Date.now(); saveSettings();
    return latest;
  })().finally(() => { pendingCheck = null; });
  return pendingCheck;
}

export function openUpdates() {
  if (activePanel?.root.isConnected) return;
  const p = panel('游戏更新', { cls: 'updates' }); activePanel = p;
  const status = h('p.update-status', { role: 'status', 'aria-live': 'polite' }, '可以手动检查最新版本。');
  const detail = h('div.update-detail');
  const progress = h('progress.update-progress', { max: 100, value: 0, 'aria-label': '安装包下载进度', hidden: true });
  const action = btn('下载更新', () => download(), 'gold'); action.hidden = true;
  const cancel = btn('暂停下载', () => native.cancelDownload().catch(e => { status.textContent = e.message; }), 'sm'); cancel.hidden = true;
  const check = btn('检查更新', async () => {
    check.disabled = true; status.textContent = '正在连接 GitHub……';
    try { const update = await checkForUpdate(); render(update); }
    catch (e) { status.textContent = e.message || '检查失败，请稍后重试'; }
    finally { check.disabled = false; }
  }, 'sm');
  const auto = h('input', { type: 'checkbox', checked: settings.autoUpdate !== false, onchange: e => { settings.autoUpdate = e.target.checked; saveSettings(); } });
  p.body.append(h('p', {}, `当前版本 ${APP_VERSION}`), h('label.update-auto', {}, auto, ' 启动时自动检查更新'),
    status, detail, progress, h('div.row', {}, check, action, cancel),
    h('p.tiny', {}, '更新来自本游戏的 GitHub Releases。覆盖安装会保留本机存档；Android 会要求你确认安装。'));

  function render(update) {
    detail.replaceChildren(); action.hidden = true;
    if (!update.available) { status.textContent = '当前已是最新版本'; return; }
    status.textContent = `发现新版本 ${update.version} · ${(update.size / 1024 / 1024).toFixed(1)} MB`;
    detail.append(h('pre.update-notes', {}, update.notes || '本次更新包含游戏体验与稳定性改进。'),
      h('a', { href: update.releaseUrl, target: '_blank', rel: 'noopener noreferrer' }, '查看 GitHub 发布说明'));
    action.hidden = false; action.textContent = android() ? '下载并准备安装' : '在 GitHub 下载 Android 版';
  }
  async function download() {
    if (!latest?.available || downloading) return;
    if (!android()) { window.open(latest.releaseUrl, '_blank', 'noopener,noreferrer'); return; }
    downloading = true; action.disabled = true; check.disabled = true; cancel.hidden = false; progress.hidden = false;
    let listener;
    try {
      listener = await native.addListener('downloadProgress', event => {
        progress.value = event.percent || 0;
        status.textContent = event.status === 'verifying' ? '下载完成，正在校验安装包……' : `正在下载 ${Math.floor(event.percent || 0)}% · 可暂停后继续`;
      });
      const result = await native.download({ url: latest.url, sha256: latest.sha256, size: latest.size, versionCode: latest.versionCode });
      if (result?.paused) { status.textContent = '下载已暂停，点“继续下载”可断点续传'; action.textContent = '继续下载'; return; }
      action.textContent = '继续安装'; status.textContent = '安装包已验证，可安全覆盖安装';
      if(!p.root.isConnected || S?.mode==='action' || document.querySelector('.screen.bt')) { toast('更新已下载，可在标题或设置中继续安装'); return; }
      if (S && S.mode !== 'title') save(AUTO);
      const install = await native.install({ versionCode: latest.versionCode });
      status.textContent = install.permissionRequired ? '请允许本游戏安装更新，返回游戏后点“继续安装”' : '已打开系统安装页面，请按提示确认';
    } catch (e) { status.textContent = e.message || '下载失败，请检查网络后重试'; action.textContent = '重试下载 / 安装'; }
    finally { try { await listener?.remove(); } catch {} downloading = false; action.disabled = false; check.disabled = false; cancel.hidden = true; }
  }
  if (latest) render(latest);
  else check.click();
}

export function initUpdates() {
  let checking = false;
  async function check() {
    if (checking || !android() || settings.autoUpdate === false || document.hidden ||
        Date.now() - (settings.lastUpdateAttempt || 0) < 6 * 60 * 60 * 1000) return;
    checking = true; settings.lastUpdateAttempt = Date.now(); saveSettings();
    try { await checkForUpdate(); }
    catch { /* Offline play remains available. Manual checks always allow retry. */ }
    finally { checking = false; }
    notify();
  }
  function notify() {
    if (!android() || document.hidden || !latest?.available || notified === latest.version ||
        document.querySelector('.screen.action,.screen.bt,.screen.vn,.panel-wrap')) return;
    notified = latest.version;
    const p = panel('有新版本可用', { cls: 'small' });
    p.body.append(h('p', {}, `烛龙纪 ${latest.version} 已发布。`),
      h('div.row', {}, btn('稍后', () => p.close(), 'sm'), btn('查看更新', () => { p.close(); openUpdates(); }, 'gold')));
  }
  setTimeout(check, 3500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  setInterval(notify, 10000);
}
