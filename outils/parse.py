"""Étape 1/2 : extrait les matières (bloc, nom, ECTS, options) des maquettes UPF.

Utilisation :
    pdftotext -layout "LICENCE Maths 2024-2028.pdf"      (un .txt par maquette, dans un même dossier)
    python3 outils/parse.py DOSSIER_DES_TXT              → écrit DOSSIER_DES_TXT/parsed.json
puis python3 outils/build.py DOSSIER_DES_TXT (étape 2).

Méthode : pdftotext garde la mise en colonnes. On repère dans l'en-tête de chaque page la position
des colonnes « Heures » et « ECTS » ; sur chaque ligne de matière (code « 1.4 »), le nom est le texte
à gauche de « Heures » et les ECTS sont le nombre aligné sous « ECTS ».
Le rapport affiché signale les semestres dont le total ou un bloc ne colle pas (« !! ») : à corriger dans build.py."""
import re, json, glob, os, sys

# ligne de matière : « 1.4 Nom… » (option : « 2.6.a », « 4.6a »), parfois précédée de « SEMESTRE 1 »
code_re = re.compile(r'^(\s*(?:SEMESTRE\s*\d+\s+)?)(\d{1,2})\.(\d{1,2})([a-z.]*)(?=\s|$)')
# en-tête de bloc : « DS1 DS1 Compétences… », « ES 5 … », « TS1 / LS1 … » ; DS3A / DS3B en éco-gestion
bloc_re = re.compile(r'^\s*([A-Z]{2})\s?(\d{1,2})([A-Z]?)(?:\s*/\s*[A-Z]{2}\d{1,2})?(?:\s+\1\s?\2\3)?\s+(?=[A-ZÉa-zé])')
# un nombre isolé (« 31,5 », « 4 »), pas un morceau de code ou de mot
num_re = re.compile(r'(?<![\w.,])\d+(?:,\d+)?(?![\w.,])')
# un nom qui finit par ces mots continue sur la ligne suivante
CONT_END = re.compile(r'(\bet|\bde|\bdes|\bdu|\bla|\ble|\bles|\bà|\ben|\bau|\bpour|:|,|/|-|&|\()$', re.I)
# lignes de texte qui ne sont jamais des noms de matières
SKIP = ('SEMESTRE', 'Volume', 'TOTAL', 'DOMAINE', 'LICENCE', 'Mention', 'Parcours', 'NIVEAU', 'Bloc', 'CONTENU', 'compétences', '(h)', 'Auto', 'UE ', 'Heures', 'étudiants')

def parse(path):
    """Renvoie ({parcours: {semestre: [[bloc, nom, ects, options?], …]}}, [(parcours, sem, bloc, ects annoncés)])."""
    L = [l.replace('\f', '') for l in open(path, encoding='utf-8').read().split('\n')]
    out, checks = {}, []
    parc, bloc, hx, ex = '', None, 60, 140
    last = None  # dernière matière ajoutée (pour les noms sur 2 lignes)
    skip = -1
    owner = None
    owner_opts = {}

    def textonly(s):
        t = s.strip()
        return t and not any(x.start() >= hx - 8 for x in num_re.finditer(s)) and not code_re.match(s) and not bloc_re.match(s) and not t.startswith(SKIP)

    for i, line in enumerate(L):
        m = re.search(r'Parcours\s*:\s*(.*?)(?:\s{2,}|$)', line)
        if m:
            parc = m.group(1).strip()
        if 'ECTS' in line:
            ex = line.index('ECTS') + 4
        if 'Heures' in line:
            hx = line.index('Heures')
        bm = bloc_re.match(line)
        if bm:
            bloc = bm.group(1) + bm.group(3)
            nums = [(x.group(), x.end()) for x in num_re.finditer(line)]
            be = [n for n, e in nums if abs(e - ex) <= 5]
            checks.append((parc, int(bm.group(2)), bloc, be[-1] if be else None))
            last = None
            owner = None
            continue
        if i == skip:
            continue
        cm = code_re.match(line)
        if not cm or not bloc:
            if last is not None and textonly(line) and (CONT_END.search(last[1]) or line.strip()[:1].islower()):
                last[1] += ' ' + line.strip()
            continue
        sem, suf = int(cm.group(2)), cm.group(4)
        if suf:
            # option d'une matière à choix (2.6.a Sport, 5.8.b Re'o Mā'ohi ou…)
            if owner is not None:
                cut = [x.start() for x in num_re.finditer(line) if x.start() >= hx - 8]
                on = line[cm.end():cut[0] if cut else len(line)].strip()
                on = re.sub(r'\s*\*\s*', ' ', re.sub(r'\s+ou$', '', on)).strip()
                if on and 'facultati' not in on.lower():
                    owner_opts.setdefault(id(owner), (owner, []))[1].append(on)
            last = None
            continue
        rest_start = cm.end()
        toks = [(x.group(), x.start(), x.end()) for x in num_re.finditer(line) if x.start() >= rest_start]
        cols = [t for t in toks if t[1] >= hx - 8]
        name_end = cols[0][1] if cols else len(line)
        name = line[rest_start:name_end].strip()
        ects = [t[0] for t in cols if abs(t[2] - ex) <= 5]
        if not name:
            prev = ''
            for k in range(i - 1, max(i - 7, -1), -1):
                t = L[k].strip()
                if not t or t.startswith('SEMESTRE'):
                    continue
                prev = L[k] if textonly(L[k]) else ''
                break
            nxt = L[i + 1] if i + 1 < len(L) else ''
            parts = [prev.strip()] if prev else []
            if textonly(nxt) and (not prev or CONT_END.search(prev.strip()) or nxt.strip()[:1].islower()):
                parts.append(nxt.strip())
                skip = i + 1
            name = ' '.join(parts)
        name = re.sub(r'\s*\*\s*', ' ', re.sub(r'\s{2,}', ' ', name)).strip()
        if not ects and 'facultati' not in name.lower():
            # ECTS porté par une des options en dessous (2.6.a Sport ... 2)
            for j in range(i + 1, min(i + 5, len(L))):
                cj = code_re.match(L[j])
                if not cj or not cj.group(4):
                    break
                ej = [x.group() for x in num_re.finditer(L[j]) if abs(x.end() - ex) <= 5 and x.start() >= hx - 8]
                if ej:
                    ects = ej
                    break
        if 'facultati' in name.lower() or not ects:
            last = None
            owner = None
            continue
        e = float(ects[-1].replace(',', '.'))
        if e <= 0:
            last = None
            owner = None
            continue
        row = [bloc, name, e]
        out.setdefault(parc, {}).setdefault(sem, []).append(row)
        last = row
        owner = row
    for row, opts in owner_opts.values():
        if len(opts) >= 2:
            row.append(opts)
    return out, checks

def report(folder):
    """Analyse tous les .txt du dossier, affiche les contrôles et écrit parsed.json."""
    res = {}
    for f in sorted(glob.glob(os.path.join(folder, '*.txt'))):
        base = os.path.basename(f)[:-4]
        if base == 'orig_info':
            continue
        data, checks = parse(f)
        res[base] = data
        print('==', base)
        for parc, sems in data.items():
            for s, rows in sorted(sems.items()):
                tot = sum(r[2] for r in rows)
                byb = {}
                for b, _, e, *_ in rows:
                    byb[b] = byb.get(b, 0) + e
                exp = {c[2]: c[3] for c in checks if c[0] == parc and c[1] == s}
                bad = {b: (byb.get(b, 0), exp[b]) for b in exp if exp[b] and float(exp[b].replace(',', '.')) != byb.get(b, 0)}
                print(f'  [{parc[:30]}] S{s}: {len(rows)} mat, {tot:g} ects' + (f'  !! blocs {bad}' if bad else '') + ('' if tot == 30 else '  !! total'))
    json.dump(res, open(os.path.join(folder, 'parsed.json'), 'w'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('usage : python3 outils/parse.py DOSSIER_DES_TXT')
    report(sys.argv[1])
