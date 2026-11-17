import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateStats, maxLevel, maxValues, moveAccess, normalize} from './pokedex-core.mjs';
const data=JSON.parse(readFileSync(new URL('./pokedex-data.json',import.meta.url)));
const find=id=>data.pokemon.find(p=>p.id===id);
test('GO PC and HP at known levels; Buddy extends to 51 without changing IVs',()=>{
  const mewtwo=find('mewtwo');
  assert.equal(calculateStats(mewtwo.stats,40,[15,15,15],data.cpms).cp,4178);
  assert.equal(calculateStats(mewtwo.stats,50,[15,15,15],data.cpms).cp,4724);
  assert.equal(calculateStats(mewtwo.stats,50,[15,15,15],data.cpms).hp,192);
  assert.equal(calculateStats(find('charizard').stats,40,[15,15,15],data.cpms).cp,2889);
  assert.ok(calculateStats(mewtwo.stats,51,[15,15,15],data.cpms).cp>4724);
  assert.throws(()=>calculateStats(mewtwo.stats,51.5,[15,15,15],data.cpms));
  assert.throws(()=>calculateStats(mewtwo.stats,40,[16,15,15],data.cpms));
});
test('Low-level lower bounds and half levels',()=>{
  const stats=calculateStats({atk:1,def:1,hp:1},1,[0,0,0],data.cpms);
  assert.equal(stats.cp,10); assert.equal(stats.hp,10);
  assert.ok(calculateStats(find('eternatus').stats,20.5,[10,10,10],data.cpms).cp>calculateStats(find('eternatus').stats,20,[10,10,10],data.cpms).cp);
});
test('Max move training, temporary level four and crowned exclusions',()=>{
  assert.equal(maxLevel(0,true),1);assert.equal(maxLevel(3,true),4);assert.equal(maxLevel(3,true,true),3);
  assert.equal(maxValues('dmax',3,['fire'],'fire',200).power,350);
  assert.equal(maxValues('gmax',3,['fire'],'fire',200).power,450);
  assert.equal(maxValues('gmax',4,['fire'],'fire',200).boostedPower,660);
  assert.equal(maxValues('dmax',1,['fire'],'dragon',200).stab,1);
  assert.equal(maxValues('dmax',3,['fire'],'fire',200).healing,32);
  assert.equal(maxValues('dmax',0,['fire'],'fire',200).guard,0);
});
test('Elite, historical legacy, and special form moves remain distinct',()=>{
  assert.equal(moveAccess(find('charizard'),'BLAST_BURN'),'MT élite / evento');
  assert.equal(moveAccess(find('charizard'),'FIRE_SPIN'),'Normal');
  assert.equal(moveAccess(find('zacian_crowned_sword'),'BEHEMOTH_BLADE'),'Cambio de forma');
});
test('Catalogue is self-consistent, has Spanish search and never uses main-series stats',()=>{
  assert.ok(data.pokemon.length>1000);assert.equal(new Set(data.pokemon.map(p=>p.id)).size,data.pokemon.length);
  assert.equal(find('mewtwo').stats.atk,300);assert.equal(find('eternatus').stats.hp,268);
  assert.ok(!find('eternatus_eternamax'));
  for(const p of data.pokemon) for(const id of [...p.fast,...p.charged]) assert.ok(data.moves[id],p.id+': '+id);
  assert.equal(normalize('Flabébé'),'flabebe');
  assert.equal(data.moves.BLAST_BURN.name,'Anillo Ígneo');
  assert.equal(data.moves.DYNAMAX_CANNON.pve.power,215);
  assert.equal(data.cpms.length,101);
});
