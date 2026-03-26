
// STATE
let OWNER='',REPO='',BRANCH='',FULL='';
let FILES=[],STATS={},FUNCTIONS=[],DUPLICATES=[],AI_RESULT='',CHAT_HIST=[],CTAB='overview';
const GH='https://api.github.com';
const NV='/api/chat';

// HELPERS
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function prog(p,m){
  const b=document.getElementById('lbar');
  const s=document.getElementById('lstatus');
  if(b) b.style.width=p+'%';
  if(s) s.textContent=m;
}
function lf(t){
  const f=document.getElementById('lfiles');
  if(f) f.textContent=t;
}
function sDisp(id,v){const el=document.getElementById(id);if(el)el.style.display=v}
function ghH(){
  const tok=(document.getElementById('gtoken')?.value||'').trim();
  const h={'Accept':'application/vnd.github.v3+json','X-GitHub-Api-Version':'2022-11-28'};
  if(tok) h['Authorization']='Bearer '+tok;
  return h;
}
function parseUrl(s){
  s=s.trim().replace(/\.git$/,'').replace(/\/$/,'');
  const u=/github\.com[\/:]([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/.exec(s);
  if(u) return{owner:u[1],repo:u[2].replace(/\.git$/,'')};
  const sh=/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/.exec(s);
  if(sh) return{owner:sh[1],repo:sh[2]};
  return null;
}
function goHome(){
  sDisp('home','flex');
  sDisp('analyzer','none');
  FILES=[];STATS={};FUNCTIONS=[];DUPLICATES=[];AI_RESULT='';CHAT_HIST=[];
  const ci=document.getElementById('cinput');
  const sb=document.getElementById('sbtn');
  if(ci) ci.disabled=true;
  if(sb) sb.disabled=true;
  // Show/hide last analysis button
  const lastBtn=document.getElementById('last-analysis-btn');
  if(lastBtn){
    const saved=localStorage.getItem('codesighter_last');
    lastBtn.style.display=saved?'flex':'none';
    if(saved){
      try{
        const d=JSON.parse(saved);
        const info=document.getElementById('last-analysis-info');
        if(info) info.textContent=d.full+' • '+d.stats.files+' files • '+(d.stats.lines||0).toLocaleString()+' lines';
      }catch{}
    }
  }
}
function lsw(t){
  ['tree','issues'].forEach(x=>{
    const tab=document.getElementById('ltab-'+x);
    if(tab) tab.classList.toggle('on',x===t);
    sDisp('l'+x+'-body',x===t?'block':'none');
  });
}
function csw(t,el){
  CTAB=t;
  document.querySelectorAll('.ctab').forEach(e=>e.classList.remove('on'));
  el.classList.add('on');
  renderCenter();
}
function setStatus(s){
  const el=document.getElementById('rstatus');
  if(!el) return;
  const map={scan:['s-scan','● Scanning'],done:['s-done','✓ Done'],err:['s-err','✕ Error']};
  el.className='rstatus '+map[s][0];el.textContent=map[s][1];
}

// GITHUB FETCH
async function ghFetch(url){
  let r;
  try{ r=await fetch(url,{headers:ghH()}); }
  catch(e){ throw new Error('Network error — check your internet connection. ('+e.message+')'); }
  if(r.status===401) throw new Error('GitHub token invalid or expired. Go to github.com/settings/tokens to generate a new one.');
  if(r.status===403){const b=await r.json().catch(()=>({}));throw new Error('GitHub access denied: '+(b.message||'Check token scopes — needs public_repo'));}
  if(r.status===404) throw new Error('Repository "'+FULL+'" not found. Check the name is correct and the repo is public.');
  if(!r.ok){const b=await r.json().catch(()=>({}));throw new Error('GitHub error '+r.status+': '+(b.message||'unknown'));}
  return r.json();
}

// MAIN FLOW
async function run(){
  const raw=document.getElementById('rurl').value;
  const p=parseUrl(raw);
  if(!p){alert('Enter a valid GitHub URL:\n• owner/repo\n• https://github.com/owner/repo\n• https://github.com/owner/repo.git');return;}
  OWNER=p.owner; REPO=p.repo.replace(/\.git$/,''); FULL=OWNER+'/'+REPO;
  const btn=document.getElementById('abtn');
  if(btn) btn.disabled=true;
  sDisp('loading','flex');
  prog(0,'Starting…');

  try{
    // Rate limit check
    prog(3,'Checking GitHub API status…');
    let rlData;
    try{rlData=await ghFetch(GH+'/rate_limit');}catch(e){throw e;}
    const rem=rlData?.rate?.remaining??0,lim=rlData?.rate?.limit??60;
    const tok=(document.getElementById('gtoken')?.value||'').trim();
    if(rem<5){
      const rt=new Date((rlData?.rate?.reset||0)*1000).toLocaleTimeString();
      throw new Error('Rate limit exhausted ('+rem+'/'+lim+'). Resets at '+rt+'. '+(tok?'Try a fresh token.':'Add a GitHub Personal Access Token.'));
    }
    prog(6,'API ready — '+rem+'/'+lim+' requests ('+(tok?'authenticated':'unauthenticated')+')');

    // Repo info
    prog(10,'Fetching repo metadata…');
    const info=await ghFetch(GH+'/repos/'+OWNER+'/'+REPO);
    BRANCH=info.default_branch||'main';
    prog(16,'✓ '+info.full_name+' • Branch: '+BRANCH+' • '+(info.language||'?')+' • '+Number(info.stargazers_count||0).toLocaleString()+' ★');

    // File tree (1 API call gets everything)
    prog(20,'Fetching full file tree…');
    const tree=await ghFetch(GH+'/repos/'+OWNER+'/'+REPO+'/git/trees/'+BRANCH+'?recursive=1');
    if(!tree?.tree?.length) throw new Error('Repository appears to be empty or the tree could not be read.');
    if(tree.truncated) prog(22,'⚠ Large repo — tree truncated, fetching what we can…');

    const SKIP=['node_modules','/.next/','dist/','build/','__pycache__','.venv/','venv/','vendor/','coverage/','out/','target/','.gradle/','.idea/','.vscode/'];
    const TEXT=/\.(js|jsx|ts|tsx|py|go|rs|java|c|cpp|h|hpp|cs|rb|php|swift|kt|scala|vue|svelte|html|htm|css|scss|sass|less|json|yaml|yml|toml|md|txt|sh|bash|env|gitignore|prettierrc|eslintrc|editorconfig|nvmrc|npmrc|lock)$/i;
    const NOEXT=/^(dockerfile|makefile|procfile|gemfile|rakefile|brewfile|jenkinsfile|vagrantfile)$/i;

    const flist=tree.tree.filter(item=>{
      if(item.type!=='blob') return false;
      const lp=item.path.toLowerCase();
      if(SKIP.some(s=>lp.includes(s.toLowerCase()))) return false;
      const name=item.path.split('/').pop();
      return TEXT.test(name)||NOEXT.test(name.toLowerCase());
    }).map(item=>({
      path:item.path,size:item.size||0,
      rawUrl:'https://raw.githubusercontent.com/'+OWNER+'/'+REPO+'/'+BRANCH+'/'+item.path
    }));

    if(!flist.length) throw new Error('No readable source files found (all files may be binary or in excluded folders).');
    prog(24,'Found '+flist.length+' files. Downloading…');

    // Download content — use raw.githubusercontent.com (no CORS issues)
    const BATCH=5;
    FILES=[];
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    for(let i=0;i<flist.length;i+=BATCH){
      const batch=flist.slice(i,i+BATCH);
      const results=await Promise.all(batch.map(async f=>{
        if(f.size>300000) return{...f,content:'[File too large: '+Math.round(f.size/1024)+'KB]'};
        try{
          const r=await fetch(f.rawUrl);
          if(r.ok) return{...f,content:await r.text()};
          return{...f,content:'[HTTP '+r.status+']'};
        }catch(e){return{...f,content:'[Fetch error: '+e.message+']'};}
      }));
      FILES=FILES.concat(results);
      const pct=24+Math.round((Math.min(i+BATCH,flist.length)/flist.length)*36);
      prog(pct,'Reading files ('+Math.min(i+BATCH,flist.length)+'/'+flist.length+')…');
      lf(results.map(r=>'📄 '+r.path).join('\n'));
      if(i+BATCH < flist.length) await delay(200); 
    }

    prog(62,'Computing stats…');
    computeStats();
    renderFileTree();

    // Show analyzer
    sDisp('loading','none');
    sDisp('home','none');
    sDisp('analyzer','flex');
    document.getElementById('rbar-url').textContent='github.com/'+FULL;
    setStatus('scan');
    renderCenter();

    // Local analysis
    prog(65,'Extracting functions…');
    extractFunctions();
    prog(68,'Detecting duplicates…');
    detectDuplicates();

    // Enable chat immediately with what we have
    document.getElementById('cinput').disabled=false;
    document.getElementById('sbtn').disabled=false;
    renderCenter();

    // AI analysis
    prog(72,'Running AI analysis (streaming)…');
    const messages=[
      {role:'system',content:'You are CodeSighter, an expert code analyst. Be thorough, specific, structured. Use markdown. Reference file names.'},
      {role:'user',content:buildPrompt()}
    ];
    await streamLLM(messages,full=>{
      AI_RESULT=full;
      if(CTAB==='ai') renderCenter();
    });

    parseIssues();
    setStatus('done');
    renderCenter();
    
    // Notify React that analysis is complete
    window.dispatchEvent(new CustomEvent('analysis-complete', { 
      detail: { 
        stats: STATS, 
        functions: FUNCTIONS, 
        duplicates: DUPLICATES,
        aiResult: AI_RESULT,
        full: FULL
      } 
    }));
    const wb=document.querySelector('#chat-msgs .bubble');
    if(wb) wb.textContent='✅ Analysis of '+FULL+' complete! Read '+FILES.length+' files, found '+FUNCTIONS.length+' functions, '+DUPLICATES.length+' duplicates. Ask me anything!';

    // Save to localStorage
    try{
      const saveData={
        full:FULL,owner:OWNER,repo:REPO,branch:BRANCH,
        stats:STATS,functions:FUNCTIONS,duplicates:DUPLICATES,
        aiResult:AI_RESULT,
        files:FILES.map(f=>({path:f.path,size:f.size,content:f.content.slice(0,2000)})),
        timestamp:Date.now()
      };
      localStorage.setItem('codesighter_last',JSON.stringify(saveData));
    }catch(e){console.warn('Could not save to localStorage:',e);}

  }catch(err){
    const l=document.getElementById('loading');
    const h=document.getElementById('home');
    const a=document.getElementById('analyzer');
    if(l) l.style.display='none';
    if(h) h.style.display='none';
    if(a) a.style.display='flex';
    const ru=document.getElementById('rbar-url');
    if(ru) ru.textContent='github.com/'+FULL;
    setStatus('err');
    const cb=document.getElementById('cbody');
    if(cb) cb.innerHTML='<div class="ebanner"><strong>❌ '+esc(err.message)+'</strong>'
      +'<br>Things to check:<br>'
      +'• Is the repository name spelled correctly?<br>'
      +'• Is the repository public?<br>'
      +'• Does your token have <code>public_repo</code> scope?<br>'
      +'• Try: <code>'+esc(FULL)+'</code></div>';
  }
  const ab=document.getElementById('abtn');
  if(ab) ab.disabled=false;
}

// STATS
function computeStats(){
  const langMap={},extDetail={},folders=new Set();
  let totalLines=0;
  FILES.forEach(f=>{
    const lines=(f.content.match(/\n/g)||[]).length+1;
    totalLines+=lines;
    const ext=f.path.split('.').pop().toLowerCase()||'other';
    langMap[ext]=(langMap[ext]||0)+1;
    if(!extDetail[ext]) extDetail[ext]={count:0,lines:0,size:0};
    extDetail[ext].count++;extDetail[ext].lines+=lines;extDetail[ext].size+=f.content.length;
    const parts=f.path.split('/');
    for(let i=0;i<parts.length-1;i++) folders.add(parts.slice(0,i+1).join('/'));
  });
  STATS={files:FILES.length,folders:folders.size,lines:totalLines,
    langs:Object.entries(langMap).sort((a,b)=>b[1]-a[1]),
    extDetail,topLang:(Object.entries(langMap).sort((a,b)=>b[1]-a[1])[0]||['?'])[0],
    avgLines:Math.round(totalLines/Math.max(FILES.length,1))};
}

// FUNCTION EXTRACTION
function extractFunctions(){
  FUNCTIONS=[];
  const pats=[
    {re:/(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,lang:'fn'},
    {re:/(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,lang:'arrow'},
    {re:/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s+)?function\s*\(/g,lang:'method'},
    {re:/^\s*async\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm,lang:'async'},
    {re:/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,lang:'py'},
    {re:/func\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,lang:'go'},
    {re:/fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,lang:'rs'},
    {re:/class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,lang:'class'},
  ];
  const SKIP_NAMES=new Set(['if','for','while','switch','catch','return','const','let','var','new','import','export','default','async','await','typeof','instanceof','this','super']);
  FILES.forEach(f=>{
    if(!f.content||f.content.startsWith('[')) return;
    const lines=f.content.split('\n');
    lines.forEach((line,i)=>{
      pats.forEach(({re,lang})=>{
        const r=new RegExp(re.source,re.flags);
        let m;
        while((m=r.exec(line))!==null){
          const name=m[1];
          if(!name||SKIP_NAMES.has(name)||name.length<2) continue;
          FUNCTIONS.push({name,file:f.path,line:i+1,lang,size:estSize(lines,i)});
        }
      });
    });
  });
  // dedup
  const seen=new Set();
  FUNCTIONS=FUNCTIONS.filter(fn=>{const k=fn.file+':'+fn.name+':'+fn.line;if(seen.has(k))return false;seen.add(k);return true;});
}
function estSize(lines,start){
  let d=0,c=0;
  for(let i=start;i<Math.min(start+150,lines.length);i++){
    const l=lines[i];
    d+=(l.match(/\{/g)||[]).length-(l.match(/\}/g)||[]).length;
    c++;
    if(i>start&&d<=0) break;
  }
  return c;
}

// DUPLICATE DETECTION
function detectDuplicates(){
  DUPLICATES=[];
  const blocks={};
  FILES.forEach(f=>{
    if(!f.content||f.content.startsWith('[')) return;
    const lines=f.content.split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('//')&&!l.startsWith('#')&&l.length>5);
    for(let i=0;i<lines.length-7;i++){
      const block=lines.slice(i,i+8).join('\n');
      if(block.length<80) continue;
      const key=block.slice(0,100);
      if(!blocks[key]) blocks[key]=[];
      blocks[key].push({file:f.path,line:i+1});
    }
  });
  const seen=new Set();
  Object.entries(blocks).forEach(([key,locs])=>{
    const files=[...new Set(locs.map(l=>l.file))];
    if(files.length<2) return;
    const k=files.sort().join('|');
    if(seen.has(k)) return;
    seen.add(k);
    DUPLICATES.push({snippet:key.split('\n').slice(0,3).join('\n'),files,count:locs.length});
  });
  DUPLICATES=DUPLICATES.slice(0,30);
}

// AI PROMPT
function buildPrompt(){
  let ctx='# Repo: '+FULL+' | Branch: '+BRANCH+'\n';
  ctx+='Files: '+STATS.files+' | Folders: '+STATS.folders+' | Lines: '+STATS.lines.toLocaleString()+'\n';
  ctx+='Functions: '+FUNCTIONS.length+' | Duplicates: '+DUPLICATES.length+' | Top lang: '+STATS.topLang+'\n\n';
  ctx+='## Files\n'+FILES.map(f=>'- '+f.path+' ('+Math.round(f.content.length/1024)+'KB)').join('\n')+'\n\n';
  let budget=72000;
  ctx+='## Contents\n';
  for(const f of FILES){
    const chunk='### '+f.path+'\n```\n'+f.content.slice(0,3500)+'\n```\n\n';
    if(budget-chunk.length<0) break;
    ctx+=chunk;budget-=chunk.length;
  }
  return ctx+`\nProvide complete analysis:
## 1. Overview — Purpose, stack, architecture
## 2. Type Errors & Bugs — Specific errors with file names
## 3. Logic Errors — Edge cases, race conditions, off-by-one
## 4. Code Quality — Anti-patterns, god functions, poor naming
## 5. Security Issues — Secrets, XSS, injection, exposed APIs
## 6. Performance — Memory leaks, N+1, blocking calls
## 7. Missing Coverage — Untested critical paths
## 8. Score & Top 5 Actions — Health score 0-100, priority fixes`;
}

// LLM STREAMING
async function streamLLM(messages,onChunk){
  let r;
  try{r=await fetch(NV,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'meta/llama-3.1-8b-instruct',messages,max_tokens:4096,temperature:0.5,top_p:0.9,stream:true})});}
  catch(e){throw new Error('AI API network error: '+e.message);}
  if(!r.ok){const e=await r.text();throw new Error('AI error '+r.status+': '+e.slice(0,200));}
  const reader=r.body.getReader(),dec=new TextDecoder();
  let full='',buf='';
  while(true){
    const{done,value}=await reader.read();
    if(done) break;
    buf+=dec.decode(value,{stream:true});
    const lines=buf.split('\n');
    buf=lines.pop()||'';
    for(const line of lines){
      if(!line.startsWith('data: ')) continue;
      const d=line.slice(6).trim();
      if(d==='[DONE]') continue;
      try{
        const j=JSON.parse(d);
        const c=j.choices?.[0]?.delta?.content||'';
        if(c){full+=c;onChunk(full);}
      }catch{}
    }
  }
  if(buf.startsWith('data: ')&&buf.slice(6).trim()!=='[DONE]'){
    try{const j=JSON.parse(buf.slice(6).trim());const c=j.choices?.[0]?.delta?.content||'';if(c){full+=c;onChunk(full);}}catch{}
  }
  return full;
}

// FILE TREE
function renderFileTree(){
  const fcount={};
  FILES.forEach(f=>{const parts=f.path.split('/');for(let i=0;i<parts.length-1;i++) fcount[parts.slice(0,i+1).join('/')]=(fcount[parts.slice(0,i+1).join('/')]||0)+1;});
  const rendF=new Set();
  let html='';
  FILES.forEach(f=>{
    const parts=f.path.split('/');
    for(let i=0;i<parts.length-1;i++){
      const fp=parts.slice(0,i+1).join('/');
      if(!rendF.has(fp)){rendF.add(fp);html+='<div class="ni ni-folder" style="padding-left:'+(i*12+8)+'px"><span class="ni-icon">📁</span><span class="ni-label">'+esc(parts[i])+'</span><span class="ni-count">'+(fcount[fp]||'')+'</span></div>';}
    }
    const ext=f.path.split('.').pop().toLowerCase();
    html+='<div class="ni ni-file" style="padding-left:'+((parts.length-1)*12+8)+'px" title="'+esc(f.path)+'"><span class="ni-icon">'+ficon(ext)+'</span><span class="ni-label">'+esc(parts[parts.length-1])+'</span></div>';
  });
  document.getElementById('ltree-body').innerHTML=html||'<div class="empty">No files</div>';
}
function ficon(e){return({js:'🟨',jsx:'⚛️',ts:'🔷',tsx:'⚛️',py:'🐍',go:'🐹',rs:'🦀',java:'☕',css:'🎨',scss:'🎨',html:'🌐',json:'📋',md:'📝',yml:'⚙️',yaml:'⚙️',sh:'🔧',dockerfile:'🐳',toml:'⚙️',rb:'💎',php:'🐘',swift:'🍎',kt:'🟠',vue:'💚',svelte:'🟠',env:'🔒',gitignore:'🚫',lock:'🔐',nvmrc:'⚙️'})[e]||'📄';}

// RENDER CENTER
function renderCenter(){
  const b=document.getElementById('cbody');
  if(CTAB==='overview') b.innerHTML=renderOverview();
  else if(CTAB==='functions') b.innerHTML=renderFns();
  else if(CTAB==='duplicates') b.innerHTML=renderDups();
  else if(CTAB==='ai') b.innerHTML=renderAI();
}

const LC=['#e8854a','#4ab8b8','#3fb950','#a371f7','#e3b341','#f85149','#58a6ff','#ffa657','#79c0ff','#ff7b72'];

function renderOverview(){
  if(!STATS.files) return '<div class="empty" style="margin-top:60px"><div class="empty-ico">⏳</div>Loading…</div>';
  const tot=STATS.langs.reduce((s,[,n])=>s+n,0);
  const topFiles=[...FILES].sort((a,b)=>b.content.length-a.content.length).slice(0,10);
  const fnByFile=FUNCTIONS.reduce((a,f)=>{a[f.file]=(a[f.file]||0)+1;return a;},{});
  const topFnFiles=Object.entries(fnByFile).sort((a,b)=>b[1]-a[1]).slice(0,8);
  return `
  <div class="sgrid">
    <div class="sc ora"><div class="sc-lbl">Total Files</div><div class="sc-val">${STATS.files}</div><div class="sc-sub">source files read</div></div>
    <div class="sc blu"><div class="sc-lbl">Folders</div><div class="sc-val">${STATS.folders}</div><div class="sc-sub">directories</div></div>
    <div class="sc grn"><div class="sc-lbl">Total Lines</div><div class="sc-val">${(STATS.lines/1000).toFixed(1)}k</div><div class="sc-sub">${STATS.lines.toLocaleString()} lines</div></div>
    <div class="sc pur"><div class="sc-lbl">Functions</div><div class="sc-val">${FUNCTIONS.length}</div><div class="sc-sub">extracted</div></div>
    <div class="sc red"><div class="sc-lbl">Duplicates</div><div class="sc-val">${DUPLICATES.length}</div><div class="sc-sub">code blocks</div></div>
    <div class="sc ylw"><div class="sc-lbl">Avg Lines/File</div><div class="sc-val">${STATS.avgLines}</div><div class="sc-sub">per file</div></div>
  </div>
  <div class="sec"><div class="sec-title">📊 Language Breakdown</div>
    ${STATS.langs.slice(0,12).map(([lang,count],i)=>`<div class="lang-row"><div class="lang-name">${esc(lang)}</div><div class="lang-bar-wrap"><div class="lang-bar" style="width:${Math.round(count/tot*100)}%;background:${LC[i%LC.length]}"></div></div><div class="lang-pct">${Math.round(count/tot*100)}%</div><div class="lang-cnt">${count} files</div></div>`).join('')}
  </div>
  <div class="sec"><div class="sec-title">📦 File Types Detail</div>
    <table class="dtable"><thead><tr><th>Extension</th><th>Files</th><th>Lines</th><th>Size</th></tr></thead><tbody>
    ${Object.entries(STATS.extDetail||{}).sort((a,b)=>b[1].count-a[1].count).slice(0,14).map(([ext,d])=>`<tr><td class="path">.${esc(ext)}</td><td class="num">${d.count}</td><td class="num">${d.lines.toLocaleString()}</td><td class="num">${(d.size/1024).toFixed(1)}KB</td></tr>`).join('')}
    </tbody></table>
  </div>
  <div class="sec"><div class="sec-title">📏 Largest Files</div>
    <table class="dtable"><thead><tr><th>File</th><th>Lines</th><th>Size</th><th>Functions</th></tr></thead><tbody>
    ${topFiles.map(f=>{const lines=(f.content.match(/\n/g)||[]).length+1;const fns=FUNCTIONS.filter(fn=>fn.file===f.path).length;return`<tr><td class="path">${esc(f.path)}</td><td class="num">${lines.toLocaleString()}</td><td class="num">${(f.content.length/1024).toFixed(1)}KB</td><td class="num">${fns}</td></tr>`;}).join('')}
    </tbody></table>
  </div>
  <div class="sec"><div class="sec-title">🏆 Most Functions per File</div>
    <table class="dtable"><thead><tr><th>File</th><th>Functions</th><th>Complexity</th></tr></thead><tbody>
    ${topFnFiles.map(([file,count])=>`<tr><td class="path">${esc(file)}</td><td class="num">${count}</td><td><span class="${count>20?'tred':count>10?'tylw':'tgrn'}">${count>20?'HIGH':count>10?'MED':'LOW'}</span></td></tr>`).join('')}
    </tbody></table>
  </div>`;
}

function renderFns(){
  if(!FILES.length) return '<div class="empty" style="margin-top:60px"><div class="empty-ico">⏳</div>Loading…</div>';
  const classes=FUNCTIONS.filter(f=>f.lang==='class');
  const fns=FUNCTIONS.filter(f=>f.lang!=='class');
  const utils=fns.filter(f=>/(util|helper|format|parse|convert|validate|sanitize|transform|handle|get|set|fetch|load|save|create|update|delete|check|is|has|can)/i.test(f.name));
  const big=fns.filter(f=>f.size>30).sort((a,b)=>b.size-a.size).slice(0,20);
  return `
  <div class="sgrid">
    <div class="sc pur"><div class="sc-lbl">Classes</div><div class="sc-val">${classes.length}</div></div>
    <div class="sc ora"><div class="sc-lbl">Functions</div><div class="sc-val">${fns.length}</div></div>
    <div class="sc blu"><div class="sc-lbl">Utils/Helpers</div><div class="sc-val">${utils.length}</div></div>
    <div class="sc ylw"><div class="sc-lbl">Large (>30 lines)</div><div class="sc-val">${fns.filter(f=>f.size>30).length}</div></div>
  </div>
  ${classes.length?`<div class="sec"><div class="sec-title">🏛️ Classes (${classes.length})</div>
    <table class="dtable"><thead><tr><th>Class Name</th><th>File</th><th>Line</th></tr></thead><tbody>
    ${classes.map(f=>`<tr><td style="color:var(--pur);font-weight:700">${esc(f.name)}</td><td class="path">${esc(f.file)}</td><td class="num">${f.line}</td></tr>`).join('')}
    </tbody></table></div>`:''}
  ${utils.length?`<div class="sec"><div class="sec-title">🔧 Utility & Helper Functions (${utils.length})</div>
    <table class="dtable"><thead><tr><th>Function</th><th>File</th><th>Line</th><th>~Lines</th></tr></thead><tbody>
    ${utils.map(f=>`<tr><td style="color:var(--sec)">${esc(f.name)}</td><td class="path">${esc(f.file)}</td><td class="num">${f.line}</td><td class="num">${f.size}</td></tr>`).join('')}
    </tbody></table></div>`:''}
  ${big.length?`<div class="sec"><div class="sec-title">📏 Large Functions — Refactor Targets (${big.length})</div>
    <table class="dtable"><thead><tr><th>Function</th><th>File</th><th>~Lines</th><th>Risk</th></tr></thead><tbody>
    ${big.map(f=>`<tr><td style="color:var(--pri)">${esc(f.name)}</td><td class="path">${esc(f.file)}</td><td class="num">${f.size}</td><td><span class="${f.size>80?'tred':f.size>40?'tylw':'tgrn'}">${f.size>80?'HIGH':f.size>40?'MED':'LOW'}</span></td></tr>`).join('')}
    </tbody></table></div>`:''}
  <div class="sec"><div class="sec-title">📋 All Functions (${fns.length})</div>
    <table class="dtable"><thead><tr><th>Name</th><th>Type</th><th>File</th><th>Line</th><th>~Ln</th></tr></thead><tbody>
    ${fns.slice(0,120).map(f=>`<tr><td style="color:var(--tx)">${esc(f.name)}</td><td><span class="tblu">${esc(f.lang)}</span></td><td class="path">${esc(f.file)}</td><td class="num">${f.line}</td><td class="num">${f.size}</td></tr>`).join('')}
    ${fns.length>120?`<tr><td colspan="5" style="color:var(--tx3);text-align:center;padding:10px">…and ${fns.length-120} more</td></tr>`:''}
    </tbody></table>
  </div>`;
}

function renderDups(){
  if(!FILES.length) return '<div class="empty" style="margin-top:60px"><div class="empty-ico">⏳</div>Loading…</div>';
  if(!DUPLICATES.length) return '<div class="empty" style="margin-top:60px"><div class="empty-ico">✅</div><div>No significant code duplicates detected across files.</div></div>';
  const affected=[...new Set(DUPLICATES.flatMap(d=>d.files))].length;
  return `
  <div class="sgrid">
    <div class="sc red"><div class="sc-lbl">Duplicate Blocks</div><div class="sc-val">${DUPLICATES.length}</div><div class="sc-sub">across files</div></div>
    <div class="sc ylw"><div class="sc-lbl">Files Affected</div><div class="sc-val">${affected}</div><div class="sc-sub">of ${STATS.files} total</div></div>
    <div class="sc ora"><div class="sc-lbl">Waste %</div><div class="sc-val">${Math.round(affected/Math.max(STATS.files,1)*100)}%</div><div class="sc-sub">files have dups</div></div>
  </div>
  <div class="sec"><div class="sec-title">🔁 Duplicate Code Blocks</div>
    ${DUPLICATES.map((d,i)=>`<div class="dup-item">
      <div class="dup-title">#${i+1} — Found in ${d.files.length} files (${d.count} occurrences)</div>
      <div class="dup-files">${d.files.map(f=>`<span class="dup-file">${esc(f)}</span>`).join('')}</div>
      <pre style="margin-top:8px;background:var(--s1);border:1px solid var(--b1);border-radius:5px;padding:10px;font-size:.66rem;color:var(--tx2);overflow-x:auto;white-space:pre-wrap">${esc(d.snippet)}</pre>
    </div>`).join('')}
  </div>`;
}

function renderAI(){
  if(!AI_RESULT) return '<div class="empty" style="margin-top:60px"><div class="empty-ico">🤖</div><div>AI analysis running…</div></div>';
  return '<div class="stext">'+md(AI_RESULT)+(AI_RESULT&&!AI_RESULT.endsWith('\n\n')?'<span class="cblink"></span>':'')+'</div>';
}

// ISSUES
function parseIssues(){
  const issues=[];const lines=AI_RESULT.split('\n');let sec='';
  lines.forEach(line=>{
    if(/^##/.test(line)) sec=line;
    const fm=/`([^`\n]+\.[a-z]{1,6})`/.exec(line);
    if(fm&&/(error|bug|undefined|null|missing|security|vulnerability|leak|injection|xss|warning)/i.test(line)&&line.trim().length>40){
      const type=/security|vulnerability|injection|xss|secret|exposed/i.test(sec)?'error':/warning|quality/i.test(sec)?'warn':'info';
      issues.push({file:fm[1],msg:line.trim().replace(/^[-*•\d.]\s*/,''),type});
    }
  });
  document.getElementById('lissues-body').innerHTML=issues.length
    ?issues.map(i=>`<div class="issue"><span class="issue-tag ${i.type==='error'?'t-err':i.type==='warn'?'t-warn':'t-info'}">${i.type.toUpperCase()}</span><div class="issue-file">📄 ${esc(i.file)}</div><div class="issue-msg">${esc(i.msg.slice(0,180))}</div></div>`).join('')
    :'<div class="empty"><div class="empty-ico">✅</div>No file-specific issues extracted yet.</div>';
}

// MARKDOWN
function md(t){
  return t
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/```[\w]*\n([\s\S]*?)```/g,'<pre style="background:var(--s2);border:1px solid var(--b1);border-radius:6px;padding:12px;overflow-x:auto;margin:8px 0;font-size:.74rem"><code>$1</code></pre>')
    .replace(/`([^`\n]+)`/g,'<code style="background:var(--s2);border:1px solid var(--b1);padding:1px 5px;border-radius:3px;color:var(--sec);font-size:.82em">$1</code>')
    .replace(/^### (.+)$/gm,'<h3 style="font-family:var(--disp);color:var(--sec);margin:14px 0 6px;font-size:.87rem">$1</h3>')
    .replace(/^## (.+)$/gm,'<h2 style="font-family:var(--disp);color:var(--pri);margin:18px 0 8px;font-size:.95rem;border-bottom:1px solid var(--b1);padding-bottom:4px">$1</h2>')
    .replace(/^# (.+)$/gm,'<h1 style="font-family:var(--disp);color:var(--pri);margin:20px 0 10px;font-size:1.1rem">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g,'<strong style="color:var(--tx)">$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^[-*] (.+)$/gm,'<div style="padding:2px 0 2px 14px;position:relative"><span style="position:absolute;left:3px;color:var(--pri)">•</span>$1</div>')
    .replace(/^\d+\. (.+)$/gm,'<div style="padding:2px 0 2px 18px">$1</div>')
    .replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>');
}

// CHAT
function qs(el){document.getElementById('cinput').value=el.textContent;sendChat();}
async function sendChat(){
  const inp=document.getElementById('cinput');
  const msg=inp.value.trim();if(!msg) return;
  inp.value='';
  document.getElementById('sbtn').disabled=true;inp.disabled=true;
  document.getElementById('suggs')?.remove();
  addMsg('u',msg);
  CHAT_HIST.push({role:'user',content:msg});
  const cm=document.getElementById('chat-msgs');
  const tid='t'+Date.now();
  cm.insertAdjacentHTML('beforeend',`
    <div class="flex gap-4 items-start mb-6 animate-in fade-in slide-in-from-bottom-2" id="${tid}">
      <div class="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 shadow-sm border border-border/50">
        <img src="/ai.png" class="w-5 h-5 opacity-80" />
      </div>
      <div class="flex flex-col gap-1.5 max-w-[85%]">
        
        <div class="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 shadow-sm">
          <div class="typing flex gap-1 items-center">
            <div class="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce"></div>
            <div class="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]"></div>
            <div class="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.4s]"></div>
          </div>
        </div>
      </div>
    </div>`);
  cm.scrollTop=cm.scrollHeight;
  try{
    const sys='You are CodeSighter AI. You have analyzed the repo "'+FULL+'" ('+FILES.length+' files, '+(STATS.lines||0).toLocaleString()+' lines).\n\n'
      +'Functions: '+FUNCTIONS.slice(0,60).map(f=>f.name+' in '+f.file).join(', ')+'\n\n'
      +'File list: '+FILES.map(f=>f.path).join(', ')+'\n\n'
      +'AI Analysis summary:\n'+AI_RESULT.slice(0,5000)+'\n\n'
      +'File contents (partial):\n'+FILES.slice(0,15).map(f=>'FILE: '+f.path+'\n'+f.content.slice(0,500)).join('\n---\n')
      +'\n\nAnswer specifically about this codebase. Reference files by name. Be concise and helpful.';
    const messages=[{role:'system',content:sys},...CHAT_HIST.slice(-8)];
    const el=document.getElementById(tid);
    const bd = document.createElement('div');
    bd.className = "flex gap-4 items-start mb-6";
    bd.innerHTML = `
      <div class="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 shadow-sm border border-border/50">
        <img src="/ai.png" class="w-5 h-5 opacity-80" />
      </div>
      <div class="flex flex-col gap-1.5 max-w-[85%]">
        
        <div class="bubble p-4 text-sm leading-relaxed text-foreground"></div>
      </div>`;
    const bubble = bd.querySelector('.bubble');
    el?.replaceWith(bd);
    let reply='';
    await streamLLM(messages,full=>{reply=full;bubble.innerHTML=md(full)+'<span class="cblink"></span>';cm.scrollTop=cm.scrollHeight;});
    bubble.innerHTML=md(reply);
    CHAT_HIST.push({role:'assistant',content:reply});
  }catch(e){document.getElementById(tid)?.remove();addMsg('b','❌ Error: '+e.message);}
  document.getElementById('sbtn').disabled=false;inp.disabled=false;inp.focus();
  document.getElementById('chat-msgs').scrollTop=9999;
}
function addMsg(role, text) {
  const cm = document.getElementById('chat-msgs');
  const isUser = role === 'u';
  
  const html = isUser ? `
    <div class="flex justify-end mb-6">
      <div class="bg-primary text-primary-foreground rounded-2xl p-4 shadow-md max-w-[85%] text-sm leading-relaxed ml-12">
        ${esc(text)}
      </div>
    </div>
  ` : `
    <div class="flex gap-4 items-start mb-6">
      <div class="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 shadow-sm border border-border/50">
        <img src="/ai.png" class="w-5 h-5 opacity-80" />
      </div>
      <div class="flex flex-col gap-1.5 max-w-[85%]">
        <span class="text-[10px] text-muted-foreground uppercase tracking-widest ml-1 font-bold">CodeSighter AI</span>
        <div class="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 shadow-sm text-sm leading-relaxed text-foreground">
          ${md(text)}
        </div>
      </div>
    </div>
  `;
  
  cm.insertAdjacentHTML('beforeend', html);
  cm.scrollTop = cm.scrollHeight;
}
document.addEventListener('keydown',e=>{
  if(e.target.id==='cinput'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();}
  if(e.target.id==='rurl'&&e.key==='Enter') run();
});

// LOAD LAST ANALYSIS
function loadLastAnalysis(){
  const raw=localStorage.getItem('codesighter_last');
  if(!raw){alert('No saved analysis found.');return;}
  try{
    const d=JSON.parse(raw);
    OWNER=d.owner;REPO=d.repo;BRANCH=d.branch;FULL=d.full;
    FILES=d.files||[];
    STATS=d.stats||{};
    FUNCTIONS=d.functions||[];
    DUPLICATES=d.duplicates||[];
    AI_RESULT=d.aiResult||'';
    CHAT_HIST=[];
    CTAB='overview';

    // Show analyzer
    sDisp('home','none');
    sDisp('analyzer','flex');
    const rbar = document.getElementById('rbar-url');
    if (rbar) rbar.textContent = 'github.com/' + FULL;
    setStatus('done');
    renderFileTree();
    renderCenter();
    if(AI_RESULT) parseIssues();

    // Enable chat
    const ci = document.getElementById('cinput');
    const sb = document.getElementById('sbtn');
    if (ci) ci.disabled = false;
    if (sb) sb.disabled = false;
    
    const msgs = document.getElementById('chat-msgs');
    if (msgs) {
      const bubble = msgs.querySelector('.bubble');
      if(bubble) bubble.textContent='📂 Loaded saved analysis of '+FULL+'. '+FILES.length+' files, '+FUNCTIONS.length+' functions. Ask me anything!';
    }
    
    // Notify React that analysis is loaded
    window.dispatchEvent(new CustomEvent('analysis-complete', { 
      detail: { 
        stats: STATS, 
        functions: FUNCTIONS, 
        duplicates: DUPLICATES,
        aiResult: AI_RESULT,
        full: FULL
      } 
    }));
  }catch(e){
    alert('Failed to load saved analysis: '+e.message);
  }
}
// CLEANUP EXPORTS
window.run = run;
window.goHome = goHome;
window.lsw = lsw;
window.csw = csw;
window.qs = qs;
window.sendChat = sendChat;
window.loadLastAnalysis = loadLastAnalysis;
