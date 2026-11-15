const assert = require('node:assert/strict');
const test = require('node:test');
const { PdfGeneratorService } = require('../dist/audit/pdf-generator.service.js');

test('PDF generator preserves the data-to-storage pipeline', async () => {
  const calls = [];
  const data = { sessionId: 'session-1' };
  const pdf = Buffer.from('%PDF-test');
  const service = new PdfGeneratorService(
    {
      build: async (sessionId) => {
        calls.push(['data', sessionId]);
        return data;
      },
    },
    {
      render: async (received) => {
        calls.push(['template', received]);
        return '<html>report</html>';
      },
    },
    {
      render: async (html) => {
        calls.push(['browser', html]);
        return pdf;
      },
    },
    {
      store: async (received, sessionId) => {
        calls.push(['storage', received, sessionId]);
        return 'https://example.test/report.pdf';
      },
    },
  );

  const result = await service.generateSessionReport('session-1');

  assert.equal(result, 'https://example.test/report.pdf');
  assert.deepEqual(calls, [
    ['data', 'session-1'],
    ['template', data],
    ['browser', '<html>report</html>'],
    ['storage', pdf, 'session-1'],
  ]);
});
