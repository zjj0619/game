import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'/usr/bin/google-chrome' });
const p = await b.newPage({ viewport:{width:915,height:412} });
const errs=[]; p.on('pageerror', e=>errs.push(e.message));
await p.addInitScript((TUNE)=>{ localStorage.clear(); window.__ZLJ_TEST={auto:true,nopop:true,lineMs:0,autoLose:true}; window.__ZLJ_TUNE=JSON.parse(TUNE); }, process.env.TUNE||'{}');
await p.goto('http://localhost:4173/'); await p.waitForTimeout(1500);
await p.click('text=新的旅程'); await p.waitForTimeout(500);
let BOSSES=[['qq_b',5,2],['dh_b',8,3],['cy_a',10,4],['kl_c',15,4],['yg_c',22,5],['bh_d',29,6],['gx_c',35,7]];
if (process.env.ONLY) BOSSES=BOSSES.filter(x=>process.env.ONLY.split(',').includes(x[0]));
const N=+(process.env.N||6);
for (const mode of (process.env.MODES||'auto,smart').split(',')) for (const [enc,L,nm] of BOSSES) {
  const r = await p.evaluate(async ({enc,L,nm,mode,N})=>{
    const z=window.__zlj, S=z.S, I=z.ITEMS||window.__zlj.items;
    const order=['yangui','baiji','xianwei','qi','ali','kualing','fuli'];
    const res=[];
    for (let k=0;k<N;k++){
      for (const m of order.slice(0,nm)) z.add(m);
      S.formation=order.slice(0,Math.min(4,nm)).concat(nm>4?[]:[]); if (nm>=7) S.formation=['yangui','baiji','ali','fuli'];
      for (const m of S.members){ const P=S.party[m]; P.lv=L; P.talents=[]; 
        if (I) for (const slot of ['weapon','armor','charm']){ const type=slot; let best=null; for (const [id,it] of Object.entries(I)) if (it.type===type && it.price>0 && it.price<=L*140 && (!best||it.price>I[best].price)) best=id; if (best) P.equip[slot]=best; }
      }
      S.lamp = L>=30?4:L>=20?3:L>=10?2:1;
      window.__ZLJ_TEST.smart = mode==='smart'; window.__ZLJ_TEST.auto=true;
      z.healAll && z.healAll();
      document.querySelectorAll('.screen').forEach(e=>e.remove());
      const t0=performance.now();
      await window.__game.battle(enc,{story:true});
      const lb=window.__ZLJ_TEST.lastBattle; res.push({win:lb?.win, turns:lb?.turns, ms:Math.round(performance.now()-t0), br:lb?.breaks, re:lb?.reacts, hp:lb?.hpLeft, tk:lb?.taken});
    }
    return res;
  }, {enc,L,nm,mode,N});
  const w=r.filter(x=>x.win).length; const t=r.map(x=>x.turns);
  console.log(mode.padEnd(5), enc.padEnd(12), 'Lv'+L, `win ${w}/${r.length}`, 'turns', t.join(','), 'brk', r.map(x=>x.br).join(','), 'hp', r.map(x=>x.hp).join(','), 'taken', r.map(x=>x.tk).join(','));
}
console.log('ERR', errs.slice(0,5).join('\n'));
await b.close();
