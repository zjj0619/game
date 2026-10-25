// v1.1 战斗：行动值时间轴 · 共享灯焰 · 终结技能量（可插队） · 韧性/弱点击破 · 五行相生反应 · 意图与目标 · 首领二阶段
import { S, settings, stats, skillsOf, gainExp, addItem, addGold, unlock, ach, expNeed } from './state.js';
import { CHARS, SKILLS, STATUS, EL, EL_COLOR, elemMult } from '../data/characters.js';
import { ENEMIES, ENCOUNTERS, ARCH, MOVES } from '../data/enemies.js';
import { ITEMS } from '../data/items.js';
import { REGIONS } from '../data/regions.js';
import { GEN, REACT, weaknesses, spCost, SP_MAX } from '../data/combat.js';
import { h, btn, asset, icon, sleep, toast, haptic, tutorial } from './ui.js';
import { sfx, playBgm, currentBgm } from './audio.js';
import { burst, shake, flash, rise } from './fx.js';

const rnd = (a,b)=>a+Math.random()*(b-a);
const pick = a => a[Math.floor(Math.random()*a.length)];
const T = () => window.__ZLJ_TEST;
function fortuneOn(k){ const f=S.fortune; return f && f.day===new Date().toDateString() && f.buff===k; }
const ELI = { metal:'金', wood:'木', water:'水', fire:'火', earth:'土', light:'光', dark:'暗', none:'无' };
const MOVE_GLYPH = m => m.kind==='heal' ? '✚' : m.kind==='buff' ? '▲' : m.kind==='debuff' ? '☍' : m.charge ? '☄' : m.tgt==='all' ? '✸' : m.kind==='mag' ? '✦' : '⚔';

function foeStats(def, L, boss, nParty){
  const A = ARCH[def.arch] || ARCH.brute;
  const hpM = boss ? (2.5 + 1.2*Math.min(4,nParty))*(window.__ZLJ_TUNE?.hpB ?? 0.9) : 0.85, atM = boss ? (window.__ZLJ_TUNE?.atM ?? 2.0)*(1+Math.max(0,L-14)*0.03) : 1.15+Math.max(0,L-14)*0.015;
  return { hp:Math.round((30+15*L)*A.hp*hpM), atk:Math.round((6+2.6*L)*A.atk*atM), mag:Math.round((6+2.6*L)*A.mag*atM),
    def:Math.round((5+1.9*L)*A.def), spd:Math.round((8+0.6*L)*A.spd*(boss ? (window.__ZLJ_TUNE?.spdB ?? 1.7) : 1)), crit:0.05 };
}

export function battle(encId, opts={}){
  return new Promise(resolve => new Battle(encId, opts, resolve));
}

class Battle {
  constructor(encId, opts, resolve){
    this.enc = ENCOUNTERS[encId]; this.encId = encId; this.opts = opts; this.resolve = resolve;
    if (!this.enc) { console.error('无此遭遇', encId); resolve({win:true}); return; }
    this.boss = !!this.enc.boss; this.turn = 0; this.over = false; this.anyDown = false; this.dmgTaken = 0;
    this.ultQ = []; this.prevBgm = currentBgm(); this.log = { breaks:0, reacts:0, ults:0 };
    const form = S.formation.filter(id=>S.members.includes(id));
    this.allies = form.map(id => this.mkAlly(id));
    if (this.allies.every(a=>a.dead)) for (const a of this.allies) { a.dead=false; a.hp=Math.max(1, Math.round(a.max.hp*0.3)); }
    const avg = Math.round(S.members.reduce((s,m)=>s+S.party[m].lv,0)/S.members.length);
    this.elite = !!opts.elite;
    this.foes = this.enc.foes.map(([id, L], i) => {
      const d = ENEMIES[id]; const lv = L||avg; const isB = id.startsWith('B_');
      const m = foeStats(d, lv, isB, this.allies.length);
      unlock('e_'+id);
      const tmax = isB ? 70 : (this.elite || (this.boss && this.enc.foes.length===1)) ? 60 : 30;
      return { side:'e', id, uid:'e'+i, name:d.name, el:d.el, lv, max:m, hp:m.hp, st:{}, shield:0, dead:false, d, boss:isB, moves:d.moves,
        intent:null, charging:null, tough:tmax, tmax, broken:false, weak:weaknesses(id, d.el), mark:null, phase:1, bturn:0 };
    });
    // 灯焰与能量
    const lampBonus = (S.lamp||1) >= 5 ? 1 : 0;
    this.sp = Math.min(SP_MAX, 3 + lampBonus + Math.max(0, ...this.allies.map(a=>a.max.spStart||0)));
    for (const a of this.allies) { a.en = Math.min(100, 20 + (fortuneOn('gauge')?30:0) + (a.max.startEnergy||0) + ((S.lamp||1)>=5?10:0)); if (a.max.startShield) { a.shield = Math.round(a.max.hp*0.15); a.st.shield = 2; } }
    // 行动值：先手
    for (const u of [...this.allies, ...this.foes]) u.av = this.interval(u) * rnd(0.9,1.05);
    if (opts.ambush==='player') for (const a of this.allies) a.av *= 0.3;
    if (opts.ambush==='enemy') for (const f of this.foes) f.av *= 0.3;
    if (opts.lampStun) for (const f of this.foes) if (!f.boss) f.st.stun = 1;
    for (const f of this.foes) this.planIntent(f);
    this.target = this.foes[0];
    this.build(); this.loop();
  }
  mkAlly(id){
    const st = stats(id); const p = S.party[id];
    const hp = Math.max(0, Math.min(st.hp, p.hp ?? st.hp));
    return { side:'a', id, uid:'a'+id, name:CHARS[id].name, el:CHARS[id].el, lv:p.lv, max:st, hp: hp<=0?1:hp, st:{}, shield:0, dead:false, en:0 };
  }
  spd(u){ let s = u.max.spd * (u.phase===2?1.15:1); if (u.st.freeze) s*=1; return Math.max(1, s); }
  interval(u){ return 10000/this.spd(u); }
  wait(ms){ const t=T(); return sleep(t ? Math.min(ms, 6) : ms/settings.battleSpeed); }
  alive(side){ return (side==='a'?this.allies:this.foes).filter(u=>!u.dead); }

  // —— 界面 ——
  build(){
    const reg = REGIONS[S.region];
    const bg = this.opts.bg || (this.opts.story ? (S.bg || reg?.bg) : (reg?.bg || S.bg)) || 'jincheng';
    this.root = h('div.screen.bt'+(this.boss?'.boss':''), {}, h('div.bt-bg', { style:{backgroundImage:`url(${asset('bg/'+bg)})`} }), h('div.bt-vig'), h('div.bt-floor'));
    this.tl = h('div.bt-tl');
    this.foeRow = h('div.bt-foes'); this.allyRow = h('div.bt-allies');
    this.banner = h('div.bt-banner');
    this.spEl = h('div.bt-sp');
    this.cmd = h('div.bt-cmd');
    this.drawer = h('div.bt-drawer');
    const ib = (g, t, on, cls='') => h('button.bt-ib'+(cls?'.'+cls:''), { onclick:(e)=>{ e.stopPropagation(); sfx('click'); on(); }, 'aria-label':t }, h('span.g', {}, g), h('span.t', {}, t));
    this.autoBtn = ib('⟳', '自动', ()=>{ settings.autoBattle=!settings.autoBattle; this.autoBtn.classList.toggle('on', settings.autoBattle); if (settings.autoBattle && this.choosing) this.choosing(this.autoAct(this.cur)); }, settings.autoBattle?'on':'');
    this.spdBtn = ib('»', '×'+settings.battleSpeed, ()=>{ settings.battleSpeed = settings.battleSpeed>=3?1:settings.battleSpeed+1; this.spdBtn.querySelector('.t').textContent='×'+settings.battleSpeed; });
    const flee = ib('⇠', '撤离', ()=>{ if (this.choosing) this.choosing({type:'flee'}); }, (this.boss||this.opts.noFlee)?'off':'');
    this.top = h('div.bt-top', {}, this.round = h('div.bt-round'), h('div.bt-tools', {}, this.autoBtn, this.spdBtn, flee));
    if (this.boss) { const b = this.foes.find(f=>f.boss) || this.foes[0]; this.bossBar = h('div.bt-bossbar', {}, h('div.bb-name', {}, h('b', {style:{color:EL_COLOR[b.el]}}, ELI[b.el]), b.name, h('span.bb-ph')), h('div.bb-hp', {}, h('i'), h('em')), h('div.bb-t', {}, h('i'))); this.top.append(this.bossBar); }
    this.hint = h('div.bt-hint');
    this.root.append(this.top, this.tl, this.foeRow, this.banner, this.allyRow, this.spEl, this.cmd, this.drawer, this.hint);
    for (const f of this.foes) { f.dom = this.foeDom(f); this.foeRow.append(f.dom.el); }
    for (const a of this.allies) { a.dom = this.allyDom(a); this.allyRow.append(a.dom.el); }
    this.root.addEventListener('click', ()=>{ if (this.drawer.classList.contains('show') && !this.pickMode) this.closeDrawer(); });
    document.getElementById('app').append(this.root);
    playBgm(this.enc.bgm || (this.boss?'boss':'battle'));
    this.refresh();
    if (T() && T().autoWin) setTimeout(()=>{ this.foes.forEach(f=>{f.hp=0;f.dead=true;}); }, 50);
  }
  foeDom(f){
    const img = h('img.f-img', { src: asset(f.d.img), draggable:'false' });
    const hp = h('div.f-hp', {}, h('i'), h('b')); const tg = h('div.f-tg', {}, h('i'));
    const weak = h('div.f-weak', {}, f.weak.map(e=>h('span.el.el-'+e, {}, ELI[e])));
    const sts = h('div.sts'); const intent = h('div.f-intent'); const mark = h('div.f-mark');
    const el = h('div.foe'+(f.boss?'.bossfoe':'')+(f.d.img.startsWith('por/')?'.porfoe':''), { onclick:(e)=>{ e.stopPropagation(); this.tapFoe(f); } },
      intent, h('div.f-fig', {}, img, mark, h('div.f-reticle')), h('div.f-info', {}, h('div.f-name', {}, h('span.el.el-'+f.el, {}, ELI[f.el]), f.name, h('small', {}, 'Lv'+f.lv)), hp, tg, h('div.f-row', {}, weak, sts)));
    return { el, hp, tg, sts, intent, img, mark };
  }
  allyDom(a){
    const hp = h('div.a-hp', {}, h('i'), h('span')); const sts = h('div.sts');
    const ring = h('div.a-ring', {}, h('div.a-face', { style:{backgroundImage:`url(${asset('por/'+a.id)})`} }));
    const el = h('div.ally', { onclick:(e)=>{ e.stopPropagation(); this.tapAlly(a); } },
      ring, h('div.a-info', {}, h('div.a-name', {}, h('span.el.el-'+a.el, {}, ELI[a.el]), a.name), hp, sts), h('div.a-ult', {}, '终结技'));
    return { el, hp, sts, ring };
  }
  refresh(){
    for (const u of [...this.foes, ...this.allies]) {
      const D = u.dom; if (!D) continue; const p = Math.max(0, u.hp/u.max.hp);
      if (u.side==='e') {
        D.hp.firstChild.style.width=(p*100)+'%'; D.hp.lastChild.textContent = Math.ceil(u.hp);
        D.tg.firstChild.style.width=(u.tough/u.tmax*100)+'%'; D.tg.classList.toggle('broken', u.broken);
        D.el.classList.toggle('broken', u.broken); D.el.classList.toggle('targeted', this.target===u && !u.dead);
        D.mark.className = 'f-mark'+(u.mark?' el-'+u.mark+' on':''); D.mark.textContent = u.mark?ELI[u.mark]:'';
        const it = u.charging || u.intent?.m; const tgt = u.intent?.t;
        if (u.dead || !it) D.intent.replaceChildren();
        else D.intent.replaceChildren(h('span.ig', {}, MOVE_GLYPH(it)), h('span.in', {}, (u.charging?'蓄力·':'')+it.name), h('span.it', {}, it.kind==='heal'||it.kind==='buff' ? '自身/友方' : it.tgt==='all' ? '→ 全体' : tgt ? '→ '+tgt.name : ''));
        D.intent.className = 'f-intent'+((u.charging || it?.charge || it?.tgt==='all')?' warn':'')+(u.charging?' charging':'');
      } else {
        D.hp.firstChild.style.width=(p*100)+'%'; D.hp.lastChild.textContent=`${Math.ceil(u.hp)}`;
        D.ring.style.setProperty('--en', Math.min(100,u.en)); D.el.classList.toggle('ready', !u.dead && u.en>=100);
        D.el.classList.toggle('active', this.cur===u); D.el.classList.toggle('pickable', !!this.pickMode && this.pickMode.pool.includes(u));
      }
      D.el.classList.toggle('dead', u.dead); D.el.classList.toggle('lowhp', !u.dead && p<0.3);
      D.sts.replaceChildren(...Object.entries(u.st).filter(([k])=>STATUS[k]).map(([k,v])=>h('span.st'+(STATUS[k].bad?'.bad':''), {}, STATUS[k].icon, h('sub', {}, v>20?'':v))), ...(u.shield>0?[h('span.st.shield', {}, '◈')]:[]));
    }
    if (this.bossBar) { const b = this.foes.find(f=>f.boss) || this.foes[0]; this.bossBar.querySelector('.bb-hp i').style.width = (Math.max(0,b.hp/b.max.hp)*100)+'%'; this.bossBar.querySelector('.bb-hp em').textContent = `${Math.ceil(Math.max(0,b.hp))} / ${b.max.hp}`; this.bossBar.querySelector('.bb-t i').style.width=(b.tough/b.tmax*100)+'%'; this.bossBar.querySelector('.bb-ph').textContent = b.phase===2?'·二阶段':''; this.bossBar.classList.toggle('broken', b.broken); }
    this.spEl.replaceChildren(h('span.sp-l', {}, '灯焰'), ...Array.from({length:SP_MAX}, (_,i)=>h('i'+(i<this.sp?'.on':''))));
    this.drawTimeline();
  }
  drawTimeline(){
    const units = [...this.alive('a'), ...this.alive('e')]; if (!units.length) return;
    const av = new Map(units.map(u=>[u, u.av])); const seq = [];
    for (let k=0; k<7; k++) { let m=null; for (const u of units) if (!m || av.get(u)<av.get(m)) m=u; const d=av.get(m); for (const u of units) av.set(u, av.get(u)-d); seq.push([m, Math.round(d)]); av.set(m, this.interval(m)); }
    this.tl.replaceChildren(...seq.map(([u], i)=>h('div.tl-u'+(u.side==='e'?'.e':'')+(i===0?'.now':'')+(u.boss?'.b':''), {}, h('div.tl-p', { style:{backgroundImage:`url(${asset(u.side==='a'?'por/'+u.id:u.d.img)})`} }), i===0?null:h('span', {}, i))));
  }
  say(text, cls=''){ this.banner.className='bt-banner show '+cls; this.banner.textContent=text; clearTimeout(this.bt); this.bt=setTimeout(()=>this.banner.classList.remove('show'), T()?50:1300/settings.battleSpeed); }
  pop(u, text, cls=''){
    if (T() && T().nopop) return;
    const r = u.dom.el.getBoundingClientRect(); const n = h('div.dmgn'+(cls?'.'+cls.split(' ').filter(Boolean).join('.'):''), {}, text);
    n.style.left=(r.left+r.width/2+rnd(-24,24))+'px'; n.style.top=(r.top+(u.side==='e'?r.height*0.32:-6)+rnd(-8,8))+'px'; this.root.append(n); setTimeout(()=>n.remove(), 1200);
  }
  center(u){ const r=(u.side==='e'?u.dom.img:u.dom.el).getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height*0.45]; }
  big(text, cls){ const b = h('div.bt-big.'+cls, {}, text); this.root.append(b); setTimeout(()=>b.remove(), 1300); }

  // —— 交互 ——
  tapFoe(f){ if (f.dead) return; if (this.pickMode) { if (this.pickMode.pool.includes(f)) { const cb=this.pickMode.cb; this.pickMode=null; cb(f); } return; } this.target = f; sfx('click'); haptic('light'); this.refresh(); this.renderCmd(); }
  tapAlly(a){
    if (this.pickMode) { if (this.pickMode.pool.includes(a)) { const cb=this.pickMode.cb; this.pickMode=null; cb(a); } return; }
    if (a.dead || a.en < 100) { if (!a.dead) toast(`${a.name} 能量 ${Math.floor(a.en)}/100`); return; }
    if (this.ultQ.includes(a)) return;
    haptic('medium'); sfx('click');
    if (this.choosing) this.choosing({ type:'ult', u:a });
    else { this.ultQ.push(a); a.dom.el.classList.add('queued'); toast(`${a.name} 的终结技将插入下一个间隙`); }
  }
  // —— 主循环 ——
  async loop(){
    await this.wait(350);
    this.say(this.boss ? '首领战' : this.opts.ambush==='player' ? '先手！我方抢占先机' : this.opts.ambush==='enemy' ? '遭到偷袭！' : '遭遇敌人', this.boss?'boss':this.opts.ambush==='enemy'?'bad':'');
    if (this.boss) sfx('bell');
    if (!T()) {
      await tutorial('battle2', [
        { sel:'.bt-tl', text:'左侧是行动顺序。速度越快，出手越频繁。' },
        { sel:'.foe .f-tg', text:'白条是韧性。用敌人弱点（下方属性字）的攻击削空它，就能「击破」：重创、延后其行动、打断蓄力。' },
        { sel:'.bt-sp', text:'灯焰全队共享：普攻 +1，战技消耗 1～2。规划好节奏。' },
        { sel:'.ally', text:'角色头像外圈是能量。满了之后随时点头像释放终结技，哪怕不是 TA 的回合。' },
        { sel:'.foe .f-mark', el:this.foes[0]?.dom.el, text:'属性攻击会留下印记。用「相生」的下一属性命中（木→火→土→金→水→木）即触发反应。' },
      ], S.flags);
      if (this.boss) await tutorial('boss2', [ { sel:'.bt-bossbar', text:'首领有两个阶段。半血后会蓄力「灭世」：击破韧性可打断，或者提前防御、上护盾减伤。自动战斗不会帮你防。' } ], S.flags);
    }
    let guard = 0;
    while (!this.over && guard++ < 4000) {
      await this.flushUlts(); if (this.check()) break;
      const units = [...this.alive('a'), ...this.alive('e')];
      let u = units[0]; for (const x of units) if (x.av < u.av) u = x;
      const d = u.av; for (const x of units) x.av -= d;
      this.turn++; this.round.textContent = `行动 ${this.turn}`;
      await this.unitTurn(u);
      u.av = this.interval(u) * (u.charging ? 0.55 : 1);
      this.refresh();
      if (this.check()) break;
    }
  }
  check(){
    if (this.over) return true;
    if (!this.alive('e').length) { this.over=true; this.win(); return true; }
    if (!this.alive('a').length) { this.over=true; this.lose(); return true; }
    return false;
  }
  async flushUlts(){
    while (this.ultQ.length && !this.over) { const a = this.ultQ.shift(); a.dom.el.classList.remove('queued'); if (!a.dead && a.en>=100 && this.alive('e').length) await this.doUlt(a); if (this.check()) return; }
  }
  async unitTurn(u){
    const tick = (k, pct, cls) => { if (!u.st[k]) return; const v=Math.max(1,Math.round(u.max.hp*pct)); u.hp=Math.max(0,u.hp-v); this.pop(u, '-'+v, cls); if (u.hp<=0) this.kill(u); };
    tick('burn', u.boss?0.025:0.06, 'burn'); tick('poison', u.boss?0.025:0.07, 'poison');
    if (u.st.regen && !u.dead) { const v=Math.round(u.max.hp*0.08); u.hp=Math.min(u.max.hp,u.hp+v); this.pop(u,'+'+v,'heal'); }
    if (u.side==='a' && !u.dead && u.max.regen) u.hp=Math.min(u.max.hp,u.hp+Math.round(u.max.hp*Math.min(0.1,u.max.regen)));
    if (u.dead) { this.refresh(); return; }
    if (u.side==='e' && u.broken) { u.broken=false; u.tough=u.tmax; this.pop(u,'韧性恢复',''); }
    this.cur = u; this.refresh();
    try {
      if (u.st.freeze || u.st.stun) { this.say(`${u.name} ${u.st.freeze?'被冰封':'眩晕中'}，无法行动`); await this.wait(650); }
      else if (u.st.charm && Math.random()<0.5) {
        const pool = (u.side==='a'?this.alive('a'):this.alive('e')).filter(x=>x!==u);
        if (pool.length) { this.say(`${u.name} 被魅惑了！`, 'bad'); await this.wait(400); await this.hitOnce(u, pick(pool), 1.0, 'phys', 'none', {}); }
      }
      else if (u.side==='a') await this.allyTurn(u);
      else await this.foeTurn(u);
    } finally { this.cur = null; }
    for (const k of Object.keys(u.st)) { if (k==='shield') continue; if (--u.st[k] <= 0) delete u.st[k]; }
    if (u.st.shield!==undefined) { if (--u.st.shield<=0) { delete u.st.shield; u.shield=0; } }
  }
  // —— 我方 ——
  async allyTurn(u){
    for (;;) {
      const a = await new Promise(res => {
        this.choosing = (x) => { this.choosing = null; this.pickMode = null; this.cmd.classList.remove('show'); this.closeDrawer(); res(x); };
        const t = T();
        if (settings.autoBattle || (t && (t.auto || t.smart))) { setTimeout(()=>this.choosing && this.choosing(t && t.smart ? this.smartAct(u) : this.autoAct(u)), t?1:220/settings.battleSpeed); return; }
        this.renderCmd(); this.cmd.classList.add('show');
      });
      if (a.type==='ult') { await this.doUlt(a.u, a.t); this.refresh(); if (this.check() || this.over) return; if (u.dead) return; continue; }
      await this.doAction(u, a); return;
    }
  }
  renderCmd(){
    const u = this.cur; if (!u || u.side!=='a' || !this.choosing) return;
    const sk = skillsOf(u.id); const basic = SKILLS[sk[0]];
    const elB = u.max.wel || basic.el;
    this.cmd.replaceChildren(
      h('div.cmd-who', {}, h('span.el.el-'+u.el, {}, ELI[u.el]), u.name, h('small', {}, this.target && !this.target.dead ? ' → '+this.target.name : '')),
      h('div.cmd-row', {},
        h('button.cb.cit', { onclick:(e)=>{ e.stopPropagation(); sfx('click'); this.itemDrawer(u); } }, h('span.g', {}, '◇'), h('span.t', {}, '道具')),
        h('button.cb.cgd', { onclick:(e)=>{ e.stopPropagation(); sfx('click'); this.choosing({type:'guard'}); } }, h('span.g', {}, '⛨'), h('span.t', {}, '防御'), h('em', {}, '+1焰')),
        h('button.cb.csk', { onclick:(e)=>{ e.stopPropagation(); sfx('click'); this.skillDrawer(u); } }, h('span.g', {}, '✧'), h('span.t', {}, '战技')),
        h('button.cb.basic.el-'+elB, { onclick:(e)=>{ e.stopPropagation(); sfx('click'); haptic('light'); this.choose(u, sk[0]); } }, h('span.g', {}, '⚔'), h('span.t', {}, basic.name.length>4?'普攻':basic.name), h('em', {}, ELI[elB]+'·+1焰'))));
  }
  closeDrawer(){ this.drawer.classList.remove('show'); }
  skillDrawer(u){
    const list = skillsOf(u.id).slice(1);
    this.drawer.replaceChildren(h('div.dr-h', {}, '战技', h('span', {}, `灯焰 ${this.sp}/${SP_MAX}`)),
      h('div.dr-list', {}, list.map(k => { const s=SKILLS[k]; const c=spCost(s); const ok = this.sp>=c;
        const tg = {enemy:'单体', enemies:'全体', ally:'友方', allies:'全队', self:'自身'}[s.tgt]||'';
        return h('button.dr-it'+(ok?'':'.off'), { onclick:(e)=>{ e.stopPropagation(); if (!ok) { toast('灯焰不足'); return; } sfx('click'); this.choose(u,k); } },
          h('span.el.el-'+s.el, {}, ELI[s.el]), h('span.dn', {}, s.name, h('small', {}, tg)), h('span.dc', {}, Array.from({length:c},()=>h('i'))), h('span.dd', {}, s.desc)); })));
    this.drawer.classList.add('show');
  }
  itemDrawer(u){
    const list = Object.keys(S.inv).filter(k=>ITEMS[k]?.type==='use' && S.inv[k]>0 && !ITEMS[k].field);
    this.drawer.replaceChildren(h('div.dr-h', {}, '道具', h('span', {}, '使用道具不消耗灯焰')),
      h('div.dr-list', {}, list.length ? list.map(k => { const it=ITEMS[k]; const ok = !(it.flee && (this.boss||this.opts.noFlee));
        return h('button.dr-it'+(ok?'':'.off'), { onclick:(e)=>{ e.stopPropagation(); if (!ok) return; sfx('click'); this.choose(u, null, k); } }, icon(it.icon,'sm'), h('span.dn', {}, it.name, h('small', {}, '×'+S.inv[k])), h('span.dd', {}, it.desc)); }) : h('div.empty', {}, '没有可用的道具')));
    this.drawer.classList.add('show');
  }
  choose(u, skillK, itemK){
    const s = skillK ? SKILLS[skillK] : ITEMS[itemK];
    if (skillK && this.sp < spCost(s)) { toast('灯焰不足'); return; }
    const type = skillK ? 'skill' : 'item'; const k = skillK || itemK;
    if (s.tgt==='enemy') { const t = this.target && !this.target.dead ? this.target : this.alive('e')[0]; return this.choosing({type, k, t}); }
    if (s.tgt==='ally') {
      const pool = this.allies.filter(a => (s.revive ? true : !a.dead));
      if (pool.length===1) return this.choosing({type, k, t:pool[0]});
      this.closeDrawer();
      this.pickMode = { pool, cb:(t)=>{ this.choosing && this.choosing({type, k, t}); } };
      this.hint.textContent = '点选一名同伴：'+s.name; this.hint.classList.add('show');
      const off = () => { this.hint.classList.remove('show'); };
      const cb0 = this.pickMode.cb; this.pickMode.cb = (t)=>{ off(); cb0(t); };
      this.refresh(); return;
    }
    this.choosing({type, k});
  }
  // —— 自动（朴素）：不看弱点、不防灭世 ——
  autoAct(u){
    const sk = skillsOf(u.id).map(k=>[k,SKILLS[k]]); const foes = this.alive('e');
    const hurt = this.allies.filter(a=>!a.dead && a.hp/a.max.hp<0.35).sort((a,b)=>a.hp/a.max.hp-b.hp/b.max.hp);
    const dead = this.allies.filter(a=>a.dead);
    for (const a of this.alive('a')) if (a.en>=100 && !this.ultQ.includes(a)) this.ultQ.push(a);
    if (dead.length) { const r = sk.find(([k,s])=>s.revive && this.sp>=spCost(s)); if (r) return {type:'skill',k:r[0],t:dead[0]}; }
    if (hurt.length) { const hs = sk.filter(([k,s])=>s.kind==='heal' && !s.revive && this.sp>=spCost(s)); if (hs.length) return {type:'skill',k:hs[hs.length-1][0],t:hurt[0]};
      if (u.hp/u.max.hp<0.25) { const pot = ['u_redpill','u_bun','u_goldpill'].find(i=>S.inv[i]>0); if (pot) return {type:'item',k:pot,t:u}; } }
    if (this.sp>=3) { const atk = sk.slice(1).filter(([k,s])=>(s.kind==='phys'||s.kind==='mag') && this.sp>=spCost(s)); if (atk.length) { const [k,s] = pick(atk); return {type:'skill',k,t:pick(foes)}; } }
    return {type:'skill', k:sk[0][0], t:pick(foes)};
  }
  // —— 测试用最优策略（仅 __ZLJ_TEST.smart）——
  smartAct(u){
    const sk = skillsOf(u.id).map(k=>[k,SKILLS[k]]); const foes = this.alive('e');
    for (const a of this.alive('a')) if (a.en>=100 && !this.ultQ.includes(a)) this.ultQ.push(a);
    const dead = this.allies.filter(a=>a.dead);
    if (dead.length) { const r = sk.find(([k,s])=>s.revive && this.sp>=spCost(s)); if (r) return {type:'skill',k:r[0],t:dead[0]}; }
    const hurt = this.allies.filter(a=>!a.dead && a.hp/a.max.hp<0.5).sort((a,b)=>a.hp/a.max.hp-b.hp/b.max.hp);
    if (hurt.length) { const hs = sk.filter(([k,s])=>s.kind==='heal' && !s.revive && this.sp>=spCost(s)); if (hs.length) return {type:'skill',k:hs[hs.length-1][0],t:hurt[0]}; }
    const doom = foes.find(f=>f.charging && f.charging.tgt==='all');
    if (doom && !doom.broken) {
      const sh = sk.find(([k,s])=>s.shieldPow && this.sp>=spCost(s)); if (sh) return {type:'skill',k:sh[0],t:u};
      const canBreak = doom.weak.includes(u.max.wel||u.el) && doom.tough<=20;
      if (!canBreak) return {type:'guard'};
    }
    const score = (s, f) => { const el = s===SKILLS[sk[0][0]] && u.max.wel ? u.max.wel : s.el; const st = s.kind==='phys'?u.max.atk:u.max.mag; let v=(s.pow||1)*st*elemMult(el,f.el)*(s.hits||1); if (f.weak.includes(el)) v*= f.tough<=20?2.2:1.4; if (f.mark && (GEN[f.mark]===el)) v*=1.5; if (f.charging) v*=1.6; if (f.boss) v*=1.2; return s.tgt==='enemies' ? v*Math.min(3,foes.length)*0.75 : v; };
    let best=sk[0][0], bt=foes[0], bv=-1;
    for (const [k,s] of sk) { if (!(s.kind==='phys'||s.kind==='mag')) continue; const c=spCost(s); if (this.sp<c) continue; if (c>0 && this.sp<=1 && !foes.some(f=>f.charging)) continue;
      for (const f of foes) { const v=score(s,f)*(c?0.8:1); if (v>bv) { bv=v; best=k; bt=f; } } }
    return {type:'skill', k:best, t:bt};
  }
  async doAction(u, a){
    if (a.type==='guard') { u.st.defup = 2; this.sp=Math.min(SP_MAX,this.sp+1); this.gain(u, 15); this.say(`${u.name} 防御`); sfx('buff'); await this.wait(420); return; }
    if (a.type==='flee') {
      if (this.boss || this.opts.noFlee) { this.say('无法撤离！','bad'); await this.wait(500); return; }
      if (Math.random()<0.7) { this.say('成功撤离'); await this.wait(500); this.over=true; this.finish({win:false, fled:true}); }
      else { this.say('撤离失败','bad'); await this.wait(600); }
      return;
    }
    if (a.type==='item') return this.useItem(u, a.k, a.t);
    const s = SKILLS[a.k]; const sk = skillsOf(u.id); const isBasic = a.k===sk[0];
    const c = spCost(s);
    if (isBasic) { this.sp = Math.min(SP_MAX, this.sp+1); this.gain(u, 20); }
    else { this.sp -= c; this.gain(u, 30); }
    this.say(s.name); sfx(s.kind==='heal'?'heal':s.kind==='buff'?'buff':s.kind==='debuff'?'debuff':s.kind==='mag'?'magic':'hit');
    u.dom.el.classList.add('lunge'); setTimeout(()=>u.dom.el.classList.remove('lunge'), 380);
    await this.wait(260);
    await this.applySkill(u, s, a.t, { tough: isBasic ? 10 : (s.tgt==='enemies' ? 10 : 20), basic:isBasic });
    this.refresh(); await this.wait(360);
  }
  gain(u, v){ if (u.dead) return; u.en = Math.min(100, u.en + v*(1+(u.max.ultGain||0))); }
  async doUlt(u, t){
    if (u.dead || u.en<100) return;
    const k = CHARS[u.id].ult; const s = SKILLS[k];
    u.en = 5; this.log.ults++; S.stats.ults=(S.stats.ults||0)+1; ach('ult'); if (S.stats.ults>=20) ach('ult20');
    haptic('heavy'); sfx('ult'); flash(EL_COLOR[s.el]);
    if (!T()) {
      const cut = h('div.ultcut.el-'+s.el, {}, h('div.uc-stripe'), h('div.uc-por', { style:{backgroundImage:`url(${asset('por/'+u.id)})`} }), h('div.uc-txt', {}, h('div.uc-who', {}, u.name), h('div.uc-name', {}, s.name.replace('灯技·',''))));
      this.root.append(cut); await sleep(1150/settings.battleSpeed); cut.classList.add('out'); setTimeout(()=>cut.remove(), 300);
    }
    this.say(s.name, 'ult');
    let tt = t; if (s.tgt==='enemy') tt = this.target && !this.target.dead ? this.target : this.alive('e')[0];
    if (s.tgt==='ally') tt = this.allies.filter(a=>s.revive||!a.dead).sort((a,b)=>(a.dead?-1:a.hp/a.max.hp)-(b.dead?-1:b.hp/b.max.hp))[0];
    await this.applySkill(u, s, tt, { tough:30, ult:true });
    this.refresh(); await this.wait(300);
  }
  targets(u, s, t){
    const foes = u.side==='a'?this.alive('e'):this.alive('a'); const friends = u.side==='a'?this.allies:this.foes;
    switch (s.tgt) {
      case 'enemy': return [t && !t.dead ? t : pick(foes)].filter(Boolean);
      case 'enemies': return foes;
      case 'ally': return [t || u];
      case 'allies': return friends.filter(x=>s.revive || !x.dead);
      case 'self': return [u];
    } return [];
  }
  async applySkill(u, s, t, o={}){
    const list = this.targets(u, s, t);
    let el = s.el; if (u.side==='a' && o.basic && u.max.wel) el = u.max.wel;
    const powM = o.ult ? 1+(u.max.ultBoost||0) : 1;
    for (const x of list) {
      if (s.kind==='phys' || s.kind==='mag') {
        this.vfx(x, el, s.kind, o.ult);
        for (let i=0;i<(s.hits||1);i++) { if (x.dead) break; await this.hitOnce(u, x, s.pow*powM, s.kind, el, { tough: i===0 ? o.tough : Math.round(o.tough*0.3), react: i===0 }); if ((s.hits||1)>1) await this.wait(120); }
        if (!x.dead) { this.tryStatus(x, s.st); this.tryStatus(x, s.st2); }
      } else if (s.kind==='heal') {
        if (x.dead) { if (!s.revive) continue; x.dead=false; x.hp=0; this.pop(x,'复苏','heal'); }
        const v = Math.round(s.pow*powM*(u.max.mag*2.2+25)*(1+(u.max.healBoost||0))*rnd(0.95,1.05)); x.hp=Math.min(x.max.hp, x.hp+v); this.pop(x, '+'+v, 'heal');
        if (s.cleanse) for (const k2 of Object.keys(x.st)) if (STATUS[k2]?.bad) delete x.st[k2];
        this.tryStatus(x, s.st); this.tryStatus(x, s.st2);
        const [cx,cy]=this.center(x); rise(cx,cy,'#9dffb0',14);
      } else {
        this.tryStatus(x, s.st, s.shieldPow?u:null, s.shieldPow); this.tryStatus(x, s.st2, s.shieldPow?u:null, s.shieldPow);
        const [cx,cy]=this.center(x); burst(cx,cy, s.kind==='buff'?'#ffe28a':'#c08bff', 12, 2.5);
      }
    }
  }
  vfx(x, el, kind, ult){
    if (T()) return; const r = (x.side==='e'?x.dom.img:x.dom.el).getBoundingClientRect();
    const v = h('div.hitfx.'+(kind==='mag'?'orb':'slash')+'.el-'+el+(ult?'.ult':''));
    v.style.left=(r.left+r.width/2)+'px'; v.style.top=(r.top+r.height*0.45)+'px'; this.root.append(v); setTimeout(()=>v.remove(), 600);
  }
  tryStatus(x, st, src, shieldPow){
    if (!st || x.dead) return; let [k, ch, turns] = st;
    if (x.side==='a' && x.max.immune?.includes(k)) return;
    if (x.boss && ['stun','freeze','charm'].includes(k)) { ch*=0.4; turns=1; }
    if (Math.random() > ch) return;
    if (k==='shield') { x.shield = Math.round((src?src.max.mag*2+40:60)*(shieldPow||0.6)); x.st.shield=turns; this.pop(x,'护盾','buff'); return; }
    x.st[k] = Math.max(x.st[k]||0, turns); this.pop(x, STATUS[k].name, STATUS[k].bad?'debuff':'buff');
  }
  calc(att, def, pow, kind, el, mult=1, forceCrit=false){
    const a = kind==='phys' ? att.max.atk : att.max.mag;
    const d = def.max.def * (def.st.brk?0.6:1) * (kind==='mag'?0.8:1);
    let v = pow * a * 100/(100+d*1.6) * 1.15 * mult;
    const em = elemMult(el, def.el); v *= em;
    if (att.side==='a' && att.max.boost?.[el]) v *= 1+att.max.boost[el];
    if (def.side==='a' && def.max.res?.includes(el)) v *= 0.8;
    if (att.st.atkup) v*=1.3; if (att.st.weak) v*=0.75; if (def.st.defup) v*=0.6; if (def.st.brk) v*=1.15; if (def.broken) v*=1.2;
    if (att.phase===2) v*=1.15;
    const crit = forceCrit || Math.random() < (att.max.crit + (att.side==='a'&&fortuneOn('crit')?0.1:0));
    if (crit) v*=1.5 + (att.max.critDmg||0);
    v *= rnd(0.93,1.07);
    return { v:Math.max(1,Math.round(v)), crit, em };
  }
  async hitOnce(att, def, pow, kind, el, o={}){
    let mult = 1, forceCrit = false, react = null;
    // 相生反应
    if (att.side==='a' && def.side==='e' && o.react && el && el!=='none') {
      const key = def.mark ? def.mark+'>'+el : null;
      if (key && REACT[key] && (GEN[def.mark]===el || (def.mark==='light'&&el==='dark') || (def.mark==='dark'&&el==='light'))) { react = key; def.mark = null; }
      else def.mark = el;
    }
    const rb = 1 + (att.max.reactBoost||0);
    if (react) {
      const R = REACT[react]; this.log.reacts++; S.stats.reacts=(S.stats.reacts||0)+1; if (S.stats.reacts>=30) ach('react30');
      if (react==='wood>fire') mult *= 1+0.6*rb;
      if (react==='light>dark' || react==='dark>light') { mult *= 1+0.5*rb; def.av += this.interval(def)*0.2; }
      if (react==='earth>metal') { forceCrit = true; this.sp = Math.min(SP_MAX, this.sp+1); }
      this.big(R.name, 'react el-'+el); haptic('medium');
    }
    const r = this.calc(att, def, pow, kind, el, mult, forceCrit); let v = r.v;
    if (def.shield>0) { const ab=Math.min(def.shield, v); def.shield-=ab; v-=ab; if (def.shield<=0) { delete def.st.shield; def.shield=0; } if (ab) this.pop(def,'吸收'+ab,'buff'); }
    def.hp = Math.max(0, def.hp - v);
    const [cx,cy] = this.center(def);
    burst(cx, cy, EL_COLOR[el]||'#fff', r.crit?28:14, r.crit?6:4);
    def.dom.el.classList.remove('hurt'); void def.dom.el.offsetWidth; def.dom.el.classList.add('hurt'); setTimeout(()=>def.dom.el.classList.remove('hurt'), 380);
    const weakHit = def.side==='e' && def.weak.includes(el);
    this.pop(def, (r.crit?'暴击 ':'')+v, (weakHit||r.em>1?'weak el-'+el:r.em<1?'resist':'')+(r.crit?' crit':''));
    if (weakHit && att.side==='a') { S.stats.weak=(S.stats.weak||0)+1; if (S.stats.weak>=100) ach('weak'); }
    sfx(r.crit?'crit':'hit'); haptic(r.crit?'medium':'light'); if (r.crit || att.boss) shake(this.root);
    if (def.side==='a') { this.gain(def, 10*(1+(def.max.hitEnergy||0))); this.dmgTaken += v; }
    // 韧性
    if (def.side==='e' && att.side==='a' && !def.broken && !def.dead && o.tough) {
      let td = o.tough * (weakHit ? 1 : 0.25) * (1+(att.max.breakEff||0)); if (react==='fire>earth') { td*=2; def.st.brk=Math.max(def.st.brk||0,2); }
      def.tough = Math.max(0, def.tough - td);
      if (def.tough<=0) await this.doBreak(att, def, el);
    }
    if (react==='metal>water' && !def.dead) { if (def.boss) def.av += this.interval(def)*0.3; else def.st.freeze = Math.max(def.st.freeze||0, 1); this.pop(def, '寒潮', 'debuff'); }
    if (react==='water>wood') for (const a of this.alive('a')) { const hv=Math.round(a.max.hp*0.08*rb); a.hp=Math.min(a.max.hp,a.hp+hv); this.pop(a,'+'+hv,'heal'); }
    if (react==='wood>fire') for (const f of this.alive('e')) f.st.burn = Math.max(f.st.burn||0, 2);
    if (def.hp<=0) { this.kill(def); if (att.side==='a') this.gain(att, 10); }
    else if (def.boss && def.phase===1 && def.hp < def.max.hp*0.5) await this.phase2(def);
    this.refresh();
  }
  async doBreak(att, def, el){
    def.broken = true; this.log.breaks++; S.stats.breaks=(S.stats.breaks||0)+1; if (S.stats.breaks>=50) ach('break50'); sfx('break');
    const st = { fire:'burn', wood:'poison', water:'freeze', metal:'brk', earth:'stun', light:'weak', dark:'weak' }[el];
    const dmg = Math.round((Math.max(att.max.atk, att.max.mag)*1.1 + 20) * (def.boss?1.6:1) * (1+(att.max.breakEff||0)) * (def.st.defup?0.7:1));
    def.hp = Math.max(0, def.hp - dmg);
    def.av += this.interval(def) * 0.25;
    if (def.charging) { this.pop(def, '蓄力被打断！', 'weak'); def.charging = null; this.planIntent(def); }
    if (st) { if (def.boss && (st==='freeze'||st==='stun')) def.av += this.interval(def)*0.15; else def.st[st] = Math.max(def.st[st]||0, st==='freeze'||st==='stun'?1:2); }
    if (att.max.spOnBreak) this.sp = Math.min(SP_MAX, this.sp+1);
    this.big('击破', 'brk el-'+el); this.pop(def, '击破 '+dmg, 'weak crit el-'+el);
    haptic('heavy'); sfx('crit'); shake(this.root); if (!T()) flash(EL_COLOR[el]||'#fff');
    const [cx,cy]=this.center(def); burst(cx,cy,EL_COLOR[el]||'#fff',44,7);
    await this.wait(380);
  }
  async phase2(b){
    b.phase = 2; b.tough = b.tmax; b.broken = false; b.st.atkup = 99; b.bturn = 0;
    for (const k of Object.keys(b.st)) if (STATUS[k]?.bad) delete b.st[k];
    this.charging = null; haptic('heavy'); sfx('bell');
    if (!T()) { const c = h('div.phase2', {}, h('div.p2-a', {}, b.name), h('div.p2-b', {}, '真身 · 二阶段')); this.root.append(c); flash('#ff5a3a'); shake(this.root); await sleep(1500/settings.battleSpeed); c.remove(); }
    this.say(`${b.name} 进入狂暴！韧性恢复，即将蓄力「灭世」`, 'boss');
    this.planIntent(b); this.refresh();
  }
  kill(u){
    if (u.dead) return; u.dead = true; u.st = {}; u.shield = 0; u.charging=null;
    if (u.side==='e') { S.kills[u.id]=(S.kills[u.id]||0)+1; const [cx,cy]=this.center(u); burst(cx,cy,'#ffd27a',40,6); sfx('magic'); if (this.target===u) this.target = this.alive('e')[0]; for (const f of this.alive('e')) {} }
    else { this.anyDown = true; this.say(`${u.name} 倒下了`, 'bad'); sfx('lose'); haptic('warn'); for (const f of this.alive('e')) if (f.intent?.t===u) this.planIntent(f, true); }
  }
  async useItem(u, k, t){
    const it = ITEMS[k]; if (!S.inv[k]) return; addItem(k, -1); this.say(it.name); sfx('item'); await this.wait(260);
    const list = it.tgt==='allies' ? this.allies : it.tgt==='enemies' ? this.alive('e') : [t||u];
    for (const x of list) {
      if (it.revive) { if (x.dead) { x.dead=false; x.hp=Math.round(x.max.hp*it.revive); this.pop(x,'复苏','heal'); } else if (it.revive>=1) x.hp=x.max.hp; }
      if (x.dead) continue;
      if (it.heal) { const v=Math.min(it.heal, x.max.hp-x.hp); x.hp+=v; this.pop(x,'+'+v,'heal'); }
      if (it.cleanse) for (const s of Object.keys(x.st)) if (STATUS[s]?.bad) delete x.st[s];
      if (it.status) { x.st[it.status[0]] = it.status[1]; this.pop(x, STATUS[it.status[0]].name, STATUS[it.status[0]].bad?'debuff':'buff'); }
      if (it.dmg) { x.hp=Math.max(0,x.hp-Math.round(it.dmg*elemMult(it.el,x.el))); this.pop(x,'-'+it.dmg); if (x.side==='e' && !x.broken) { x.tough=Math.max(0,x.tough-15); if (x.tough<=0) await this.doBreak(u, x, it.el||'none'); } if (x.hp<=0) this.kill(x); }
    }
    if (it.mpheal) { this.sp = Math.min(SP_MAX, this.sp+1); this.pop(u,'+1 灯焰','buff'); }
    if (it.gauge) for (const a of this.alive('a')) this.gain(a, it.gauge);
    if (it.flee) { this.over=true; this.say('烟雾弥漫……'); await this.wait(600); this.finish({win:false, fled:true}); return; }
    this.refresh(); await this.wait(300);
  }
  // —— 敌方：预先决定招式与目标 ——
  planIntent(f, keepMove){
    const allies = this.alive('a'); if (!allies.length) return;
    let m = keepMove && f.intent ? f.intent.m : this.chooseMove(f);
    const taunt = allies.filter(a=>a.st.taunt);
    const t = taunt.length ? pick(taunt) : (Math.random()<0.35 ? allies.slice().sort((a,b)=>a.hp-b.hp)[0] : pick(allies));
    f.intent = { m, t: (m.kind==='heal'||m.kind==='buff'||m.tgt==='all') ? null : t };
  }
  chooseMove(f){
    let opts = f.moves.slice();
    const hurtAlly = this.alive('e').some(x=>x.hp/x.max.hp<0.6);
    if (!hurtAlly) opts = opts.filter(m=>m!=='mend');
    if (f.boss) {
      f.bturn = (f.bturn||0)+1;
      if (f.phase===2 && f.bturn % 3 === 0) return { ...MOVES.doom, name: MOVES.doom.name || '灭世', pow: window.__ZLJ_TUNE?.doom2 ?? 2.8, charge:true, tgt:'all' };
      if (f.phase===1 && f.bturn % 5 === 0 && /^B_/.test(f.id)) return { ...MOVES.doom, name: MOVES.doom.name || '灭世', pow: window.__ZLJ_TUNE?.doom1 ?? 2.1, charge:true, tgt:'all' };
      opts = opts.filter(m=>m!=='doom');
    } else opts = opts.filter(m=>m!=='doom');
    if (f.st.atkup) opts = opts.filter(m=>m!=='rage'); if (f.st.defup) opts = opts.filter(m=>m!=='guard');
    if (!opts.length) opts=['hit'];
    return MOVES[pick(opts)] || MOVES.hit;
  }
  async foeTurn(f){
    const m = f.charging || f.intent?.m || this.chooseMove(f);
    if (m.charge && !f.charging) { f.charging = m; this.say(`${f.name} 正在蓄力「${m.name}」——击破可打断！`, 'warn'); sfx('debuff'); haptic('warn'); f.dom.el.classList.add('charging'); this.refresh(); await this.wait(700); return; }
    f.charging = null; f.dom.el.classList.remove('charging');
    this.say(`${f.name}·${m.name}`, f.boss?'boss':'');
    f.dom.el.classList.add('lunge'); setTimeout(()=>f.dom.el.classList.remove('lunge'), 400);
    await this.wait(380);
    const allies = this.alive('a'); if (!allies.length) return;
    const taunt = allies.filter(a=>a.st.taunt);
    let t = f.intent?.t; if (!t || t.dead) t = taunt.length ? pick(taunt) : pick(allies); if (taunt.length && !taunt.includes(t)) t = pick(taunt);
    if (m.kind==='heal') { const tt = this.alive('e').sort((a,b)=>a.hp/a.max.hp-b.hp/b.max.hp)[0]; const v=Math.round(m.pow*(f.max.mag*1.5+20)); tt.hp=Math.min(tt.max.hp,tt.hp+v); this.pop(tt,'+'+v,'heal'); sfx('heal'); }
    else if (m.kind==='buff') { this.tryStatus(f, m.st); sfx('buff'); if (f.boss) { await this.wait(300); await this.hitOnce(f, t, 0.9, f.max.atk>=f.max.mag?'phys':'mag', f.el==='none'?'none':f.el, {}); } }
    else if (m.kind==='debuff') { const ts = m.tgt==='all'?allies:[t]; for (const x of ts) this.tryStatus(x, m.st); sfx('debuff'); }
    else {
      const ts = m.tgt==='all' ? allies : [t];
      if (m.tgt==='all' && f.boss) { shake(this.root); if (!T()) flash('#ff3a2a'); }
      for (const x of ts) {
        for (let i=0;i<(m.hits||1);i++) { if (x.dead) break; const hp0=x.hp; await this.hitOnce(f, x, m.pow, m.kind, f.el==='none'?'none':f.el, {});
          if (m.drain) { const v=Math.round((hp0-x.hp)*m.drain); f.hp=Math.min(f.max.hp,f.hp+v); if (v) this.pop(f,'+'+v,'heal'); } }
        if (!x.dead) this.tryStatus(x, m.st);
      }
    }
    this.planIntent(f);
    this.refresh(); await this.wait(380);
  }
  // —— 结算 ——
  persist(){
    for (const a of this.allies) { const p=S.party[a.id]; p.hp = a.dead ? 1 : Math.round(a.hp); p.mp = a.max.mp; }
  }
  async win(){
    await this.wait(450); sfx('win'); playBgm('none'); haptic('success');
    const avg = S.members.reduce((s,m)=>s+S.party[m].lv,0)/S.members.length;
    let exp=0, gold=0; const drops={};
    for (const f of this.foes) {
      let e = (12 + f.lv*f.lv*0.9 + f.lv*6) * (f.boss?5:this.elite?2:1); const diff = f.lv-avg; e *= diff>0 ? 1+0.25*diff : diff<-4 ? 0.5 : 1;
      exp += e; gold += (8 + f.lv*5) * (f.boss?6:this.elite?2:1) * rnd(0.85,1.15);
      for (const [it, ch] of f.d.drops||[]) if (Math.random() < ch*(fortuneOn('drop')?1.3:1)*(this.elite?1.5:1)) { drops[it]=(drops[it]||0)+1; }
    }
    if (fortuneOn('exp')) exp*=1.3; if (fortuneOn('gold')) gold*=1.3;
    if (this.opts.ambush==='player') { exp*=1.1; gold*=1.1; }
    const gb = 1 + Math.max(0, ...this.allies.map(a=>a.max.goldBonus||0));
    exp = Math.round(exp); gold = Math.round(gold*gb);
    this.persist();
    if (fortuneOn('heal')) for (const m of S.members) { const st=stats(m); S.party[m].hp=Math.min(st.hp, S.party[m].hp+Math.round(st.hp*0.2)); }
    // 战后恢复少量气血，减少跑营地的枯燥
    for (const m of S.members) { const st=stats(m); S.party[m].hp=Math.min(st.hp, Math.max(1,S.party[m].hp)+Math.round(st.hp*0.12)); }
    addGold(gold); for (const [k,n] of Object.entries(drops)) addItem(k, n);
    const ups = [];
    for (const m of S.members) { const share = S.formation.includes(m) ? 1 : 0.7; const lv0=S.party[m].lv; const u=gainExp(m, Math.round(exp*share)); if (u.length) ups.push([m, lv0, S.party[m].lv]); }
    S.stats.wins++; S.stats.battles++; ach('win1'); if (S.stats.wins>=50) ach('win50'); if (S.stats.wins>=150) ach('win150');
    if (this.boss && !this.anyDown) ach('nohit');
    for (const k in S.gather) if (S.gather[k]>0) S.gather[k]--;
    if (ups.length) sfx('level');
    const rank = this.anyDown ? '乙' : this.dmgTaken < this.allies.reduce((s,a)=>s+a.max.hp,0)*0.25 ? '甲上' : '甲';
    const panel = h('div.bt-result', {}, h('div.res-card', {},
      h('div.res-title', {}, '胜'), h('div.res-rank', {}, '评定 · '+rank),
      h('div.res-stats', {}, h('span', {}, `击破 ${this.log.breaks}`), h('span', {}, `反应 ${this.log.reacts}`), h('span', {}, `终结技 ${this.log.ults}`)),
      h('div.res-row', {}, h('div.rr', {}, h('b', {}, '+'+exp), h('small', {}, '经验')), h('div.rr', {}, h('b.gold', {}, '+'+gold), h('small', {}, '星砂'))),
      h('div.res-drops', {}, Object.entries(drops).map(([k,n],i)=>h('div.drop', {style:{animationDelay:(0.3+i*0.1)+'s'}}, icon(ITEMS[k].icon,'sm'), h('span', {}, ITEMS[k].name), h('em', {}, '×'+n)))),
      h('div.res-party', {}, S.formation.filter(m=>S.members.includes(m)).map(m=>{ const p=S.party[m]; const up=ups.find(x=>x[0]===m); return h('div.rp'+(up?'.up':''), {}, h('div.rp-f', {style:{backgroundImage:`url(${asset('por/'+m)})`}}), h('div.rp-n', {}, CHARS[m].name), h('div.rp-l', {}, up?`Lv${up[1]} → ${up[2]}`:'Lv'+p.lv), h('div.bar.exp', {}, h('i', {style:{width:(p.exp/expNeed(p.lv)*100)+'%'}}))); })),
      btn('继续', ()=>this.finish({win:true}), 'gold big')));
    this.root.append(panel);
    if (T()) setTimeout(()=>this.finish({win:true}), 20);
  }
  async lose(){
    await this.wait(500); sfx('lose'); this.persist(); haptic('warn');
    S.stats.battles++;
    const tip = this.boss ? '提示：首领蓄力「灭世」时，用弱点属性击破即可打断；来不及就全员防御。' : '提示：盯住敌人意图上的目标名，提前给被瞄准的同伴加护盾或防御。';
    const panel = h('div.bt-result.lose', {}, h('div.res-card', {}, h('div.res-title', {}, '败'), h('p', {}, '灯火摇曳……但还没有熄灭。'), h('p.tip', {}, tip),
      h('div.row.center', {}, btn('再战一次', ()=>{ for (const m of S.members){ const st=stats(m); S.party[m].hp=st.hp; S.party[m].mp=st.mp; } this.root.remove(); new Battle(this.encId, this.opts, this.resolve); }, 'gold'),
        !this.opts.story ? btn('撤退', ()=>this.finish({win:false})) : (this.opts.loseLabel ? btn('接受命运', ()=>this.finish({win:false})) : null),
        btn('读取存档', ()=>{ this.finish({win:false, load:true}); }))));
    this.root.append(panel);
    if (T() && T().autoRetry) setTimeout(()=>panel.querySelector('.btn.gold').click(), 20);
    else if (T() && T().autoLose) setTimeout(()=>this.finish({win:false}), 20);
  }
  finish(r){
    if (this.done) return; this.done = true; this.persist();
    if (r.win===false && !r.fled) for (const m of S.members) { const st=stats(m); S.party[m].hp=Math.max(S.party[m].hp, Math.round(st.hp*0.3)); }
    if (T()) T().lastBattle = { enc:this.encId, win:r.win, turns:this.turn, ...this.log, taken:+(this.dmgTaken/this.allies.reduce((a,x)=>a+x.max.hp,0)).toFixed(2), down:this.anyDown, hpLeft:+(this.allies.reduce((a,x)=>a+Math.max(0,x.hp),0)/this.allies.reduce((a,x)=>a+x.max.hp,0)).toFixed(2) };
    this.root.classList.add('closing'); setTimeout(()=>this.root.remove(), 250);
    this.resolve(r);
  }
}
