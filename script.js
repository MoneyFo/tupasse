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
const fresh=s=>P()[s][1].map(([b,n,e])=>({b,n,e,c1:'',c2:'',ra:'',rt:null}));
let S=null;try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!S||!S.data){S={lic:'info',sem:'S1',target:10,mode:'sem',rule:'max',edit:false,sample:true,data:{}};
  const r=fresh('S1'),c1=[9,8,11,10,12,8,13,12,11,14],c2={1:7,3:10,6:12,7:11,8:12,9:15};
  r.forEach((x,i)=>{x.c1=String(c1[i]);if(c2[i]!=null)x.c2=String(c2[i])});S.data.S1=r}
if(!LIC[S.lic])S.lic='info';
for(const k of Object.keys(S.data))if(!k.includes(':')){S.data['info:'+k]=S.data[k];delete S.data[k]}
const dkey=()=>S.lic+':'+S.sem;
S.mode='bloc';S.target=10;
const rows=()=>S.data[dkey()]||(S.data[dkey()]=fresh(S.sem));
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
const wts=()=>[.5,.5]; // CC1 et CC2 comptent pareil
const ccAvg=r=>{const[a,b]=wts(),x=num(r.c1),y=num(r.c2);return ok(x)&&ok(y)?a*x+b*y:null};
// note de la matière une fois le rattrapage connu, selon la règle choisie
const rated=(r,ra)=>{const m=ccAvg(r);if(!ok(ra)||m==null)return m;const[a,b]=wts(),x=num(r.c1),y=num(r.c2);
  if(S.rule==='moy3')return (x+y+ra)/3;          // moyenne des 3 notes
  if(S.rule==='cc')return x<=y?a*ra+b*y:a*x+b*ra; // remplace le plus faible des deux CC
  return Math.max(m,ra)};                         // garde le rattrapage s'il est meilleur que la moyenne des CC

// calcule un bloc (ou le semestre entier).
// phase 1 : il reste des CC à passer → inconnues = CC vides.
// phase 2 : tous les CC sont là → si pas validé, inconnues = rattrapages des matières repassées.
function calc(list){
  const L=list.filter(r=>ects(r)>0&&!r.va),  // matière validée = hors calcul
   E=L.reduce((s,r)=>s+ects(r),0),[a,b]=wts(),T0=S.target-1e-9;
  const o={E,phase:1,n:0,need:null,cur:null,fin:null,valid:false,doneE:0,onlyCC2:true,inR:()=>false,f:()=>0};
  if(!E)return o;
  if(L.some(r=>ccAvg(r)==null)){
    let K=0,U=0;
    for(const r of L){const e=ects(r);for(const[v,w,k]of[[r.c1,a,1],[r.c2,b,2]]){const x=num(v);
      if(ok(x))K+=e*w*x;else if(w>0){U+=e*w;o.n++;if(k===1)o.onlyCC2=false}}}
    o.doneE=E-U;o.cur=E-U>1e-9?K/(E-U):null;o.f=x=>(K+U*x)/E;
  }else{
    o.phase=2;
    const base=L.reduce((s,r)=>s+ects(r)*rated(r,num(r.ra)),0)/E;
    o.cur=base;o.doneE=E;
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
const groups=()=>{const g={};rows().forEach((r,i)=>(g[r.b]=g[r.b]||[]).push([r,i]));return g};
const tag=(need,pre)=>need==null?'':need<=0?'<span class="tag t">déjà ok</span>':need>20?'<span class="tag p">&gt; 20</span>':`<span class="tag y">${pre} ${fmt(ceil(need))}</span>`;

function welcome(){
  $('calcBtn').disabled=!pick;$('calcBtn').textContent=pick?`calculer mon ${P()[pick][0].split(' · ')[1]} →`:'choisis un semestre';
  $('licSel').innerHTML=GROUPS.map(([g,ks])=>`<optgroup label="${esc(g)}">${ks.filter(k=>LIC[k]).map(k=>`<option value="${k}"${k===S.lic?' selected':''}>${esc(LIC[k].n)}</option>`).join('')}</optgroup>`).join('');
  if(pick&&!P()[pick])pick=null;
  const yrs={};for(const k of Object.keys(P())){const y=P()[k][0].split(' · ')[0];(yrs[y]=yrs[y]||[]).push(k)}
  const col={L1:'var(--teal)',L2:'var(--lav)',L3:'var(--pink)'};
  $('semGrid').innerHTML=Object.entries(yrs).map(([y,ks])=>`<div class="yr"><b>${y}</b>${ks.map(k=>{const n=(S.data[S.lic+':'+k]||P()[k][1]).length;
    return `<button class="go" role="radio" data-go="${k}" style="--c:${col[y]||'var(--yellow)'}" aria-checked="${k===pick}">${P()[k][0].split(' · ')[1]}<small>${n?n+' matières':'à remplir'}</small></button>`}).join('')}</div>`).join('');
}
function render(){
  document.body.dataset.view=view;
  if(view==='welcome'){welcome();return}
  const[yr,se]=P()[S.sem][0].split(' · ');
  $('crumb').textContent=LIC[S.lic].n.toLowerCase()+' · '+yr;
  $('semTitle').textContent=`semestre ${se.slice(1)}`;
  document.querySelectorAll('[data-rule]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.rule===S.rule));
  $('editBtn').classList.toggle('on',S.edit);$('editBtn').textContent=S.edit?'terminer':'modifier la maquette';
  $('sample').hidden=!(S.sample&&S.lic==='info'&&S.sem==='S1');
  const g=groups();
  let h=order().map((k,bi)=>{const{code,name,col,ico}=BI(k),it=g[k]||[];
    return `<section class="bloc ${bi===0?'main':''}" data-b="${esc(k)}"><div class="bh"><span class="ib" style="background:${col}"><svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ico}</svg></span>
      <div><h2>${esc(code)} · ${esc(name)}</h2><small data-tot="${esc(k)}"></small></div><span class="need" data-bneed="${esc(k)}"></span></div>
      ${it.map(([r,i])=>S.edit?`<div class="row edit-row" data-i="${i}"><input class="in wide" data-f="n" value="${esc(r.n)}" aria-label="nom de la matière"><input class="in sm" data-f="e" inputmode="decimal" value="${esc(r.e)}" aria-label="ects"><button class="mini" data-act="del" aria-label="supprimer">×</button></div>`
      :`<div class="row${r.va?' acq':''}" data-i="${i}"><div><div class="nm">${esc(r.n)}</div><div class="meta"><span class="ects">${fmt(ects(r))} ects</span><span data-chip></span></div></div>
        <div class="fields">${r.va?'':`
          <label class="f">cc1<input class="in" data-f="c1" inputmode="decimal" placeholder="?" value="${esc(r.c1)}"></label>
          <label class="f">cc2<input class="in" data-f="c2" inputmode="decimal" placeholder="?" value="${esc(r.c2)}"></label>
          <label class="f ra">rattrapage<input class="in" data-f="ra" inputmode="decimal" placeholder="—" value="${esc(r.ra)}"></label>
          <button class="mini" data-act="rt" hidden>rattrapage ?</button>`}
          <button class="mini va" data-act="va" aria-pressed="${!!r.va}" title="matière déjà validée (redoublement)">${r.va?'✓ validée':'validée ?'}</button></div></div>`).join('')}
      ${S.edit?`<button class="add" data-act="add">+ ajouter une matière</button>`:''}</section>`}).join('');
  if(S.edit)h+=`<button class="btn cor" data-act="reset">remettre la maquette d'origine</button>`;
  $('list').innerHTML=h;
  document.querySelectorAll('#list .in').forEach(check);update();
}
function check(el){const f=el.dataset.f;if(f==='n')return;const v=el.value,x=parseFloat(String(v).replace(',','.'));
  el.classList.toggle('bad',v.trim()!==''&&!(isFinite(x)&&x>=0&&x<=(f==='e'?60:20)))}

function short(p){return !p.E?'acquis':p.valid?'validé':p.need==null?(p.phase===2?'à rattraper':'–'):p.need<=0?'déjà ok':p.need>20?'&gt; 20':`vise ${fmt(ceil(p.need))}${p.phase===2?' (ratt.)':''}`}
function update(){
  const all=calc(rows()),g=groups(),per={};for(const k in g)per[k]=calc(g[k].map(x=>x[0]));
  for(const k of order()){const t=document.querySelector(`[data-tot="${CSS.escape(k)}"]`),p=per[k];
    if(t&&p)t.textContent=`${fmt(g[k].reduce((s,[r])=>s+ects(r),0))} ects`+(p.cur!=null?` · moyenne ${fmt(p.cur)}`:'');
    const n=document.querySelector(`[data-bneed="${CSS.escape(k)}"]`);if(n)n.innerHTML=p&&!S.edit&&(p.valid||!p.E)?`<span class="tag t">${short(p)}</span>`:''}
  document.querySelectorAll('#list .row[data-i]').forEach(el=>{const r=rows()[el.dataset.i],c=el.querySelector('[data-chip]'),bt=el.querySelector('[data-act=rt]');if(!c)return;
    if(r.va){c.innerHTML='<span class="tag t">acquise · hors calcul</span>';return}
    const G=per[r.b],avg=ccAvg(r);
    if(G.phase===1)c.innerHTML=avg==null?'':`<span class="tag">= ${fmt(avg)}</span>`;
    else if(G.inR(r))c.innerHTML='';
    else{const m=rated(r,num(r.ra));c.innerHTML=`<span class="tag ${m<10?'p':''}">= ${fmt(m)}</span>`}
    if(bt){bt.hidden=!(G.phase===2&&!G.valid&&!ok(num(r.ra))&&avg!=null);bt.setAttribute('aria-pressed',G.inR(r));bt.textContent=G.inR(r)?'✓ rattrapage':'rattrapage ?'}});
  // en tête : le bloc le plus serré
  let R=null,which='',w=null;
  for(const k in per){const p=per[k];if(!p.E)continue;const sc=p.valid?-99:p.need==null?99:p.need;if(!w||sc>w.s)w={s:sc,k}}
  if(w){R=per[w.k];which=w.k}
  const pre=which?`bloc ${BI(which).code} · `:'',ep=R&&R.phase===1?(R.onlyCC2?'au CC2':'aux CC restants'):'au rattrapage';
  let s='',big='–',sub='',lbl=pre+'note à viser '+ep;
  if(!R){s='done';lbl='note à viser';sub=rows().length?'toutes les matières sont déjà validées.':'ajoute tes matières et leurs ects pour commencer.'}
  else if(R.valid){s='ok';lbl='tous les blocs';big='validé';sub='chaque bloc a déjà 10 de moyenne'+(R.phase===2?', pas besoin de rattrapage.':'.')}
  else if(R.need==null){s='no';lbl=pre+'moyenne après les CC';big=fmt(R.fin)+'<small>/20</small>';sub=`il manque ${fmt(10-R.fin)} point(s) à ce bloc. appuie sur « rattrapage ? » pour les matières que tu passes au rattrapage.`}
  else if(R.need<=0){s='ok';big='0<small>/20</small>';sub=`même avec 0 ${ep}, tous tes blocs sont à 10.`}
  else if(R.need>20){s='no';big='&gt;20';sub=R.phase===1?`même avec 20 ${ep}, ce bloc plafonne à ${fmt(R.f(20))}. il restera le rattrapage.`:`même avec 20 au rattrapage sur ces ${R.n} matière(s), ce bloc plafonne à ${fmt(R.f(20))}. ajoute des matières à repasser.`}
  else{const n=ceil(R.need);s=n<=10?'':n<=14?'mid':'hard';big=fmt(n)+'<small>/20</small>';
    sub=(R.phase===1?`sur chacun des ${R.n} CC qui restent dans ce bloc`:`sur chacune des ${R.n} matière(s) repassée(s) de ce bloc`)+`, pour qu’il ait 10. c’est le bloc le plus serré.`}
  const card=$('card');card.dataset.s=s;$('lbl').textContent=lbl;$('big').innerHTML=big;$('big').classList.toggle('long',big.replace(/<small>.*$/,'').length>4);$('sub').textContent=sub;
  $('bl').innerHTML=order().filter(k=>per[k]).map(k=>{const p=per[k],bi=BI(k);
    return `<div><span class="bk" style="--c:${bi.col}">${esc(bi.code)}</span><span class="bm">${p.cur!=null?'moyenne '+fmt(p.cur):p.E?'pas encore de note':'matières acquises'}</span><span class="bs">${short(p)}</span></div>`}).join('');
}
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.go){pick=t.dataset.go;welcome();return}
  else if(t.id==='calcBtn'){if(!pick)return;S.sem=pick;S.chosen=true;view='app';S.edit=!rows().length;window.scrollTo(0,0)}
  else if(t.id==='licBtn'){view='welcome';pick=S.sem;window.scrollTo(0,0)}
  else if(t.dataset.rule)S.rule=t.dataset.rule;
  else if(t.id==='editBtn')S.edit=!S.edit;
  else if(t.id==='clearBtn'){rows().forEach(r=>{r.c1='';r.c2='';r.ra='';r.rt=null});S.sample=false}
  else if(t.dataset.act){const a=t.dataset.act,row=t.closest('[data-i]'),i=row?+row.dataset.i:-1;
    if(a==='rt')rows()[i].rt=t.getAttribute('aria-pressed')!=='true';
    else if(a==='va')rows()[i].va=!rows()[i].va;
    else if(a==='del')rows().splice(i,1);
    else if(a==='add')rows().push({b:t.closest('[data-b]').dataset.b,n:'nouvelle matière',e:2,c1:'',c2:'',ra:'',rt:null,va:false});
    else if(a==='reset')S.data[dkey()]=fresh(S.sem);
    else return}
  else return;
  save();render()});
$('list').addEventListener('input',e=>{const el=e.target,row=el.closest('[data-i]');if(!row||!el.dataset.f)return;
  rows()[+row.dataset.i][el.dataset.f]=el.value;check(el);save();update()});
$('licSel').addEventListener('change',e=>{S.lic=e.target.value;save();welcome()});
render();
