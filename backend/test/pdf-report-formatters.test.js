const assert = require('node:assert/strict');
const test = require('node:test');
const {
  calculateDuration,
  calculateSpatialExtent,
  formatBytes,
  formatEventDetails,
  formatTimestamp,
} = require('../dist/audit/pdf-report-formatters.js');

test('PDF report formatters preserve report values', () => {
  const start = new Date('2026-08-19T10:00:00.000Z');
  const end = new Date('2026-08-19T11:02:03.000Z');

  assert.equal(formatTimestamp(start), '2026-08-19 10:00:00 UTC');
  assert.equal(calculateDuration(start, end), '1h 2m 3s');
  assert.equal(calculateDuration(start), 'En curso');
  assert.equal(formatBytes(1536), '1.50 KB');
  assert.equal(formatEventDetails({ ok: true }), '{\n  "ok": true\n}');
});

test('spatial extent includes valid zero coordinates', () => {
  const locations = [
    { location: { coordinates: [0, 0] } },
    { location: { coordinates: [-74.1, 4.7] } },
  ];

  assert.equal(
    calculateSpatialExtent(locations),
    '0.000000,-74.100000 to 4.700000,0.000000',
  );
});
