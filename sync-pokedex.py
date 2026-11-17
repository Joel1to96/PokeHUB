"""Build the local GO catalogue. Usage: python sync-pokedex.py [--refresh].

Game values and availability: PvPoke; PvE snapshot: PokeMiners.
PokéAPI supplies names and artwork IDs, NEVER main-series battle stats.
"""
from pathlib import Path
from datetime import datetime, timezone
import csv, json, re, sys, urllib.request

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / '.pokedex-cache'
CACHE.mkdir(exist_ok=True)
URLS = {
    'gm.json': 'https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json',
    'timestamp.txt': 'https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/timestamp.txt',
    'pvpoke.json': 'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json',
    'Pokemon.js': 'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/js/pokemon/Pokemon.js',
    'pokemon.csv': 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon.csv',
    'names.csv': 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv',
    'moves.csv': 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/moves.csv',
    'move_names.csv': 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/move_names.csv',
    'pvpoke-license.txt': 'https://raw.githubusercontent.com/pvpoke/pvpoke/master/LICENSE',
}
for name, url in URLS.items():
    target = CACHE / name
    if '--refresh' in sys.argv or not target.exists():
        request = urllib.request.Request(url, headers={'User-Agent': 'PokeHUB catalogue builder'})
        target.write_bytes(urllib.request.urlopen(request, timeout=60).read())

def rows(name):
    return list(csv.DictReader((CACHE / name).read_text(encoding='utf-8-sig').splitlines()))

pvp = json.loads((CACHE / 'pvpoke.json').read_text(encoding='utf-8'))
gm = json.loads((CACHE / 'gm.json').read_text(encoding='utf-8'))
art = {r['identifier']: int(r['id']) for r in rows('pokemon.csv')}
names = {int(r['pokemon_species_id']): r['name'] for r in rows('names.csv') if r['local_language_id'] == '7'}
move_names = {r['move_id']: r['name'] for r in rows('move_names.csv') if r['local_language_id'] == '7'}
spanish_moves = {r['identifier'].replace('-', '_').upper(): move_names.get(r['id']) for r in rows('moves.csv')}
spanish_moves.update({'DYNAMAX_CANNON': 'Cañón Dinamax', 'BEHEMOTH_BLADE': 'Tajo Supremo', 'BEHEMOTH_BASH': 'Embate Supremo', 'RETURN': 'Retribución', 'FRUSTRATION': 'Frustración'})

pve = {}
for row in gm:
    s = row.get('data', {}).get('moveSettings')
    if not s or '_MOVE_' not in row['templateId']:
        continue
    name = row['templateId'].split('_MOVE_', 1)[1].removesuffix('_FAST')
    pve[name] = {'power': s.get('power', 0), 'seconds': s.get('durationMs', 0) / 1000, 'energy': s.get('energyDelta', 0), 'window': s.get('damageWindowStartMs', 0) / 1000}

moves = {}
for m in pvp['moves']:
    mid = m['moveId']
    translated = spanish_moves.get(mid) or (spanish_moves.get(mid.removesuffix('_PLUS'), '') + '+' if mid.endswith('_PLUS') and spanish_moves.get(mid.removesuffix('_PLUS')) else m['name'])
    moves[mid] = {'id': mid, 'name': translated, 'english': m['name'], 'type': m['type'], 'pve': pve.get(mid), 'pvp': {'power': m['power'], 'energy': m.get('energyGain', 0) or -m.get('energy', 0), 'turns': m.get('turns'), 'buffs': m.get('buffs'), 'target': m.get('buffTarget'), 'chance': float(m.get('buffApplyChance', 0))}, 'mega': bool(m.get('isMegaMove'))}

aliases = {'mr_mime': 'mr-mime', 'mime_jr': 'mime-jr', 'mr_rime': 'mr-rime', 'ho_oh': 'ho-oh', 'porygon_z': 'porygon-z', 'nidoran_female': 'nidoran-f', 'nidoran_male': 'nidoran-m', 'type_null': 'type-null', 'zacian_hero': 'zacian', 'zamazenta_hero': 'zamazenta', 'zacian_crowned_sword': 'zacian-crowned', 'zamazenta_crowned_shield': 'zamazenta-crowned', 'giratina_altered': 'giratina-altered', 'aegislash_shield': 'aegislash-shield', 'aegislash_blade': 'aegislash-blade', 'keldeo_ordinary': 'keldeo-ordinary', 'landorus_incarnate': 'landorus-incarnate', 'thundurus_incarnate': 'thundurus-incarnate', 'tornadus_incarnate': 'tornadus-incarnate', 'toxtricity': 'toxtricity-amped', 'toxtricity_low_key': 'toxtricity-low-key', 'tauros_aqua': 'tauros-paldea-aqua-breed', 'tauros_blaze': 'tauros-paldea-blaze-breed', 'tauros_combat': 'tauros-paldea-combat-breed', 'darmanitan_standard': 'darmanitan-standard', 'darmanitan_galarian_standard': 'darmanitan-galar-standard', 'darmanitan_galarian_zen': 'darmanitan-galar-zen', 'zygarde_10': 'zygarde-10', 'zygarde_50': 'zygarde-50', 'zygarde_complete': 'zygarde-complete', 'pumpkaboo_small': 'pumpkaboo-small', 'pumpkaboo_average': 'pumpkaboo-average', 'gourgeist_average': 'gourgeist-average', 'oricorio_pau': 'oricorio-pau', 'maushold_family_of_three': 'maushold-family-of-three', 'maushold_family_of_four': 'maushold-family-of-four'}
aliases.update({'necrozma_dawn_wings': 'necrozma-dawn', 'necrozma_dusk_mane': 'necrozma-dusk', 'minior_core': 'minior-red', 'burmy_plant': 'burmy', 'cherrim_overcast': 'cherrim'})
form_translations = {'Alolan': 'Alola', 'Galarian': 'Galar', 'Hisuian': 'Hisui', 'Paldean': 'Paldea', 'Crowned Sword': 'Espada Suprema', 'Crowned Shield': 'Escudo Supremo', 'Hero': 'Guerrero Avezado', 'Origin': 'Origen', 'Altered': 'Modificada', 'Attack': 'Ataque', 'Defense': 'Defensa', 'Speed': 'Velocidad', 'Armored': 'Acorazado', 'Primal': 'Primigenio', 'Incarnate': 'Avatar', 'Therian': 'Tótem', 'Eternamax': 'Dinamax Infinito', 'Sunny': 'Sol', 'Rainy': 'Lluvia', 'Snowy': 'Nieve', 'Plant': 'Planta', 'Sandy': 'Arena', 'Trash': 'Basura', 'Standard': 'Estándar', 'Shield': 'Escudo', 'Blade': 'Filo', 'Low Key': 'Grave', 'Amped': 'Aguda', 'Normal': 'Normal', 'Complete': 'Completa', 'Small': 'Pequeño', 'Average': 'Mediano', 'Large': 'Grande', 'Super': 'Extragrande'}
pokemon = []
missing = []
for p in pvp['pokemon']:
    if 'shadow' in p.get('tags', []) or not p.get('released'):
        continue
    sid, dex = p['speciesId'], p['dex']
    slug = aliases.get(sid, sid.replace('_', '-').replace('-alolan', '-alola').replace('-galarian', '-galar').replace('-hisuian', '-hisui').replace('-paldean', '-paldea'))
    image_id = art.get(slug)
    if image_id is None and '_' not in sid:
        image_id = dex
    if image_id is None:
        missing.append(sid)
    form_match = re.search(r'\((.*?)\)', p['speciesName'])
    form = form_match.group(1) if form_match else 'Normal'
    for en, es in form_translations.items():
        form = form.replace(en, es)
    # Special form moves are preserved but never labelled as ordinary TMs.
    special = p.get('extraChargedMoves', [])
    pokemon.append({'id': sid, 'dex': dex, 'name': names.get(dex, p['speciesName'].split(' (')[0]), 'form': form, 'english': p['speciesName'], 'stats': p['baseStats'], 'types': [t for t in p['types'] if t != 'none'], 'fast': p['fastMoves'], 'charged': list(dict.fromkeys(p['chargedMoves'] + special)), 'elite': p.get('eliteMoves', []), 'legacy': p.get('legacyMoves', []), 'special': special, 'tags': p.get('tags', []), 'image': image_id})

cpms = json.loads(re.search(r'var cpms\s*=\s*(\[[^;]+\])', (CACHE / 'Pokemon.js').read_text(encoding='utf-8')).group(1))[:101]
assert len(cpms) == 101 and len(pokemon) > 800
unknown = {(p['id'], m) for p in pokemon for m in p['fast'] + p['charged'] if m not in moves}
assert not unknown, f'Missing move records: {unknown}'
data = {'meta': {'pvpDate': pvp['timestamp'][:10], 'pveDate': datetime.fromtimestamp(int((CACHE / 'timestamp.txt').read_text().strip()) / 1000, timezone.utc).date().isoformat(), 'compiledAt': datetime.now(timezone.utc).isoformat(), 'sources': URLS}, 'cpms': cpms, 'pokemon': pokemon, 'moves': moves}
(ROOT / 'pokedex-data.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
(ROOT / 'PVPoke-LICENSE.txt').write_bytes((CACHE / 'pvpoke-license.txt').read_bytes())
print(json.dumps({'pokemon': len(pokemon), 'species': len({p['dex'] for p in pokemon}), 'moves': len(moves), 'pvpDate': data['meta']['pvpDate'], 'pveDate': data['meta']['pveDate'], 'missingArt': missing}, ensure_ascii=False))
