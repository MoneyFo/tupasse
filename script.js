const P={
 S1:['L1 · S1',[['DS','Logique propositionnelle et des prédicats, algèbre linéaire, arithmétique',4],['DS','Polynômes, raisonnement, récursion, induction, dénombrement',4],['DS',"Initiation à l'informatique de base",2],['DS',"Introduction à l'algorithmique et à la programmation (python)",6],['DS','Application algorithmique (scratch, LARP, Coding Game…)',2],['DS','Programmation web : HTML 5 / CSS',4],['TS','CNB : compétences numériques, bureautique, PIX',3],['ES','Méthodologie de la programmation, versioning, génie logiciel',2],['ES','PREPRO : connaissance de soi',2],['ES','Méthodologie de la recherche documentaire',1]]],
 S2:['L1 · S2',[['DS','Mathématiques pour l’informatique : calcul matriciel',2],['DS','Fonctions, vecteurs, récursivité, tris (python)',6],['DS','Structures de données fondamentales (python)',6],['DS','Programmation C niveau 1',6],['DS','Architecture des ordinateurs, représentation de l’info',4],['TS',"Activité d'ouverture (sport ou transitions)",2],['LS','Anglais',2],['ES','Transitions numériques',2]]],
 S3:['L2 · S3',[['DS','Maths pour l’informatique : analyse matricielle et numérique',4],['DS','Algorithmique niveau 2 : récursivité, tableaux ND',5],['DS','Programmation C niveau 2',5],['DS','Javascript, jQuery',3],['DS','Programmation objet niveau 1 : Java',6],['DS','Système d’exploitation niveau 1 : shell, regex',3],['LS','Anglais',2],['ES','PREPRO : découverte du monde professionnel',2]]],
 S4:['L2 · S4',[['DS','Algorithmique des arbres et des graphes',4],['DS','Système d’exploitation niveau 2 : fork, processus',4],['DS','Bases de données : initiation',4],['DS','Données sur le web : XML, XSLT, XPATH',5],['DS','Programmation web : PHP / MariaDB / AJAX',6],['TS','Expression écrite et certification Voltaire',3],['TS',"Activité d'ouverture",2],['LS','Anglais',2]]],
 S5:['L3 · S5',[['DS','Architecture',3],['DS','Protocoles',5],['DS','Programmation mobile',5],['DS','Programmation par contraintes',5],['DS','Bases de données : conception et notions avancées',4],['TS','Compétences rédactionnelles',2],['LS','Anglais',2],['ES','Génie logiciel',4]]],
 S6:['L3 · S6',[['DS','Automates et théorie des langages',3],['DS','POO niveau 2 : Java, IHM, interfaces graphiques',5],['DS','Programmation mobile niveau 2',4],['DS','Système d’exploitation niveau 3 : communication inter-processus',3],['DS','Sécurité informatique',4],['TS','Transitions (en anglais)',2],['LS','Anglais',2],['ES','Stage en entreprise ou en laboratoire (7 semaines)',6],['ES','PREPRO : insertion dans le milieu professionnel',1]]]
};
const B={DS:['compétences disciplinaires','var(--teal)','<path d="M8 6 3 12l5 6M16 6l5 6-5 6M14 4l-4 16"/>'],
 TS:['compétences transversales','var(--yellow)','<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'],
 LS:['compétences linguistiques','var(--lav)','<path d="M4 5h16v11H9l-5 4z"/>'],
 ES:['compétences préprofessionnelles','var(--pink)','<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 13h18"/>']};
const T=[[10,'10 · valider'],[12,'12 · assez bien'],[14,'14 · bien'],[16,'16 · très bien']];
const KEY='ma-moyenne-v1',$=id=>document.getElementById(id);
const fresh=s=>P[s][1].map(([b,n,e])=>({b,n,e,cc:'',ex:'',p:40,on:false}));
let S=null;try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!S||!S.data){S={sem:'S1',target:10,mode:'sem',edit:false,sample:true,data:{}};
  const r=fresh('S1');Object.assign(r[0],{on:true,cc:'12.5'});Object.assign(r[3],{on:true,cc:'14',p:50});Object.assign(r[5],{on:true,cc:'9'});
  r[6].ex='15';r[8].ex='13';r[9].ex='16';S.data.S1=r}
const rows=()=>S.data[S.sem]||(S.data[S.sem]=fresh(S.sem));
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const num=v=>{if(v==null||String(v).trim()==='')return null;const x=parseFloat(String(v).replace(',','.'));return isFinite(x)&&x>=0&&x<=20?x:NaN};
const fmt=(x,d=2)=>x.toFixed(d).replace('.',',').replace(/,?0+$/,'')||'0';
const ceil=x=>Math.ceil(x*100-1e-9)/100;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function parts(r){const p=r.on?Math.min(Math.max(+r.p||0,0),100)/100:0;return r.on?[[r.cc,p],[r.ex,1-p]]:[[r.ex,1]]}
function calc(list){let E=0,K=0,U=0;for(const r of list){const e=Math.max(+String(r.e).replace(',','.')||0,0);if(!e)continue;E+=e;
  for(const[v,w]of parts(r)){const x=num(v);if(x==null||isNaN(x))U+=e*w;else K+=e*w*x}}
  return{E,K,U,need:U>1e-9?(S.target*E-K)/U:null,cur:E-U>1e-9?K/(E-U):null,fin:U<=1e-9&&E?K/E:null}}
const groups=()=>{const g={};rows().forEach((r,i)=>(g[r.b]=g[r.b]||[]).push([r,i]));return g};

function render(){
  $('tabs').innerHTML=Object.keys(P).map(k=>`<button class="tab" data-sem="${k}" aria-pressed="${k===S.sem}">${P[k][0]}</button>`).join('');
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===S.mode));
  $('editBtn').classList.toggle('on',S.edit);$('editBtn').textContent=S.edit?'terminer':'modifier la maquette';
  $('targets').innerHTML=T.map(([v,l])=>`<button class="pill" data-t="${v}" aria-pressed="${v===S.target}">${l}</button>`).join('');
  $('sample').hidden=!(S.sample&&S.sem==='S1');
  const g=groups(),order=['DS','TS','LS','ES'];
  let h=order.filter(k=>g[k]||S.edit).map(k=>{const[name,col,ico]=B[k],it=g[k]||[];
    return `<section class="bloc ${k==='DS'?'main':''}" data-b="${k}"><div class="bh"><span class="ib" style="background:${col}"><svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ico}</svg></span>
      <div><h2>${k} · ${name}</h2><small data-tot="${k}"></small></div><span class="need" data-bneed="${k}"></span></div>
      ${it.map(([r,i])=>S.edit?`<div class="row edit-row" data-i="${i}"><input class="in wide" data-f="n" value="${esc(r.n)}" aria-label="nom de la matière"><input class="in sm" data-f="e" inputmode="decimal" value="${esc(r.e)}" aria-label="ects"><button class="mini" data-act="del" aria-label="supprimer">×</button></div>`
      :`<div class="row" data-i="${i}"><div><div class="nm">${esc(r.n)}</div><div class="meta"><span class="ects">${esc(r.e)} ects</span><span data-chip></span></div></div>
        <div class="fields">${r.on?`<label class="f">cc<input class="in" data-f="cc" inputmode="decimal" placeholder="—" value="${esc(r.cc)}"></label><label class="f">% cc<input class="in sm" data-f="p" inputmode="decimal" value="${esc(r.p)}"></label>`:''}
        <label class="f">${r.on?'examen':'note'}<input class="in" data-f="ex" inputmode="decimal" placeholder="?" value="${esc(r.ex)}"></label>
        <button class="mini" data-act="cc" title="${r.on?'retirer le contrôle continu':'ajouter un contrôle continu'}">${r.on?'− cc':'+ cc'}</button></div></div>`).join('')}
      ${S.edit?`<button class="add" data-act="add">+ ajouter une matière</button>`:''}</section>`}).join('');
  if(S.edit)h+=`<button class="btn cor" data-act="reset">remettre la maquette d'origine</button>`;
  $('list').innerHTML=h;
  document.querySelectorAll('#list .in').forEach(check);update();
}
function check(el){const f=el.dataset.f;if(f==='n')return;const v=el.value,x=parseFloat(String(v).replace(',','.'));
  el.classList.toggle('bad',v.trim()!==''&&!(isFinite(x)&&x>=0&&x<=(f==='p'?100:f==='e'?60:20)))}

function update(){
  const all=calc(rows()),g=groups();
  const per={};for(const k in g)per[k]=calc(g[k].map(x=>x[0]));
  for(const k in B){const t=document.querySelector(`[data-tot="${k}"]`);if(t&&per[k])t.textContent=`${fmt(per[k].E)} ects`+(per[k].cur!=null?` · moyenne ${fmt(per[k].cur)}`:'');
    const n=document.querySelector(`[data-bneed="${k}"]`);if(n)n.innerHTML=S.mode==='bloc'&&per[k]&&!S.edit?tagFor(per[k]):''}
  document.querySelectorAll('#list .row[data-i]').forEach(el=>{const r=rows()[el.dataset.i],c=el.querySelector('[data-chip]');if(!c)return;
    const ps=parts(r),miss=ps.some(([v])=>{const x=num(v);return x==null||isNaN(x)});
    const grp=S.mode==='bloc'?per[r.b]:all;
    if(!miss){const m=ps.reduce((s,[v,w])=>s+w*num(v),0);c.innerHTML=`<span class="tag">= ${fmt(m)}</span>`}
    else c.innerHTML=grp.need==null?'':grp.need<=0?'<span class="tag t">déjà ok</span>':grp.need>20?'<span class="tag p">&gt; 20</span>':`<span class="tag y">vise ${fmt(ceil(grp.need))}</span>`});
  // headline: semestre ou pire bloc
  let R=all,which='';
  if(S.mode==='bloc'){let worst=null;for(const k in per){const p=per[k];const score=p.need!=null?p.need:(p.fin!=null&&p.fin<S.target?99:-99);
      if(worst==null||score>worst.s)worst={s:score,k}}if(worst){R=per[worst.k];which=worst.k}}
  const card=$('card');let s,big,sub,lbl='note à viser partout';
  if(!all.E){s='done';big='–';sub='ajoute des matières pour commencer.'}
  else if(R.need==null){const ok=R.fin>=S.target;s=ok?'ok':'no';lbl=which?`bloc ${which} · moyenne finale`:'moyenne finale';big=fmt(R.fin)+'<small>/20</small>';
    sub=ok?`toutes les notes sont là : objectif de ${S.target} atteint.`:`toutes les notes sont là : il manque ${fmt(S.target-R.fin)} point(s) pour atteindre ${S.target}.`}
  else if(R.need<=0){s='ok';big='0<small>/20</small>';sub=`même avec 0 aux épreuves restantes, tu atteins ${S.target}${which?' dans chaque bloc':''}.`}
  else if(R.need>20){s='no';big='&gt;20';sub=`même avec 20 partout, ${which?'le bloc '+which:'le semestre'} plafonne à ${fmt((R.K+R.U*20)/R.E)}. pense au rattrapage.`}
  else{const n=ceil(R.need);s=n<=10?'':n<=14?'mid':'hard';big=fmt(n)+'<small>/20</small>';
    sub=`sur chaque épreuve qui reste${which?` (le bloc ${which} est le plus serré)`:''}, pour finir à ${S.target} de moyenne.`;if(which)lbl=`note à viser · bloc ${which}`}
  card.dataset.s=s;$('lbl').textContent=lbl;$('big').innerHTML=big;$('sub').textContent=sub;
  $('mobl').textContent=lbl;$('mobv').innerHTML=big;$('mob').style.background=getComputedStyle(card).backgroundColor;
  const c=all.cur!=null?all.cur:all.fin;$('cur').textContent=c!=null?fmt(c):'–';
  $('done').textContent=all.E?`${fmt(all.E-all.U,1)} / ${fmt(all.E)}`:'–';
  $('fill').style.width=(c!=null?c/20*100:0)+'%';$('mark').style.left=S.target/20*100+'%';
  $('bl').innerHTML=S.mode==='bloc'?Object.keys(per).map(k=>`<div><span>bloc ${k}</span><span>${per[k].need==null?'final '+fmt(per[k].fin):per[k].need<=0?'déjà ok':per[k].need>20?'&gt; 20':'vise '+fmt(ceil(per[k].need))}</span></div>`).join(''):'';
  sim();
}
function tagFor(p){return p.need==null?`<span class="tag ${p.fin>=S.target?'t':'p'}">final ${fmt(p.fin)}</span>`:p.need<=0?'<span class="tag t">déjà ok</span>':p.need>20?'<span class="tag p">&gt; 20</span>':`<span class="tag y">vise ${fmt(ceil(p.need))}</span>`}
function sim(){const v=+$('sim').value,a=calc(rows());$('simv').textContent=fmt(v);
  $('simr').textContent=a.E?fmt((a.K+a.U*v)/a.E)+' /20':'–'}

document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.sem){S.sem=t.dataset.sem;S.edit=false}
  else if(t.dataset.mode)S.mode=t.dataset.mode;
  else if(t.dataset.t)S.target=+t.dataset.t;
  else if(t.id==='editBtn')S.edit=!S.edit;
  else if(t.id==='clearBtn'){rows().forEach(r=>{r.cc='';r.ex=''});S.sample=false}
  else if(t.dataset.act){const a=t.dataset.act,row=t.closest('[data-i]'),i=row?+row.dataset.i:-1;
    if(a==='cc')rows()[i].on=!rows()[i].on;
    else if(a==='del')rows().splice(i,1);
    else if(a==='add')rows().push({b:t.closest('[data-b]').dataset.b,n:'nouvelle matière',e:2,cc:'',ex:'',p:40,on:false});
    else if(a==='reset')S.data[S.sem]=fresh(S.sem);
    else return}
  else return;
  save();render()});
$('list').addEventListener('input',e=>{const el=e.target,row=el.closest('[data-i]');if(!row||!el.dataset.f)return;
  rows()[+row.dataset.i][el.dataset.f]=el.value;check(el);save();update()});
$('sim').addEventListener('input',sim);
render();
