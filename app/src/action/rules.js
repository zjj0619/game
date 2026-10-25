export class StageClock {
  now = 0; unscaled = 0; queue = []; nextId = 0;
  schedule(fn, milliseconds, unscaled = false) {
    const id = ++this.nextId;
    this.queue.push({ id, fn, unscaled, at: (unscaled ? this.unscaled : this.now) + milliseconds / 1000 });
    return id;
  }
  advance(seconds, scale = 1) {
    this.now += seconds * scale; this.unscaled += seconds;
    const due = this.queue.filter(item => item.at <= (item.unscaled ? this.unscaled : this.now));
    this.queue = this.queue.filter(item => !due.includes(item));
    for (const item of due) item.fn();
  }
  clear() { this.queue.length = 0; }
}

export const telegraphDuration = (duration) => Math.max(0.3, duration);

export function setFoeLayer(foe, dream) {
  if (foe.def_?.boss) return;
  foe._awakeMax ??= foe.max; foe._awakeAtk ??= foe.atk;
  const ratio = foe.hp / foe.max;
  foe.max = Math.round(foe._awakeMax * (dream ? 1.35 : 1));
  foe.hp = Math.max(1, Math.min(foe.max, Math.round(foe.max * ratio)));
  foe.atk = Math.round(foe._awakeAtk * (dream ? 1.15 : 1));
  foe.dream = !!dream; foe.stealth = !!dream; foe.reveal = !dream;
}

// Generated stages use an encounter budget; authored signature stages keep their layouts.
export function balanceGeneratedStage(stage) {
  if (stage.hidden || stage.kind === 'keysecret' || stage.signature) return stage;
  const early = stage.region === 'jincheng' && stage.idx < 3;
  const maxArenas = early ? (stage.idx === 0 ? 1 : 2) : stage.idx < 3 ? 2 : 3;
  const budget = early ? 6 : Math.min(36, 16 + stage.idx * 2 + Math.floor(stage.ri / 3) * 2);
  let remaining = budget;
  stage.arenas = stage.arenas.slice(0, maxArenas).map(arena => {
    const waves = arena.waves.slice(0, early ? 1 : 2).map(wave => {
      const next = wave.slice(0, Math.min(early ? 3 : 5, remaining)); remaining -= next.length;
      return next;
    }).filter(wave => wave.length);
    const dreamWaves = (arena.dreamWaves || []).slice(0, waves.length).map((wave, i) => wave.slice(0, waves[i].length));
    return { ...arena, waves, dreamWaves };
  }).filter(arena => arena.waves.length || arena.boss);
  return stage;
}

export const LAMP_PATHS = {
  keeper: { name: '守灯', desc: '灯域扩大 24；精准闪避回复 5% 气血。适合稳健反击。', radius: 24, eyeCost: 1, resonance: 1 },
  seer: { name: '观瞳', desc: '烛瞳耗蓝降低 25%；弱点标记更快。适合看破与爆发。', radius: 0, eyeCost: 0.75, resonance: 1 },
  dreamer: { name: '入梦', desc: '梦层击破获得额外梦屑；梦层共鸣获取提高 25%。', radius: -12, eyeCost: 1, resonance: 1.25 },
};
