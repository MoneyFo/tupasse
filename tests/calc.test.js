// Test des calculs de tupasse, sans navigateur ni dépendance : `node tests/calc.test.js`.
// Charge licences.js et script.js dans un faux DOM minimal, puis compare les résultats
// à des valeurs calculées à la main.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..');

// --- faux DOM : juste ce que script.js touche au chargement
const el = () => ({ innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, href: '', placeholder: '',
  dataset: {}, style: {}, classList: { toggle() {}, add() {}, remove() {} },
  setAttribute() {}, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], select() {}, closest: () => null });
const els = {};
const store = {};
const ctx = vm.createContext({
  document: { getElementById: id => els[id] || (els[id] = el()), querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, body: { dataset: {} }, documentElement: { dataset: {} } },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  window: { scrollTo() {} }, CSS: { escape: s => s }, navigator: {},
  btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'),
  escape, unescape, console,
});
for (const f of ['licences.js', 'script.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const run = code => vm.runInContext(code, ctx);

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg} : ${a} au lieu de ${b}`);
let n = 0;
const test = (name, fn) => { run(`S.data={};S.lic='info';S.sem='S1';S.rule='max';S.ncc=2;S.annual=false;`); fn(); n++; console.log('ok -', name); };
// notes d'exemple du S1 d'Informatique (les mêmes que celles pré-remplies sur le site)
const sample = `(()=>{const r=rows();const c1=[9,8,11,10,12,8,13,12,11,14],c2={1:7,3:10,6:12,7:11,8:12,9:15};
  r.forEach((x,i)=>{x.cc=[String(c1[i]),c2[i]!=null?String(c2[i]):'']})})()`;
const ds = () => run(`calc(grp(pool()).DS)`);

test('affichage sans arrondi', () => {
  assert.strictEqual(run(`fmt((8.5+11.25)/2)`), '9,875');
  assert.strictEqual(run(`fmt(28/3)`), '9,333');
  assert.strictEqual(run(`fmt(ceil(28/3))`), '9,334');
  assert.strictEqual(run(`fmt(10)`), '10');
});

test('note à viser au CC2 (exemple du S1)', () => {
  run(sample);
  near(ds().need, (220 - 147) / 6, 'DS');           // 12,1666…
});

test('1 note et 3 CC', () => {
  run(sample);
  run(`rows()[0].k=1;rows()[3].k=3`);
  near(ds().need, 12.5, 'DS');                       // (220-145)/6
});

test('pourcentages 60/40 et 25/65/(10)', () => {
  run(sample);
  run(`rows()[1].w=['60','40'];rows()[3].k=3;rows()[3].w=['25','65',''];rows()[3].cc=['10','10','']`);
  near(run(`ccAvg(rows()[1])`), 7.6, 'moyenne 8 (60 %) / 7 (40 %)');
  near(ds().need, (220 - 141.4) / 6.6, 'DS');        // 11,909…
});

test('compensation annuelle S1 + S2', () => {
  run(sample);
  run(`S.annual=true`);
  near(ds().need, (460 - 147) / 30, 'DS année');     // 10,4333…
});

test('règles de rattrapage avec pourcentages', () => {
  const r = `({k:2,cc:['8','14'],w:['60','40']})`;
  run(`S.rule='cc'`); near(run(`rated(${r},12)`), 12.8, 'remplace le CC le plus faible');
  run(`S.rule='moy3'`); near(run(`rated(${r},12)`), (10.4 * 100 + 50 * 12) / 150, 'moyenne des CC et du rattrapage');
  run(`S.rule='max'`); near(run(`rated(${r},12)`), 12, 'garde le meilleur');
  near(run(`rated(${r},9)`), 10.4, 'garde la moyenne des CC si elle est meilleure');
});

test('note à viser au rattrapage (phase 2)', () => {
  const v = [8, 7, 12, 9, 11, 8, 12, 12, 13, 14];
  run(`rows().forEach((x,i)=>{x.cc=[String(${JSON.stringify(v)}[i]),String(${JSON.stringify(v)}[i])]})`);
  const p = ds();
  assert.strictEqual(p.phase, 2);
  near(p.need, 29 / 3, 'DS, garde le meilleur');     // 9,6666…
});

test('matière validée hors calcul', () => {
  run(sample);
  run(`rows()[1].va=true`);
  near(ds().need, (180 - 117) / 6, 'DS sans la matière validée'); // 10,5
});

test('un code de restauration faux ne touche pas aux notes', () => {
  run(sample);
  const before = run(`JSON.stringify(S.data)`);
  const bad = 'tupasse:' + Buffer.from(JSON.stringify({ data: { 'info:S1': 'abc' } })).toString('base64');
  assert.strictEqual(run(`readSave(${JSON.stringify(bad)})`), null);
  assert.strictEqual(run(`JSON.stringify(S.data)`), before);
  const good = run(`enc({v:3,rule:'cc',ncc:3,annual:true,data:S.data})`);
  const o = run(`readSave(${JSON.stringify(good)})`);
  assert.ok(o && o.data['info:S1'].length === 10, 'un vrai code est accepté');
});

console.log(`\n${n} tests passés`);
