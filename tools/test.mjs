import fs from 'node:fs';
const env = fs.readFileSync('/home/box/.secrets/minimax.env','utf8');
for (const l of env.split('\n')) { const m=l.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?/); if(m) process.env[m[1]]=m[2].trim(); }
const mm = await import('./minimax.js');
const which = process.argv[2];
try {
if (which==='text'){ const r=await mm.chatJson({system:'只输出JSON',user:'输出 {"ok":true,"poem":"一句七言诗"}',maxTokens:300}); console.log(r);}
if (which==='image'){ const b=await mm.generateImage({prompt:'ink wash chinese fantasy mountain under starry cosmos, gold line art',aspectRatio:'16:9'}); fs.writeFileSync('/tmp/t.jpg',b); console.log('img',b.length);}
if (which==='tts'){ const b=await mm.synthesize({text:'山海之间，星河倒悬。',voiceId:'male-qn-jingying'}); fs.writeFileSync('/tmp/t.mp3',b); console.log('tts',b.length);}
} catch(e){ console.log('ERR',e.message, JSON.stringify(e.detail||'').slice(0,300)); }
