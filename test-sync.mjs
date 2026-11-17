import test from 'node:test';
import assert from 'node:assert/strict';
import { ProgressReplica, compare, mergeRecords } from './sync-core.mjs';
const a = 'a'.repeat(32), b = 'b'.repeat(32), ids = [1, 2, 3];
const replica = device => new ProgressReplica(ids, device);

test('two devices converge without dropping different stops', () => {
  const pc = replica(a), phone = replica(b);
  pc.change([{ id: 1, value: true }]); phone.change([{ id: 2, value: true }]);
  const server = mergeRecords(pc.records, phone.records);
  pc.receive(server); phone.receive(server);
  assert.deepEqual(pc.visited, [1, 2]); assert.deepEqual(phone.visited, [1, 2]);
  assert.equal(Object.keys(pc.pending).length, 0);
});
test('stale snapshots and first-login migration cannot resurrect an undone stop', () => {
  const pc = replica(a); pc.change([{ id: 1, value: true }]);
  const old = structuredClone(pc.records);
  pc.change([{ id: 1, value: false }]); pc.receive(old);
  const fresh = replica(b); fresh.seed([1, 2]); fresh.receive(pc.records);
  assert.deepEqual(pc.visited, []); assert.deepEqual(fresh.visited, [2]);
  assert.equal(fresh.pending[1], undefined);
});
test('offline changes survive closing and acknowledgements do not lose a newer undo', () => {
  const pc = replica(a); pc.change([{ id: 1, value: true }]);
  const sent = structuredClone(pc.pending);
  const reopened = new ProgressReplica(ids, b, JSON.parse(JSON.stringify(pc.serialize())));
  reopened.change([{ id: 1, value: false }]); reopened.receive(sent);
  assert.deepEqual(reopened.visited, []); assert.equal(reopened.pending[1].value, false);
  reopened.receive(reopened.pending); assert.deepEqual(reopened.pending, {});
});
test('reset writes tombstones for every stop, including visits unknown on this device', () => {
  const pc = replica(a), phone = replica(b);
  phone.change([{ id: 3, value: true }]); pc.receive(phone.records);
  pc.change(ids.map(id => ({ id, value: false })));
  phone.receive(pc.records); assert.deepEqual(phone.visited, []);
  assert.equal(Object.keys(phone.records).length, ids.length);
});
test('concurrent changes to the same stop converge independent of delivery order', () => {
  const pc = replica(a), phone = replica(b);
  pc.change([{ id: 1, value: true }]); phone.change([{ id: 1, value: false }]);
  assert.deepEqual(mergeRecords(pc.records, phone.records), mergeRecords(phone.records, pc.records));
  assert.equal(compare(phone.records[1], pc.records[1]) > 0, true);
});
test('migration preserves existing visits and only seeds once', () => {
  const pc = replica(a); pc.seed([1, 2]); pc.receive(pc.pending);
  pc.change([{ id: 2, value: false }]); pc.seed([1, 2, 3]);
  assert.deepEqual(pc.visited, [1, 3]);
});
test('untrusted local backups cannot introduce invalid stops or malformed stamps', () => {
  const pc = new ProgressReplica(ids, a, { records: {
    1: { value: true, clock: 1, device: a },
    9: { value: true, clock: 1, device: a },
    2: { value: 'true', clock: 1, device: a },
    3: { value: true, clock: 1e20, device: a },
  }});
  assert.deepEqual(pc.visited, [1]);
});
