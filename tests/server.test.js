// Tests del panel (sin dependencias). Ejecutar desde la raíz del repo:  node --test
// Esta carpeta no se instala: manager_install.sh solo copia el contenido de Manager_install/.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  parseList, normalizePath, isInside, stripCreds, PORT_RE, COMPILE_OK_RE, COMPILE_FAIL_RE,
} = require('../Manager_install/ui/server.js');

test('parseList: ignora vacías, comentarios y #EXCLUDE', () => {
  const repos = parseList([
    '',
    '# comentario',
    '   # comentario con espacios',
    'https://github.com/u/excluido.git #EXCLUDE',
    'https://github.com/u/uno.git',
  ].join('\n'));
  assert.equal(repos.length, 1);
  assert.equal(repos[0].name, 'uno');
});

test('parseList: comando por defecto, comando propio y #NEW', () => {
  const [a, b, c] = parseList([
    'https://github.com/u/a.git',
    'https://github.com/u/b.git npm run dev',
    'https://github.com/u/c.git npm run dev #NEW',
  ].join('\r\n')); // también con saltos de línea Windows
  assert.deepEqual([a.command, a.isNew], ['npm run start', false]);
  assert.deepEqual([b.command, b.isNew], ['npm run dev', false]);
  assert.deepEqual([c.command, c.isNew], ['npm run dev', true]);
});

test('parseList: nombre como git clone y sin credenciales en la URL', () => {
  const [r] = parseList('https://user:secreto@dev.azure.com/org/proj/_git/mi-repo/');
  assert.equal(r.name, 'mi-repo');
  assert.equal(r.url, 'https://dev.azure.com/org/proj/_git/mi-repo/');
  assert.equal(stripCreds('https://github.com/u/x.git'), 'https://github.com/u/x.git');
});

test('normalizePath: rutas relativas al directorio de trabajo', () => {
  assert.equal(normalizePath('lista.txt'), path.resolve(process.cwd(), 'lista.txt'));
});

test('normalizePath: rutas de Git Bash en Windows', { skip: process.platform !== 'win32' }, () => {
  assert.equal(normalizePath('/c/ruta/lista.txt'), path.resolve('C:/ruta/lista.txt'));
  assert.equal(normalizePath('d:'), path.resolve('D:/'));
});

test('isInside', () => {
  const root = path.resolve('raiz');
  assert.equal(isInside(root, path.join(root, 'a.txt')), true);
  assert.equal(isInside(root, path.join(root, 'sub', 'a.txt')), true);
  assert.equal(isInside(root, root), true);
  assert.equal(isInside(root, path.resolve('otra', 'a.txt')), false);
  assert.equal(isInside(root, path.resolve(root, '..', 'raiz-falsa', 'a.txt')), false);
});

test('PORT_RE: detecta el puerto en la salida de los dev servers', () => {
  assert.equal('  ➜  Local:   http://localhost:5173/'.match(PORT_RE)[1], '5173');
  assert.equal('** Angular Live Development Server is listening on 127.0.0.1:4200 **'.match(PORT_RE)[1], '4200');
  assert.equal('On Your Network: http://0.0.0.0:3000'.match(PORT_RE)[1], '3000');
  assert.equal('sin puerto aquí'.match(PORT_RE), null);
});

test('COMPILE_OK_RE / COMPILE_FAIL_RE', () => {
  assert.ok(COMPILE_OK_RE.test('Compiled successfully.'));
  assert.ok(COMPILE_OK_RE.test('webpack 5.90.1 compiled successfully in 1200 ms'));
  assert.ok(COMPILE_OK_RE.test('Application bundle generation complete. [3.2 seconds]'));
  assert.ok(COMPILE_OK_RE.test('  VITE v5.0.0  ready in 300 ms'));
  assert.ok(COMPILE_FAIL_RE.test('Failed to compile.'));
  assert.ok(COMPILE_FAIL_RE.test('webpack 5.90.1 compiled with 2 errors in 900 ms'));
  assert.ok(!COMPILE_OK_RE.test('webpack 5.90.1 compiled with 2 errors in 900 ms'));
});
