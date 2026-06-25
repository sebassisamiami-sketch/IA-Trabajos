/**
 * AGENTE 3 — CONTROL Y VALIDACIÓN ("The Guard").
 *
 * Misión: supervisión extrema. Revisa seguridad, coherencia y calidad ANTES de
 * la entrega. Es el filtro final: si detecta una vulnerabilidad o un fallo de
 * lógica, marca la tarea como NO aprobada para que el Ejecutor la corrija.
 *
 * Human-in-the-loop: cuando hay cambios de riesgo alto o críticos, exige
 * aprobación humana explícita (`requiresHumanApproval`).
 *
 * Privilegio mínimo: análisis estático + ejecución de "quality gates" mediante
 * una allowlist de comandos no destructivos.
 */
import { execFileSync } from 'node:child_process';
import { createLogger } from '../core/logger.js';
import type {
  ExecutionPlan,
  ValidationIssue,
  ValidationReport,
} from '../core/types.js';

/** Reglas de seguridad por análisis estático (regex). Ampliable. */
const SECURITY_RULES: { rule: string; re: RegExp; severity: ValidationIssue['severity']; message: string }[] = [
  { rule: 'secret-hardcoded', re: /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{12,}['"]/i, severity: 'critical', message: 'Posible secreto embebido en el código.' },
  { rule: 'private-key', re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, severity: 'critical', message: 'Clave privada embebida.' },
  { rule: 'eval', re: /\beval\s*\(/, severity: 'critical', message: 'Uso de eval(): riesgo de ejecución arbitraria.' },
  { rule: 'child-process-concat', re: /exec(Sync)?\s*\(\s*[`'"][^`'"]*\$\{/, severity: 'warning', message: 'Comando con interpolación: posible inyección de shell.' },
  { rule: 'dangerous-html', re: /dangerouslySetInnerHTML/, severity: 'warning', message: 'Inserción de HTML sin sanear: posible XSS.' },
  { rule: 'http-insecure', re: /http:\/\/(?!localhost|127\.0\.0\.1)/, severity: 'info', message: 'URL sin HTTPS.' },
];

export interface ValidadorOptions {
  /** Directorio donde correr los quality gates (lint/test). Por defecto, cwd. */
  cwd?: string;
  /** Comandos de calidad permitidos. */
  allowedGates?: string[];
}

const DEFAULT_GATES = ['npm run lint', 'npm run typecheck', 'npm run test'];

export class Validador {
  private cwd: string;
  private allowedGates: string[];

  constructor(opts: ValidadorOptions = {}) {
    this.cwd = opts.cwd ?? process.cwd();
    this.allowedGates = opts.allowedGates ?? DEFAULT_GATES;
  }

  /** Análisis estático de un texto/código. Devuelve incidencias de seguridad. */
  scanContent(text: string, location?: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const r of SECURITY_RULES) {
      if (r.re.test(text)) {
        issues.push({ severity: r.severity, rule: r.rule, message: r.message, location });
      }
    }
    return issues;
  }

  /**
   * Valida un plan de ejecución ANTES de aplicarlo: escanea el contenido de los
   * archivos a escribir y evalúa el riesgo de cada paso.
   */
  validatePlan(plan: ExecutionPlan): ValidationReport {
    const logger = createLogger(plan.taskId, 'validador');
    const issues: ValidationIssue[] = [];

    for (const step of plan.steps) {
      if (step.kind === 'writeFile') issues.push(...this.scanContent(step.content, step.path));
      if ((step.risk ?? 'low') === 'high') {
        issues.push({ severity: 'warning', rule: 'high-risk-step', message: `Paso de riesgo alto: ${step.description}`, location: step.description });
      }
    }

    const critical = issues.filter((i) => i.severity === 'critical');
    const hasHighRisk = plan.steps.some((s) => (s.risk ?? 'low') === 'high');
    const passed = critical.length === 0;
    const requiresHumanApproval = !passed || hasHighRisk;

    const checks = [
      { name: 'sin-secretos-ni-vulnerabilidades-criticas', passed: critical.length === 0 },
      { name: 'pasos-de-riesgo-controlados', passed: !hasHighRisk },
    ];

    logger(passed ? 'decision' : 'error', passed ? 'Plan validado' : 'Plan RECHAZADO (devuélvelo al ejecutor)', {
      issues: issues.length,
      critical: critical.length,
      requiresHumanApproval,
    });
    if (requiresHumanApproval) logger('human', 'Se requiere aprobación humana antes de continuar.');

    return { taskId: plan.taskId, passed, requiresHumanApproval, issues, checks };
  }

  /**
   * Ejecuta los "quality gates" (lint, typecheck, tests) sobre el código real.
   * Devuelve el reporte combinado. Solo permite comandos de la allowlist.
   */
  runQualityGates(taskId: string, gates: string[] = this.allowedGates): ValidationReport {
    const logger = createLogger(taskId, 'validador');
    const checks: ValidationReport['checks'] = [];
    const issues: ValidationIssue[] = [];

    for (const gate of gates) {
      if (!this.allowedGates.includes(gate)) {
        issues.push({ severity: 'warning', rule: 'gate-no-permitido', message: `Gate no permitido: ${gate}` });
        continue;
      }
      const [bin, ...args] = gate.split(' ');
      try {
        execFileSync(bin, args, { cwd: this.cwd, stdio: 'pipe', encoding: 'utf8' });
        checks.push({ name: gate, passed: true });
        logger('info', `Gate OK: ${gate}`);
      } catch (err) {
        checks.push({ name: gate, passed: false, detail: String(err).slice(0, 500) });
        issues.push({ severity: 'critical', rule: 'gate-fallido', message: `Falló: ${gate}` });
        logger('error', `Gate FALLÓ: ${gate}`);
      }
    }

    const passed = checks.every((c) => c.passed);
    return { taskId, passed, requiresHumanApproval: !passed, issues, checks };
  }
}
