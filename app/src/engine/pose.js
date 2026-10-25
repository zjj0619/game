/** 晏归等多姿态立绘：按场景切换，无姿则回落 por/{id} */
import { asset } from './ui.js';

export const POSES = {
  idle: 'por/pose/yangui_idle',
  lamp: 'por/pose/yangui_lamp',
  lamp_por: 'por/pose/yangui_lamp_por',
  battle: 'por/pose/yangui_battle',
  think: 'por/pose/yangui_think',
  smile: 'por/pose/yangui_smile',
  hurt: 'por/pose/yangui_hurt',
  cast: 'por/pose/yangui_cast',
  title: 'por/pose/yangui_title',
};

const HERO = 'yangui';

/** @param {string} id @param {keyof typeof POSES | string} [pose] */
export function portrait(id, pose) {
  if (id === HERO && pose && POSES[pose]) return asset(POSES[pose]);
  return asset('por/' + id);
}

/** 枢纽：持灯 Q 版更有「在场」感；无灯姿时 idle */
export function hubPose(id) {
  if (id === HERO) return portrait(id, 'lamp');
  return portrait(id);
}

/** VN：按情绪标签；默认 think 近景说话更有戏 */
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
