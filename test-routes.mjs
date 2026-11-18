import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
function route(file) {
  const context = { window: {} };
  runInNewContext(readFileSync(new URL(file, import.meta.url), 'utf8'), context);
  return JSON.parse(JSON.stringify(context.window.ROUTE));
}
const dust = route('route-polvos.js'), eternatus = route('route.js');
const today = route('route-eternatus-2026-11-18.js');
test('the new day keeps every reported stop once and does not reuse old progress', () => {
  const source = JSON.parse(readFileSync(new URL('eternatus-2026-11-18-fuente.json', import.meta.url), 'utf8'));
  assert.equal(today.id, 'londres-eternatus-2026-11-18-v1');
  assert.notEqual(today.id, eternatus.id);
  assert.notEqual(today.id, dust.id);
  assert.equal(today.stops.length, 100);
  assert.equal(new Set(today.stops.map(s => s.id)).size, 100);
  assert.deepEqual([...today.stops].sort((a,b) => a.id-b.id).map(s => s.coords), source.coordenadas);
  assert.deepEqual(today.stops.map(s => s.sequence), Array.from({length:100},(_,i)=>i+1));
  assert.equal(new Set(today.stops.map(s => s.group)).size, 34);
  assert.equal(today.stops.filter(s => s.group===34).length, 1);
  assert.equal(today.expiresAt, '2026-11-19T00:00:00Z');
  const active = readFileSync(new URL('index.html',import.meta.url),'utf8');
  const archive = readFileSync(new URL('eternatus-2026-11-17.html',import.meta.url),'utf8');
  assert.ok(active.includes('src="route-eternatus-2026-11-18.js"'));
  assert.ok(archive.includes('src="route.js"'));
});
test('new route starts nearest the supplied position and all waits cover their incoming distance', () => {
  assert.equal(today.origin.coords, '51.529585,-0.122008');
  const distance = (a,b) => {
    const [lat1,lon1] = a.split(',').map(Number), [lat2,lon2] = b.split(',').map(Number), r=Math.PI/180;
    return 6371000*Math.acos(Math.min(1, Math.sin(lat1*r)*Math.sin(lat2*r)+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.cos((lon2-lon1)*r)));
  };
  assert.equal(today.stops[0].coords,'51.511067,-0.117139');
  const firstDistance = distance(today.origin.coords,today.stops[0].coords);
  assert.ok(today.stops.every(s => distance(today.origin.coords,s.coords)>=firstDistance-0.01));
  today.stops.forEach((s,i) => {
    const measured=distance(i?today.stops[i-1].coords:today.origin.coords,s.coords);
    assert.ok(Math.abs(s.distanceM-measured)<1);
    assert.equal(s.waitSeconds,i===0?120:60);
    assert.ok(measured<=(i===0?3000:2000));
  });
  assert.equal(today.totalWaitSeconds,6060);
  assert.equal(today.stops.reduce((sum,s)=>sum+s.waitSeconds,0),today.totalWaitSeconds);
});
test('the existing route identity and stop coordinates stay unchanged', () => {
  assert.equal(eternatus.id, 'londres-eternatus-2026-11-17-v1');
  assert.equal(eternatus.stops.length, 173);
  assert.equal(eternatus.stops[0].coords, '51.525918,-0.037038');
  assert.notEqual(dust.id, eternatus.id);
  assert.equal(dust.stops.length, 20);
  assert.equal(new Set(dust.stops.map(s => s.coords)).size, 20);
  assert.deepEqual(dust.stops.map(s => s.id).sort((a,b) => a-b), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.equal(dust.id, 'londres-polvos-2026-11-17-v1');
  assert.deepEqual(dust.stops.map(s => s.sequence), Array.from({ length: 20 }, (_, i) => i + 1));
});
test('all 20 coordinate identities survive reordering and old progress imports', () => {
  assert.deepEqual([...dust.stops].sort((a,b) => a.id-b.id).map(s => s.coords), [
    '51.514475,-0.075578','51.524366,-0.080154','51.530782,-0.104962',
    '51.541296,-0.077336','51.564339,-0.092799','51.555576,-0.111769',
    '51.516436,-0.139983','51.496267,-0.144978','51.502109,-0.110916',
    '51.488461,-0.078887','51.463372,-0.116245','51.457626,-0.126159',
    '51.458772,-0.212708','51.506143,-0.177176','51.529685,-0.226735',
    '51.544689,-0.234559','51.506556,-0.010011','51.481093,-0.014072',
    '51.528423,0.019864','51.545571,0.019928',
  ]);
});
test('route starts nearest Eternatus 42, and recalculates every incoming leg', () => {
  assert.equal(dust.origin.coords, eternatus.stops.find(s => s.id === 42).coords);
  const distance = (a,b) => {
    const [lat1,lon1] = a.split(',').map(Number), [lat2,lon2] = b.split(',').map(Number);
    const r = Math.PI/180;
    return 6371000 * Math.acos(Math.min(1, Math.sin(lat1*r)*Math.sin(lat2*r) + Math.cos(lat1*r)*Math.cos(lat2*r)*Math.cos((lon2-lon1)*r)));
  };
  const nearest = [...dust.stops].sort((a,b)=>distance(dust.origin.coords,a.coords)-distance(dust.origin.coords,b.coords))[0];
  assert.equal(dust.stops[0].id, nearest.id);
  assert.equal(nearest.coords, '51.502109,-0.110916');
  assert.deepEqual(dust.stops.map(s => s.waitSeconds), [60,120,60,60,120,60,120,120,120,120,120,60,420,300,60,120,120,120,120,60]);
  for (let i=0;i<dust.stops.length;i++) {
    const measured = distance(i ? dust.stops[i-1].coords : dust.origin.coords, dust.stops[i].coords);
    assert.ok(Math.abs(dust.stops[i].distanceM - measured)<1);
  }
  assert.equal(dust.totalWaitSeconds, 2460);
  assert.equal(dust.stops.slice(1).reduce((sum, s) => sum + s.waitSeconds, 0), 2400);
  assert.ok(dust.stops.slice(1).every(s => s.distanceM > 0));
});
test('mission rewards and the final two-stop set match the supplied listing', () => {
  assert.deepEqual(dust.stops.filter(s => s.reward === 1500).map(s => s.id).sort((a,b)=>a-b), [3,5,9,12,13,14]);
  assert.deepEqual(dust.stops.filter(s => s.missionCode === 'R3LGS').map(s => s.id).sort((a,b)=>a-b), [1,6,11,15,16]);
  assert.equal(dust.stops.filter(s => s.reward === 1000).length, 14);
  assert.equal(dust.rewardTotal, 23000);
  assert.equal(dust.stops.filter(s => s.group === 7).length, 2);
  assert.equal(dust.stops[19].originalKit, '7.2');
});
