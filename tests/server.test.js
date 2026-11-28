// Tests del panel (sin dependencias). Ejecutar desde la raíz del repo:  node --test
// Esta carpeta no se instala: manager_install.sh solo copia el contenido de Manager_install/.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  parseList, healthUrl, normalizePath, isInside, staticFile, readInstallDate, parseCurl, parseCurlOutput, stripCreds, PORT_RE, COMPILE_OK_RE, COMPILE_FAIL_RE, BUNDLER_RE,
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

test('parseList: directiva "#> health:" bajo el repo', () => {
  const [a, b, c] = parseList([
    '#> health: /ignorada',              // sin repo anterior: se ignora
    'https://github.com/u/api.git npm run dev',
    '  #> health: /actuator/health  ',
    'https://github.com/u/web.git',
    '# comentario normal',
    'https://github.com/u/otra.git',
    '#> HEALTH: http://localhost:9000/ping',
  ].join('\n'));
  assert.equal(a.health, '/actuator/health');
  assert.equal(a.command, 'npm run dev');
  assert.equal(b.health, undefined);
  assert.equal(c.health, 'http://localhost:9000/ping');
});

test('healthUrl: ruta relativa al puerto o URL completa', () => {
  assert.equal(healthUrl('/health', 3000), 'http://localhost:3000/health');
  assert.equal(healthUrl('health', 3000), 'http://localhost:3000/health');
  assert.equal(healthUrl('https://api.dev/ping', null), 'https://api.dev/ping');
  assert.equal(healthUrl('/health', null), null); // aún sin puerto
  assert.equal(healthUrl(null, 3000), null);
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

test('COMPILE_OK_RE / BUNDLER_RE: servidores Node sin empaquetador', () => {
  assert.ok(COMPILE_OK_RE.test('[Nest] 1234  - LOG [NestApplication] Nest application successfully started +3ms'));
  assert.ok(COMPILE_OK_RE.test(' ✓ Ready in 2.3s')); // Next
  assert.ok(COMPILE_OK_RE.test('Server listening on port 3000'));
  assert.ok(COMPILE_OK_RE.test('Listening on 8080'));
  // Angular anuncia el puerto antes de terminar de compilar: no debe contar como listo
  assert.ok(!COMPILE_OK_RE.test('** Angular Live Development Server is listening on localhost:4200 **'));
  assert.ok(BUNDLER_RE.test('webpack 5.90.1 compiled successfully'));
  assert.ok(BUNDLER_RE.test('Compiling...'));
  assert.ok(BUNDLER_RE.test('  VITE v5.0.0  ready in 300 ms'));
  assert.ok(!BUNDLER_RE.test('Server listening on port 3000'));
  assert.ok(!BUNDLER_RE.test('$ mfs run  (api-mock)'));
});

test('staticFile: solo /css/*.css y /js/*.js dentro de ui/', () => {
  const root = path.resolve('ui-root');
  assert.deepEqual(staticFile('/js/main.js', root), { file: path.join(root, 'js', 'main.js'), type: 'text/javascript; charset=utf-8' });
  assert.equal(staticFile('/css/base.css', root).type, 'text/css; charset=utf-8');
  assert.equal(staticFile('/js/../server.js', root), null);
  assert.equal(staticFile('/js/%2e%2e/server.js', root), null);
  assert.equal(staticFile('/js/main.css', root), null);
  assert.equal(staticFile('/css/x.txt', root), null);
  assert.equal(staticFile('/server.js', root), null);
  assert.equal(staticFile('/js/sub/a.js', root), null);
});

test('parseCurl: bash multilínea, comillas y $\'…\' (Copiar como cURL de Chrome)', () => {
  const { args } = parseCurl([
    "curl 'https://api.example.com/items?a=1&b=2' \\",
    "  -H 'accept: application/json' \\",
    '  -H "Authorization: Bearer abc\\"x" \\',
    "  --data-raw $'{\"name\":\"it\\'s\\n\"}'",
  ].join('\n'));
  assert.deepEqual(args, [
    'https://api.example.com/items?a=1&b=2',
    '-H', 'accept: application/json',
    '-H', 'Authorization: Bearer abc"x',
    '--data-raw', '{"name":"it\'s\n"}',
  ]);
});

test('parseCurl: formato cmd de Chrome (^) y PowerShell (`)', () => {
  const cmd = parseCurl('curl ^"https://x.dev/a^" ^\n  -H ^"accept: */*^" ^\n  --data-raw ^"^{\\^"k\\^":1^}^"');
  assert.deepEqual(cmd.args, ['https://x.dev/a', '-H', 'accept: */*', '--data-raw', '{"k":1}']);
  const ps = parseCurl('curl.exe https://x.dev `\n -X POST');
  assert.deepEqual(ps.args, ['https://x.dev', '-X', 'POST']);
});

test('parseCurl: opciones cortas agrupadas, descartadas y bloqueadas', () => {
  assert.deepEqual(parseCurl('curl -sSLk -XPOST -w "%{http_code}" -i https://x.dev').args, ['-Lk', '-X', 'POST', 'https://x.dev']);
  assert.deepEqual(parseCurl('curl --silent --write-out=x --max-time 5 https://x.dev').args, ['--max-time', '5', 'https://x.dev']);
  assert.equal(parseCurl('curl -m 5 https://x.dev').timeoutMs, 7000);
  assert.throws(() => parseCurl('curl -o salida.json https://x.dev'), /-o no se admite/);
  assert.throws(() => parseCurl('curl -sO https://x.dev/f.zip'), /-O no se admite/);
  assert.throws(() => parseCurl('curl --output=f https://x.dev'), /--output no se admite/);
  assert.throws(() => parseCurl('curl -H "x: 1"'), /URL/);
  assert.throws(() => parseCurl("curl 'https://x.dev"), /comillas/);
  assert.throws(() => parseCurl('  '), /Pega/);
});

test('readInstallDate: lee la fecha que escribe el instalador', () => {
  assert.equal(readInstallDate('#!/bin/bash\n# Fecha de creación: 2025-02-27\n# Fecha de instalación: 2026-11-27 10:42:05\n# resto'), '2026-11-27 10:42:05');
  assert.equal(readInstallDate('#!/bin/bash\n# sin instalar (repo de origen)\n'), null);
  assert.equal(readInstallDate(''), null);
});

// Módulo del navegador (ES module): Node 22 lo carga con import() aunque sea .js
const curlHistory = () => import('../Manager_install/ui/js/curl-history.js');

test('curl-history: exportar e importar conserva los comandos', async () => {
  const { formatHistory, parseHistoryText } = await curlHistory();
  const cmds = [
    "curl 'https://a.dev/x' \\\n  -H 'accept: application/json'",
    "curl -X POST https://b.dev --data-raw $'{\\n\\n  \"k\": 1\\n}'",
    "curl https://c.dev -d 'linea1\n\nlinea3'", // línea en blanco dentro del comando
  ];
  const txt = formatHistory(cmds, { version: '8.6.0', date: '2026-11-27 10:42' });
  assert.match(txt, /^# Historial cURL · mfs 8\.6\.0 · exportado 2026-11-27 10:42/);
  assert.match(txt, /# ── curl 3 ──/);
  assert.deepEqual(parseHistoryText(txt), cmds);
  assert.deepEqual(parseHistoryText(txt.replace(/\n/g, '\r\n')), cmds.map((c) => c.replace(/\n/g, '\n')));
});

test('curl-history: .txt escrito a mano, sin separadores', async () => {
  const { parseHistoryText } = await curlHistory();
  const txt = '﻿# mis curls\n\ncurl https://a.dev\n\n# login\ncurl -X POST https://b.dev \\\n  -d x=1\n\nesto no es un curl\n\ncurl https://a.dev\n';
  assert.deepEqual(parseHistoryText(txt), ['curl https://a.dev', 'curl -X POST https://b.dev \\\n  -d x=1']);
  assert.deepEqual(parseHistoryText(''), []);
});

test('curl-history: redactCurl oculta credenciales y deja lo demás', async () => {
  const { redactCurl } = await curlHistory();
  assert.equal(redactCurl("curl https://a.dev -H 'Authorization: Bearer abc.def' -H 'accept: application/json'"),
    "curl https://a.dev -H 'Authorization: ***' -H 'accept: application/json'");
  assert.equal(redactCurl('curl https://a.dev -H "cookie: a=b; c=d"'), 'curl https://a.dev -H "cookie: ***"');
  assert.equal(redactCurl('curl -u user:pass https://a.dev'), 'curl -u *** https://a.dev');
  assert.equal(redactCurl("curl --cookie='s=1' --user-agent 'x' https://a.dev"), "curl --cookie='***' --user-agent 'x' https://a.dev");
  assert.equal(redactCurl('curl ^"https://a.dev^" -H ^"X-Api-Key: k1^" -b ^"s=1^"'), 'curl ^"https://a.dev^" -H ^"X-Api-Key: ***^" -b ^"***^"');
  assert.equal(redactCurl('curl https://a.dev?token=abc'), 'curl https://a.dev?token=abc'); // la URL no se toca
});

test('quips: la frase del 👾 depende del estado del panel', async () => {
  const { pickQuip, RANDOM_QUIPS } = await import('../Manager_install/ui/js/quips.js');
  const r = (o) => ({ status: 'idle', cloned: true, changes: 0, locked: false, ...o });
  // rand fijo 0.3: no cae en la frase al azar (≥ 0.25) y elige la frase 0 de las categorías de 3 y la 1 de las de 4
  const at = (v) => () => v;
  assert.equal(pickQuip([], at(0.5)), 'Sin repos a la vista. ¿Editar lista?');
  // Prioridad: bloqueado gana a cambios sin commit; error gana a en ejecución
  assert.equal(pickQuip([r({ locked: true, changes: 2 })], at(0.3)), '1 repo con index.lock. Git está en huelga');
  assert.equal(pickQuip([r({ status: 'error' }), r({ status: 'running' })], at(0.3)), '1 error. Respira, lee el log, vuelve a intentar');
  assert.equal(pickQuip([r({ status: 'running' }), r({ status: 'running' }), r({ status: 'stopping' })], at(0.3)), '3 procesos corriendo: el ventilador lo sabe');
  assert.equal(pickQuip([r({ status: 'running' })], at(0.3)), '1 proceso corriendo: el ventilador lo sabe'); // singular
  assert.equal(pickQuip([r({ changes: 4 }), r({ changes: 1 })], at(0.6)), '2 repos piden un commit con buen mensaje');
  assert.equal(pickQuip([r({ cloned: false })], at(0.3)), '1 repo esperando su primer pull');
  assert.equal(pickQuip([r(), r()], at(0.3)), 'Working tree clean. Disfruta el momento');
  // Por debajo de 0.25: frase al azar aunque haya categoría
  assert.equal(pickQuip([r({ status: 'running' })], at(0)), RANDOM_QUIPS[0]);
});

test('idle: aviso de inactividad tras N minutos', async () => {
  const { isIdle } = await import('../Manager_install/ui/js/idle.js');
  const t0 = 1_000_000;
  assert.equal(isIdle(t0, t0 + 10 * 3600000, 0), false); // desactivado
  assert.equal(isIdle(t0, t0 + 30 * 60000 - 1000, 30), false); // 29:59
  assert.equal(isIdle(t0, t0 + 30 * 60000, 30), true); // 30:00
  assert.equal(isIdle(t0, t0 + 3000, 0.05), true); // 0.05 min = 3 s
  assert.equal(isIdle(t0, t0 + 2999, 0.05), false);
});

test('idle: los mensajes rotan sin repetir el anterior', async () => {
  const { pickIdleMessage, IDLE_MESSAGES } = await import('../Manager_install/ui/js/idle.js');
  const n = IDLE_MESSAGES.length;
  for (const m of IDLE_MESSAGES) for (const k of ['l1', 'big', 'l2', 'l3']) assert.ok(m[k] && m[k].trim(), `falta ${k}`);
  assert.notEqual(pickIdleMessage(0, () => 0), 0);
  for (let prev = -1; prev < n; prev++) {
    for (const r of [0, 0.25, 0.5, 0.75, 0.9999]) {
      const i = pickIdleMessage(prev, () => r);
      assert.ok(i >= 0 && i < n, `fuera de rango: ${i}`);
      assert.notEqual(i, prev);
    }
  }
  assert.equal(pickIdleMessage(0, () => 0.5, 1), 0); // un solo mensaje: siempre ese
});

test('workday: estado y avance de la jornada', async () => {
  const { workProgress, fmtRemaining } = await import('../Manager_install/ui/js/workday.js');
  const at = (h, m = 0) => new Date(2026, 10, 27, h, m);
  assert.equal(workProgress(at(13), '09:00', 0).state, 'off');
  assert.equal(workProgress(at(8), '09:00', 8).state, 'before');
  const mid = workProgress(at(13), '09:00', 8);
  assert.equal(mid.state, 'during');
  assert.equal(mid.progress, 0.5);
  assert.equal(fmtRemaining(mid.remainingMs), '4 h 00 min');
  assert.equal(workProgress(at(17, 30), '09:00', 8).state, 'after');
  // Turno nocturno: 22:00 + 8 h, a las 02:00 del día siguiente va por la mitad
  const night = workProgress(at(2), '22:00', 8);
  assert.equal(night.state, 'during');
  assert.equal(night.progress, 0.5);
  assert.equal(workProgress(at(21), '22:00', 8).state, 'before');
  assert.equal(fmtRemaining(45 * 60000), '45 min');
});

test('logview: color de las líneas del log', async () => {
  const { lineClass: cls } = await import('../Manager_install/ui/js/logview.js');
  assert.equal(cls('[ERROR] No se pudo clonar'), 'err');
  assert.equal(cls('npm ERR! code ENOENT'), 'err');
  assert.equal(cls('TypeError: Exception in thread'), 'err');
  assert.equal(cls('fatal: not a git repository'), 'err');
  assert.equal(cls('webpack compiled with 2 errors'), 'err');
  assert.equal(cls('[WARNING] Rama inexistente'), 'warn');
  assert.equal(cls('WARN deprecated package'), 'warn');
  assert.equal(cls('Found 0 errors. Watching for file changes.'), '');
  assert.equal(cls('[INFO] Procesando app'), '');
});

test('notify: qué cambios de estado generan aviso', async () => {
  const { notifyKind } = await import('../Manager_install/ui/js/notify.js');
  const run = (compile) => ({ status: 'running', action: 'run', compile });
  assert.equal(notifyKind(run('compiling'), run('ready')), 'ready');
  assert.equal(notifyKind(run('ready'), run('ready')), null); // sin repetir
  assert.equal(notifyKind(run('compiling'), run('failed')), 'failed');
  assert.equal(notifyKind({ status: 'running', action: 'pull' }, { status: 'ok', action: 'pull' }), 'ok');
  assert.equal(notifyKind({ status: 'running', action: 'install' }, { status: 'error', action: 'install' }), 'error');
  assert.equal(notifyKind({ status: 'stopping', action: 'run' }, { status: 'stopped', action: 'run' }), null); // detener no avisa
  assert.equal(notifyKind({ status: 'idle' }, { status: 'running', action: 'pull' }), null);
});

test('palette: filtro de comandos por palabras, sin tildes', async () => {
  const { filterCommands } = await import('../Manager_install/ui/js/palette.js');
  const cmds = [
    { label: 'Run en los marcados', hint: 'Acción' },
    { label: 'Nueva rama…', hint: 'Git' },
    { label: 'Ver log: api-pagos', hint: 'APIs' },
  ];
  assert.deepEqual(filterCommands(cmds, '').length, 3);
  assert.deepEqual(filterCommands(cmds, 'accion').map((c) => c.label), ['Run en los marcados']);
  assert.deepEqual(filterCommands(cmds, 'git rama').map((c) => c.label), ['Nueva rama…']);
  assert.deepEqual(filterCommands(cmds, 'LOG pagos').map((c) => c.label), ['Ver log: api-pagos']);
  assert.deepEqual(filterCommands(cmds, 'nada'), []);
});

test('empty-art: personaje al azar sin repetir y frases suficientes', async () => {
  const { EMPTY_ARTS, pickEmptyArt, pickPhrase } = await import('../Manager_install/ui/js/empty-art.js');
  const ids = EMPTY_ARTS.map((a) => a.id);
  assert.deepEqual(ids, ['pulpo', 'gato', 'astronauta', 'terminal']);
  for (const a of EMPTY_ARTS) assert.ok(a.phrases.length >= 3, `${a.id}: pocas frases`);
  for (const prev of [null, ...ids]) {
    for (const r of [0, 0.3, 0.6, 0.9999]) {
      const id = pickEmptyArt(prev, () => r);
      assert.ok(ids.includes(id)); assert.notEqual(id, prev);
    }
  }
  assert.ok(EMPTY_ARTS[1].phrases.includes(pickPhrase('gato', () => 0.5)));
});

test('parseCurlOutput: último bloque de cabeceras, cuerpo y métricas', () => {
  const out = parseCurlOutput([
    'HTTP/1.1 301 Moved', 'Location: /b', '', 'HTTP/2 200', 'content-type: application/json', 'x-a: 1:2', '', '{"ok":true}',
  ].join('\r\n') + '\n__MFS_CURL__200 0.123 11 application/json');
  assert.equal(out.status, 200);
  assert.equal(out.timeMs, 123);
  assert.equal(out.size, 11);
  assert.equal(out.contentType, 'application/json');
  assert.deepEqual(out.headers, [['content-type', 'application/json'], ['x-a', '1:2']]);
  assert.equal(out.body, '{"ok":true}');
});
