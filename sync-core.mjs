// A last-writer register per stop, using a logical clock rather than device time.
// Tombstones are retained: a stale device must not restore a visit after an undo.
export const MAX_CLOCK = 1_000_000_000;
export function validRecord(record) {
  return record && typeof record.value === 'boolean' && Number.isInteger(record.clock)
    && record.clock >= 0 && record.clock <= MAX_CLOCK
    && typeof record.device === 'string' && /^[a-f0-9]{32}$/.test(record.device);
}
export function compare(a, b) {
  if (!a) return b ? -1 : 0;
  if (!b) return 1;
  return a.clock - b.clock || (a.device > b.device ? 1 : a.device < b.device ? -1 : 0);
}
export function cleanRecords(records, ids) {
  const result = {};
  if (!records || typeof records !== 'object') return result;
  for (const [id, value] of Object.entries(records)) {
    if (ids.has(Number(id)) && String(Number(id)) === id && validRecord(value)) {
      result[id] = { value: value.value, clock: value.clock, device: value.device };
    }
  }
  return result;
}
export function mergeRecords(a, b) {
  const result = { ...a };
  for (const [id, value] of Object.entries(b)) if (compare(value, result[id]) > 0) result[id] = value;
  return result;
}
export function visitedIds(records) {
  return Object.entries(records).filter(([, record]) => record.value)
    .sort((a, b) => compare(a[1], b[1]) || Number(a[0]) - Number(b[0])).map(([id]) => Number(id));
}
export class ProgressReplica {
  constructor(ids, device, saved = {}) {
    this.ids = new Set(ids);
    this.device = device;
    this.records = cleanRecords(saved.records, this.ids);
    this.pending = cleanRecords(saved.pending, this.ids);
    this.records = mergeRecords(this.records, this.pending);
    this.clock = Math.max(0, ...Object.values(this.records).map(r => r.clock));
  }
  change(changes) {
    const valid = changes.filter(({ id, value }) => this.ids.has(id) && typeof value === 'boolean');
    if (!valid.length) return;
    if (this.clock >= MAX_CLOCK) throw new Error('Es necesario revisar la sincronización de esta ruta.');
    const clock = ++this.clock;
    for (const { id, value } of valid) this.records[id] = this.pending[id] = { value, clock, device: this.device };
  }
  seed(visits) {
    // Clock zero only fills gaps; an explicit remote undo always wins.
    for (const id of visits) if (this.ids.has(id) && !this.records[id]) {
      this.records[id] = this.pending[id] = { value: true, clock: 0, device: this.device };
    }
  }
  receive(remote) {
    const valid = cleanRecords(remote, this.ids);
    this.records = mergeRecords(this.records, valid);
    this.clock = Math.max(this.clock, ...Object.values(valid).map(r => r.clock));
    for (const [id, record] of Object.entries(this.pending)) {
      if (valid[id] && compare(valid[id], record) >= 0) delete this.pending[id];
    }
  }
  mergeLocal(saved) {
    this.records = mergeRecords(this.records, cleanRecords(saved.records, this.ids));
    this.pending = mergeRecords(this.pending, cleanRecords(saved.pending, this.ids));
    this.clock = Math.max(this.clock, ...Object.values(this.records).map(r => r.clock));
    for (const [id, record] of Object.entries(this.pending)) {
      if (compare(this.records[id], record) > 0) delete this.pending[id];
    }
  }
  serialize() { return { version: 1, records: this.records, pending: this.pending }; }
  get visited() { return visitedIds(this.records); }
}
