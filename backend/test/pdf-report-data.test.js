const assert = require('node:assert/strict');
const test = require('node:test');
const { PdfReportDataService } = require('../dist/audit/pdf-report-data.service.js');
const { buildPdfReportData } = require('../dist/audit/pdf-report-data.mapper.js');

const publicId = '59642574-c7f0-45e0-8eba-3e948d017a92';
const internalId = '507f1f77bcf86cd799439011';
function harness({ legacy = false, missing = false } = {}) {
  const calls = [];
  const session = { _id: { toString: () => internalId }, sessionId: publicId, qrId: 'mobile-unit', startTime: new Date('2026-10-15T06:00:00Z'), status: 'completed' };
  const sessions = {
    findOne(filter) { calls.push(['session', filter]); return { exec: async () => legacy || missing ? null : session }; },
    findById(id) { calls.push(['legacy', id]); return { exec: async () => missing ? null : session }; },
  };
  const collection = name => ({ find(filter) { calls.push([name, filter]); return { sort(order) { calls.push([name + '-sort', order]); return { exec: async () => [] }; } }; } });
  return { service: new PdfReportDataService(sessions, collection('audit'), collection('locations')), calls };
}

test('PDF report resolves a public session UUID without casting it to a MongoDB identifier', async () => {
  const h = harness();
  const report = await h.service.build(publicId);
  assert.deepEqual(h.calls[0], ['session', { sessionId: publicId }]);
  assert.equal(h.calls.some(([name]) => name === 'legacy'), false);
  assert.deepEqual(h.calls.find(([name]) => name === 'audit'), ['audit', { sessionId: publicId }]);
  assert.deepEqual(h.calls.find(([name]) => name === 'locations'), ['locations', { sessionId: publicId }]);
  assert.equal(report.sessionId, publicId);
});

test('legacy MongoDB report requests use the public session UUID for events and GPS', async () => {
  const h = harness({ legacy: true });
  const report = await h.service.build(internalId);
  assert.deepEqual(h.calls.find(([name]) => name === 'legacy'), ['legacy', internalId]);
  assert.deepEqual(h.calls.find(([name]) => name === 'audit'), ['audit', { sessionId: publicId }]);
  assert.equal(report.sessionId, publicId);
});

test('missing public sessions fail before loading evidence or invoking a MongoDB ID lookup', async () => {
  const h = harness({ missing: true });
  await assert.rejects(h.service.build(publicId), /not found/);
  assert.equal(h.calls.length, 1);
});

test('legacy report records without a public identifier retain their internal display ID', () => {
  const report = buildPdfReportData({ session: { _id: { toString: () => internalId } }, auditLogs: [], locations: [], qrCodeDataUrl: '' });
  assert.equal(report.sessionId, internalId);
});
