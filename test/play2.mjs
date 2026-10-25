// v1.1 自动通关：横版探索（__ex 钩子）+ 自动战斗 + 支线/宝箱/羁绊/成长，截图到 screenshots_v2/play_*
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://localhost:4173/';
const SHOT = '/workspace/game/screenshots_v2/'; const W=+(process.env.W||915), H=+(process.env.H||412);
const TARGET = process.env.TARGET || 'A';
const b = await chromium.launch({ executablePath:'/usr/bin/google-chrome', args:['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{width:W,height:H}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const errs=[]; p.on('pageerror', e=>errs.push('PAGEERROR '+e.message+' '+(e.stack||'').split('\n')[1])); p.on('console', m=>{ if (m.type()==='error') errs.push(m.text()); });
await p.addInitScript((target)=>{
  if (!sessionStorage.getItem('init')) { localStorage.clear(); localStorage.setItem('zlj_settings', JSON.stringify({textSpeed:100, music:0.3})); sessionStorage.setItem('init','1'); }
  window.__ZLJ_TEST = { auto:true, smart:true, lineMs:0, endMs:5000, autoRetry:false, target,
    choose(c, opts){
      const sc = o => { let s=Math.random()*0.5; const e=(o.eff||[]).join(' ');
        for (const m of e.matchAll(/aff:(\w+)([+-]\d+)/g)) s += +m[2] * (m[1]==='baiji'?1.5:1);
        for (const m of e.matchAll(/hope([+-]\d+)/g)) s += +m[2];
        if (/flag:(ba_freed|fuli_forgiven|baiji_protected|elixir_keep)/.test(e)) s+=20;
        if (/lose:|fuli_killed|self_rear/.test(e)) s-=30;
        if (o.to==='fin_'+target.toLowerCase()) s+=2000;
        return s; };
      return opts.slice().sort((a,b)=>sc(b)-sc(a))[0];
    } };
}, TARGET);
const shots = new Set();
async function shot(name, force){ if (shots.has(name) && !force) return; shots.add(name); await p.waitForTimeout(450); await p.evaluate(()=>document.querySelectorAll('.toasts').forEach(e=>e.replaceChildren())); await p.screenshot({ path:SHOT+'play_'+name+'_'+W+'.png' }); console.log('📷', name); }
await p.goto(URL); await p.waitForTimeout(2500); await shot('01_title');
await p.click('text=新的旅程');
const t0 = Date.now(); let last=''; let stuck=0; const loses={}; const done=new Set(); let ending=null; const log=[]; const grind={};
const spendProgress = () => p.evaluate(()=>{ const z=window.__zlj, S=z.S; let n=0;
  for (const m of S.members) { const P=S.party[m]; P.talents ??= []; while (P.talents.length < Math.min(6, Math.floor(P.lv/4))) { P.talents.push('t'+(P.talents.length+1)); n++; } }
  return n; });
while (Date.now()-t0 < 35*60*1000) {
  await p.waitForTimeout(120);
  const st = await p.evaluate(() => {
    const z = window.__zlj, S = z.S; const q = s=>document.querySelector(s);
    const ends = q('.ending, .end-screen, .ending-screen');
    return { mode:S?.mode, ch:S?.chapterN, region:S?.region, exp:S?.explore?.region, ex:!!q('.screen.explore'),
      battle:!!q('.screen.bt'), lose:!!q('.bt-result.lose'), panel:!!q('.panel-wrap'), reward:!!q('.reward'), tut:!!q('.tut'),
      name:q('.vn-name')?.textContent||'', text:(q('.vn-text')?.textContent||'').slice(0,20), cg: !!q('.vn-cg.on'), ending: ends ? ends.className : null,
      bonds: S && S.mode==='region' ? S.members.some(m=>z.nextBond(S,m)) : false, lv: S ? S.party?.yangui?.lv : 0, lamp:S?.lamp };
  });
  if (st.ch!==globalThis._lc) { globalThis._lc=st.ch; console.log('CH', st.ch, 'Lv', st.lv, 'lamp', st.lamp, Math.round((Date.now()-t0)/1000)+'s'); }
  await p.evaluate(ms=>window.__ZLJ_TEST.lineMs=ms, (st.ch>=2 && !shots.has('02_dialogue')) ? 900 : 0);
  const sig = JSON.stringify([st.mode, st.ch, st.text, st.battle, st.panel, st.reward, st.lose]);
  if (Date.now()-(globalThis._hb||0) > 20000) { globalThis._hb=Date.now(); console.log('HB', Math.round((Date.now()-t0)/1000), sig, stuck, log.slice(-3).join('|')); await p.screenshot({path:'/tmp/dbg.png'}); }
  if (sig===last) stuck++; else { stuck=0; last=sig; }
  if (st.ending) { ending = await p.evaluate(()=>(document.querySelector('.end-x')?.textContent||'')+' '+(document.querySelector('.end-name')?.textContent||'')); await shot('09_ending'); await p.waitForTimeout(5600); await shot('12_credits'); break; }
  if (st.tut) { await p.click('.tut').catch(()=>{}); continue; }
  if (st.reward) { if (st.ch>=2) await shot('07_reward'); await p.click('.reward').catch(()=>{}); continue; }
  if (st.lose) { loses[st.ch]=(loses[st.ch]||0)+1; log.push(`败 ch${st.ch} Lv${st.lv}`); await shot('08_lose');
    if (loses[st.ch]>2) await p.evaluate(()=>{ window.__ZLJ_TEST.autoWin=true; setTimeout(()=>window.__ZLJ_TEST.autoWin=false, 4000); });
    await p.click('text=再战一次'); continue; }
  if (st.battle) { if (st.ch>=3 && !shots.has('05_combat')) { await p.waitForTimeout(1800); await shot('05_combat'); } continue; }
  if (st.mode==='region' && st.ex && !st.panel) {
    if (await spendProgress()) log.push('星命 ch'+st.ch);
    const L = await p.evaluate(()=>window.__ex.list());
    const k = (e)=>st.region+':'+e.i;
    await shot('03_explore');
    // 1) 支线（新/可交付）
    let t = L.find(e=>e.k==='quest' && (e.qs==='new'||e.qs==='ready') && !done.has('q'+e.q+e.qs));
    if (t) { done.add('q'+t.q+t.qs); await p.evaluate(i=>{ window.__ex.act(i); }, t.i); log.push('支线 '+t.q+' '+t.qs); continue; }
    // 2) 宝箱（可开）
    t = L.find(e=>e.k==='chest' && !e.opened && !done.has('c'+st.region+e.i));
    if (t) { done.add('c'+st.region+e_i(t)); await p.evaluate(i=>{ window.__ex.act(i); }, t.i); continue; }
    // 3) 刷支线：采集 / 杂兵
    const gk = st.ch+'_'+st.region; grind[gk]=grind[gk]||0;
    if (grind[gk]<14 && L.some(e=>e.k==='quest' && e.qs==='active')) { grind[gk]++;
      const g = L.filter(e=>e.k==='gather'); const f = L.filter(e=>e.k==='foe' && !e.gone && !e.elite);
      if (g.length && grind[gk]%2) await p.evaluate(i=>{ window.__ex.act(i); }, g[grind[gk]%g.length].i);
      else if (f.length) await p.evaluate(i=>{ window.__ex.act(i); }, f[0].i);
      else if (g.length) await p.evaluate(i=>{ window.__ex.act(i); }, g[0].i);
      log.push('刷'); continue; }
    // 4) 灯阶：有钱就升；石灯谜题
    if (await p.evaluate(()=>{ const z=window.__zlj; return z.S.gold > 0; })) {
      const up = await p.evaluate(async ()=>{ const S=window.__zlj.S; const LAMP=[null,null,{gold:300,need:{m_starmarrow:2}},{gold:900,need:{m_starmarrow:4,m_ember:2}},{gold:2000,need:{m_starmarrow:6,m_jade:3}},{gold:4000,need:{m_starmarrow:10,m_goldsand:4}}];
        const c = LAMP[(S.lamp||1)+1]; if (!c) return false; return S.gold>=c.gold && Object.entries(c.need).every(([k,n])=>(S.inv[k]||0)>=n); });
      if (up && !done.has('lamp'+st.lamp)) { done.add('lamp'+st.lamp); const camp = L.find(e=>e.k==='camp'); await p.evaluate(i=>{ window.__ex.act(i); }, camp.i); await p.waitForTimeout(500); await p.click('.cmr.hot >> nth=0').catch(()=>{}); await p.waitForTimeout(400); await shot('06_lamp'); await p.click('.lamp .btn.gold').catch(()=>{}); await p.waitForTimeout(400); await p.evaluate(()=>document.querySelectorAll('.panel-wrap').forEach(e=>e.remove())); log.push('灯阶→'+(st.lamp+1)); continue; }
    }
    // 5) 精英（每区一次）
    t = L.find(e=>e.k==='foe' && e.elite && !e.gone && !done.has('el'+st.region));
    if (t && st.ch>=3) { done.add('el'+st.region); await p.evaluate(i=>{ window.__ex.act(i); }, t.i); continue; }
    // 6) 羁绊
    if (st.bonds && !done.has('b'+st.ch+st.region)) { done.add('b'+st.ch+st.region); const camp = L.find(e=>e.k==='camp');
      if (camp) { await p.evaluate(i=>{ window.__ex.act(i); }, camp.i); await p.waitForTimeout(600); if (st.ch>=4) await shot('10_camp');
        const s = await p.$('.seat.bond'); const who = await p.evaluate(()=>{ const z=window.__zlj; return z.S.members.filter(m=>z.nextBond(z.S,m)).join(',')+' camp='+!!document.querySelector('.panel-wrap.camp'); });
        if (s) { await s.click(); log.push('羁绊 ch'+st.ch); } else { log.push('无心事座位 '+who); await p.evaluate(()=>document.querySelectorAll('.panel-wrap').forEach(e=>e.remove())); } }
      continue; }
    // 7) 主线
    t = L.find(e=>e.k==='main'); if (t) { await p.evaluate(i=>window.__ex.go(i), t.i); await p.waitForTimeout(250); if (st.ch>=3) await shot('04_main'); await p.evaluate(i=>{ window.__ex.act(i); }, t.i); continue; }
    if (st.exp && st.exp!==st.region) { await p.evaluate(r=>window.__game.region(r), st.exp); continue; }
  }
  if (st.mode==='world') { await shot('04_world'); if (st.exp) await p.evaluate(r=>window.__game.region(r), st.exp); continue; }
  if (st.panel && st.mode==='region') { await p.evaluate(()=>document.querySelectorAll('.panel-wrap').forEach(e=>e.remove())); continue; }
  if (st.name && st.name.trim() && !/旁白/.test(st.name) && st.ch>=2 && st.text.length>8) await shot('02_dialogue');
  if (st.cg && st.ch>=3) await shot('11_cg');
  if (stuck>40) { await p.mouse.click(W/2, H*0.75); stuck=0; log.push('戳 '+sig); }
}
function e_i(t){ return t.i; }
const fin = await p.evaluate(()=>{ const S=window.__zlj.S; return { ch:S.chapterN, lv:S.party.yangui.lv, hope:S.hope, lamp:S.lamp, gold:S.gold, chests:Object.keys(S.chests).length, puzzles:Object.keys(S.puzzles).length, members:S.members, quests:Object.values(S.quests).filter(x=>x==='done').length, bonds:Object.keys(S.flags).filter(f=>/^bond_/.test(f)).length, ach:Object.keys(window.__zlj.meta?.ach||{}).length }; });
console.log(JSON.stringify({ ending, secs:Math.round((Date.now()-t0)/1000), fin, loses, log:log.filter(x=>x!=='刷').slice(-50), grinds:log.filter(x=>x==='刷').length }, null, 1));
console.log('ERRORS:\n'+[...new Set(errs)].slice(0,30).join('\n'));
await b.close();
