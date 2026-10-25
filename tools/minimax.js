// MiniMax API 封装：文本（Anthropic 兼容）、文生图 image-01、同步语音合成 T2A v2
import fs from 'node:fs/promises';
import path from 'node:path';

export function config() {
  return {
    apiKey: process.env.MINIMAX_API_KEY || '',
    baseUrl: (process.env.MINIMAX_BASE_URL || 'https://api.minimax.cn').replace(/\/+$/, ''),
    textModel: process.env.MINIMAX_TEXT_MODEL || 'MiniMax-M3',
    textFallbackModel: process.env.MINIMAX_TEXT_FALLBACK_MODEL || 'MiniMax-M3.1-Flash',
    imageModel: process.env.MINIMAX_IMAGE_MODEL || 'image-01',
    ttsModel: process.env.MINIMAX_TTS_MODEL || 'speech-2.8-hd',
    timeoutMs: Number(process.env.MINIMAX_TIMEOUT_MS || 120000),
  };
}

class MiniMaxError extends Error {
  constructor(msg, detail) { super(msg); this.detail = detail; }
}

async function post(url, body, timeoutMs) {
  const cfg = config();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs || cfg.timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
        'x-api-key': cfg.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const raw = await res.text();
    let json;
    try { json = JSON.parse(raw); } catch { json = null; }
    if (!res.ok) {
      const msg = json?.error?.message || json?.base_resp?.status_msg || raw.slice(0, 300);
      throw new MiniMaxError(`HTTP ${res.status}: ${msg}`, json || raw);
    }
    if (json?.base_resp && json.base_resp.status_code !== 0) {
      throw new MiniMaxError(`MiniMax ${json.base_resp.status_code}: ${json.base_resp.status_msg}`, json);
    }
    return json;
  } catch (e) {
    if (e.name === 'AbortError') throw new MiniMaxError('请求 MiniMax 超时');
    throw e;
  } finally { clearTimeout(t); }
}

/** 从模型输出中稳健地提取 JSON */
export function extractJson(text) {
  let s = String(text || '').trim();
  s = s.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const a = s.indexOf('{'); const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch {}
  // 修复常见问题：中文引号 / 尾逗号
  const fixed = s.replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(fixed);
}

/** 调用文本模型（Anthropic Messages 兼容接口），返回解析后的 JSON */
export async function chatJson({ system, user, maxTokens = 2048 }) {
  const cfg = config();
  const models = [cfg.textModel, cfg.textFallbackModel].filter((m, i, a) => m && a.indexOf(m) === i);
  let lastErr;
  for (const model of models) {
    const body = {
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: [{ type: 'text', text: user }] }],
    };
    // M3.1-Flash 强制开启 thinking，用 low 档位降低延迟与额度消耗；M3 默认关闭 thinking
    if (/3\.1/.test(model)) { body.output_config = { effort: 'low' }; body.max_tokens = Math.max(maxTokens, 4096); }
    try {
      const json = await post(`${cfg.baseUrl}/anthropic/v1/messages`, body);
      const text = (json.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
      try {
        return { data: extractJson(text), model };
      } catch (e) {
        lastErr = new MiniMaxError('模型输出无法解析为 JSON', text.slice(0, 500));
        continue;
      }
    } catch (e) {
      lastErr = e;
      console.warn(`[text] ${model} 失败：`, e.message);
    }
  }
  throw lastErr;
}

/** 文生图：返回 Buffer（使用 base64 返回格式，避免 URL 24 小时过期） */
export async function generateImage({ prompt, aspectRatio = '3:4' }) {
  const cfg = config();
  const json = await post(`${cfg.baseUrl}/v1/image_generation`, {
    model: cfg.imageModel,
    prompt: prompt.slice(0, 1500),
    aspect_ratio: aspectRatio,
    response_format: 'base64',
    n: 1,
    prompt_optimizer: false,
  });
  const b64 = json?.data?.image_base64?.[0];
  if (b64) return Buffer.from(b64, 'base64');
  const url = json?.data?.image_urls?.[0];
  if (url) {
    const r = await fetch(url);
    return Buffer.from(await r.arrayBuffer());
  }
  if (json?.metadata?.failed_count && Number(json.metadata.failed_count) > 0) {
    throw new MiniMaxError('图像未通过内容安全审核，请换个说法再试');
  }
  throw new MiniMaxError('文生图未返回图片', json);
}

/** 同步语音合成：返回 mp3 Buffer */
export async function synthesize({ text, voiceId, speed = 1, pitch = 0, vol = 1, emotion }) {
  const cfg = config();
  const voice_setting = { voice_id: voiceId, speed, vol, pitch };
  if (emotion) voice_setting.emotion = emotion;
  const json = await post(`${cfg.baseUrl}/v1/t2a_v2`, {
    model: cfg.ttsModel,
    text: text.slice(0, 9000),
    stream: false,
    voice_setting,
    audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
    language_boost: 'Chinese',
    output_format: 'hex',
  });
  const hex = json?.data?.audio;
  if (!hex) throw new MiniMaxError('语音合成未返回音频', json);
  if (/^https?:/.test(hex)) {
    const r = await fetch(hex);
    return Buffer.from(await r.arrayBuffer());
  }
  return Buffer.from(hex, 'hex');
}

export async function saveFile(dir, name, buf) {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buf);
  return name;
}

export { MiniMaxError };
