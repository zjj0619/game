// 粒子与屏幕特效（Canvas 叠加层）
import { settings } from './state.js';
let cv, ctx, parts = [], running = false, ambient = null;
function ensure(){
  if (cv) return;
  cv = document.createElement('canvas'); cv.id = 'fx'; document.body.append(cv);
  ctx = cv.getContext('2d'); const rs = () => { cv.width = innerWidth*devicePixelRatio; cv.height = innerHeight*devicePixelRatio; }; rs(); addEventListener('resize', rs);
}
function loop(){
  if (!parts.length && !ambient) { running = false; ctx.clearRect(0,0,cv.width,cv.height); return; }
  running = true; requestAnimationFrame(loop);
  const d = devicePixelRatio; ctx.clearRect(0,0,cv.width,cv.height);
  if (ambient && parts.length < ambient.n && Math.random() < ambient.rate) parts.push(ambient.make());
  ctx.globalCompositeOperation = 'lighter';
  for (let i = parts.length-1; i >= 0; i--) {
    const p = parts[i]; p.life -= p.decay; if (p.life <= 0) { parts.splice(i,1); continue; }
    p.vy += p.g; p.vx *= p.f; p.vy *= p.f; p.x += p.vx; p.y += p.vy; if (p.wob) p.x += Math.sin((p.t=(p.t||0)+0.05))*p.wob;
    ctx.globalAlpha = Math.min(1, p.life*1.5);
    const r = p.r*d*(p.shrink? p.life : 1);
    const gr = ctx.createRadialGradient(p.x*d,p.y*d,0,p.x*d,p.y*d,r*2.2);
    gr.addColorStop(0, p.c); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x*d, p.y*d, r*2.2, 0, 6.283); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function kick(){ if (!running) loop(); }
export function burst(x, y, color='#ffcf6a', n=24, power=4){
  if (!settings.fx) return; ensure(); n = Math.round(n*(settings.fx===1?0.5:1));
  for (let i=0;i<n;i++){ const a=Math.random()*6.283, s=Math.random()*power+1;
    parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1,g:0.06,f:0.95,r:2+Math.random()*3,c:color,life:1,decay:0.015+Math.random()*0.02,shrink:true}); }
  kick();
}
export function rise(x, y, color='#ffe9a8', n=16){
  if (!settings.fx) return; ensure();
  for (let i=0;i<n;i++) parts.push({x:x+(Math.random()-0.5)*80,y:y+Math.random()*30,vx:0,vy:-1-Math.random()*2,g:-0.01,f:0.99,r:2+Math.random()*2.5,c:color,life:1,decay:0.012,wob:0.6});
  kick();
}
// 环境粒子：embers 余烬 / snow 雪 / stars 星尘 / petals 桃花 / none
export function setAmbient(kind){
  ensure(); if (!settings.fx || kind==='none' || !kind) { ambient=null; return; }
  const W=()=>innerWidth, H=()=>innerHeight;
  const M = {
    embers:()=>({x:Math.random()*W(),y:H()+10,vx:(Math.random()-0.5)*0.4,vy:-0.6-Math.random()*0.9,g:0,f:1,r:1.2+Math.random()*1.8,c:'#ff9a4a',life:1,decay:0.003+Math.random()*0.003,wob:0.4}),
    snow:()=>({x:Math.random()*W(),y:-10,vx:-0.3,vy:0.5+Math.random()*0.8,g:0,f:1,r:1.2+Math.random()*2,c:'#dff2ff',life:1,decay:0.0025,wob:0.5}),
    stars:()=>({x:Math.random()*W(),y:Math.random()*H(),vx:0,vy:-0.1,g:0,f:1,r:0.8+Math.random()*1.6,c:'#ffe7a0',life:1,decay:0.006+Math.random()*0.006}),
    petals:()=>({x:Math.random()*W(),y:-10,vx:0.4+Math.random()*0.5,vy:0.5+Math.random()*0.6,g:0,f:1,r:1.6+Math.random()*2,c:'#ff9ccf',life:1,decay:0.003,wob:0.8}),
    blue:()=>({x:Math.random()*W(),y:H()+10,vx:0,vy:-0.4-Math.random()*0.6,g:0,f:1,r:1.5+Math.random()*2,c:'#6fd8ff',life:1,decay:0.004,wob:0.7}),
  };
  if (!M[kind]) { ambient=null; return; }
  ambient = { make:M[kind], n: settings.fx===1?25:60, rate:0.35 }; kick();
}
export function shake(el=document.getElementById('app'), cls='shake'){ el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(()=>el.classList.remove(cls), 500); }
export function flash(color='#fff'){
  const f=document.createElement('div'); f.className='flash'; f.style.background=color; document.body.append(f); setTimeout(()=>f.remove(), 600);
}
