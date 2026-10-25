package com.jiaqi.zhulongji;

import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** APK updates are user initiated; the Android installer owns final approval. */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean downloading = new AtomicBoolean(false);
    private final AtomicBoolean cancelled = new AtomicBoolean(false);
    private volatile HttpURLConnection connection;

    @Override
    public void load() {
        executor.execute(() -> {
            try {
                long current = code(installed());
                File[] files = directory().listFiles();
                if (files != null) for (File file : files) {
                    String name = file.getName();
                    if (name.matches("update-[0-9]+\\.apk")) {
                        long version = Long.parseLong(name.substring(7, name.length() - 4));
                        if (version <= current) file.delete();
                    } else if (name.endsWith(".part") && System.currentTimeMillis() - file.lastModified() > 7L * 24 * 60 * 60 * 1000) file.delete();
                }
            } catch (Exception ignored) { /* Cleanup must never prevent offline startup. */ }
        });
    }

    private File directory() throws Exception {
        File dir = new File(getContext().getFilesDir(), "updates");
        if (!dir.isDirectory() && !dir.mkdirs()) throw new Exception("无法创建更新目录");
        return dir;
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences("app_updates", 0);
    }

    @SuppressWarnings("deprecation")
    private long code(PackageInfo info) {
        return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
    }

    @SuppressWarnings("deprecation")
    private PackageInfo installed() throws Exception {
        return getContext().getPackageManager().getPackageInfo(getContext().getPackageName(),
            Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES);
    }

    @PluginMethod
    public void getInfo(PluginCall call) {
        try {
            PackageInfo info = installed();
            JSObject result = new JSObject();
            result.put("version", info.versionName);
            result.put("versionCode", code(info));
            result.put("canInstall", Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls());
            call.resolve(result);
        } catch (Exception error) { call.reject("无法读取当前版本", error); }
    }

    private boolean allowed(URL url) {
        String host = url.getHost();
        return url.getProtocol().equals("https") && (url.getPort() == -1 || url.getPort() == 443) && url.getUserInfo() == null &&
            (host.equals("github.com") || host.equals("release-assets.githubusercontent.com") || host.equals("objects.githubusercontent.com"));
    }

    private HttpURLConnection open(URL start, long offset) throws Exception {
        URL url = start;
        for (int redirects = 0; redirects < 6; redirects++) {
            if (!allowed(url)) throw new Exception("更新下载地址无效");
            HttpURLConnection next = (HttpURLConnection) url.openConnection();
            connection = next;
            next.setConnectTimeout(20000); next.setReadTimeout(30000);
            next.setInstanceFollowRedirects(false);
            next.setRequestProperty("User-Agent", "Zhulongji-Android-Updater");
            next.setRequestProperty("Accept-Encoding", "identity");
            if (offset > 0) next.setRequestProperty("Range", "bytes=" + offset + "-");
            int status = next.getResponseCode();
            if (status == 301 || status == 302 || status == 303 || status == 307 || status == 308) {
                String location = next.getHeaderField("Location"); next.disconnect();
                if (location == null) throw new Exception("GitHub 下载重定向无效");
                url = new URL(url, location); continue;
            }
            return next;
        }
        throw new Exception("下载重定向次数过多");
    }

    private String checksum(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream stream = new FileInputStream(file)) {
            byte[] buffer = new byte[65536]; int n;
            while ((n = stream.read(buffer)) != -1) digest.update(buffer, 0, n);
        }
        StringBuilder value = new StringBuilder();
        for (byte b : digest.digest()) value.append(String.format("%02x", b & 255));
        return value.toString();
    }

    @SuppressWarnings("deprecation")
    private Set<String> signers(PackageInfo info) {
        Signature[] signatures = Build.VERSION.SDK_INT >= 28 && info.signingInfo != null ?
            info.signingInfo.getApkContentsSigners() : info.signatures;
        Set<String> result = new HashSet<>();
        if (signatures != null) for (Signature signature : signatures) result.add(signature.toCharsString());
        return result;
    }

    @SuppressWarnings("deprecation")
    private void verify(File file, String sha256, long size, int versionCode) throws Exception {
        if (!file.isFile() || file.length() != size || !checksum(file).equalsIgnoreCase(sha256)) throw new Exception("安装包校验失败，请重新下载");
        PackageManager manager = getContext().getPackageManager();
        PackageInfo archive = manager.getPackageArchiveInfo(file.getAbsolutePath(),
            Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES);
        PackageInfo current = installed();
        if (archive == null || !current.packageName.equals(archive.packageName) || code(archive) != versionCode || code(archive) <= code(current))
            throw new Exception("安装包的应用标识或版本不匹配");
        Set<String> expected = signers(current), actual = signers(archive);
        if (expected.isEmpty() || !expected.equals(actual)) throw new Exception("安装包签名与当前游戏不同，已停止更新");
    }

    private void progress(long bytes, long size, String status) {
        JSObject event = new JSObject();
        event.put("bytes", bytes); event.put("size", size); event.put("status", status);
        event.put("percent", Math.min(100.0, bytes * 100.0 / size));
        notifyListeners("downloadProgress", event);
    }

    @PluginMethod
    public void download(PluginCall call) {
        String address = call.getString("url", ""), hash = call.getString("sha256", "");
        Integer versionCode = call.getInt("versionCode");
        Long size = call.getData().optLong("size", -1);
        try {
            URL url = new URL(address);
            if (!allowed(url) || !url.getHost().equals("github.com") ||
                !url.getPath().matches("/zjj0619/game/releases/download/v[0-9]+\\.[0-9]+\\.[0-9]+/[^/]+\\.apk") ||
                url.getQuery() != null || url.getRef() != null || !hash.matches("(?i)[a-f0-9]{64}") ||
                versionCode == null || versionCode <= code(installed()) || size == null || size <= 0 || size > 1073741824L)
                throw new Exception("更新参数无效");
        } catch (Exception error) { call.reject("更新参数无效", error); return; }
        if (!downloading.compareAndSet(false, true)) { call.reject("已有下载正在进行"); return; }
        cancelled.set(false);
        executor.execute(() -> {
            File partial = null;
            try {
                File dir = directory();
                File apk = new File(dir, "update-" + versionCode + ".apk");
                partial = new File(dir, versionCode + "-" + hash.substring(0, 16) + ".part");
                if (apk.isFile()) {
                    try { verify(apk, hash, size, versionCode); ready(apk, hash, size, versionCode); call.resolve(); return; }
                    catch (Exception stale) { apk.delete(); }
                }
                if (partial.length() > size) partial.delete();
                long offset = partial.length();
                if (offset < size) {
                    HttpURLConnection response = open(new URL(address), offset);
                    int status = response.getResponseCode();
                    if (status == 200) offset = 0;
                    else if (status != 206 || !String.valueOf(response.getHeaderField("Content-Range")).startsWith("bytes " + offset + "-"))
                        throw new Exception("下载连接失败（" + status + "），请稍后重试");
                    long free = dir.getUsableSpace();
                    if (free < size - offset + 16 * 1024 * 1024) throw new Exception("手机存储空间不足");
                    try (InputStream input = response.getInputStream(); FileOutputStream output = new FileOutputStream(partial, offset > 0)) {
                        byte[] buffer = new byte[65536]; int n; long bytes = offset, last = 0;
                        while (!cancelled.get() && (n = input.read(buffer)) != -1) {
                            bytes += n;
                            if (bytes > size) { partial.delete(); throw new Exception("下载文件大小异常"); }
                            output.write(buffer, 0, n);
                            long now = System.currentTimeMillis();
                            if (now - last > 250) { progress(bytes, size, "downloading"); last = now; }
                        }
                    } finally { response.disconnect(); }
                }
                if (cancelled.get()) { JSObject result = new JSObject(); result.put("paused", true); call.resolve(result); return; }
                if (partial.length() < size) throw new IOException("下载中断，可稍后继续下载");
                progress(partial.length(), size, "verifying");
                try { verify(partial, hash, size, versionCode); }
                catch (Exception invalid) { partial.delete(); throw invalid; }
                if (!partial.renameTo(apk)) throw new Exception("无法保存安装包");
                ready(apk, hash, size, versionCode);
                call.resolve();
            } catch (Exception error) {
                if (cancelled.get()) { JSObject result = new JSObject(); result.put("paused", true); call.resolve(result); }
                else call.reject(error instanceof IOException || error.getMessage() == null ? "下载中断，请检查网络后继续下载" : error.getMessage(), error);
            } finally { connection = null; downloading.set(false); }
        });
    }

    private void ready(File file, String hash, long size, int versionCode) {
        prefs().edit().putInt("versionCode", versionCode).putString("sha256", hash).putLong("size", size).apply();
        progress(size, size, "ready");
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        cancelled.set(true);
        HttpURLConnection active = connection;
        if (active != null) active.disconnect();
        call.resolve();
    }

    @PluginMethod
    public void install(PluginCall call) {
        Integer versionCode = call.getInt("versionCode");
        if (versionCode == null || versionCode != prefs().getInt("versionCode", -1)) { call.reject("请先下载并校验更新"); return; }
        executor.execute(() -> {
            try {
                File apk = new File(directory(), "update-" + versionCode + ".apk");
                verify(apk, prefs().getString("sha256", ""), prefs().getLong("size", 0), versionCode);
                getActivity().runOnUiThread(() -> {
                    try {
                        JSObject result = new JSObject();
                        if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
                            getActivity().startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                Uri.parse("package:" + getContext().getPackageName())));
                            result.put("permissionRequired", true);
                        } else {
                            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
                            Intent intent = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            getActivity().startActivity(intent); result.put("opened", true);
                        }
                        call.resolve(result);
                    } catch (Exception error) { call.reject("无法打开系统安装页面", error); }
                });
            } catch (Exception error) { call.reject(error.getMessage(), error); }
        });
    }

    @Override
    protected void handleOnDestroy() {
        cancelled.set(true);
        HttpURLConnection active = connection;
        if (active != null) active.disconnect();
        executor.shutdownNow();
    }
}
