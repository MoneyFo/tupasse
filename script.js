const INFO=LICENCES.info.P;
const EMPTY=Object.fromEntries(Object.entries(INFO).map(([k,v])=>[k,[v[0],[]]]));
const LIC={...LICENCES,perso:{n:'Autre licence (maquette vide à remplir)',P:EMPTY}};
// menu des licences, rangées par domaine
const GROUPS=[['Sciences et technologies',['info','maths','lspi','sv-bio','sv-chimie','sv-env','las','stes']],
  ['Droit, économie, gestion',['droit','droit-exc','ap','eco-mci','eco-cca']],
  ['Lettres, langues, sciences humaines',['geo','histoire','lettres','lea-esp','lea-man','llcer-ang','llcer-lp','llcer-pppe']],
  ['Licence professionnelle',['erme']],['Autre',['perso']]];
const P=()=>LIC[S.lic]?LIC[S.lic].P:INFO;
const B={DS:['compétences disciplinaires','var(--teal)','<path d="M8 6 3 12l5 6M16 6l5 6-5 6M14 4l-4 16"/>'],
 TS:['compétences transversales','var(--yellow)','<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'],
 LS:['compétences linguistiques','var(--lav)','<path d="M4 5h16v11H9l-5 4z"/>'],
 ES:['compétences préprofessionnelles','var(--pink)','<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 13h18"/>']};
// bloc : code affiché, intitulé, couleur, icône (blocs propres à une licence : DS-A, UE 1…)
const PAL=['var(--teal)','var(--yellow)','var(--lav)','var(--pink)','var(--coral)'];
const BI=k=>{const o=((LIC[S.lic]||{}).blocs||{})[k],d=B[k.slice(0,2)];
  return{code:o?o[0]:k,name:o?o[1]:(d?d[0]:k),col:d?d[1]:PAL[(parseInt(k.replace(/\D/g,''))||0)%PAL.length],ico:d?d[2]:'<path d="M4 6h16M4 12h16M4 18h10"/>'}};
const order=()=>{const o=[];for(const r of rows())if(!o.includes(r.b))o.push(r.b);
  if(S.edit&&!(LIC[S.lic]||{}).blocs)for(const k of ['DS','TS','LS','ES'])if(!o.includes(k))o.push(k);return o};

const KEY='ma-moyenne-v2',$=id=>document.getElementById(id);
const fresh=(s,lic=S.lic)=>LIC[lic].P[s][1].map(([b,n,e,o])=>({b,n,e,cc:[],ra:'',rt:null,va:false,...(o?{o}:{})}));
let S=null;try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!S||!S.data){S={lic:'info',sem:'S1',rule:'max',ncc:2,annual:false,edit:false,sample:true,data:{}};
  const r=fresh('S1'),c1=[9,8,11,10,12,8,13,12,11,14],c2={1:7,3:10,6:12,7:11,8:12,9:15};
  r.forEach((x,i)=>{x.cc=[String(c1[i]),c2[i]!=null?String(c2[i]):'']});S.data['info:S1']=r}
// anciennes sauvegardes : clés sans licence, notes c1/c2, matières sans leurs options
function migrate(){
  if(!LIC[S.lic])S.lic='info';
  if(!(S.ncc>=1))S.ncc=2;
  for(const k of Object.keys(S.data))if(!k.includes(':')){S.data['info:'+k]=S.data[k];delete S.data[k]}
  for(const [k,list] of Object.entries(S.data)){
    const [lic,sem]=k.split(':'),pre=LIC[lic]&&LIC[lic].P[sem]?LIC[lic].P[sem][1]:[];
    for(const r of list){
      if(!Array.isArray(r.cc)){r.cc=[r.c1??'',r.c2??''];delete r.c1;delete r.c2}
      if(!r.o){const m=pre.find(x=>x[1]===r.n&&x[3]);if(m)r.o=m[3]}
    }
  }
}
migrate();
const dkey=(sem=S.sem)=>S.lic+':'+sem;
const rowsOf=sem=>S.data[dkey(sem)]||(S.data[dkey(sem)]=fresh(sem));
const rows=()=>rowsOf(S.sem);
let view='welcome',pick=S.chosen?S.sem:null;
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const num=v=>{if(v==null||String(v).trim()==='')return null;const x=parseFloat(String(v).replace(',','.'));return isFinite(x)&&x>=0&&x<=20?x:NaN};
const ok=x=>x!=null&&!isNaN(x);
// pas d'arrondi : valeur exacte jusqu'à 3 décimales (9,875), au-delà on coupe sans arrondir (9,333…)
const milli=x=>Math.round(x*1e9)/1e6; // x × 1000, débarrassé du bruit des flottants
const fmt=x=>{const v=Math.trunc(milli(x))/1000;return v.toFixed(3).replace('.',',').replace(/(,\d*?)0+$/,'$1').replace(/,$/,'')};
// note à viser : jamais en dessous de la vraie valeur
const ceil=x=>Math.ceil(milli(x))/1000;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ects=r=>Math.max(+String(r.e).replace(',','.')||0,0);

// --- notes d'une matière : N CC (N = 1 : une seule note), chacune avec son pourcentage (égaux par défaut)
const MAXCC=6;
const K=r=>Math.min(MAXCC,Math.max(1,+(r.k??S.ncc)||2));
const ccs=r=>{const a=(r.cc||[]).slice(0,K(r));while(a.length<K(r))a.push('');return a};
// poids de chaque note : la valeur saisie (en %) ; les cases vides se partagent le reste jusqu'à 100 %.
// les poids sont ensuite ramenés à leur total (60 + 30 = 90 → 66,7 % / 33,3 %)
const wts=r=>{const k=K(r),raw=Array.from({length:k},(_,j)=>{const x=r.w?parseFloat(String(r.w[j]??'').replace(',','.')):NaN;return isFinite(x)&&x>=0&&x<=100?x:null});
  const set=raw.filter(x=>x!=null),free=k-set.length,rest=free?Math.max(0,100-set.reduce((s,x)=>s+x,0))/free:0;
  const w=raw.map(x=>x??rest);return w.some(x=>x>0)?w:w.map(()=>100/k)};
const ccAvg=r=>{const v=ccs(r).map(num),w=wts(r),T=w.reduce((s,x)=>s+x,0);let s=0;
  for(let j=0;j<v.length;j++){if(!w[j])continue;if(!ok(v[j]))return null;s+=w[j]*v[j]}return s/T};
// note de la matière une fois le rattrapage connu, selon la règle choisie
const rated=(r,ra)=>{const m=ccAvg(r);if(!ok(ra)||m==null)return m;
  const v=ccs(r).map(num),w=wts(r),T=w.reduce((s,x)=>s+x,0),idx=v.map((_,j)=>j).filter(j=>w[j]>0);
  if(S.rule==='moy3'){const wb=T/idx.length;return (m*T+wb*ra)/(T+wb)}     // moyenne des CC et du rattrapage (le rattrapage pèse comme une note moyenne)
  if(S.rule==='cc'){const lo=idx.reduce((a,b)=>v[b]<v[a]?b:a);return m+w[lo]*(ra-v[lo])/T}  // remplace le CC le plus faible (il garde son poids)
  return Math.max(m,ra)};                                    // garde le rattrapage s'il est meilleur

// calcule un bloc.
// phase 1 : il reste des CC à passer → inconnues = CC vides.
// phase 2 : tous les CC sont là → si pas validé, inconnues = rattrapages des matières repassées.
function calc(list){
  const L=list.filter(r=>ects(r)>0&&!r.va),  // matière validée = hors calcul
   E=L.reduce((s,r)=>s+ects(r),0),T0=10-1e-9;
  const o={E,phase:1,n:0,need:null,cur:null,fin:null,valid:false,miss:new Set(),inR:()=>false,f:()=>0};
  if(!E)return o;
  if(L.some(r=>ccAvg(r)==null)){
    let Kn=0,U=0;
    for(const r of L){const e=ects(r),v=ccs(r),w=wts(r),T=w.reduce((s,x)=>s+x,0);
      v.forEach((x,i)=>{if(!w[i])return;const y=num(x),f=w[i]/T;if(ok(y))Kn+=e*f*y;else{U+=e*f;o.n++;o.miss.add(v.length===1?'note':'CC'+(i+1))}})}
    o.cur=E-U>1e-9?Kn/(E-U):null;o.f=x=>(Kn+U*x)/E;
  }else{
    o.phase=2;
    const base=L.reduce((s,r)=>s+ects(r)*rated(r,num(r.ra)),0)/E;
    o.cur=base;
    if(base>=T0){o.valid=true;o.fin=base;return o}
    o.inR=r=>ects(r)>0&&!r.va&&!ok(num(r.ra))&&ccAvg(r)!=null&&(r.rt!=null?r.rt:ccAvg(r)<10);
    o.n=L.filter(o.inR).length;
    o.f=x=>L.reduce((s,r)=>s+ects(r)*rated(r,o.inR(r)?x:num(r.ra)),0)/E;
  }
  if(!o.n){o.fin=o.f(0);o.valid=o.fin>=T0;return o}
  if(o.f(0)>=T0)o.need=0;
  else if(o.f(20)<T0)o.need=21;
  else{let lo=0,hi=20;for(let i=0;i<50;i++){const m=(lo+hi)/2;if(o.f(m)>=T0)hi=m;else lo=m}o.need=hi}
  return o;
}
const grp=list=>{const g={};for(const r of list)(g[r.b]=g[r.b]||[]).push(r);return g};
// épreuve visée : « au CC2 », « à l'examen », « aux épreuves restantes », « au rattrapage »
const epl=R=>R.phase===2?'au rattrapage':R.miss.size===1?([...R.miss][0]==='note'?'à l’examen':'au '+[...R.miss][0]):'aux épreuves restantes';
// compensation annuelle : S1+S2, S3+S4, S5+S6
const partner=()=>{const n=+S.sem.slice(1),k='S'+(n%2?n+1:n-1);return P()[k]?k:null};
const annualOn=()=>!!(S.annual&&partner());
const pool=()=>annualOn()?rows().concat(rowsOf(partner())):rows();

function welcome(){
  $('licSel').innerHTML=GROUPS.map(([g,ks])=>`<optgroup label="${esc(g)}">${ks.filter(k=>LIC[k]).map(k=>`<option value="${k}"${k===S.lic?' selected':''}>${esc(LIC[k].n)}</option>`).join('')}</optgroup>`).join('');
  if(pick&&!P()[pick])pick=null;
  $('calcBtn').disabled=!pick;$('calcBtn').textContent=pick?`calculer mon ${P()[pick][0].split(' · ')[1]} →`:'choisis un semestre';
  const yrs={};for(const k of Object.keys(P())){const y=P()[k][0].split(' · ')[0];(yrs[y]=yrs[y]||[]).push(k)}
  const col={L1:'var(--teal)',L2:'var(--lav)',L3:'var(--pink)'};
  $('semGrid').innerHTML=Object.entries(yrs).map(([y,ks])=>`<div class="yr"><b>${y}</b>${ks.map(k=>{const n=(S.data[S.lic+':'+k]||P()[k][1]).length;
    return `<button class="go" role="radio" data-go="${k}" style="--c:${col[y]||'var(--yellow)'}" aria-checked="${k===pick}">${P()[k][0].split(' · ')[1]}<small>${n?n+' matières':'à remplir'}</small></button>`}).join('')}</div>`).join('');
}
function bugHref(){
  const lic=LIC[S.lic].n,sem=P()[S.sem]?P()[S.sem][0]:S.sem;
  const body=`Licence : ${lic}\nSemestre : ${sem}\n\nCe qui est faux (matière, ECTS, bloc…) :\n\n\nCe qu'il faudrait (avec la source si possible) :\n`;
  return 'https://github.com/MoneyFo/tupasse/issues/new?title='+encodeURIComponent(`Erreur de maquette : ${lic} · ${sem}`)+'&body='+encodeURIComponent(body);
}
function render(){
  document.body.dataset.view=view;
  if(view==='welcome'){welcome();return}
  const[yr,se]=P()[S.sem][0].split(' · ');
  $('licName').textContent=LIC[S.lic].n;
  $('semPill').textContent=`${yr} · semestre ${se.slice(1)}`;
  document.querySelectorAll('[data-rule]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.rule===S.rule));
  const pa=partner();$('annRule').hidden=!pa;
  if(pa){$('annYes').textContent=`oui : ${[S.sem,pa].sort().join(' + ')}`;document.querySelectorAll('[data-ann]').forEach(b=>b.setAttribute('aria-pressed',(b.dataset.ann==='1')===!!S.annual))}
  $('nccVal').textContent=S.ncc;
  $('editBtn').classList.toggle('on',S.edit);$('editBtn').textContent=S.edit?'terminer':'modifier la maquette';
  $('sample').hidden=!(S.sample&&S.lic==='info'&&S.sem==='S1');
  $('bugLink').href=bugHref();
  const g={};rows().forEach((r,i)=>(g[r.b]=g[r.b]||[]).push([r,i]));
  let h=order().map((k,bi)=>{const{code,name,col,ico}=BI(k),it=g[k]||[];
    return `<section class="bloc ${bi===0?'main':''}" data-b="${esc(k)}"><div class="bh"><span class="ib" style="background:${col}"><svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ico}</svg></span>
      <div><h2>${esc(code)} · ${esc(name)}</h2><small data-tot="${esc(k)}"></small></div><span class="need" data-bneed="${esc(k)}"></span></div>
      ${it.map(([r,i])=>S.edit?`<div class="row edit-row" data-i="${i}"><input class="in wide" data-f="n" value="${esc(r.n)}" aria-label="nom de la matière"><input class="in sm" data-f="e" inputmode="decimal" value="${esc(r.e)}" aria-label="ects"><button class="mini" data-act="del" aria-label="supprimer">×</button></div>`
      :rowHTML(r,i)).join('')}
      ${S.edit?`<button class="add" data-act="add">+ ajouter une matière</button>`:''}</section>`}).join('');
  if(S.edit)h+=`<button class="btn cor" data-act="reset">remettre la maquette d'origine</button>`;
  $('list').innerHTML=h;
  document.querySelectorAll('#list .in').forEach(check);update();
}
function rowHTML(r,i){
  const k=K(r),v=ccs(r);
  const opt=r.o?`<label class="optw">ton option <select class="opt" data-f="oc"><option value="">à choisir…</option>${r.o.map(o=>`<option${o===r.oc?' selected':''}>${esc(o)}</option>`).join('')}</select></label>`:'';
  const sel=`<select class="in nk" data-f="k" aria-label="nombre d'épreuves">${Array.from({length:MAXCC},(_,n)=>n+1).map(n=>`<option value="${n}"${n===k?' selected':''}>${n===1?'1 note':n+' CC'}</option>`).join('')}</select>`;
  const nm=j=>k===1?'note':'cc'+(j+1);
  const notes=v.map((x,j)=>`<div class="f"><span>${nm(j)}</span><input class="in" data-f="cc" data-j="${j}" inputmode="decimal" placeholder="?" value="${esc(x)}" aria-label="${nm(j)}">${r.pw&&k>1?`<span class="pct-wrap"><input class="in pct" data-f="w" data-j="${j}" inputmode="decimal" placeholder="${fmt(100/k)}" value="${esc((r.w||[])[j]??'')}" aria-label="pourcentage de ${nm(j)}">%</span>`:''}</div>`).join('')
    +`<label class="f ra">rattrapage<input class="in" data-f="ra" inputmode="decimal" placeholder="—" value="${esc(r.ra)}"></label>`;
  return `<div class="row${r.va?' acq':''}" data-i="${i}">
    <div class="rhead"><div class="nm">${esc(r.n)}</div><div class="meta"><span class="ects">${fmt(ects(r))} ects</span><span data-chip></span></div></div>
    <div class="rtools">${r.va?'':sel+(k>1?`<button class="mini pw" data-act="pw" aria-pressed="${!!r.pw}" title="modifier le pourcentage de chaque note">${r.pw?'✓ %':'%'}</button>`:'')+'<button class="mini" data-act="rt" hidden>rattrapage ?</button>'}
      <button class="mini va" data-act="va" aria-pressed="${!!r.va}" title="matière déjà validée (redoublement)">${r.va?'✓ validée':'validée ?'}</button></div>
    ${r.va?'':`<div class="notes">${notes}</div>`}${r.pw&&!r.va&&k>1?'<p class="pw-hint" data-pwhint></p>':''}${opt}</div>`;
}
function check(el){const f=el.dataset.f;if(f==='n'||f==='k'||f==='oc')return;const v=el.value,x=parseFloat(String(v).replace(',','.'));
  el.classList.toggle('bad',v.trim()!==''&&!(isFinite(x)&&x>=0&&x<=(f==='e'?60:f==='w'?100:20)))}

function short(p){return !p.E?'acquis':p.valid?'validé':p.need==null?(p.phase===2?'à rattraper':'–'):p.need<=0?'déjà ok':p.need>20?'&gt; 20':`vise ${fmt(ceil(p.need))}${p.phase===2?' (ratt.)':''}`}
function update(){
  const ann=annualOn(),gA=grp(pool()),gS=grp(rows()),per={},perS={};
  for(const k in gA)per[k]=calc(gA[k]);
  for(const k in gS)perS[k]=calc(gS[k]);
  for(const k of order()){const t=document.querySelector(`[data-tot="${CSS.escape(k)}"]`),p=perS[k],a=per[k];
    if(t&&p)t.textContent=`${fmt((gS[k]||[]).reduce((s,r)=>s+ects(r),0))} ects`+(p.cur!=null?` · moyenne ${fmt(p.cur)}`:'')+(ann&&a&&a.cur!=null?` · année ${fmt(a.cur)}`:'');
    const n=document.querySelector(`[data-bneed="${CSS.escape(k)}"]`);if(n)n.innerHTML=a&&!S.edit&&(a.valid||!a.E)?`<span class="tag t">${short(a)}</span>`:''}
  document.querySelectorAll('#list .row[data-i]').forEach(el=>{const r=rows()[el.dataset.i],c=el.querySelector('[data-chip]'),bt=el.querySelector('[data-act=rt]');if(!c)return;
    if(r.va){c.innerHTML='<span class="tag t">acquise · hors calcul</span>';return}
    const hint=el.querySelector('[data-pwhint]');
    if(hint){const w=wts(r);el.querySelectorAll('[data-f=w]').forEach(x=>{x.placeholder=fmt(w[+x.dataset.j])});const t=w.reduce((s,x)=>s+x,0);hint.textContent=Math.abs(t-100)<1e-6?'total : 100 %':`total : ${fmt(t)} % · les pourcentages sont ramenés à 100 %`;hint.classList.toggle('warn',Math.abs(t-100)>=1e-6)}
    const G=per[r.b],avg=ccAvg(r);
    if(G.phase===1)c.innerHTML=avg==null?'':`<span class="tag">= ${fmt(avg)}</span>`;
    else if(G.inR(r))c.innerHTML='';
    else{const m=rated(r,num(r.ra));c.innerHTML=`<span class="tag ${m<10?'p':''}">= ${fmt(m)}</span>`}
    if(bt){bt.hidden=!(G.phase===2&&!G.valid&&!ok(num(r.ra))&&avg!=null);bt.setAttribute('aria-pressed',G.inR(r));bt.textContent=G.inR(r)?'✓ rattrapage':'rattrapage ?'}});
  // en tête : le bloc le plus serré
  let R=null,which='',w=null;
  for(const k in per){const p=per[k];if(!p.E)continue;const sc=p.valid?-99:p.need==null?99:p.need;if(!w||sc>w.s)w={s:sc,k}}
  if(w){R=per[w.k];which=w.k}
  const yr=ann?` sur l’année (${[S.sem,partner()].sort().join(' + ')})`:'';
  const pre=(ann?'année · ':'')+(which?`bloc ${BI(which).code} · `:''),ep=R?epl(R):'';
  let s='',big='–',sub='',lbl=pre+'note à viser '+ep;
  if(!R){s='done';lbl='note à viser';sub=rows().length?'toutes les matières sont déjà validées.':'ajoute tes matières et leurs ects pour commencer.'}
  else if(R.valid){s='ok';lbl=(ann?'année · ':'')+'tous les blocs';big='validé';sub='chaque bloc a déjà 10 de moyenne'+yr+(R.phase===2?', pas besoin de rattrapage.':'.')}
  else if(R.need==null){s='no';lbl=pre+'moyenne après les CC';big=fmt(R.fin)+'<small>/20</small>';sub=`il manque ${fmt(10-R.fin)} point(s) à ce bloc${yr}. appuie sur « rattrapage ? » pour les matières que tu passes au rattrapage.`}
  else if(R.need<=0){s='ok';big='0<small>/20</small>';sub=`même avec 0 ${ep}, tous tes blocs sont à 10${yr}.`}
  else if(R.need>20){s='no';big='&gt;20';sub=R.phase===1?`même avec 20 ${ep}, ce bloc plafonne à ${fmt(R.f(20))}${yr}. il restera le rattrapage.`:`même avec 20 au rattrapage sur ces ${R.n} matière(s), ce bloc plafonne à ${fmt(R.f(20))}${yr}. ajoute des matières à repasser.`}
  else{const n=ceil(R.need);s=n<=10?'':n<=14?'mid':'hard';big=fmt(n)+'<small>/20</small>';
    sub=(R.phase===1?`sur chacune des ${R.n} épreuves qui restent dans ce bloc`:`sur chacune des ${R.n} matière(s) repassée(s) de ce bloc`)+`${yr}, pour qu’il ait 10. c’est le bloc le plus serré.`}
  const card=$('card');card.dataset.s=s;$('lbl').textContent=lbl;$('big').innerHTML=big;$('big').classList.toggle('long',big.replace(/<small>.*$/,'').length>4);$('sub').textContent=sub;
  const ks=order().concat(Object.keys(per).filter(k=>!order().includes(k)));
  $('bl').innerHTML=ks.filter(k=>per[k]).map(k=>{const p=per[k],bi=BI(k);
    return `<div><span class="bk" style="--c:${bi.col}">${esc(bi.code)}</span><span class="bm">${p.cur!=null?(ann?'moyenne annuelle ':'moyenne ')+fmt(p.cur):p.E?'pas encore de note':'matières acquises'}</span><span class="bs">${short(p)}</span></div>`}).join('');
}

// --- sauvegarde / restauration par code
const enc=o=>'tupasse:'+btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const dec=s=>JSON.parse(decodeURIComponent(escape(atob(String(s).trim().replace(/^tupasse:/,'').replace(/\s+/g,'')))));
function ioFill(){$('ioOut').value=enc({v:3,lic:S.lic,sem:S.sem,rule:S.rule,ncc:S.ncc,annual:S.annual,data:S.data});$('ioMsg').textContent=''}

// --- thème : auto (réglage du téléphone), clair, sombre
const THEMES=['auto','clair','sombre'],TV={clair:'light',sombre:'dark'};
let theme='auto';try{theme={light:'clair',dark:'sombre'}[localStorage.getItem('tupasse-theme')]||'auto'}catch(e){}
function applyTheme(){if(TV[theme])document.documentElement.dataset.theme=TV[theme];else delete document.documentElement.dataset.theme;
  $('themeBtn').textContent='thème : '+theme;try{if(TV[theme])localStorage.setItem('tupasse-theme',TV[theme]);else localStorage.removeItem('tupasse-theme')}catch(e){}}

document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.go){pick=t.dataset.go;welcome();return}
  if(t.id==='themeBtn'){theme=THEMES[(THEMES.indexOf(theme)+1)%3];applyTheme();return}
  if(t.id==='ioBtn'){const o=$('io').hidden;$('io').hidden=!o;t.setAttribute('aria-expanded',o);if(o)ioFill();return}
  if(t.id==='ioCopy'){const v=$('ioOut').value;navigator.clipboard.writeText(v).then(()=>{$('ioMsg').textContent='code copié ✓'},()=>{$('ioOut').select();$('ioMsg').textContent='sélectionne le code et copie-le (Ctrl/Cmd + C).'});return}
  if(t.id==='ioLoad'){try{const o=dec($('ioIn').value);if(!o||typeof o.data!=='object')throw 0;
      S.data=o.data;if(o.rule)S.rule=o.rule;if(o.ncc)S.ncc=o.ncc;S.annual=!!o.annual;S.sample=false;migrate();save();render();ioFill();$('ioIn').value='';$('ioMsg').textContent='notes restaurées ✓'}
    catch(err){$('ioMsg').textContent='ce code ne marche pas : vérifie que tu l’as copié en entier.'}return}
  if(t.id==='calcBtn'){if(!pick)return;S.sem=pick;S.chosen=true;view='app';S.edit=!rows().length;window.scrollTo(0,0)}
  else if(t.id==='licBtn'){view='welcome';pick=S.sem;window.scrollTo(0,0)}
  else if(t.dataset.rule)S.rule=t.dataset.rule;
  else if(t.dataset.ann)S.annual=t.dataset.ann==='1';
  else if(t.id==='nccMinus'||t.id==='nccPlus')S.ncc=Math.min(MAXCC,Math.max(1,S.ncc+(t.id==='nccPlus'?1:-1)));
  else if(t.id==='editBtn')S.edit=!S.edit;
  else if(t.id==='clearBtn'){rows().forEach(r=>{r.cc=[];r.ra='';r.rt=null});S.sample=false}
  else if(t.dataset.act){const a=t.dataset.act,row=t.closest('[data-i]'),i=row?+row.dataset.i:-1;
    if(a==='rt')rows()[i].rt=t.getAttribute('aria-pressed')!=='true';
    else if(a==='pw'){const r=rows()[i];r.pw=!r.pw;if(!r.pw)delete r.w}
    else if(a==='va')rows()[i].va=!rows()[i].va;
    else if(a==='del')rows().splice(i,1);
    else if(a==='add')rows().push({b:t.closest('[data-b]').dataset.b,n:'nouvelle matière',e:2,cc:[],ra:'',rt:null,va:false});
    else if(a==='reset')S.data[dkey()]=fresh(S.sem);
    else return}
  else return;
  save();render()});
function onField(e){const el=e.target,row=el.closest('[data-i]'),f=el.dataset.f;if(!row||!f)return;
  const r=rows()[+row.dataset.i];
  if(f==='cc'){const j=+el.dataset.j,a=(r.cc||[]).slice();while(a.length<=j)a.push('');a[j]=el.value;r.cc=a}
  else if(f==='k'){r.k=+el.value;delete r.w;save();render();return}
  else if(f==='w'){const jj=+el.dataset.j,a=(r.w||[]).slice();while(a.length<=jj)a.push('');a[jj]=el.value;r.w=a}
  else if(f==='oc'){r.oc=el.value;save();return}
  else r[f]=el.value;
  check(el);save();update()}
$('list').addEventListener('input',onField);
$('licSel').addEventListener('change',e=>{S.lic=e.target.value;save();welcome()});
applyTheme();
render();
