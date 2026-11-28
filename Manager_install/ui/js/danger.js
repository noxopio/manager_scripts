// Detección de comandos destructivos para "Run con" (-r): borran archivos, reescriben historial git o tocan discos.
// Pura (sin DOM): la usan el panel (confirmación reforzada) y server.js (rechaza sin confirmación).
// La misma lista está en Bash: is_dangerous_cmd() de manager_repo.sh — si cambias una, cambia la otra.
const ARGS = String.raw`(?:[^|;&]*\s)?`; // argumentos intermedios dentro del mismo comando (hasta | ; &)

export const DANGER_RULES = [
  new RegExp(String.raw`\brm\s+${ARGS}(?:-[a-z]*[rf][a-z]*|--recursive|--force)`, 'i'), // rm -rf, rm -fr, rm -R, rm --force
  new RegExp(String.raw`\b(?:rmdir|rd)\s+${ARGS}\/s\b`, 'i'),                            // rmdir /s, rd /s (cmd)
  new RegExp(String.raw`\bdel\s+${ARGS}\/[sfq]\b`, 'i'),                                 // del /s /f /q (cmd)
  /\bremove-item\b[^|;&]*-recurse/i,                                                      // PowerShell
  /\bfind\b[^|;&]*\s-delete\b/i,
  /\bxargs\s+(?:-\S+\s+)*rm\b/i,
  new RegExp(String.raw`\bgit\s+clean\s+${ARGS}-[a-z]*f`, 'i'),                          // git clean -f / -fdx
  new RegExp(String.raw`\bgit\s+reset\s+${ARGS}--hard\b`, 'i'),
  /\bgit\s+push\b[^|;&]*\s(?:--force|-f\b|\+\S)/i,                                         // --force, -f, +rama
  new RegExp(String.raw`\bgit\s+checkout\s+${ARGS}--\s+\.`, 'i'),                        // git checkout -- .
  new RegExp(String.raw`\bgit\s+restore\s+${ARGS}\.(?:\s|$)`, 'i'),                      // git restore .
  /\bmkfs\b/i,
  /\bdd\s+[^|;&]*\bif=/i,
  /\bformat\s+[a-z]:/i,
];

export function isDangerousCmd(cmd) {
  const s = String(cmd || '');
  return DANGER_RULES.some((re) => re.test(s));
}
