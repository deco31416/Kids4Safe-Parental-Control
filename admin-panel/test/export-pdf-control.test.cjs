/* eslint-disable @typescript-eslint/no-require-imports -- Node regression harness; no browser or server is started. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function mount(exportReport) {
  const slots = [];
  let cursor = 0;
  let requests = 0;
  class SessionExpired extends Error {}
  const access = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/admin-access.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: access, Error });
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = value; }]; },
    useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
  };
  const jsx = (type, props) => ({ type, props });
  const components = { Dialog: 'dialog', DialogTrigger: 'trigger', DialogContent: 'content', DialogHeader: 'header', DialogDescription: 'description', DialogFooter: 'footer', DialogTitle: 'h2' };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/sessions/ExportPDFButton.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'lucide-react') return {};
      if (name.endsWith('/ui/button')) return { Button: 'button' };
      if (name.endsWith('/ui/dialog')) return components;
      if (name.endsWith('/admin-access')) return access;
      if (name.endsWith('/admin-auth')) return { isAdminSessionExpiredError: cause => cause instanceof SessionExpired };
      if (name.endsWith('/admin-api')) return { AdminAPI: { async exportSessionPdf(id) { requests++; return exportReport(id, { ...access, SessionExpired }); } } };
      throw new Error('Unexpected import: ' + name);
    },
  });
  function render() { cursor = 0; const entry = exports.ExportPDFButton({ sessionId: 'public-session-id' }); return entry.type(entry.props); }
  const initial = render(); initial.props.onOpenChange(true);
  return { render, requests: () => requests };
}
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  const children = node.props?.children;
  return [node, ...(Array.isArray(children) ? children : [children]).flatMap(nodes)];
}
function text(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!node || typeof node !== 'object') return '';
  const children = node.props?.children;
  return (Array.isArray(children) ? children : [children]).map(text).join('');
}
function button(tree, label) { return nodes(tree).find(node => node.type === 'button' && text(node) === label); }

test('PDF permission denial names the required permission and offers close without another export attempt', async () => {
  const h = mount(async (_id, { AdminPermissionError }) => { throw new AdminPermissionError(); });
  await button(h.render(), 'Generar PDF').props.onClick();
  const tree = h.render();
  assert.match(text(tree), /permiso «Exportar reportes»/);
  assert.ok(button(tree, 'Cerrar'));
  assert.equal(button(tree, 'Reintentar'), undefined);
  assert.equal(button(tree, 'Generar PDF'), undefined);
  assert.equal(h.requests(), 1);
});

test('a temporary PDF error leaves a retry action and never presents a download link', async () => {
  const h = mount(async () => { throw new Error('No se pudo conectar con el servidor.'); });
  await button(h.render(), 'Generar PDF').props.onClick();
  assert.ok(button(h.render(), 'Reintentar'));
  assert.equal(nodes(h.render()).some(node => node.type === 'a'), false);
});

test('repeated clicks while PDF generation is pending submit only one request', async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const h = mount(() => pending);
  const submit = button(h.render(), 'Generar PDF').props.onClick;
  const first = submit(); await submit();
  assert.equal(h.requests(), 1);
  assert.equal(button(h.render(), 'Generando…').props.disabled, true);
  resolve({ pdfUrl: 'https://backend.test/report.pdf' }); await first;
  assert.match(text(h.render()), /Tu reporte está listo/);
});

test('a successful PDF provides an explicit protected download link without opening a popup', async () => {
  const h = mount(async id => { assert.equal(id, 'public-session-id'); return { pdfUrl: 'https://backend.test/report.pdf' }; });
  await button(h.render(), 'Generar PDF').props.onClick();
  const link = nodes(h.render()).find(node => node.type === 'a');
  assert.equal(link.props.href, 'https://backend.test/report.pdf');
  assert.equal(link.props.rel, 'noopener noreferrer');
  assert.equal(text(link), 'Abrir PDF');
});

test('an expired administrative session closes the export dialog without a misleading retry message', async () => {
  const h = mount(async (_id, { SessionExpired }) => { throw new SessionExpired(); });
  await button(h.render(), 'Generar PDF').props.onClick();
  const tree = h.render();
  assert.equal(tree.props.open, false);
  assert.equal(nodes(tree).some(node => node.props?.role === 'alert'), false);
});
