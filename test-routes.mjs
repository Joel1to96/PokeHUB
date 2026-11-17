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
test('the existing route identity and stop coordinates stay unchanged', () => {
  assert.equal(eternatus.id, 'londres-eternatus-2026-11-17-v1');
  assert.equal(eternatus.stops.length, 173);
  assert.equal(eternatus.stops[0].coords, '51.525918,-0.037038');
  assert.notEqual(dust.id, eternatus.id);
  assert.equal(dust.stops.length, 20);
  assert.equal(new Set(dust.stops.map(s => s.coords)).size, 20);
  assert.deepEqual(dust.stops.map(s => s.id), Array.from({ length: 20 }, (_, i) => i + 1));
});
test('all 20 supplied coordinates retain their exact order and signs', () => {
  assert.deepEqual(dust.stops.map(s => s.coords), [
    '51.514475,-0.075578','51.524366,-0.080154','51.530782,-0.104962',
    '51.541296,-0.077336','51.564339,-0.092799','51.555576,-0.111769',
    '51.516436,-0.139983','51.496267,-0.144978','51.502109,-0.110916',
    '51.488461,-0.078887','51.463372,-0.116245','51.457626,-0.126159',
    '51.458772,-0.212708','51.506143,-0.177176','51.529685,-0.226735',
    '51.544689,-0.234559','51.506556,-0.010011','51.481093,-0.014072',
    '51.528423,0.019864','51.545571,0.019928',
  ]);
});
test('outgoing waits remain attached to the correct leg, including 30 seconds and 10 minutes', () => {
  assert.equal(dust.stops[0].waitSeconds, null);
  assert.deepEqual(dust.stops.slice(1).map(s => s.waitSeconds), [60,60,120,120,60,120,120,120,120,120,30,240,240,120,60,600,120,240,60]);
  assert.equal(dust.stops.slice(1).reduce((sum, s) => sum + s.waitSeconds, 0), 2730);
  assert.ok(dust.stops.slice(1).every(s => s.distanceM > 0));
});
test('mission rewards and the final two-stop set match the supplied listing', () => {
  assert.deepEqual(dust.stops.filter(s => s.reward === 1500).map(s => s.id), [3,5,9,12,13,14]);
  assert.deepEqual(dust.stops.filter(s => s.missionCode === 'R3LGS').map(s => s.id), [1,6,11,15,16]);
  assert.equal(dust.stops.filter(s => s.reward === 1000).length, 14);
  assert.equal(dust.rewardTotal, 23000);
  assert.equal(dust.stops.filter(s => s.group === 7).length, 2);
  assert.equal(dust.stops[19].originalKit, '7.2');
});
