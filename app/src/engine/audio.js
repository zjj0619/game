// 程序化 WebAudio 音乐与音效（五声音阶，无任何外部音频版权）
import { settings } from './state.js';
let ctx, master, musicBus, sfxBus, verb, cur=null, timer=null, step=0, nextT=0;
const PENTA = [0,2,4,7,9];
const THEMES = {
  title:{root:50,mode:[0,2,5,7,9],bpm:56,pad:true,bell:0.25,pluck:0.5,drum:0,dark:0.3},
  jincheng:{root:48,mode:[0,3,5,7,10],bpm:62,pad:true,bell:0.15,pluck:0.55,drum:0,dark:0.4},
  qingqiu:{root:55,mode:PENTA,bpm:70,pad:true,bell:0.3,pluck:0.7,drum:0,dark:0.1},
  donghai:{root:52,mode:[0,2,4,7,9],bpm:58,pad:true,bell:0.1,pluck:0.45,drum:0,dark:0.2,wave:true},
  changyang:{root:45,mode:[0,3,5,7,10],bpm:76,pad:true,bell:0.05,pluck:0.5,drum:0.5,dark:0.5},
  kunlun:{root:57,mode:[0,2,5,7,9],bpm:54,pad:true,bell:0.45,pluck:0.4,drum:0,dark:0},
  hundun:{root:51,mode:[0,1,5,7,8],bpm:84,pad:true,bell:0.3,pluck:0.75,drum:0.3,dark:0.3},
  yugu:{root:47,mode:[0,3,5,7,10],bpm:66,pad:true,bell:0.1,pluck:0.5,drum:0.25,dark:0.3},
  beihai:{root:50,mode:[0,2,3,7,8],bpm:50,pad:true,bell:0.4,pluck:0.3,drum:0,dark:0.6},
  guixu:{root:43,mode:[0,1,5,7,10],bpm:48,pad:true,bell:0.35,pluck:0.3,drum:0,dark:0.8},
  sad:{root:50,mode:[0,3,5,7,10],bpm:50,pad:true,bell:0.2,pluck:0.4,drum:0,dark:0.5},
  warm:{root:53,mode:PENTA,bpm:60,pad:true,bell:0.2,pluck:0.6,drum:0,dark:0},
  tense:{root:46,mode:[0,1,5,6,10],bpm:90,pad:true,bell:0.1,pluck:0.6,drum:0.4,dark:0.7},
  battle:{root:50,mode:[0,3,5,7,10],bpm:132,pad:false,bell:0,pluck:0.9,drum:1,dark:0.3,battle:true},
  boss:{root:45,mode:[0,1,5,7,8],bpm:144,pad:true,bell:0.15,pluck:0.9,drum:1,dark:0.6,battle:true},
  final:{root:43,mode:[0,2,3,7,8],bpm:150,pad:true,bell:0.4,pluck:1,drum:1,dark:0.5,battle:true},
  dawn:{root:55,mode:[0,2,4,7,9],bpm:64,pad:true,bell:0.6,pluck:0.6,drum:0,dark:0},
  dream:{root:58,mode:[0,2,6,7,11],bpm:46,pad:true,bell:0.7,pluck:0.25,drum:0,dark:0.1},
};
export function initAudio(){
  if (ctx) { if (ctx.state==='suspended') ctx.resume(); return; }
  const AC = window.AudioContext||window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
  musicBus = ctx.createGain(); sfxBus = ctx.createGain(); musicBus.connect(master); sfxBus.connect(master);
  // 简易混响
  verb = ctx.createConvolver(); const len=ctx.sampleRate*2.6; const b=ctx.createBuffer(2,len,ctx.sampleRate);
  for (let c=0;c<2;c++){ const d=b.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.4); }
  verb.buffer=b; const vg=ctx.createGain(); vg.gain.value=0.35; verb.connect(vg); vg.connect(musicBus);
  applyVolumes();
  if (cur) { const n=cur; cur=null; playBgm(n); }
}
export function applyVolumes(){ if(!ctx) return; master.gain.value=settings.master; if (usingFile && trackGain) { musicBus.gain.value=1; trackGain.gain.value=trackVol(); } else { musicBus.gain.value=settings.music*0.55; } sfxBus.gain.value=settings.sfx; if (trackEl && !trackGain) trackEl.volume=trackVol(); }
const mtof = m => 440*Math.pow(2,(m-69)/12);
function env(g,t,a,d,peak){ g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+d); }
function pluck(m,t,vol=0.18,dur=1.6){ // 古筝式拨弦
  const o=ctx.createOscillator(), o2=ctx.createOscillator(), g=ctx.createGain(), f=ctx.createBiquadFilter();
  o.type='triangle'; o2.type='sawtooth'; o.frequency.value=mtof(m); o2.frequency.value=mtof(m)*1.002;
  f.type='lowpass'; f.frequency.setValueAtTime(mtof(m)*8,t); f.frequency.exponentialRampToValueAtTime(mtof(m)*1.5,t+dur*0.6);
  const g2=ctx.createGain(); g2.gain.value=0.25; o2.connect(g2); g2.connect(f); o.connect(f); f.connect(g); env(g,t,0.004,dur,vol);
  g.connect(musicBus); g.connect(verb); o.start(t); o2.start(t); o.stop(t+dur+0.1); o2.stop(t+dur+0.1);
  // 揉弦：轻微下滑
  o.frequency.setValueAtTime(mtof(m),t+0.25); o.frequency.linearRampToValueAtTime(mtof(m)*0.995,t+dur);
}
function pad(m,t,dur,vol=0.05){ // 埙/箫式长音
  const o=ctx.createOscillator(), g=ctx.createGain(), lfo=ctx.createOscillator(), lg=ctx.createGain(), f=ctx.createBiquadFilter();
  o.type='sine'; o.frequency.value=mtof(m); lfo.frequency.value=5; lg.gain.value=mtof(m)*0.006; lfo.connect(lg); lg.connect(o.frequency);
  f.type='lowpass'; f.frequency.value=1800; o.connect(f); f.connect(g);
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+dur*0.3); g.gain.linearRampToValueAtTime(0.0001,t+dur);
  g.connect(musicBus); g.connect(verb); o.start(t); lfo.start(t); o.stop(t+dur+0.1); lfo.stop(t+dur+0.1);
  // 气声
  const n=noise(dur), nf=ctx.createBiquadFilter(), ng=ctx.createGain(); nf.type='bandpass'; nf.frequency.value=mtof(m)*2; nf.Q.value=8;
  n.connect(nf); nf.connect(ng); ng.gain.setValueAtTime(0.0001,t); ng.gain.linearRampToValueAtTime(vol*0.25,t+dur*0.3); ng.gain.linearRampToValueAtTime(0.0001,t+dur); ng.connect(musicBus); n.start(t); n.stop(t+dur);
}
function bell(m,t,vol=0.06){ // 钟磬：FM
  const c=ctx.createOscillator(), mo=ctx.createOscillator(), mg=ctx.createGain(), g=ctx.createGain();
  c.frequency.value=mtof(m); mo.frequency.value=mtof(m)*3.5; mg.gain.value=mtof(m)*2; mo.connect(mg); mg.connect(c.frequency);
  c.connect(g); env(g,t,0.003,3.2,vol); g.connect(musicBus); g.connect(verb); c.start(t); mo.start(t); c.stop(t+3.4); mo.stop(t+3.4);
}
let nb=null; function noise(d){ if(!nb){ nb=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate); const x=nb.getChannelData(0); for(let i=0;i<x.length;i++) x[i]=Math.random()*2-1; } const s=ctx.createBufferSource(); s.buffer=nb; s.loop=true; return s; }
function drum(t,type,vol=0.5,bus){ bus=bus||musicBus;
  if (type==='kick'){ const o=ctx.createOscillator(),g=ctx.createGain(); o.frequency.setValueAtTime(110,t); o.frequency.exponentialRampToValueAtTime(40,t+0.25); env(g,t,0.002,0.35,vol); o.connect(g); g.connect(bus); o.start(t); o.stop(t+0.4); }
  else { const n=noise(),f=ctx.createBiquadFilter(),g=ctx.createGain(); f.type=type==='hat'?'highpass':'bandpass'; f.frequency.value=type==='hat'?7000:1800; n.connect(f); f.connect(g); env(g,t,0.001,type==='hat'?0.05:0.18,vol*0.5); g.connect(bus); n.start(t); n.stop(t+0.3); }
}
function tick(){
  if (!ctx || !cur) return; const th=THEMES[cur]; const spb=60/th.bpm/2;
  while (nextT < ctx.currentTime+0.25) {
    const t=nextT, s=step%32, bar=Math.floor(step/32);
    const deg = i => { const L=th.mode.length; return th.root + 12*Math.floor(i/L) + th.mode[((i%L)+L)%L]; };
    const prog=[0,3,4,2][bar%4];
    if (th.pad && s===0) { pad(deg(prog)-12, t, spb*32, 0.045); pad(deg(prog+2)-12, t, spb*32, 0.03); }
    if (th.battle) {
      if (s%4===0) drum(t,'kick',0.55); if (s%8===4) drum(t,'snare',0.5); if (s%2===1) drum(t,'hat',0.25);
      if (s%2===0 && Math.random()<th.pluck) pluck(deg(prog+[0,2,4,2,5,4,2,1][(s/2)%8])+12, t, 0.12, 0.5);
      if (s%8===0) pluck(deg(prog)-12,t,0.2,0.8);
    } else {
      const r=Math.random();
      if (s%2===0 && r<th.pluck*0.45) { const i=prog+Math.floor(Math.random()*7); pluck(deg(i)+12, t, 0.12+Math.random()*0.06, 1.8);
        if (Math.random()<0.3) pluck(deg(i)+12, t+spb*0.5, 0.06, 1.2); }
      if (s%8===0 && Math.random()<th.bell) bell(deg(prog+Math.floor(Math.random()*5))+24, t, 0.035);
      if (th.drum && s%16===0) drum(t,'kick',0.35*th.drum);
      if (th.wave && s===0) { const n=noise(),f=ctx.createBiquadFilter(),g=ctx.createGain(); f.type='lowpass'; f.frequency.value=600; n.connect(f); f.connect(g); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.05,t+spb*12); g.gain.linearRampToValueAtTime(0.0001,t+spb*30); g.connect(musicBus); n.start(t); n.stop(t+spb*31); }
    }
    nextT += spb; step++;
  }
}

// 预渲染主题（MIDI+FluidSynth 原创 → mp3/ogg）；无文件时回退程序化
const M = id => ({ mp3: `assets/music/${id}.mp3`, ogg: `assets/music/${id}.ogg` });
const THEME_BANK = {
  title: M('theme_title'), warm: M('theme_hub'), hub: M('theme_hub'),
  battle: M('theme_battle'), boss: M('theme_boss'), final: M('theme_final'), epic: M('theme_final'),
  dream: M('theme_dream'), soft: M('theme_dream'),
  dawn: M('theme_win'), win: M('theme_win'), ending: M('theme_ending'),
  sad: M('theme_sad'), tense: M('theme_boss'),
  jincheng: M('theme_jincheng'), qingqiu: M('theme_qingqiu'), donghai: M('theme_donghai'),
  kunlun: M('theme_kunlun'), beihai: M('theme_beihai'), guixu: M('theme_guixu'),
  // 邻近区域复用
  changyang: M('theme_jincheng'), hundun: M('theme_guixu'), yugu: M('theme_qingqiu'), youdu: M('theme_beihai'),
};
const THEME_FILES = Object.fromEntries(Object.entries(THEME_BANK).map(([k, v]) => [k, v.mp3]));
let trackEl = null, trackNode = null, trackGain = null, usingFile = false;
function trackVol(){ return Math.min(1, (settings.music || 0.6) * (settings.master || 1) * 0.7); }
function resolveSrc(name){
  const b = THEME_BANK[name]; if (!b) return null;
  // 优先 mp3（Android WebView / Capacitor 最稳）；ogg 作解码失败回退
  return b.mp3 || b.ogg;
}
function resolveSrcFallback(name){
  const b = THEME_BANK[name]; return b ? b.ogg : null;
}
function detachTrack(){
  try { if (trackEl) { trackEl.pause(); trackEl.removeAttribute('src'); trackEl.load?.(); } } catch(e){}
  try { if (trackNode) { trackNode.disconnect(); } } catch(e){}
  trackEl = null; trackNode = null; trackGain = null; usingFile = false;
}
function playTrackFile(name){
  const src = resolveSrc(name); if (!src) return false;
  try {
    detachTrack();
    initAudio();
    const a = new Audio(src); a.loop = true; a.preload = 'auto';
    if (ctx && musicBus) {
      // 走混音总线，与 SFX/程序化同一音量曲线
      trackGain = ctx.createGain(); trackGain.gain.value = trackVol();
      trackNode = ctx.createMediaElementSource(a);
      trackNode.connect(trackGain); trackGain.connect(musicBus);
      // 文件轨时压低程序化垫乐
      musicBus.gain.cancelScheduledValues(ctx.currentTime);
      musicBus.gain.setValueAtTime(1, ctx.currentTime);
    } else {
      a.volume = trackVol();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    a.onerror = () => { const fb = resolveSrcFallback(name); if (fb && a.src.indexOf('.ogg') < 0) { a.src = fb; a.play().catch(() => {}); } };
    const p = a.play(); if (p && p.catch) p.catch(() => {});
    trackEl = a; usingFile = true; return true;
  } catch(e){ detachTrack(); return false; }
}
export function stopTrack(){ detachTrack(); }

export function playBgm(name){
  if (name === 'none' || name === 'stop') { stopBgm(); return; }
  // 别名兜底
  if (!THEME_BANK[name] && !THEMES[name]) {
    if (name === 'soft') name = 'dream';
    else if (name === 'epic') name = 'final';
    else name = THEMES[name] ? name : 'title';
  }
  if (cur === name && (usingFile || (ctx && THEMES[name]))) return;
  stopTrack();
  if (THEME_BANK[name] && playTrackFile(name)) {
    cur = name;
    // 停程序化 tick 垫乐，避免叠奏
    if (timer) { clearInterval(timer); timer = null; }
    return;
  }
  if (!THEMES[name]) name = 'title';
  if (cur === name) return; cur = name; usingFile = false;
  if (!ctx) return; step = 0; nextT = ctx.currentTime + 0.1;
  musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.setValueAtTime(0.0001, ctx.currentTime); musicBus.gain.linearRampToValueAtTime(settings.music * 0.55, ctx.currentTime + 1.5);
  if (!timer) timer = setInterval(tick, 80);
}
export function stopBgm(){ cur = null; stopTrack(); if (timer) { clearInterval(timer); timer = null; } }
export function currentBgm(){ return cur; }
const _sfxT={};
export function sfx(name){
  { const n=performance.now(); if (_sfxT[name] && n-_sfxT[name]<45) return; _sfxT[name]=n; }
  if (!ctx) return; const t=ctx.currentTime;
  const tone=(f,d,type='sine',v=0.2,f2)=>{ const o=ctx.createOscillator(),g=ctx.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+d); env(g,t,0.005,d,v); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t+d+0.05); };
  switch(name){
    case 'click': tone(880,0.06,'triangle',0.12); break;
    case 'page': tone(660,0.05,'sine',0.06); break;
    case 'choice': tone(523,0.15,'triangle',0.15); setTimeout(()=>tone(784,0.2,'triangle',0.12),70); break;
    case 'hit': drum(t,'snare',0.7,sfxBus); tone(180,0.12,'square',0.08,60); break;
    case 'crit': drum(t,'snare',0.9,sfxBus); drum(t,'kick',0.8,sfxBus); tone(1200,0.2,'sawtooth',0.08,300); break;
    case 'magic': tone(400,0.5,'sine',0.15,1200); tone(600,0.4,'triangle',0.08,1800); break;
    case 'heal': [523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,0.3,'sine',0.1),i*60)); break;
    case 'buff': tone(300,0.3,'triangle',0.12,900); break;
    case 'debuff': tone(600,0.35,'sawtooth',0.06,150); break;
    case 'miss': tone(300,0.1,'sine',0.05,200); break;
    case 'ult': drum(t,'kick',1,sfxBus); tone(110,1.2,'sawtooth',0.15,880); [0,4,7,12].forEach((s,i)=>setTimeout(()=>tone(440*Math.pow(2,s/12),0.8,'triangle',0.12),i*90)); break;
    case 'level': [0,4,7,12,16].forEach((s,i)=>setTimeout(()=>tone(523*Math.pow(2,s/12),0.4,'triangle',0.12),i*80)); break;
    case 'win': [0,2,4,7,9,12].forEach((s,i)=>setTimeout(()=>tone(392*Math.pow(2,s/12),0.5,'triangle',0.12),i*110)); break;
    case 'lose': [7,5,3,0].forEach((s,i)=>setTimeout(()=>tone(220*Math.pow(2,s/12),0.7,'sine',0.14),i*250)); break;
    case 'item': tone(988,0.12,'sine',0.1); setTimeout(()=>tone(1318,0.2,'sine',0.1),80); break;
    case 'shake': drum(t,'kick',1,sfxBus); drum(t+0.1,'kick',0.7,sfxBus); break;
    case 'ach': [0,7,12,19].forEach((s,i)=>setTimeout(()=>tone(659*Math.pow(2,s/12),0.5,'sine',0.08),i*90)); break;
    case 'slash': tone(1400,0.12,'sawtooth',0.05,300); drum(t,'snare',0.35,sfxBus); break;
    case 'fire': tone(120,0.5,'sawtooth',0.07,60); drum(t,'snare',0.5,sfxBus); tone(500,0.4,'triangle',0.05,1400); break;
    case 'break': drum(t,'kick',1,sfxBus); tone(1600,0.25,'square',0.06,200); tone(90,0.4,'sawtooth',0.1,40); break;
    case 'bell': if (ctx) { const g=sfxBus; bell(74,t,0.1); } break;
    case 'swing': tone(900,0.07,'triangle',0.035,260); break;
    case 'skill': tone(420,0.18,'sine',0.06,1200); tone(840,0.14,'triangle',0.03,1800); break;
    case 'jump': tone(300,0.1,'sine',0.05,620); break;
    case 'dash': tone(1800,0.12,'sawtooth',0.025,400); drum(t,'hat',0.25,sfxBus); break;
    case 'coin': tone(1320,0.06,'square',0.03); tone(1760,0.1,'square',0.025); break;
    case 'boom': drum(t,'kick',1,sfxBus); tone(70,0.6,'sawtooth',0.1,30); drum(t,'snare',0.5,sfxBus); break;
    case 'hurt': tone(220,0.16,'square',0.06,90); break;
    case 'portal': tone(220,0.5,'sine',0.1,880); tone(440,0.45,'triangle',0.06,110); drum(t,'hat',0.4,sfxBus); setTimeout(()=>tone(660,0.35,'sine',0.08,220),120); break;
    case 'dream': tone(180,0.7,'sine',0.1,520); tone(270,0.6,'triangle',0.06,90); [0,3,7].forEach((s,i)=>setTimeout(()=>tone(330*Math.pow(2,s/12),0.4,'sine',0.05),i*100)); break;
    case 'reso': drum(t,'kick',1,sfxBus); tone(98,1.0,'sawtooth',0.12,660); [0,5,7,12,17].forEach((s,i)=>setTimeout(()=>tone(392*Math.pow(2,s/12),0.7,'triangle',0.1),i*80)); tone(1320,0.5,'sine',0.05,440); break;
    case 'eye': tone(880,0.25,'sine',0.08,1760); tone(1320,0.2,'triangle',0.05,660); drum(t,'hat',0.3,sfxBus); break;
    case 'share': [0,4,7,11,14].forEach((s,i)=>setTimeout(()=>tone(523*Math.pow(2,s/12),0.35,'triangle',0.09),i*70)); break;
    case 'secret': tone(740,0.15,'sine',0.1); setTimeout(()=>tone(988,0.25,'triangle',0.1),90); setTimeout(()=>tone(1480,0.3,'sine',0.08),180); break;
    case 'forge': drum(t,'kick',0.6,sfxBus); tone(90,0.18,'square',0.08,40); setTimeout(()=>{ tone(220,0.12,'triangle',0.06); drum(ctx.currentTime,'snare',0.4,sfxBus); },90); setTimeout(()=>tone(880,0.2,'sine',0.05),180); break;
    case 'lamp': tone(520,0.35,'sine',0.08,1040); tone(780,0.4,'triangle',0.05,390); [0,4,7].forEach((s,i)=>setTimeout(()=>tone(392*Math.pow(2,s/12),0.45,'sine',0.04),i*70)); break;
    case 'pet': tone(660,0.12,'triangle',0.08); setTimeout(()=>tone(880,0.18,'sine',0.07),70); setTimeout(()=>tone(1320,0.22,'triangle',0.05),150); break;
    case 'tower': drum(t,'kick',0.8,sfxBus); tone(110,0.5,'sawtooth',0.08,55); tone(440,0.3,'triangle',0.06,220); break;
    case 'ui_open': tone(523,0.08,'sine',0.05); tone(784,0.12,'triangle',0.04); break;
    case 'ui_close': tone(660,0.06,'sine',0.035,220); break;
    case 'ui_reward': tone(523,0.1,'triangle',0.07); tone(784,0.14,'sine',0.05); tone(1046,0.2,'triangle',0.04); drum(t,'hat',0.3,sfxBus); break;
    case 'clear': drum(t,'kick',0.9,sfxBus); [0,4,7,12].forEach((s,i)=>setTimeout(()=>tone(523*Math.pow(2,s/12),0.35,'triangle',0.08),i*70)); break;
    case 'ui_close': tone(784,0.08,'sine',0.04,392); break;
    case 'star': [0,4,7,12].forEach((s,i)=>setTimeout(()=>tone(1046*Math.pow(2,s/12),0.25,'sine',0.06),i*55)); break;
    case 'flip': tone(300,0.2,'sawtooth',0.06,900); tone(900,0.25,'triangle',0.05,200); drum(t,'snare',0.35,sfxBus); break;
  }
}
let voiceEl=null;
export function playVoice(url){ stopVoice(); voiceEl=new Audio(url); voiceEl.volume=Math.min(1,settings.voice*settings.master); voiceEl.play().catch(()=>{}); return voiceEl; }
export function stopVoice(){ if (voiceEl) { voiceEl.pause(); voiceEl=null; } }
