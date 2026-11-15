const assert = require('node:assert/strict');
const test = require('node:test');
const { PdfBrowserRenderer } = require('../dist/audit/pdf-browser-renderer.service');

test('Puppeteer renders and closes a real local PDF browser', async () => {
  const renderer = new PdfBrowserRenderer();
  const pdf = await renderer.render(
    '<!doctype html><html><body><h1>Kids4Safe local smoke</h1></body></html>',
  );

  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.ok(pdf.length > 1_000);
});
