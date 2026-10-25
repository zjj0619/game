export function readObject(key, fallback = {}) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return JSON.parse(JSON.stringify(fallback));
    const value = JSON.parse(raw);
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Invalid stored object');
    return value;
  } catch {
    // Keep the original value for recovery; never clear unrelated game data.
    return JSON.parse(JSON.stringify(fallback));
  }
}

export function safeWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

export function validatedSave(value, characters) {
  if (!value || typeof value !== 'object' || !value.party?.yangui || Array.isArray(value.party)) throw new Error('存档缺少主角数据');
  for (const [id, member] of Object.entries(value.party)) {
    if (!Object.prototype.hasOwnProperty.call(characters,id) || !member || typeof member !== 'object' || !Number.isFinite(member.lv) || member.lv < 1 || member.lv > 80)
      throw new Error('存档角色数据无效');
  }
  if (value.gold !== undefined && (!Number.isFinite(value.gold) || value.gold < 0)) throw new Error('存档星砂数据无效');
  return value;
}
