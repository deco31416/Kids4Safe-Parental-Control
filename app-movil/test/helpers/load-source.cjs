const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');

function createLoader(mocks, globals = {}) {
  const cache = new Map();
  const timeouts = new Map();
  const intervals = new Map();
  let timerId = 0;
  const resolve = (relative, parent = root) => {
    const base = path.resolve(parent, relative);
    return [base, `${base}.ts`, `${base}.tsx`].find((file) => fs.existsSync(file)) || base;
  };
  function load(relative, parent) {
    if (Object.hasOwn(mocks, relative)) return mocks[relative];
    const file = resolve(relative, parent);
    const key = path.relative(root, file).replaceAll('\\', '/');
    if (Object.hasOwn(mocks, key)) return mocks[key];
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
    }).outputText;
    vm.runInNewContext(output, {
      ...globals, Error, module, exports: module.exports,
      require: (name) => {
        if (!name.startsWith('.') && !Object.hasOwn(mocks, name)) throw new Error(`Dependencia sin simular: ${name}`);
        return load(name, path.dirname(file));
      },
      console: { warn() {}, log() {}, error() {} },
      setTimeout: (fn) => { timeouts.set(++timerId, fn); return timerId; },
      clearTimeout: (id) => timeouts.delete(id),
      setInterval: (fn) => { intervals.set(++timerId, fn); return timerId; },
      clearInterval: (id) => intervals.delete(id),
      process: { env: {} }
    }, { filename: key });
    return module.exports;
  }
  return { load, runTimeouts: () => { const pending = [...timeouts.values()]; timeouts.clear(); pending.forEach((fn) => fn()); } };
}

function memoryStorage(values = new Map()) {
  return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

module.exports = { createLoader, memoryStorage };
