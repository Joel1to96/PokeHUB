// Pure GO calculations, independent from the UI and route storage.
export function calculateStats(base, level, ivs, cpms) {
  if (!Number.isFinite(level) || level < 1 || level > 51 || level * 2 % 1 || ivs.length !== 3 || ivs.some(v => !Number.isInteger(v) || v < 0 || v > 15)) throw new RangeError('Nivel o IV no válido');
  const cpm = cpms[(level - 1) * 2];
  if (!cpm) throw new RangeError('Multiplicador no disponible');
  const attack = (base.atk + ivs[0]) * cpm;
  const defense = (base.def + ivs[1]) * cpm;
  const stamina = (base.hp + ivs[2]) * cpm;
  return {cp: Math.max(10, Math.floor(attack * Math.sqrt(defense) * Math.sqrt(stamina) / 10)), hp: Math.max(10, Math.floor(stamina)), attack, defense, cpm};
}
export function normalize(value) { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
export function maxLevel(trained, effect, excluded = false) {
  return Math.min(4, Math.max(0, trained) + (effect && !excluded ? 1 : 0));
}
export function maxValues(kind, level, types, attackType, hp) {
  if (level === 0) return {power: 0, stab: 1, boostedPower: 0, guard: 0, healing: 0, healingPercent: 0};
  const power = (kind === 'gmax' || kind === 'eternamax' ? [350, 400, 450, 550] : [250, 300, 350, 450])[level - 1];
  const stab = types.includes(attackType) ? 1.2 : 1;
  const percent = [8, 12, 16, 20][level - 1];
  return {power, stab, boostedPower: power * stab, guard: [20, 40, 60, 80][level - 1], healing: hp * percent / 100, healingPercent: percent};
}
export function moveAccess(pokemon, move) {
  if (pokemon.special.includes(move)) return 'Especial';
  if (['BEHEMOTH_BLADE', 'BEHEMOTH_BASH'].includes(move) && pokemon.id.includes('crowned')) return 'Cambio de forma';
  if (pokemon.elite.includes(move)) return 'MT élite / evento';
  if (pokemon.legacy.includes(move)) return 'Legado sin MT élite';
  return 'Normal';
}
