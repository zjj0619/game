/** 晏归多姿态：全站统一半身精品立绘风格（与 por/yangui.webp 同画风）。禁止枢纽用 Q 版/chibi。 */
import { asset } from './ui.js';

export const POSES = {
  idle: 'por/pose/yangui_idle',
  lamp_por: 'por/pose/yangui_lamp_por',
  battle: 'por/pose/yangui_battle',
  think: 'por/pose/yangui_think',
  smile: 'por/pose/yangui_smile',
  hurt: 'por/pose/yangui_hurt',
  cast: 'por/pose/yangui_cast',
  title: 'por/pose/yangui_title',
  /** Q 版持灯：仅战斗小头等小尺寸场景，禁止 hub/title/VN/result 主展示 */
  lamp_chibi: 'por/pose/yangui_lamp',
};

const HERO = 'yangui';

/** @param {string} id @param {keyof typeof POSES | string} [pose] */
export function portrait(id, pose) {
  if (id === HERO && pose && POSES[pose]) return asset(POSES[pose]);
  return asset('por/' + id);
}

/** 枢纽主展示：半身精品 idle（与 yangui.webp 同画风）。绝不用 chibi。 */
export function hubPose(id) {
  if (id === HERO) return portrait(id, 'idle');
  return portrait(id);
}

/** VN：同画风表情变体；灯相关用 lamp_por 半身，不用 chibi */
export function vnPose(id, mood) {
  if (id !== HERO) return portrait(id);
  const m = (mood || '').toLowerCase();
  if (/hurt|pain|伤|痛|死|败/.test(m)) return portrait(id, 'hurt');
  if (/smile|喜|笑|通关|胜|暖/.test(m)) return portrait(id, 'smile');
  if (/battle|战|怒|杀|攻/.test(m)) return portrait(id, 'battle');
  if (/cast|法|仪式|龙|烛/.test(m)) return portrait(id, 'cast');
  if (/lamp|灯|夜|守/.test(m)) return portrait(id, 'lamp_por');
  if (/think|思|疑|问|…/.test(m)) return portrait(id, 'think');
  return portrait(id, 'think');
}

export function resultPose(win) {
  return portrait(HERO, win ? 'smile' : 'hurt');
}

export function titlePose() {
  return portrait(HERO, 'title');
}
