"""Étape 2/2 : construit licences.js à partir de parsed.json (étape 1, outils/parse.py),
des corrections relevées à la main dans les PDF, et des maquettes saisies à la main
(Économie-gestion, LLCER PPPE, licence pro ERME : leur mise en page ne se lit pas automatiquement).

Utilisation : python3 outils/build.py DOSSIER_DES_TXT     → réécrit licences.js à la racine du projet.
Informatique n'est pas relue depuis les PDF : on reprend celle du licences.js actuel (maquette 2025-2026).
À la fin, chaque semestre doit faire 30 ECTS ; sinon il est signalé « <-- total »."""
import json, os, re, sys

if len(sys.argv) != 2:
    sys.exit('usage : python3 outils/build.py DOSSIER_DES_TXT')
MAQ = sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'licences.js')
D = json.load(open(os.path.join(MAQ, 'parsed.json'), encoding='utf-8'))
_js = open(OUT, encoding='utf-8').read()
INFO = json.loads(_js[_js.index('{'):_js.rindex('}') + 1])['info']['P']
# lignes d'une année d'après le numéro de semestre
YEAR = {1: 'L1', 2: 'L1', 3: 'L2', 4: 'L2', 5: 'L3', 6: 'L3'}

def clean(n):
    """Nettoie un nom de matière lu dans le PDF (astérisques, mentions « au choix », restes de colonnes)."""
    n = re.sub(r'\s*\*\s*', ' ', n)
    n = re.sub(r'^Activités? d.ouverture.*$', "Activité d'ouverture", n)
    n = re.sub(r'\s*\((au choix|option obligatoire)\)\s*:?$', '', n)
    n = re.sub(r'\s*:$', '', n)
    n = re.sub(r'\s*\(l’UE « Sport ».*$', '', n)
    n = re.sub(r'\s+étudiants$', '', n)
    n = re.sub(r'\s+\d+(,\d+)?$', '', n) if re.search(r'\s(18|24|12|30|36)$', n) else n
    n = re.sub(r'\s+s$', '', n)
    n = re.sub(r'\s{2,}', ' ', n).strip()
    return n[:1].upper() + n[1:]

def opt(o):
    """Nom d'une option (« Sport OU » → « Sport »)."""
    o = re.sub(r'\s+(OU|ou)$', '', o.strip())
    return o[:1].upper() + o[1:]

def row(r):
    """Ligne de parsed.json → [bloc, nom, ects] (+ [options] pour une matière à choix)."""
    b, n, e = r[:3]
    out = [b, clean(n), e]
    if len(r) > 3:
        out.append([opt(o) for o in r[3]])
    return out

def sems(src):
    """{'5': lignes} → {'S5': ['L3 · S5', lignes nettoyées]}, le format de licences.js."""
    out = {}
    for k in sorted(src, key=int):
        out['S' + k] = [f'{YEAR[int(k)]} · S{k}', [row(r) for r in src[k]]]
    return out

def g(f, parc):
    """Semestres d'un parcours d'une maquette, tels que lus par parse.py."""
    return D[f][parc]

def insert_after(rows, after_name, row):
    """Ajoute une matière oubliée par l'extraction, juste après une matière donnée."""
    i = next(i for i, r in enumerate(rows) if r[1] == after_name)
    rows.insert(i + 1, row)

# L : toutes les licences, { id: {n: nom, P: semestres, blocs?: intitulés de blocs propres} }
L = {}
# options de l'activité d'ouverture (Informatique et Économie-gestion)
ACT = ['Sport', 'Transitions (en français ou en anglais)']
for k in ('S2', 'S4'):
    for r in INFO[k][1]:
        if r[1].startswith("Activité d'ouverture"):
            r[1] = "Activité d'ouverture"
            r[3:] = [ACT]
L['info'] = {'n': 'Licence Informatique', 'P': INFO}

# --- Droit
for key, parc, label in [('droit', 'Droit Général', 'Licence Droit · Droit général'), ('droit-exc', 'Excellence', 'Licence Droit · parcours Excellence')]:
    P = sems(g('LICENCE DG-DE 2024-2028', parc))
    for r in P['S4'][1]:
        if r[1] == 'Mises en situation':
            r[1] = 'Premiers contacts avec le monde professionnel et mises en situation'
    if key == 'droit-exc':
        insert_after(P['S3'][1], 'Droit pénal général', ['DS', 'Institutions européennes', 2])
    L[key] = {'n': label, 'P': P}

# --- Administration publique (L3 seulement)
P = sems(g('LICENCE AP 2024-2028', 'Compétences transversales'))
insert_after(P['S5'][1], "Préparation à l'entretien oral", ['LS', 'Anglais', 2])
L['ap'] = {'n': 'Licence Administration publique', 'P': P}

# --- Économie et gestion (saisie à la main)
def eco(minor):
    s5 = {'MCI': [5, 3, 3, 3, 3, 5, 3], 'CCA': [3, 3, 5, 5, 3, 3, 3]}[minor]
    s6 = {'MCI': [3, 3, 2, 3, 2, 4], 'CCA': [3, 3, 4, 3, 2, 2]}[minor]
    n5 = ['Marketing des services et du tourisme', 'Gestion des ressources humaines', 'Comptabilité approfondie et des sociétés',
          'Fiscalité des entreprises', 'Microéconomie avancée', "Stratégies d'entreprise", 'Simulations de gestion (multidisciplinaire)']
    n6 = ['Études de marché', 'Économie de la concurrence et de la réglementation', 'Analyse et gestion financière',
          "Management des systèmes d'information", 'Économie du développement', 'Special International Topics']
    return {
        'S1': ['L1 · S1', [['DS', 'Introduction à la microéconomie', 6], ['DS', 'Introduction à la gestion', 6], ["DS", "Histoire de l'économie et de la gestion", 4],
                           ['DS', 'Théorie des organisations', 6], ['TS', 'Introduction générale au droit', 5],
                           ['ES', 'Réflexion sur soi et sur son projet professionnel', 2], ['ES', 'Méthodologie de la recherche documentaire', 1]]],
        'S2': ['L1 · S2', [['DS', 'Comptabilité financière', 7], ['DS', 'Introduction à la macroéconomie', 7],
                           ['DS', "Mathématiques pour l'économie et la gestion 1", 6], ['DS', "Statistiques pour l'économie et la gestion", 6],
                           ['TS', "Activité d'ouverture", 2, ACT], ['LS', "Outils linguistiques pour l'économie et la gestion 1 : anglais", 2]]],
        'S3': ['L2 · S3', [['DSA', 'Marketing fondamental', 6], ['DSA', 'Contrôle de gestion et contrôle budgétaire', 6],
                           ['DSB', 'Microéconomie intermédiaire', 6], ['DSB', 'Macroéconomie intermédiaire', 6],
                           ['TS', 'Responsabilité sociétale des entreprises (RSE)', 2], ['TS', 'Droit des contrats et des sociétés', 2],
                           ['LS', "Outils linguistiques pour l'économie et la gestion 2 : anglais", 2]]],
        'S4': ['L2 · S4', [['DSA', 'Vente et négociation', 5], ['DSA', 'Management de la chaîne logistique globale', 5],
                           ['DSB', "Mathématiques et statistiques appliquées à l'économie et la gestion 2", 3], ['DSB', 'Économie internationale', 5],
                           ['TS', 'Expression écrite et certification Voltaire', 3], ['TS', 'Compétences numériques, bureautique et PIX', 3],
                           ['TS', "Activité d'ouverture", 2, ACT], ['LS', "Outils linguistiques pour l'économie et la gestion 3 : anglais", 2],
                           ['ES', 'Premiers contacts avec le monde professionnel et mises en situation', 2]]],
        'S5': ['L3 · S5', [['DS', n, e] for n, e in zip(n5, s5)] + [
                           ['TS', "Compétences rédactionnelles pour l'économie et la gestion", 2], ['LS', 'Anglais', 2],
                           ['ES', "Préparation à l'immersion en milieu professionnel", 1]]],
        'S6': ['L3 · S6', [['DS', n, e] for n, e in zip(n6, s6)] + [
                           ['TS', 'Droit du travail', 2], ['TS', 'Méthodologie de la recherche documentaire (économie et gestion)', 1],
                           ['TS', 'Transitions (en anglais)', 2], ['LS', 'Anglais', 2],
                           ['ES', 'Valorisation des compétences préprofessionnelles (stage de 10 semaines)', 6]]],
    }
EB = {'DSA': ['DS-A', 'compétences disciplinaires A'], 'DSB': ['DS-B', 'compétences disciplinaires B']}
L['eco-mci'] = {'n': 'Licence Économie et gestion · mineure MCI', 'P': eco('MCI'), 'blocs': EB}
L['eco-cca'] = {'n': 'Licence Économie et gestion · mineure CCA', 'P': eco('CCA'), 'blocs': EB}

# --- Lettres, sciences humaines, langues
L['geo'] = {'n': 'Licence Géographie et aménagement', 'P': sems(g('LICENCE Géographie -Aménagement 2024-2028', 'Compétences transversales'))}
L['histoire'] = {'n': 'Licence Histoire', 'P': sems(g('LICENCE Histoire 2024-2028', 'HISTOIRE'))}
L['lea-esp'] = {'n': 'Licence LEA · anglais-espagnol', 'P': sems(g('LICENCE LEA Anglais Espagnol 2024-2028', 'Anglais-Espagnol'))}
L['lea-man'] = {'n': 'Licence LEA · anglais-mandarin', 'P': sems(g('LICENCE LEA Anglais Mandarin 2024-2028', 'Anglais-Mandarin'))}
L['lettres'] = {'n': 'Licence Lettres · Lettres et arts', 'P': sems(g('LICENCE LETTRES- Lettres et Arts 2024-2028', 'Lettres et Arts'))}

src = dict(g('LICENCE LLCER-Anglais 2024-2028', 'Anglais (ANG)')); src.update(g('LICENCE LLCER-Anglais 2024-2028', 'Anglais'))
P = sems(src)
P['S5'][1].append(['LS', 'LVE', 2, ['Espagnol', 'Reo mā’ohi', 'Mandarin']])
P['S6'][1].append(['ES', 'Valorisation des compétences préprofessionnelles (stage)', 6])
L['llcer-ang'] = {'n': 'Licence LLCER Anglais', 'P': P}

P = sems(g('LICENCE-LLCER LP 2024-2028', 'Langues Polynésiennes'))
insert_after(P['S3'][1], 'Métiers de la transmission', ['ES', 'Métiers des arts et expression', 1])
P['S5'][1] = [['ES', 'Valorisation des compétences préprofessionnelles', 30, ["Mobilité ou stage à l'international", 'Deux stages de 5 semaines']]]
L['llcer-lp'] = {'n': 'Licence LLCER Langues polynésiennes', 'P': P}

# PPPE : lignes « LLC.LP-PE  1.01  Nom ... ECTS », blocs « PPPE.DS1 »
pppe, bloc = {}, None
for line in open(os.path.join(MAQ, 'LICENCE LLCER LP-PPPE 2024-2028.txt'), encoding='utf-8'):
    m = re.search(r'PPPE\.(DS|TS|LS|ES)(\d)', line)
    if m:
        bloc = m.group(1); continue
    m = re.match(r'^\s*LLC[.-]LP-PE\s+(\d)\.(\d\d)\s+(.*?)\s{2,}(.*)$', line)
    if m and bloc:
        nums = re.findall(r'\d+(?:,\d+)?', m.group(4))
        pppe.setdefault(m.group(1), []).append([bloc, m.group(3).strip(), float(nums[-1].replace(',', '.'))])
pppe['6'].insert(len(pppe['6']) - 1, ['ES', "Didactique (français, mathématiques et autres disciplines enseignées à l'école)", 0.5])
L['llcer-pppe'] = {'n': 'Licence LLCER Langues polynésiennes · parcours PPPE', 'P': sems(pppe)}

# --- Sciences
src = dict(g('LICENCE Maths 2024-2028', '')); src.update(g('LICENCE Maths 2024-2028', 'Mathématiques et gestion du risque'))
L['maths'] = {'n': 'Licence Mathématiques', 'P': sems(src)}
L['lspi'] = {'n': "Licence Sciences pour l'ingénieur", 'P': sems(g('LICENCE lspi 2024-2028', 'Sciences et techniques durables'))}

sv12 = g('LICENCE SV 2024-2028', 'Biologie-Chimie-Ecologie')
sv34 = g('LICENCE SV 2024-2028', 'Biologie-Chimie-Environnement')
s4 = sv34['4']
ds4 = [r for r in s4 if r[0] == 'DS']; rest4 = [r for r in s4 if r[0] != 'DS']
assert len(ds4) == 21
maj = {'bio': ds4[0:7], 'eco': ds4[7:14], 'chimie': ds4[14:21]}
for key, parc, m, label in [('sv-bio', 'Biologie', 'bio', 'Licence Sciences de la vie · Biologie'),
                            ('sv-chimie', 'Chimie', 'chimie', 'Licence Sciences de la vie · Chimie'),
                            ('sv-env', 'Environnement', 'eco', 'Licence Sciences de la vie · Environnement')]:
    src = {'1': sv12['1'], '2': sv12['2'], '3': sv34['3'], '4': maj[m] + rest4}
    src.update(g('LICENCE SV 2024-2028', parc))
    L[key] = {'n': label, 'P': sems(src)}

las = g('LICENCE SV accès santé 2024-2028', 'Accès santé (LAS)')
s2 = [['DS', 'Santé 2 (les UE de ta filière)', 15], ['DS', 'Structure spatiale des molécules', 3], ['DS', 'Énergie', 3],
      ['DS', 'Structure des végétaux', 3], ['LS', 'Anglais', 2], ['ES', 'Réflexion sur soi et sur son projet professionnel', 2],
      ['ES', 'Approches expérimentales', 2]]
L['las'] = {'n': 'Licence Sciences de la vie · accès santé (LAS)', 'P': sems({'1': las['1'], '2': s2})}

L['stes'] = {'n': 'Licence STES · Transitions en milieux multi-insulaires',
             'P': sems({**g('Maquette LICENCE STES 2024-2028', 'Transitions en Milieux Multi-Insulaires (TEMMI)'), **g('Maquette LICENCE STES 2024-2028', 'TEMMI')}),
             'blocs': {'DS': ['DS', 'apprendre pour comprendre'], 'TS': ['TS/LS', 'comprendre pour agir'], 'LS': ['LS', 'apprendre pour agir'], 'ES': ['ES', 'agir pour construire']}}

# --- Licence pro ERME : une UE = un bloc
erme, ue, names = {}, None, {}
for line in open(os.path.join(MAQ, 'LICENCE PRO ERME 2024-2028.txt'), encoding='utf-8'):
    m = re.match(r'^\s*ERME\s+(\d+)(?:\.(\d+))?\s+(.*?)\s{2,}(.*)$', line)
    if not m:
        continue
    nums = re.findall(r'\d+(?:,\d+)?', m.group(4)); e = float(nums[-1].replace(',', '.'))
    u = int(m.group(1)); sem = '5' if u <= 5 else '6'
    nm = re.sub(r'\s+', ' ', m.group(3)).strip()
    if m.group(2) is None:
        names['UE' + str(u)] = ['UE ' + str(u), nm[:1].lower() + nm[1:]]
        if u >= 9:   # UE sans sous-matières
            erme.setdefault(sem, []).append(['UE' + str(u), nm, e])
    else:
        erme.setdefault(sem, []).append(['UE' + str(u), nm, e])
names['UE7'][1] = 'ressources énergétiques renouvelables : évaluation et gestion'
names['UE9'][1] = 'projet tutoré'; names['UE10'][1] = 'stage'
for r in erme['6']:
    if r[0] == 'UE9': r[1] = 'Projet tutoré'
    if r[0] == 'UE10': r[1] = 'Stage (16 semaines)'
    if r[1].startswith('Evaluation des ENR'):
        r[1] = 'Évaluation des ENR : météorologie, ressources solaire, éolienne et hydrolienne'
L['erme'] = {'n': 'Licence pro ERME (énergies renouvelables)', 'P': sems(erme), 'blocs': names}

# --- contrôles
for k, v in L.items():
    for s, (lab, rows) in v['P'].items():
        t = sum(r[2] for r in rows)
        flag = '' if abs(t - 30) < 1e-9 else '  <-- total'
        if flag or k in ('erme',):
            print(k, s, t, flag)
print(len(L), 'licences')
js = 'const LICENCES=' + json.dumps(L, ensure_ascii=False, separators=(',', ':')) + ';\n'
js = js.replace('.0]', ']').replace('.0,', ',')
open(OUT, 'w', encoding='utf-8').write(
    '// maquettes UPF 2024-2028 (Informatique : maquette 2025-2026). généré par build.py\n' + js)
