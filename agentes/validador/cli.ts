/**
 * CLI del Validador.
 *   npm run validar -- scan <archivo>     # análisis estático de seguridad
 *   npm run validar -- gates              # corre lint/typecheck/test (allowlist)
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Validador } from './index.js';

function main(): void {
  const [mode, arg] = process.argv.slice(2);
  const validador = new Validador();
  const taskId = randomUUID().slice(0, 8);

  if (mode === 'scan' && arg) {
    const text = readFileSync(arg, 'utf8');
    const issues = validador.scanContent(text, arg);
    // eslint-disable-next-line no-console
    console.log(issues.length === 0 ? '✅ Sin incidencias de seguridad.' : JSON.stringify(issues, null, 2));
    if (issues.some((i) => i.severity === 'critical')) process.exitCode = 1;
    return;
  }

  if (mode === 'gates') {
    const report = validador.runQualityGates(taskId);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report.checks, null, 2));
    if (!report.passed) process.exitCode = 1;
    return;
  }

  // eslint-disable-next-line no-console
  console.error('Uso: npm run validar -- scan <archivo> | gates');
  process.exitCode = 1;
}

main();
