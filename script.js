/* tupasse — calcul de la note à viser pour valider chaque bloc d'un semestre.
 *
 * Organisation du fichier :
 *   1. données des licences (viennent de licences.js) et blocs
 *   2. état de l'application (S), sauvegarde dans le navigateur, migration des anciennes sauvegardes
 *   3. lecture et affichage des nombres
 *   4. calcul : note d'une matière, puis d'un bloc (note à viser)
 *   5. affichage : accueil, liste des matières, carte résultat
 *   6. sauvegarde / restauration par code, thème
 *   7. événements (clics et saisies)
 *
 * Vocabulaire des données d'une matière (une « ligne », r) :
 *   b bloc (DS, TS…) · n nom · e ECTS · cc notes des CC (texte saisi) · k nombre de CC (sinon S.ncc)
 *   w pourcentages saisis · pw pourcentages affichés · ra rattrapage · rt « je repasse » forcé (true/false/null)
 *   va matière déjà validée · o options possibles · oc option choisie
 */

/* ---------- 1. licences et blocs ---------- */

const INFO = LICENCES.info.P;
// « autre licence » : mêmes semestres qu'Informatique, mais sans matières
const EMPTY = Object.fromEntries(Object.entries(INFO).map(([k, v]) => [k, [v[0], []]]));
const LIC = { ...LICENCES, perso: { n: 'Autre licence (maquette vide à remplir)', P: EMPTY } };
// ordre du menu déroulant, rangé par domaine
const GROUPS = [
  ['Sciences et technologies', ['info', 'maths', 'lspi', 'sv-bio', 'sv-chimie', 'sv-env', 'las', 'stes']],
  ['Droit, économie, gestion', ['droit', 'droit-exc', 'ap', 'eco-mci', 'eco-cca']],
  ['Lettres, langues, sciences humaines', ['geo', 'histoire', 'lettres', 'lea-esp', 'lea-man', 'llcer-ang', 'llcer-lp', 'llcer-pppe']],
  ['Licence professionnelle', ['erme']],
  ['Autre', ['perso']],
];
// semestres de la licence choisie : { S1: ['L1 · S1', [[bloc, nom, ects, options?], …]], … }
const P = () => (LIC[S.lic] ? LIC[S.lic].P : INFO);

// blocs standard : intitulé, couleur, icône (tracé SVG)
const B = {
  DS: ['compétences disciplinaires', 'var(--teal)', '<path d="M8 6 3 12l5 6M16 6l5 6-5 6M14 4l-4 16"/>'],
  TS: ['compétences transversales', 'var(--yellow)', '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'],
  LS: ['compétences linguistiques', 'var(--lav)', '<path d="M4 5h16v11H9l-5 4z"/>'],
  ES: ['compétences préprofessionnelles', 'var(--pink)', '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 13h18"/>'],
};
const PAL = ['var(--teal)', 'var(--yellow)', 'var(--lav)', 'var(--pink)', 'var(--coral)'];
// infos d'affichage d'un bloc ; une licence peut renommer ses blocs (DS-A en éco-gestion, UE 1… en licence pro)
const BI = k => {
  const o = ((LIC[S.lic] || {}).blocs || {})[k], d = B[k.slice(0, 2)];
  return {
    code: o ? o[0] : k,
    name: o ? o[1] : (d ? d[0] : k),
    col: d ? d[1] : PAL[(parseInt(k.replace(/\D/g, '')) || 0) % PAL.length],
    ico: d ? d[2] : '<path d="M4 6h16M4 12h16M4 18h10"/>',
  };
};
// blocs à afficher, dans l'ordre des matières ; en mode édition on montre aussi les blocs vides
// (ceux de la maquette d'origine, et les 4 standard pour une licence sans blocs propres)
const order = () => {
  const o = [];
  const add = k => { if (!o.includes(k)) o.push(k); };
  rows().forEach(r => add(r.b));
  if (S.edit) {
    (P()[S.sem] ? P()[S.sem][1] : []).forEach(x => add(x[0]));
    if (!(LIC[S.lic] || {}).blocs) ['DS', 'TS', 'LS', 'ES'].forEach(add);
  }
  return o;
};

/* ---------- 2. état, sauvegarde, migration ---------- */

const KEY = 'ma-moyenne-v2';
const $ = id => document.getElementById(id);
// matières d'un semestre de la maquette, sans notes
const fresh = (s, lic = S.lic) => LIC[lic].P[s][1].map(([b, n, e, o]) => ({ b, n, e, cc: [], ra: '', rt: null, va: false, ...(o ? { o } : {}) }));

// S : tout ce qui est enregistré. data = { 'info:S1': [matières…], … }
let S = null;
try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* stockage indisponible : on repart de zéro */ }
if (!S || !S.data) {
  S = { lic: 'info', sem: 'S1', rule: 'max', ncc: 2, annual: false, edit: false, sample: true, data: {} };
  // notes d'exemple au premier passage, pour montrer le site en marche
  const r = fresh('S1'), c1 = [9, 8, 11, 10, 12, 8, 13, 12, 11, 14], c2 = { 1: 7, 3: 10, 6: 12, 7: 11, 8: 12, 9: 15 };
  r.forEach((x, i) => { x.cc = [String(c1[i]), c2[i] != null ? String(c2[i]) : '']; });
  S.data['info:S1'] = r;
}

// met à niveau les anciennes sauvegardes : clés sans licence, notes c1/c2, matières sans leurs options
function migrate() {
  if (!LIC[S.lic]) S.lic = 'info';
  if (!(S.ncc >= 1)) S.ncc = 2;
  for (const k of Object.keys(S.data)) if (!k.includes(':')) { S.data['info:' + k] = S.data[k]; delete S.data[k]; }
  for (const [k, list] of Object.entries(S.data)) {
    const [lic, sem] = k.split(':'), pre = LIC[lic] && LIC[lic].P[sem] ? LIC[lic].P[sem][1] : [];
    for (const r of list) {
      if (!Array.isArray(r.cc)) { r.cc = [r.c1 ?? '', r.c2 ?? '']; delete r.c1; delete r.c2; }
      if (!r.o) { const m = pre.find(x => x[1] === r.n && x[3]); if (m) r.o = m[3]; }
    }
  }
}
migrate();

const dkey = (sem = S.sem) => S.lic + ':' + sem;
const rowsOf = sem => S.data[dkey(sem)] || (S.data[dkey(sem)] = fresh(sem));
const rows = () => rowsOf(S.sem);
// page affichée ; sur l'accueil : licence choisie pendant cette visite ? semestre coché ? (rien de pré-choisi à l'arrivée)
let view = 'welcome', licPicked = false, pick = null;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* stockage plein ou bloqué */ } };

/* ---------- 3. nombres ---------- */

// note saisie → nombre entre 0 et 20 ; null si vide, NaN si invalide (« 21 », « abc »)
const num = v => {
  if (v == null || String(v).trim() === '') return null;
  const x = parseFloat(String(v).replace(',', '.'));
  return isFinite(x) && x >= 0 && x <= 20 ? x : NaN;
};
const ok = x => x != null && !isNaN(x);
// pas d'arrondi : valeur exacte jusqu'à 3 décimales (9,875), au-delà on coupe sans arrondir (9,333…)
const milli = x => Math.round(x * 1e9) / 1e6;   // x × 1000, débarrassé du bruit des flottants
const fmt = x => (Math.trunc(milli(x)) / 1000).toFixed(3).replace('.', ',').replace(/(,\d*?)0+$/, '$1').replace(/,$/, '');
// note à viser : jamais affichée en dessous de la vraie valeur
const ceil = x => Math.ceil(milli(x)) / 1000;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ects = r => Math.max(+String(r.e).replace(',', '.') || 0, 0);

/* ---------- 4. calcul ---------- */

// une matière a N notes (N = 1 : une seule note), chacune avec un pourcentage
const MAXCC = 6;
const K = r => Math.min(MAXCC, Math.max(1, +(r.k ?? S.ncc) || 2));
const ccs = r => { const a = (r.cc || []).slice(0, K(r)); while (a.length < K(r)) a.push(''); return a; };
// pourcentage de chaque note : la valeur saisie ; les cases vides se partagent le reste jusqu'à 100 %.
// les poids sont ensuite ramenés à leur total (60 + 30 = 90 → 66,7 % / 33,3 %)
const wts = r => {
  const k = K(r);
  const raw = Array.from({ length: k }, (_, j) => {
    const x = r.w ? parseFloat(String(r.w[j] ?? '').replace(',', '.')) : NaN;
    return isFinite(x) && x >= 0 && x <= 100 ? x : null;
  });
  const set = raw.filter(x => x != null), free = k - set.length;
  const rest = free ? Math.max(0, 100 - set.reduce((s, x) => s + x, 0)) / free : 0;
  const w = raw.map(x => x ?? rest);
  return w.some(x => x > 0) ? w : w.map(() => 100 / k);   // tout à 0 : parts égales
};

// prépare une matière une seule fois pour tous les calculs : notes, poids, moyenne des CC (null s'il en manque)
function prep(r) {
  const v = ccs(r).map(num), w = wts(r), T = w.reduce((s, x) => s + x, 0);
  let m = 0;
  for (let j = 0; j < v.length; j++) {
    if (!w[j]) continue;                         // une note à 0 % ne compte pas, même vide
    if (!ok(v[j])) { m = null; break; }
    m += w[j] * v[j];
  }
  return { r, e: ects(r), v, w, T, m: m == null ? null : m / T };
}
const ccAvg = r => prep(r).m;

// note de la matière avec un rattrapage ra, selon la règle choisie dans « règles de calcul »
function withRa(p, ra) {
  const { m, v, w, T } = p;
  if (!ok(ra) || m == null) return m;
  if (S.rule === 'moy3') {                       // moyenne des CC et du rattrapage : il pèse comme une note moyenne
    const wb = T / w.filter(x => x > 0).length;
    return (m * T + wb * ra) / (T + wb);
  }
  if (S.rule === 'cc') {                         // remplace le CC le plus faible, qui garde son pourcentage
    const lo = v.reduce((a, x, j) => (w[j] > 0 && (a < 0 || x < v[a]) ? j : a), -1);
    return m + w[lo] * (ra - v[lo]) / T;
  }
  return Math.max(m, ra);                        // garde le rattrapage s'il est meilleur
}
const rated = (r, ra) => withRa(prep(r), ra);

/* calcule un bloc (liste de matières) et renvoie :
 *   phase 1 : il reste des CC à passer → inconnues = CC vides
 *   phase 2 : tous les CC sont là → si pas validé, inconnues = rattrapages des matières repassées
 *   need : note à avoir sur chaque inconnue pour que le bloc ait 10 (0 = déjà bon, 21 = impossible)
 *   cur : moyenne actuelle · fin : moyenne finale quand il n'y a plus d'inconnue
 *   f(x) : moyenne du bloc si on a x partout · inR(r) : la matière est-elle repassée ? */
function calc(list) {
  const L = list.filter(r => ects(r) > 0 && !r.va).map(prep);   // matière validée ou à 0 ECTS = hors calcul
  const E = L.reduce((s, p) => s + p.e, 0), T0 = 10 - 1e-9;
  const o = { E, phase: 1, n: 0, need: null, cur: null, fin: null, valid: false, miss: new Set(), inR: () => false, f: () => 0 };
  if (!E) return o;
  if (L.some(p => p.m == null)) {
    // phase 1 : la moyenne est linéaire en x, Kn = points acquis, U = poids des CC vides
    let Kn = 0, U = 0;
    for (const p of L) p.v.forEach((y, i) => {
      if (!p.w[i]) return;
      const f = p.w[i] / p.T;
      if (ok(y)) Kn += p.e * f * y;
      else { U += p.e * f; o.n++; o.miss.add(p.v.length === 1 ? 'note' : 'CC' + (i + 1)); }
    });
    o.cur = E - U > 1e-9 ? Kn / (E - U) : null;
    o.f = x => (Kn + U * x) / E;
  } else {
    o.phase = 2;
    const base = L.reduce((s, p) => s + p.e * withRa(p, num(p.r.ra)), 0) / E;
    o.cur = base;
    if (base >= T0) { o.valid = true; o.fin = base; return o; }
    // repassée : pas encore de note de rattrapage, et cochée (ou, par défaut, moyenne des CC sous 10)
    o.inR = r => ects(r) > 0 && !r.va && !ok(num(r.ra)) && ccAvg(r) != null && (r.rt != null ? r.rt : ccAvg(r) < 10);
    const R = L.filter(p => o.inR(p.r));
    o.n = R.length;
    const fixed = L.filter(p => !o.inR(p.r)).reduce((s, p) => s + p.e * withRa(p, num(p.r.ra)), 0);
    o.f = x => (fixed + R.reduce((s, p) => s + p.e * withRa(p, x), 0)) / E;
  }
  if (!o.n) { o.fin = o.f(0); o.valid = o.fin >= T0; return o; }
  if (o.f(0) >= T0) o.need = 0;
  else if (o.f(20) < T0) o.need = 21;
  else {
    // f est croissante : on cherche la plus petite note qui donne 10, par dichotomie
    // (en phase 2 la règle « garde le meilleur » n'est pas linéaire)
    let lo = 0, hi = 20;
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (o.f(m) >= T0) hi = m; else lo = m; }
    o.need = hi;
  }
  return o;
}
const grp = list => { const g = {}; for (const r of list) (g[r.b] = g[r.b] || []).push(r); return g; };
// épreuve visée : « au CC2 », « à l'examen », « aux épreuves restantes », « au rattrapage »
const epl = R => R.phase === 2 ? 'au rattrapage'
  : R.miss.size === 1 ? ([...R.miss][0] === 'note' ? 'à l’examen' : 'au ' + [...R.miss][0]) : 'aux épreuves restantes';
// compensation annuelle : S1+S2, S3+S4, S5+S6 (si l'autre semestre existe dans la licence)
const partner = () => { const n = +S.sem.slice(1), k = 'S' + (n % 2 ? n + 1 : n - 1); return P()[k] ? k : null; };
const annualOn = () => !!(S.annual && partner());
const pool = () => (annualOn() ? rows().concat(rowsOf(partner())) : rows());

/* ---------- 5. affichage ---------- */

// accueil : menu des licences, grille des semestres, bouton calculer
function welcome() {
  $('licSel').innerHTML = (licPicked ? '' : '<option value="" selected disabled>choisis ta licence…</option>')
    + GROUPS.map(([g, ks]) => `<optgroup label="${esc(g)}">${ks.filter(k => LIC[k])
      .map(k => `<option value="${k}"${licPicked && k === S.lic ? ' selected' : ''}>${esc(LIC[k].n)}</option>`).join('')}</optgroup>`).join('');
  if (pick && !P()[pick]) pick = null;
  $('calcBtn').disabled = !pick;
  $('calcBtn').textContent = pick ? `calculer mon ${P()[pick][0].split(' · ')[1]} →` : licPicked ? 'choisis un semestre' : 'choisis ta licence';
  if (!licPicked) { $('semGrid').innerHTML = '<p class="hint">choisis d’abord ta licence.</p>'; return; }
  const yrs = {};
  for (const k of Object.keys(P())) { const y = P()[k][0].split(' · ')[0]; (yrs[y] = yrs[y] || []).push(k); }
  const col = { L1: 'var(--teal)', L2: 'var(--lav)', L3: 'var(--pink)' };
  $('semGrid').innerHTML = Object.entries(yrs).map(([y, ks]) => `<div class="yr"><b>${y}</b>${ks.map(k => {
    const n = (S.data[S.lic + ':' + k] || P()[k][1]).length;
    return `<button class="go" role="radio" data-go="${k}" style="--c:${col[y] || 'var(--yellow)'}" aria-checked="${k === pick}">${P()[k][0].split(' · ')[1]}<small>${n ? n + ' matières' : 'à remplir'}</small></button>`;
  }).join('')}</div>`).join('');
}

// lien « une erreur dans la maquette ? » : issue GitHub pré-remplie
function bugHref() {
  const lic = LIC[S.lic].n, sem = P()[S.sem] ? P()[S.sem][0] : S.sem;
  const body = `Licence : ${lic}\nSemestre : ${sem}\n\nCe qui est faux (matière, ECTS, bloc…) :\n\n\nCe qu'il faudrait (avec la source si possible) :\n`;
  return 'https://github.com/MoneyFo/tupasse/issues/new?title=' + encodeURIComponent(`Erreur de maquette : ${lic} · ${sem}`) + '&body=' + encodeURIComponent(body);
}

// reconstruit toute la page (après un clic) ; les saisies, elles, ne lancent que update()
function render() {
  document.body.dataset.view = view;
  if (view === 'welcome') { welcome(); return; }
  const [yr, se] = P()[S.sem][0].split(' · ');
  $('licName').textContent = LIC[S.lic].n;
  $('semPill').textContent = `${yr} · semestre ${se.slice(1)}`;
  document.querySelectorAll('[data-rule]').forEach(b => b.setAttribute('aria-pressed', b.dataset.rule === S.rule));
  const pa = partner();
  $('annRule').hidden = !pa;
  if (pa) {
    $('annYes').textContent = `oui : ${[S.sem, pa].sort().join(' + ')}`;
    document.querySelectorAll('[data-ann]').forEach(b => b.setAttribute('aria-pressed', (b.dataset.ann === '1') === !!S.annual));
  }
  $('nccVal').textContent = S.ncc;
  $('editBtn').classList.toggle('on', S.edit);
  $('editBtn').textContent = S.edit ? 'terminer' : 'modifier la maquette';
  $('sample').hidden = !(S.sample && S.lic === 'info' && S.sem === 'S1');
  $('bugLink').href = bugHref();
  const g = {};
  rows().forEach((r, i) => (g[r.b] = g[r.b] || []).push([r, i]));   // i : position de la matière, pour les événements
  let h = order().map((k, bi) => {
    const { code, name, col, ico } = BI(k), it = g[k] || [];
    return `<section class="bloc ${bi === 0 ? 'main' : ''}" data-b="${esc(k)}"><div class="bh"><span class="ib" style="background:${col}"><svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ico}</svg></span>
      <div><h2>${esc(code)} · ${esc(name)}</h2><small data-tot="${esc(k)}"></small></div><span class="need" data-bneed="${esc(k)}"></span></div>
      ${it.map(([r, i]) => S.edit ? editRowHTML(r, i) : rowHTML(r, i)).join('')}
      ${S.edit ? `<button class="add" data-act="add">+ ajouter une matière</button>` : ''}</section>`;
  }).join('');
  if (S.edit) h += `<button class="btn cor" data-act="reset">remettre la maquette d'origine</button>`;
  $('list').innerHTML = h;
  document.querySelectorAll('#list .in').forEach(check);
  update();
}

// matière en mode « modifier la maquette » : nom, ECTS, supprimer
const editRowHTML = (r, i) => `<div class="row edit-row" data-i="${i}"><input class="in wide" data-f="n" value="${esc(r.n)}" aria-label="nom de la matière"><input class="in sm" data-f="e" inputmode="decimal" value="${esc(r.e)}" aria-label="ects"><button class="mini" data-act="del" aria-label="supprimer">×</button></div>`;

// matière en mode normal : nom et réglages en haut, notes en dessous, option à choisir tout en bas
function rowHTML(r, i) {
  const k = K(r), v = ccs(r), nm = j => (k === 1 ? 'note' : 'cc' + (j + 1));
  const opt = r.o ? `<label class="optw">ton option <select class="opt" data-f="oc"><option value="">à choisir…</option>${r.o.map(o => `<option${o === r.oc ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>` : '';
  const sel = `<select class="in nk" data-f="k" aria-label="nombre d'épreuves">${Array.from({ length: MAXCC }, (_, n) => n + 1).map(n => `<option value="${n}"${n === k ? ' selected' : ''}>${n === 1 ? '1 note' : n + ' CC'}</option>`).join('')}</select>`;
  const notes = v.map((x, j) => `<div class="f"><span>${nm(j)}</span><input class="in" data-f="cc" data-j="${j}" inputmode="decimal" placeholder="?" value="${esc(x)}" aria-label="${nm(j)}">${r.pw && k > 1 ? `<span class="pct-wrap"><input class="in pct" data-f="w" data-j="${j}" inputmode="decimal" placeholder="${fmt(100 / k)}" value="${esc((r.w || [])[j] ?? '')}" aria-label="pourcentage de ${nm(j)}">%</span>` : ''}</div>`).join('')
    + `<label class="f ra">rattrapage<input class="in" data-f="ra" inputmode="decimal" placeholder="—" value="${esc(r.ra)}"></label>`;
  const tools = r.va ? '' : sel
    + (k > 1 ? `<button class="mini pw" data-act="pw" aria-pressed="${!!r.pw}" title="modifier le pourcentage de chaque note">${r.pw ? '✓ %' : '%'}</button>` : '')
    + '<button class="mini" data-act="rt" hidden>rattrapage ?</button>';
  return `<div class="row${r.va ? ' acq' : ''}" data-i="${i}">
    <div class="rhead"><div class="nm">${esc(r.n)}</div><div class="meta"><span class="ects">${fmt(ects(r))} ects</span><span data-chip></span></div></div>
    <div class="rtools">${tools}
      <button class="mini va" data-act="va" aria-pressed="${!!r.va}" title="matière déjà validée (redoublement)">${r.va ? '✓ validée' : 'validée ?'}</button></div>
    ${r.va ? '' : `<div class="notes">${notes}</div>`}${r.pw && !r.va && k > 1 ? '<p class="pw-hint" data-pwhint></p>' : ''}${opt}</div>`;
}

// encadre en corail une saisie hors limites (note > 20, % > 100, ECTS > 60)
function check(el) {
  const f = el.dataset.f;
  if (f === 'n' || f === 'k' || f === 'oc') return;
  const v = el.value, x = parseFloat(String(v).replace(',', '.'));
  el.classList.toggle('bad', v.trim() !== '' && !(isFinite(x) && x >= 0 && x <= (f === 'e' ? 60 : f === 'w' ? 100 : 20)));
}

// statut court d'un bloc, pour les en-têtes et la liste de la carte
const short = p => !p.E ? 'acquis' : p.valid ? 'validé' : p.need == null ? (p.phase === 2 ? 'à rattraper' : '–')
  : p.need <= 0 ? 'déjà ok' : p.need > 20 ? '&gt; 20' : `vise ${fmt(ceil(p.need))}${p.phase === 2 ? ' (ratt.)' : ''}`;

// met à jour les chiffres sans reconstruire la page (appelé à chaque saisie)
function update() {
  const ann = annualOn(), ord = order(), gA = grp(pool()), gS = grp(rows()), per = {}, perS = {};
  for (const k in gA) per[k] = calc(gA[k]);    // calcul utilisé partout (sur l'année si l'option est cochée)
  for (const k in gS) perS[k] = calc(gS[k]);   // calcul du semestre seul, pour les en-têtes de bloc
  for (const k of ord) {
    const t = document.querySelector(`[data-tot="${CSS.escape(k)}"]`), p = perS[k], a = per[k];
    if (t && p) t.textContent = `${fmt((gS[k] || []).reduce((s, r) => s + ects(r), 0))} ects`
      + (p.cur != null ? ` · moyenne ${fmt(p.cur)}` : '') + (ann && a && a.cur != null ? ` · année ${fmt(a.cur)}` : '');
    const n = document.querySelector(`[data-bneed="${CSS.escape(k)}"]`);
    if (n) n.innerHTML = a && !S.edit && (a.valid || !a.E) ? `<span class="tag t">${short(a)}</span>` : '';
  }
  // pastille de chaque matière (= note), bouton « rattrapage ? », total des pourcentages
  document.querySelectorAll('#list .row[data-i]').forEach(el => {
    const r = rows()[el.dataset.i], c = el.querySelector('[data-chip]'), bt = el.querySelector('[data-act=rt]');
    if (!c) return;                                                  // ligne du mode édition
    if (r.va) { c.innerHTML = '<span class="tag t">acquise · hors calcul</span>'; return; }
    if (!ects(r)) { c.innerHTML = '<span class="tag">0 ects · hors calcul</span>'; return; }
    const hint = el.querySelector('[data-pwhint]');
    if (hint) {
      const w = wts(r), t = w.reduce((s, x) => s + x, 0), is100 = Math.abs(t - 100) < 1e-6;
      el.querySelectorAll('[data-f=w]').forEach(x => { x.placeholder = fmt(w[+x.dataset.j]); });
      hint.textContent = is100 ? 'total : 100 %' : `total : ${fmt(t)} % · les pourcentages sont ramenés à 100 %`;
      hint.classList.toggle('warn', !is100);
    }
    const G = per[r.b], avg = ccAvg(r);
    if (G.phase === 1) c.innerHTML = avg == null ? '' : `<span class="tag">= ${fmt(avg)}</span>`;
    else if (G.inR(r)) c.innerHTML = '';
    else { const m = rated(r, num(r.ra)); c.innerHTML = `<span class="tag ${m < 10 ? 'p' : ''}">= ${fmt(m)}</span>`; }
    if (bt) {
      bt.hidden = !(G.phase === 2 && !G.valid && !ok(num(r.ra)) && avg != null);
      bt.setAttribute('aria-pressed', G.inR(r));
      bt.textContent = G.inR(r) ? '✓ rattrapage' : 'rattrapage ?';
    }
  });
  // carte résultat : le bloc le plus serré (pas validé, note à viser la plus haute)
  let R = null, which = '', w = null;
  for (const k in per) {
    const p = per[k];
    if (!p.E) continue;
    const sc = p.valid ? -99 : p.need == null ? 99 : p.need;
    if (!w || sc > w.s) w = { s: sc, k };
  }
  if (w) { R = per[w.k]; which = w.k; }
  const yr = ann ? ` sur l’année (${[S.sem, partner()].sort().join(' + ')})` : '';
  const pre = (ann ? 'année · ' : '') + (which ? `bloc ${BI(which).code} · ` : ''), ep = R ? epl(R) : '';
  let s = '', big = '–', sub = '', lbl = pre + 'note à viser ' + ep;   // s : couleur de la carte selon l'effort
  if (!R) { s = 'done'; lbl = 'note à viser'; sub = rows().length ? 'toutes les matières sont déjà validées.' : 'ajoute tes matières et leurs ects pour commencer.'; }
  else if (R.valid) { s = 'ok'; lbl = (ann ? 'année · ' : '') + 'tous les blocs'; big = 'validé'; sub = 'chaque bloc a déjà 10 de moyenne' + yr + (R.phase === 2 ? ', pas besoin de rattrapage.' : '.'); }
  else if (R.need == null) { s = 'no'; lbl = pre + 'moyenne après les CC'; big = fmt(R.fin) + '<small>/20</small>'; sub = `il manque ${fmt(10 - R.fin)} point(s) à ce bloc${yr}. appuie sur « rattrapage ? » pour les matières que tu passes au rattrapage.`; }
  else if (R.need <= 0) { s = 'ok'; big = '0<small>/20</small>'; sub = `même avec 0 ${ep}, tous tes blocs sont à 10${yr}.`; }
  else if (R.need > 20) {
    s = 'no'; big = '&gt;20';
    sub = R.phase === 1 ? `même avec 20 ${ep}, ce bloc plafonne à ${fmt(R.f(20))}${yr}. il restera le rattrapage.`
      : `même avec 20 au rattrapage sur ces ${R.n} matière(s), ce bloc plafonne à ${fmt(R.f(20))}${yr}. ajoute des matières à repasser.`;
  } else {
    const n = ceil(R.need);
    s = n <= 10 ? '' : n <= 14 ? 'mid' : 'hard';
    big = fmt(n) + '<small>/20</small>';
    sub = (R.phase === 1 ? `sur chacune des ${R.n} épreuves qui restent dans ce bloc` : `sur chacune des ${R.n} matière(s) repassée(s) de ce bloc`)
      + `${yr}, pour qu’il ait 10. c’est le bloc le plus serré.`;
  }
  const card = $('card');
  card.dataset.s = s;
  $('lbl').textContent = lbl;
  $('big').innerHTML = big;
  $('big').classList.toggle('long', big.replace(/<small>.*$/, '').length > 4);   // 3 décimales : chiffre plus petit
  $('sub').textContent = sub;
  // liste des blocs sous le grand chiffre (y compris ceux du semestre jumeau en mode annuel)
  $('bl').innerHTML = ord.concat(Object.keys(per).filter(k => !ord.includes(k))).filter(k => per[k]).map(k => {
    const p = per[k], bi = BI(k);
    return `<div><span class="bk" style="--c:${bi.col}">${esc(bi.code)}</span><span class="bm">${p.cur != null ? (ann ? 'moyenne annuelle ' : 'moyenne ') + fmt(p.cur) : p.E ? 'pas encore de note' : 'matières acquises'}</span><span class="bs">${short(p)}</span></div>`;
  }).join('');
}

/* ---------- 6. sauvegarde par code, thème ---------- */

// code = « tupasse: » + JSON en base64 (unescape/escape : passage UTF-8 ↔ binaire pour btoa/atob)
const enc = o => 'tupasse:' + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const ioFill = () => { $('ioOut').value = enc({ v: 3, lic: S.lic, sem: S.sem, rule: S.rule, ncc: S.ncc, annual: S.annual, data: S.data }); $('ioMsg').textContent = ''; };

// lit un code collé par l'utilisateur ; renvoie des données propres, ou null si le code est abîmé.
// rien n'est modifié tant que tout le code n'a pas été vérifié (sinon un code faux effacerait les notes)
function readSave(code) {
  let o;
  try { o = JSON.parse(decodeURIComponent(escape(atob(String(code).trim().replace(/^tupasse:/, '').replace(/\s+/g, ''))))); }
  catch (e) { return null; }
  if (!o || typeof o.data !== 'object' || Array.isArray(o.data)) return null;
  const str = x => (x == null ? '' : String(x));
  const strs = a => (Array.isArray(a) ? a.slice(0, MAXCC).map(str) : undefined);
  const data = {};
  for (const [key, list] of Object.entries(o.data)) {
    if (!/^[\w-]+:S\d$/.test(key) || !Array.isArray(list)) return null;
    data[key] = [];
    for (const r of list) {
      if (!r || typeof r !== 'object' || typeof r.b !== 'string' || typeof r.n !== 'string') return null;
      const row = { b: r.b, n: r.n, e: str(r.e), cc: strs(r.cc) || [str(r.c1), str(r.c2)], ra: str(r.ra),
        rt: typeof r.rt === 'boolean' ? r.rt : null, va: !!r.va };
      if (Number.isInteger(r.k) && r.k >= 1 && r.k <= MAXCC) row.k = r.k;
      if (Array.isArray(r.w)) row.w = strs(r.w);
      if (r.pw) row.pw = true;
      if (Array.isArray(r.o)) row.o = r.o.map(str);
      if (r.oc != null) row.oc = str(r.oc);
      data[key].push(row);
    }
  }
  return {
    data,
    rule: ['max', 'cc', 'moy3'].includes(o.rule) ? o.rule : 'max',
    ncc: Number.isInteger(o.ncc) && o.ncc >= 1 && o.ncc <= MAXCC ? o.ncc : 2,
    annual: !!o.annual,
  };
}

// thème : auto (suit le téléphone), clair, sombre ; mémorisé dans le navigateur
const THEMES = ['auto', 'clair', 'sombre'], TV = { clair: 'light', sombre: 'dark' };
let theme = 'auto';
try { theme = { light: 'clair', dark: 'sombre' }[localStorage.getItem('tupasse-theme')] || 'auto'; } catch (e) { /* pas de stockage */ }
function applyTheme() {
  if (TV[theme]) document.documentElement.dataset.theme = TV[theme]; else delete document.documentElement.dataset.theme;
  $('themeBtn').textContent = 'thème : ' + theme;
  try { if (TV[theme]) localStorage.setItem('tupasse-theme', TV[theme]); else localStorage.removeItem('tupasse-theme'); } catch (e) { /* pas de stockage */ }
}

/* ---------- 7. événements ---------- */

// un seul écouteur pour tous les boutons ; à la fin : enregistrer puis tout redessiner
document.addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t) return;
  // actions qui ne touchent pas aux notes
  if (t.dataset.go) { pick = t.dataset.go; welcome(); return; }
  if (t.id === 'themeBtn') { theme = THEMES[(THEMES.indexOf(theme) + 1) % 3]; applyTheme(); return; }
  if (t.id === 'ioBtn') { const o = $('io').hidden; $('io').hidden = !o; t.setAttribute('aria-expanded', o); if (o) ioFill(); return; }
  if (t.id === 'ioCopy') {
    navigator.clipboard.writeText($('ioOut').value).then(
      () => { $('ioMsg').textContent = 'code copié ✓'; },
      () => { $('ioOut').select(); $('ioMsg').textContent = 'sélectionne le code et copie-le (Ctrl/Cmd + C).'; });
    return;
  }
  if (t.id === 'ioLoad') {
    const o = readSave($('ioIn').value);
    if (!o) { $('ioMsg').textContent = 'ce code ne marche pas : vérifie que tu l’as copié en entier.'; return; }
    Object.assign(S, o, { sample: false });
    migrate(); save(); render(); ioFill();
    $('ioIn').value = ''; $('ioMsg').textContent = 'notes restaurées ✓';
    return;
  }
  // actions qui changent l'état
  if (t.id === 'calcBtn') { if (!pick) return; S.sem = pick; view = 'app'; S.edit = !rows().length; window.scrollTo(0, 0); }
  else if (t.id === 'licBtn') { view = 'welcome'; licPicked = true; pick = null; window.scrollTo(0, 0); }   // on garde la licence, on re-choisit le semestre
  else if (t.dataset.rule) S.rule = t.dataset.rule;
  else if (t.dataset.ann) S.annual = t.dataset.ann === '1';
  else if (t.id === 'nccMinus' || t.id === 'nccPlus') S.ncc = Math.min(MAXCC, Math.max(1, S.ncc + (t.id === 'nccPlus' ? 1 : -1)));
  else if (t.id === 'editBtn') S.edit = !S.edit;
  else if (t.id === 'clearBtn') { rows().forEach(r => { r.cc = []; r.ra = ''; r.rt = null; }); S.sample = false; }
  else if (t.dataset.act) {
    const a = t.dataset.act, row = t.closest('[data-i]'), r = row ? rows()[+row.dataset.i] : null;
    if (a === 'rt') r.rt = t.getAttribute('aria-pressed') !== 'true';
    else if (a === 'pw') { r.pw = !r.pw; if (!r.pw) delete r.w; }      // décocher « % » = retour aux parts égales
    else if (a === 'va') r.va = !r.va;
    else if (a === 'del') rows().splice(+row.dataset.i, 1);
    else if (a === 'add') rows().push({ b: t.closest('[data-b]').dataset.b, n: 'nouvelle matière', e: 2, cc: [], ra: '', rt: null, va: false });
    else if (a === 'reset') S.data[dkey()] = fresh(S.sem);
    else return;
  } else return;
  save();
  render();
});

// saisies dans la liste des matières : on enregistre et on recalcule sans redessiner (le curseur reste en place)
function onField(e) {
  const el = e.target, row = el.closest('[data-i]'), f = el.dataset.f;
  if (!row || !f) return;
  const r = rows()[+row.dataset.i], j = +el.dataset.j;
  const setAt = (key, v) => { const a = (r[key] || []).slice(); while (a.length <= j) a.push(''); a[j] = v; r[key] = a; };
  if (f === 'cc') setAt('cc', el.value);
  else if (f === 'w') setAt('w', el.value);
  else if (f === 'k') { r.k = +el.value; delete r.w; save(); render(); return; }   // autre nombre de CC : nouvelles cases
  else if (f === 'oc') { r.oc = el.value; save(); return; }                       // l'option ne change pas le calcul
  else r[f] = el.value;
  check(el);
  save();
  update();
}
$('list').addEventListener('input', onField);
$('licSel').addEventListener('change', e => { S.lic = e.target.value; licPicked = true; pick = null; save(); welcome(); });
applyTheme();
render();
