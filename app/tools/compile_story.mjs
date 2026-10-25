// 剧情 DSL 编译器：src/story/*.txt -> src/gen/story.json
// 语法见 README / 本文件注释
import fs from 'fs'; import path from 'path';
const dir = path.resolve('src/story'); const out = path.resolve('src/gen/story.json');
const files = fs.readdirSync(dir).filter(f=>f.endsWith('.txt')).sort();
const cmds = []; const labels = {}; const errors = [];
let chars = 0;
function parseEffects(s){ return s.trim()? s.trim().split(/\s+/):[]; }
for (const f of files) {
  const lines = fs.readFileSync(path.join(dir,f),'utf8').split(/\r?\n/);
  let choice = null;
  const flush = () => { if (choice) { cmds.push(choice); choice = null; } };
  lines.forEach((raw, i) => {
    const line = raw.trim(); const where = `${f}:${i+1}`;
    if (!line || line.startsWith('#')) return;
    if (line.startsWith('? ')) {
      if (!choice) choice = { t:'choice', opts:[], at:where };
      let body = line.slice(2).trim(); let cond = null;
      const m = body.match(/^\[([^\]]+)\]\s*(.*)$/); if (m) { cond = m[1]; body = m[2]; }
      const [left, eff=''] = body.split('|');
      const [text, to] = left.split('->').map(s=>s && s.trim());
      if (!to) errors.push(`${where} 选项缺少 -> 标签`);
      chars += text.length;
      choice.opts.push({ text, to, cond, eff: parseEffects(eff) });
      return;
    }
    flush();
    if (line.startsWith('*')) { const l = line.slice(1).trim(); if (labels[l]!==undefined) errors.push(`${where} 标签重复 ${l}`); labels[l] = cmds.length; return; }
    if (line.startsWith('@')) {
      const sp = line.indexOf(' '); const name = (sp<0?line.slice(1):line.slice(1,sp)); const rest = sp<0?'':line.slice(sp+1).trim();
      const c = { t:name, at:where };
      switch (name) {
        case 'if': { const [cond,to]=rest.split('->').map(s=>s.trim()); c.cond=cond; c.to=to; break; }
        case 'do': c.eff = parseEffects(rest); break;
        case 'chapter': { const [n,title,sub]=rest.split('|').map(s=>s.trim()); c.n=n; c.title=title; c.sub=sub||''; chars+= (title||'').length+(sub||'').length; break; }
        case 'battle': { const [enc,lose]=rest.split('->').map(s=>s.trim()); c.enc=enc; c.lose=lose||null; break; }
        case 'explore': { const [region,to,...nm]=rest.split(/\s+/); c.region=region; c.to=to; c.name=nm.join(' ')||'继续主线'; break; }
        case 'show': { const [id,pos='center']=rest.split(/\s+/); c.id=id; c.pos=pos; break; }
        case 'bg': case 'cg': case 'bgm': case 'sfx': case 'hide': case 'goto': case 'ending': case 'wait': case 'note':
          { const [a,b]=rest.split(/\s+/); c.a=a; c.b=b; if(name==='note'){c.a=rest; chars+=rest.length;} break; }
        default: c.a = rest;
      }
      cmds.push(c); return;
    }
    if (line.startsWith('>')) { const text=line.slice(1).trim(); chars+=text.length; cmds.push({t:'say',who:null,text,at:where}); return; }
    const m = line.match(/^([^：:]{1,8})[：:](.*)$/);
    if (m) { const text=m[2].trim(); chars+=text.length; cmds.push({t:'say',who:m[1].trim(),text,at:where}); return; }
    errors.push(`${where} 无法解析: ${line}`);
  });
  flush();
}
// 引用检查
for (const c of cmds) {
  const chk = l => { if (l && labels[l]===undefined) errors.push(`${c.at} 未定义标签 ${l}`); };
  if (c.t==='choice') c.opts.forEach(o=>chk(o.to));
  if (['if','goto'].includes(c.t)) chk(c.to||c.a);
  if (c.t==='explore') chk(c.to);
  if (c.t==='battle') chk(c.lose);
}
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out, JSON.stringify({cmds,labels,chars}));
console.log(`story: ${files.length} files, ${cmds.length} cmds, ${Object.keys(labels).length} labels, ${chars} chars`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
