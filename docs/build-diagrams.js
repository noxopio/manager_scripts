// Genera los diagramas de docs/ (*.svg) y la página docs/diagramas.html.
// Uso: node docs/build-diagrams.js            (escribe en esta misma carpeta)
//      node docs/build-diagrams.js <carpeta>  (escribe en otra carpeta)
// Para cambiar un diagrama, edita su bloque abajo y vuelve a ejecutar; no edites los .svg a mano.
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2] || __dirname;
fs.mkdirSync(OUT, { recursive: true });

const STYLE = `<style>
.bg{fill:#f5f7f7}
.ttl{font:700 16px system-ui,-apple-system,"Segoe UI",sans-serif;fill:#14201f}
.n{fill:#ffffff;stroke:#9fb0ae;stroke-width:1.2}
.n.hl{fill:#e2f2ef;stroke:#0d7a6f;stroke-width:1.6}
.n.bad{fill:#fbecea;stroke:#b5503f;stroke-width:1.4}
.n.dash{stroke-dasharray:5 4}
.t{font:700 13px ui-monospace,"Cascadia Mono",Consolas,Menlo,monospace;fill:#14201f;text-anchor:middle}
.s{font:400 11.5px system-ui,-apple-system,"Segoe UI",sans-serif;fill:#556563;text-anchor:middle}
.d{font:600 12.5px system-ui,-apple-system,"Segoe UI",sans-serif;fill:#14201f;text-anchor:middle}
.l{font:500 11px system-ui,-apple-system,"Segoe UI",sans-serif;fill:#556563;paint-order:stroke;stroke:#f5f7f7;stroke-width:4px;stroke-linejoin:round}
.st{text-anchor:start}
.e{fill:none;stroke:#14201f;stroke-width:1.3}
.e.dash{stroke-dasharray:5 4}
.e.acc{stroke:#0d7a6f}
.e.life{stroke:#9fb0ae;stroke-dasharray:3 4}
.ah{fill:#14201f}
.dot{fill:#14201f}
@media (prefers-color-scheme:dark){
.bg{fill:#0f1716}
.ttl,.t,.d{fill:#e3ecea}
.s,.l{fill:#94a6a3}
.l{stroke:#0f1716}
.n{fill:#172221;stroke:#4b5f5c}
.n.hl{fill:#163631;stroke:#4fc2b2}
.n.bad{fill:#3a1f1b;stroke:#e0806f}
.e{stroke:#e3ecea}
.e.acc{stroke:#4fc2b2}
.e.life{stroke:#4b5f5c}
.ah,.dot{fill:#e3ecea}
}
</style>`;

function svg(id, title, label, W, H, body) {
  const fullH = H + 44;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${fullH}" width="${W}" height="${fullH}" role="img" aria-label="${label}">
<title>${title}</title>
${STYLE}
<defs><marker id="ar-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="ah" d="M0 0 L10 5 L0 10 z"/></marker></defs>
<rect class="bg" x="0" y="0" width="${W}" height="${fullH}" rx="10"/>
<text class="ttl" x="40" y="30">${title}</text>
<g transform="translate(0,44)">
${body.replace(/MARK/g, `url(#ar-${id})`)}
</g>
</svg>
`;
}

// Caja con título y hasta dos líneas de texto
function box(x, y, w, h, cls, t, s1, s2) {
  const cx = x + w / 2;
  let out = `<rect class="n ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>`;
  const lines = [t, s1, s2].filter((v) => v != null).length;
  const top = y + h / 2 - (lines - 1) * 8 + 4;
  out += `<text class="t" x="${cx}" y="${top}">${t}</text>`;
  if (s1 != null) out += `<text class="s" x="${cx}" y="${top + 17}">${s1}</text>`;
  if (s2 != null) out += `<text class="s" x="${cx}" y="${top + 32}">${s2}</text>`;
  return out;
}
const line = (x1, y1, x2, y2, cls = '') => `<line class="e ${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="MARK"/>`;
const pline = (pts, cls = '') => `<polyline class="e ${cls}" points="${pts}" marker-end="MARK"/>`;
const seg = (x1, y1, x2, y2, cls = '') => `<line class="e ${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const lbl = (x, y, text, anchor = 'start') => `<text class="l" x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`;
const diamond = (cx, cy, hw, hh, text) =>
  `<polygon class="n" points="${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}"/><text class="d" x="${cx}" y="${cy + 4}">${text}</text>`;

const diagrams = [];

// ── 1. Arquitectura ──
diagrams.push({
  file: 'arquitectura.svg', title: 'Arquitectura de mfs',
  label: 'La terminal entra por mfs a manager_repo.sh; el navegador usa el frontend y server.js, que lanza manager_repo.sh por repo; debajo, remotos git, repos clonados, listRep.txt y procesos del sistema.',
  intro: 'El núcleo es <code>manager_repo.sh</code>. La terminal llega a él por la función <code>mfs</code>. El panel es opcional: <code>mfs ui</code> arranca <code>server.js</code>, que vuelve a llamar a <code>manager_repo.sh</code> una vez por repo.',
  W: 980, H: 540,
  body: [
    box(40, 20, 220, 52, '', 'Terminal', 'Git Bash, Linux o WSL'),
    box(620, 20, 320, 52, '', 'Navegador', 'http://127.0.0.1:&lt;puerto&gt;'),
    box(40, 110, 220, 52, '', 'mfs()', 'manager_rc.sh · cdlist y alias'),
    box(320, 110, 200, 52, 'dash', 'manager_install.sh', 'copia scripts y edita .bashrc'),
    box(620, 110, 320, 64, '', 'ui/index.html + js/*.js', 'repos · stream · lists · git · curl · palette', 'css/ por capas: tokens, base, layout…'),
    `<rect class="n hl" x="40" y="230" width="400" height="120" rx="6"/>`,
    `<text class="t" x="240" y="256">manager_repo.sh</text>`,
    `<text class="s" x="240" y="278">despacha: pull · run · install · updeps</text>`,
    `<text class="s" x="240" y="296">status · commit · push · checkout · newbranch · unlock</text>`,
    `<text class="s" x="240" y="324">usa manager_logs.sh · git-askpass.sh · url_extractor.sh</text>`,
    `<rect class="n hl" x="620" y="230" width="320" height="120" rx="6"/>`,
    `<text class="t" x="780" y="256">ui/server.js (Node ≥ 18)</text>`,
    `<text class="s" x="780" y="278">API REST /api/* · SSE /api/stream</text>`,
    `<text class="s" x="780" y="296">jobs: un bash por repo, log guardado en disco</text>`,
    `<text class="s" x="780" y="324">token git solo en memoria</text>`,
    box(40, 460, 170, 64, '', 'Remotos git', 'GitHub · Azure DevOps'),
    box(250, 460, 220, 64, '', 'Repos en WORK_DIR', 'clones · node_modules · mf vivos'),
    box(510, 460, 180, 64, '', 'listRep.txt', 'URL y comando por línea', 'marcas #NEW · #EXCLUDE'),
    box(730, 460, 210, 64, '', 'Procesos del SO', 'explorer · code · curl · taskkill'),
    line(150, 72, 150, 108), lbl(158, 95, 'mfs &lt;cmd&gt;'),
    line(320, 136, 262, 136, 'dash'), lbl(291, 128, 'instala', 'middle'),
    line(150, 162, 150, 228), lbl(158, 200, 'ejecuta'),
    line(780, 72, 780, 108), lbl(788, 95, 'carga'),
    line(720, 174, 720, 228), lbl(712, 205, 'fetch /api/*', 'end'),
    line(840, 230, 840, 176, 'acc'), lbl(848, 205, 'SSE: logs y estado'),
    line(440, 270, 618, 270), lbl(530, 262, 'ui: node server.js', 'middle'),
    line(620, 320, 442, 320), lbl(530, 312, 'spawn bash · MFS_ONLY', 'middle'),
    line(360, 350, 360, 458), lbl(352, 405, 'git · npm · run', 'end'),
    pline('420,350 420,410 560,410 560,458'), lbl(490, 402, 'lee la lista', 'middle'),
    line(650, 350, 650, 458), lbl(658, 405, 'PUT /api/list'),
    line(860, 350, 860, 458), lbl(868, 405, 'lanza'),
    `<line class="e" x1="250" y1="492" x2="212" y2="492" marker-start="MARK" marker-end="MARK"/>`, lbl(231, 484, 'git', 'middle'),
  ].join('\n'),
});

// ── 2. Flujo de una acción ──
const opt = (y, flag, a, b) =>
  `<text class="t st" x="726" y="${y}">${flag}</text><text class="s st" x="754" y="${y}">${a}</text><text class="s st" x="754" y="${y + 14}">${b}</text>`;
diagrams.push({
  file: 'flujo-accion.svg', title: 'Flujo de una acción',
  label: 'La terminal o el panel lanzan manager_repo.sh; el panel valida y lanza un job por repo libre; el script lee listRep.txt y ejecuta pull, deps, run, git o unlock; la salida va a la terminal o al panel por SSE.',
  intro: 'La terminal y el panel llegan al mismo script. El panel además valida la petición, lanza un proceso por repo con <code>MFS_ONLY</code> y lleva la salida al navegador en directo.',
  W: 980, H: 1000,
  body: [
    box(40, 20, 300, 52, 'hl', 'Terminal', 'mfs [-b rama] acción lista.txt'),
    box(600, 20, 340, 52, 'hl', 'Panel web', 'botón, atajo o paleta de comandos'),
    box(600, 110, 340, 56, '', 'POST /api/action', 'valida acción, rama, install, run y commit'),
    line(770, 72, 770, 108),
    diamond(770, 240, 90, 36, '¿repo ocupado?'), line(770, 166, 770, 202),
    box(420, 216, 200, 48, '', 'busy', 'ya está corriendo: no se lanza'),
    line(680, 240, 622, 240), lbl(651, 232, 'sí', 'middle'),
    box(600, 316, 340, 56, '', 'startJob (uno por repo)', 'spawn bash manager_repo.sh … · MFS_ONLY=repo'),
    line(770, 276, 770, 314), lbl(778, 300, 'no'),
    box(300, 420, 380, 52, 'hl', 'manager_repo.sh', 'lee las opciones (ver recuadro de la derecha)'),
    pline('190,72 190,446 298,446'), pline('770,372 770,446 682,446'),
    `<rect class="n dash" x="710" y="480" width="230" height="200" rx="6"/>`,
    `<text class="d" x="825" y="504">Opciones de manager_repo.sh</text>`,
    opt(530, '-b', 'rama para pull, checkout y', 'newbranch (por defecto main)'),
    opt(562, '-B', 'rama base de newbranch', '(vacío = HEAD actual)'),
    opt(594, '-i', 'comando de install / updeps', '(por defecto npm install)'),
    opt(626, '-r', 'comando de run; sustituye', 'al de cada línea del .txt'),
    opt(658, '-m', 'mensaje de commit', '(obligatorio en commit)'),
    diamond(490, 540, 100, 36, '¿comando sin lista?'), line(490, 472, 490, 502),
    box(40, 516, 260, 48, '', 'handle_non_list_command', 'ui · kill · ps · list · version · update'),
    line(390, 540, 302, 540), lbl(346, 532, 'sí', 'middle'),
    box(300, 616, 380, 56, '', 'lee listRep.txt', 'salta # y #EXCLUDE · filtra MFS_ONLY · marca #NEW'),
    line(490, 576, 490, 614), lbl(498, 600, 'no'),
    seg(490, 672, 490, 700), seg(126, 700, 854, 700), lbl(498, 692, 'según la acción'),
    ...[126, 308, 490, 672, 854].map((x) => line(x, 700, x, 718)),
    box(40, 720, 172, 64, '', 'pull_repos', 'clona o actualiza', 'en la rama -b'),
    box(222, 720, 172, 64, '', 'manage_deps', 'install / updeps', 'en paralelo'),
    box(404, 720, 172, 64, '', 'run_repos', 'un subshell por repo', '#NEW: terminal externa'),
    box(586, 720, 172, 64, '', 'for_each_repo', 'status · commit · push', 'checkout · newbranch'),
    box(768, 720, 172, 64, '', 'unlock_repos', 'borra index.lock', 'si git no está corriendo'),
    ...[126, 308, 490, 672, 854].map((x) => seg(x, 784, x, 806)), seg(126, 806, 854, 806),
    line(255, 806, 255, 834), lbl(263, 825, 'desde la terminal'),
    line(725, 806, 725, 834, 'acc'), lbl(733, 825, 'desde el panel'),
    box(40, 836, 430, 52, '', 'Salida en la terminal', 'mensajes de manager_logs.sh · código de salida'),
    box(510, 836, 430, 52, '', 'pushLog → SSE /api/stream', 'tarjeta y visor de log · en run: puerto, compilación y health'),
    box(510, 928, 430, 52, '', 'Al cerrar el proceso', '0 → ok · otro código → error · guarda log · resumen del lote'),
    line(725, 888, 725, 926),
    box(40, 928, 430, 52, 'dash', 'Detener: POST /api/stop', 'taskkill /T del árbol · «detenido» al liberar el puerto'),
    line(470, 954, 508, 954, 'dash'),
  ].join('\n'),
});

// ── 3. Instalación ──
diagrams.push({
  file: 'instalacion.svg', title: 'Instalación y actualización',
  label: 'manager_install.sh comprueba si existe ~/manager_scripts; si no, copia, fecha, da permisos y añade el bloque a .bashrc; con --force desinstala y reinstala; mfs update hace git pull y reinstala con --force.',
  intro: 'El instalador copia todo <code>Manager_install/</code> a <code>~/manager_scripts</code> y añade a <code>.bashrc</code> un bloque que carga <code>manager_rc.sh</code>. <code>mfs update</code> reutiliza la rama <code>--force</code> sin hacer preguntas.',
  W: 990, H: 720,
  body: [
    box(80, 20, 300, 52, 'hl', './manager_install.sh', 'opciones: --force · --help'),
    diamond(230, 140, 110, 36, '¿existe ~/manager_scripts?'), line(230, 72, 230, 102),
    diamond(480, 140, 70, 34, '¿--force?'), line(340, 140, 408, 140), lbl(374, 132, 'sí', 'middle'),
    box(590, 116, 150, 48, '', 'aviso y sale', 'ya instalado'), line(550, 140, 588, 140), lbl(569, 132, 'no', 'middle'),
    box(385, 216, 190, 64, '', 'manager_uninstall.sh', 'borra la carpeta y el bloque', 'de .bashrc; luego reinstala'),
    line(480, 174, 480, 214), lbl(488, 198, 'sí'),
    line(385, 248, 352, 248, 'dash'),
    line(230, 176, 230, 214), lbl(238, 198, 'no'),
    box(110, 216, 240, 52, '', 'copy_scripts', 'cp -r a INSTALL_DIR · guarda .source'),
    line(230, 268, 230, 294),
    box(110, 296, 240, 52, '', 'add_dates', 'fecha de instalación en la cabecera'),
    line(230, 348, 230, 374),
    box(110, 376, 240, 52, '', 'permissions', 'chmod +x *.sh'),
    line(230, 428, 230, 454),
    box(110, 456, 240, 64, '', 'create_alias', 'si .bashrc no tiene el bloque START:', 'source manager_rc.sh (define mfs)'),
    diamond(230, 588, 90, 34, '¿MFS_UPDATE=1?'), line(230, 520, 230, 552),
    box(360, 566, 170, 44, '', 'fin', 'sin preguntar nada'), line(320, 588, 358, 588), lbl(339, 580, 'sí', 'middle'),
    box(110, 660, 240, 52, '', '¿abrir la carpeta?', 'pregunta s/n y abre el explorador'),
    line(230, 622, 230, 658), lbl(238, 644, 'no'),
    box(770, 20, 180, 52, 'hl', 'mfs update', 'en manager_repo.sh'),
    line(860, 72, 860, 108),
    box(770, 110, 180, 52, '', 'lee .source', 'ruta del repo clonado'),
    line(860, 162, 860, 198),
    box(770, 200, 180, 52, '', 'git pull --ff-only', 'falla si hay cambios locales'),
    line(860, 252, 860, 288),
    box(770, 290, 180, 64, '', 'MFS_UPDATE=1', 'exec manager_install.sh', '--force, sin preguntas'),
    pline('770,322 480,322 480,282', 'acc'), lbl(625, 314, 'entra por --force', 'middle'),
  ].join('\n'),
});

// ── 4. Estados de un job ──
diagrams.push({
  file: 'estados-job.svg', title: 'Estados de un job del panel',
  label: 'Un job empieza en running; al cerrar pasa a ok o error; con stop pasa a stopping y a stopped cuando el proceso cerró, el kill terminó y el puerto quedó libre; en run hay subestados de compilación y health.',
  intro: 'Cada tarjeta del panel es un job de <code>server.js</code>. Mientras está en <code>running</code> o <code>stopping</code> no admite otra acción. En <code>run</code> se siguen además la compilación y el health check.',
  W: 980, H: 560,
  body: [
    `<circle class="dot" cx="60" cy="200" r="8"/>`,
    line(68, 200, 218, 200), lbl(143, 192, 'POST /api/action', 'middle'), lbl(143, 216, 'spawn bash', 'middle'),
    `<rect class="n hl" x="220" y="160" width="180" height="80" rx="18"/>`,
    `<text class="t" x="310" y="196">running</text><text class="s" x="310" y="214">busy: no admite otra acción</text>`,
    box(560, 40, 160, 52, '', 'ok', 'proceso cerrado con 0'),
    box(560, 174, 160, 52, 'bad', 'error', 'código ≠ 0 o fallo al lanzar'),
    box(560, 320, 160, 52, '', 'stopping', 'deteniendo el árbol'),
    box(800, 320, 150, 52, '', 'stopped', '«detenido»'),
    pline('310,160 310,66 558,66'), lbl(440, 58, 'close · código 0', 'middle'),
    line(400, 200, 558, 200), lbl(480, 192, 'close · código ≠ 0', 'middle'), lbl(480, 216, 'o error de spawn', 'middle'),
    pline('310,240 310,346 558,346'), lbl(440, 338, 'POST /api/stop', 'middle'),
    line(720, 346, 798, 346), lbl(759, 338, 'kill + close', 'middle'), lbl(759, 364, '+ puerto libre', 'middle'),
    `<rect class="n dash" x="790" y="40" width="160" height="80" rx="6"/>`,
    `<text class="d" x="870" y="64">Estados finales</text>`,
    `<text class="s" x="870" y="84">ok, error y stopped</text><text class="s" x="870" y="100">se pueden volver a lanzar</text>`,
    `<rect class="n dash" x="790" y="160" width="160" height="96" rx="6"/>`,
    `<text class="d" x="870" y="184">waitPortFree</text>`,
    `<text class="s" x="870" y="204">espera hasta 20 s a que</text><text class="s" x="870" y="220">el puerto quede libre; si no,</text><text class="s" x="870" y="236">avisa en el log</text>`,
    `<rect class="n dash" x="40" y="400" width="910" height="140" rx="6"/>`,
    `<text class="d st" x="60" y="424">Solo en run, dentro de running</text>`,
    box(60, 446, 170, 56, '', 'compiling', 'puerto: PORT_RE en el log'),
    box(340, 430, 130, 40, 'hl', 'ready'),
    box(340, 486, 130, 40, 'bad', 'failed'),
    line(230, 466, 338, 452), lbl(284, 450, 'OK o TCP', 'middle'),
    line(230, 482, 338, 504), lbl(284, 510, 'error', 'middle'),
    box(590, 426, 250, 48, '', 'checkHealth', 'fetch cada 15 s · timeout 3 s'),
    line(470, 450, 588, 450), lbl(529, 442, 'con #> health:', 'middle'),
  ].join('\n'),
});

// ── 5. Árbol de procesos y parada ──
const elbow = (x, y1, y2, x2) => pline(`${x},${y1} ${x},${y2} ${x2},${y2}`);
diagrams.push({
  file: 'procesos-parada.svg', title: 'Árbol de procesos y parada',
  label: 'node server.js lanza bash manager_repo.sh, que abre un subshell con npm y el node del microfrontend; en Windows el panel busca el grupo de procesos con ps y mata cada árbol con taskkill; en Unix mata el grupo con SIGTERM.',
  intro: 'Es la parte más delicada. En Git Bash los subshells se crean con <code>fork</code> y pierden el padre de Windows, así que <code>taskkill /T</code> sobre el bash no llega a npm ni a node. El panel busca el grupo de procesos de MSYS y mata cada árbol por separado.',
  W: 980, H: 580,
  body: [
    `<text class="d st" x="40" y="36">Árbol de un job run</text>`,
    box(40, 52, 300, 52, 'hl', 'node ui/server.js', 'panel · un job por repo'),
    elbow(60, 104, 168, 78),
    box(80, 142, 300, 52, '', 'bash manager_repo.sh', 'spawn · MFS_ONLY=repo · detached en Unix'),
    elbow(108, 194, 258, 118),
    box(120, 232, 300, 52, '', '( cd repo; eval cmd ) &amp;', 'subshell en segundo plano (fork)'),
    elbow(140, 284, 348, 158),
    box(160, 322, 300, 52, '', 'npm run start', 'o el comando de la lista / -r'),
    elbow(180, 374, 438, 198),
    box(200, 412, 260, 52, '', 'node del microfrontend', 'escucha en el puerto'),
    line(92, 194, 92, 500), lbl(84, 480, 'run_repos', 'end'),
    box(40, 502, 340, 52, 'dash', '#NEW: start bash -c …', 'ventana externa; su log no llega al panel'),
    `<text class="d st" x="520" y="36">Parada en Windows (Git Bash)</text>`,
    box(520, 52, 410, 52, 'bad', 'taskkill /T sobre el bash no basta', 'el fork de MSYS pierde el padre de Windows'),
    line(725, 104, 725, 134), lbl(733, 124, 'por eso'),
    box(520, 136, 410, 48, '', 'bash -c ps', 'fila del bash raíz por su WINPID → su PGID'),
    line(725, 184, 725, 204),
    box(520, 206, 410, 48, '', 'mismo PGID', 'todos los WINPID de ese grupo de procesos'),
    line(725, 254, 725, 274),
    box(520, 276, 410, 48, 'hl', 'taskkill /T /F /PID … /PID …', 'mata cada árbol nativo (killWindowsTree)'),
    `<text class="d st" x="520" y="364">Parada en Linux / macOS</text>`,
    box(520, 376, 410, 48, '', 'kill(-pid, SIGTERM)', 'el bash tiene grupo propio (detached)'),
    line(725, 424, 725, 460),
    pline('930,300 955,300 955,488 932,488'),
    box(520, 462, 410, 52, '', 'finishStop', 'close + kill hecho + puerto libre → stopped'),
  ].join('\n'),
});

// ── 6. Límites de seguridad ──
diagrams.push({
  file: 'seguridad.svg', title: 'Límites de seguridad del panel',
  label: 'Las peticiones pasan por escuchar solo en 127.0.0.1, la comprobación de Host y cabecera X-MFS, la validación de /api/action y las rutas confinadas a WORK_DIR antes de llegar a bash; el token git solo vive en memoria y llega a git por GIT_ASKPASS.',
  intro: 'El panel ejecuta comandos en tu máquina, así que cada petición pasa por varias capas antes de llegar a bash. Lo que no protege: los comandos de <code>listRep.txt</code> y de <code>-r</code> se ejecutan con <code>eval</code>, así que hay que confiar en la lista.',
  W: 980, H: 600,
  body: [
    box(40, 20, 560, 48, '', 'Navegador u otra web abierta', 'cualquier petición al puerto del panel'),
    line(320, 68, 320, 98),
    box(40, 100, 560, 52, '', 'server.listen(127.0.0.1)', 'no escucha en la red: solo esta máquina'),
    line(320, 152, 320, 182),
    box(40, 184, 560, 64, 'hl', 'allowed()', 'Host debe ser 127.0.0.1:PORT o localhost:PORT (DNS rebinding)', 'todo lo que no es GET lleva la cabecera X-MFS: 1 (CSRF)'),
    box(660, 194, 280, 44, 'bad', '403 Prohibido'), line(600, 216, 658, 216), lbl(629, 208, 'no', 'middle'),
    line(320, 248, 320, 278),
    `<rect class="n hl" x="40" y="280" width="560" height="84" rx="6"/>`,
    `<text class="t" x="320" y="302">validación de /api/action</text>`,
    `<text class="s" x="320" y="320">acción en ACTIONS · rama: BRANCH_RE + git check-ref-format</text>`,
    `<text class="s" x="320" y="336">install: INSTALL_CMD_RE, sin ; &amp; | &lt; &gt; \` $ ni saltos de línea</text>`,
    `<text class="s" x="320" y="352">run ≤ 500 caracteres sin saltos · commit obligatorio ≤ 2000</text>`,
    box(660, 300, 280, 44, 'bad', '400 con el motivo'), line(600, 322, 658, 322), lbl(629, 314, 'no', 'middle'),
    line(320, 364, 320, 394),
    box(40, 396, 560, 64, 'hl', 'rutas confinadas', 'resolveRepoDir: el repo está en la lista y dentro de WORK_DIR', 'listas nuevas solo dentro de WORK_DIR (isInside)'),
    line(320, 460, 320, 490),
    box(40, 492, 560, 52, 'bad', 'bash manager_repo.sh', 'eval del comando de la lista o de -r: se confía en listRep.txt'),
    `<rect class="n dash" x="640" y="380" width="320" height="216" rx="6"/>`,
    `<text class="d" x="800" y="402">Token git</text>`,
    box(660, 414, 280, 44, '', 'POST /api/token', 'solo en memoria (gitToken)'),
    line(800, 458, 800, 476),
    box(660, 478, 280, 44, '', 'MFS_GIT_TOKEN', 'variable de entorno del bash'),
    line(800, 522, 800, 540),
    box(660, 542, 280, 44, '', 'GIT_ASKPASS', 'git-askpass.sh · credential.helper vacío'),
    line(660, 500, 602, 516), lbl(618, 500, 'env', 'end'),
  ].join('\n'),
});

// ── 7. Secuencia del panel ──
const lanes = { nav: 120, srv: 400, bash: 640, mf: 860 };
const msg = (y, from, to, text, cls = '') => {
  const x1 = lanes[from], x2 = lanes[to];
  const dir = x2 > x1 ? 1 : -1;
  return line(x1 + dir * 4, y, x2 - dir * 6, y, cls) + lbl((x1 + x2) / 2, y - 6, text, 'middle');
};
const note = (y, x, w, text) =>
  `<rect class="n dash" x="${x}" y="${y - 14}" width="${w}" height="22" rx="4"/><text class="l" x="${x + 8}" y="${y + 1}">${text}</text>`;
diagrams.push({
  file: 'secuencia-panel.svg', title: 'Secuencia de un run desde el panel',
  label: 'El navegador abre el SSE, pide run, server.js lanza bash, que arranca el microfrontend; la salida vuelve por SSE con puerto, compilación y health; al detener, server.js mata el árbol, espera a que se libere el puerto y avisa de stopped.',
  intro: 'Un <code>run</code> de principio a fin. Las flechas verdes son eventos SSE. El navegador no pregunta por el estado: todo le llega por <code>/api/stream</code>.',
  W: 980, H: 720,
  body: [
    ...Object.entries({ nav: 'Navegador', srv: 'ui/server.js', bash: 'bash', mf: 'npm / node del mf' }).map(([k, t]) =>
      box(lanes[k] - 90, 10, 180, 40, k === 'srv' ? 'hl' : '', t) + seg(lanes[k], 50, lanes[k], 712, 'life')),
    msg(90, 'nav', 'srv', 'GET /api/stream (SSE abierto)'),
    msg(126, 'nav', 'srv', 'POST /api/action {run, repos}'),
    note(158, 410, 170, 'valida y llama a startJob'),
    msg(196, 'srv', 'bash', 'spawn bash manager_repo.sh run'),
    msg(226, 'srv', 'nav', '200 {started, busy}', 'dash'),
    msg(256, 'srv', 'nav', 'SSE status: running', 'acc'),
    msg(286, 'bash', 'mf', '( cd; eval npm run start ) &amp;'),
    msg(316, 'mf', 'srv', 'stdout / stderr (a través de bash)', 'dash'),
    msg(346, 'srv', 'nav', 'SSE log: cada línea (pushLog)', 'acc'),
    note(378, 410, 330, 'PORT_RE da el puerto · COMPILE_OK_RE o TCP → ready'),
    msg(416, 'srv', 'nav', 'SSE status: puerto y compile ready', 'acc'),
    msg(446, 'srv', 'mf', 'checkHealth: GET health cada 15 s'),
    msg(476, 'mf', 'srv', '200 o sin respuesta', 'dash'),
    seg(40, 504, 940, 504, 'life'), lbl(48, 498, 'Detener'),
    msg(534, 'nav', 'srv', 'POST /api/stop'),
    msg(564, 'srv', 'nav', 'SSE status: stopping', 'acc'),
    msg(594, 'srv', 'mf', 'killWindowsTree: taskkill /T al grupo'),
    msg(624, 'bash', 'srv', 'close (código)', 'dash'),
    msg(654, 'srv', 'mf', 'waitPortFree: ¿puerto libre?'),
    msg(690, 'srv', 'nav', 'SSE status: stopped', 'acc'),
  ].join('\n'),
});

// ── Escribir ──
for (const d of diagrams) fs.writeFileSync(path.join(OUT, d.file), svg(d.file.replace('.svg', ''), d.title, d.label, d.W, d.H, d.body), 'utf8');

const sections = diagrams.map((d) => `
  <section id="${d.file.replace('.svg', '')}">
    <h2>${d.title}</h2>
    <p>${d.intro}</p>
    <figure><div class="scroll"><img src="${d.file}" alt="${d.label}" width="${d.W}" height="${d.H + 44}"></div>
    <figcaption><a href="${d.file}">${d.file}</a></figcaption></figure>
  </section>`).join('\n');

fs.writeFileSync(path.join(OUT, 'diagramas.html'), `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Mapa de manager_scripts</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* Una columna de lectura; cada diagrama es un SVG suelto de docs/ con scroll horizontal si no cabe */
:root { --bg:#f5f7f7; --surface:#ffffff; --fg:#14201f; --muted:#556563; --line:#9fb0ae; --accent:#0d7a6f;
  --f-display:"Segoe UI Semibold", system-ui, sans-serif; --f-body:system-ui, -apple-system, "Segoe UI", sans-serif; --f-mono:ui-monospace, "Cascadia Mono", Consolas, monospace; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#0f1716; --surface:#172221; --fg:#e3ecea; --muted:#94a6a3; --line:#4b5f5c; --accent:#4fc2b2; color-scheme:dark } }
:root[data-theme="dark"] { --bg:#0f1716; --surface:#172221; --fg:#e3ecea; --muted:#94a6a3; --line:#4b5f5c; --accent:#4fc2b2; color-scheme:dark }
body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.55 var(--f-body); }
main { max-width:1060px; margin:0 auto; padding-block:40px 64px; padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)); display:grid; gap:44px; }
header { display:grid; gap:10px; max-width:70ch; }
.eyebrow { font:600 12px/1 var(--f-mono); letter-spacing:.08em; text-transform:uppercase; color:var(--accent); }
h1, h2 { font-family:var(--f-display); text-wrap:balance; margin:0; }
h1 { font-size:2rem; line-height:1.15; } h2 { font-size:1.3rem; }
p { margin:0; } section > p { max-width:72ch; color:var(--muted); }
code { font-family:var(--f-mono); font-size:.9em; }
nav ol { margin:0; padding-left:1.2em; columns:2; column-gap:32px; }
a { color:var(--accent); }
section { display:grid; gap:14px; }
figure { margin:0; border:1px solid var(--line); border-radius:10px; overflow:hidden; background:var(--surface); }
.scroll { overflow-x:auto; }
.scroll img { display:block; width:100%; min-width:760px; height:auto; }
figcaption { padding:10px 16px; border-top:1px solid var(--line); font:13px var(--f-mono); }
@media (max-width:600px) { nav ol { columns:1; } }
</style></head><body>
<main>
  <header>
    <span class="eyebrow">manager_scripts · docs</span>
    <h1>Cómo está montado mfs</h1>
    <p>Siete vistas del mismo sistema, de lo general a lo concreto. Cada diagrama es un SVG de esta carpeta. Todos los nombres son archivos, rutas, funciones o variables reales de <code>Manager_install/</code>.</p>
    <nav><ol>${diagrams.map((d) => `<li><a href="#${d.file.replace('.svg', '')}">${d.title}</a></li>`).join('')}</ol></nav>
  </header>
${sections}
</main>
</body></html>
`, 'utf8');
console.log('ok', diagrams.map((d) => d.file).join(', '));
