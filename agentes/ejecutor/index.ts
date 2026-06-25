/**
 * AGENTE 2 — EJECUTOR DE TAREAS ("The Arm").
 *
 * Misión: acción directa y SEGURA — escribir archivos, ejecutar automatizaciones
 * y preparar cambios en ramas. Solo actúa bajo órdenes validadas y aprobadas.
 *
 * Privilegio mínimo:
 *  - `dryRun` por defecto: nada se aplica hasta que `approved === true`.
 *  - Sandbox: las escrituras de archivos quedan confinadas a `root` (sin `..`).
 *  - Allowlist de comandos: solo se permiten comandos no destructivos.
 *  - Git: crea ramas y commits locales; NUNCA hace push ni comandos destructivos.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { createLogger } from '../core/logger.js';
import type { ExecStep, ExecStepResult, ExecutionPlan, ExecutionResult } from '../core/types.js';

/** Comandos base permitidos (privilegio mínimo). Todo lo demás se rechaza. */
const DEFAULT_ALLOWED_COMMANDS = [
  'npm run lint',
  'npm run typecheck',
  'npm run test',
  'npm run build',
  'git status',
  'git add',
  'git checkout -b',
  'git commit',
];

/** Patrones SIEMPRE prohibidos, aunque coincidan con la allowlist. */
const FORBIDDEN = [/rm\s+-rf/, /git\s+push/, /--force/, /reset\s+--hard/, /sudo/, />\s*\/dev\//, /:\(\)\s*\{/];

export interface EjecutorOptions {
  /** Raíz del sandbox para escrituras de archivos. Por defecto, el cwd. */
  root?: string;
  /** Si true, aplica los cambios. Si false (defecto), simula (dry-run). */
  approved?: boolean;
  /** Comandos permitidos adicionales. */
  allowedCommands?: string[];
}

export class Ejecutor {
  private root: string;
  private approved: boolean;
  private allowed: string[];

  constructor(opts: EjecutorOptions = {}) {
    this.root = resolve(opts.root ?? process.cwd());
    this.approved = opts.approved ?? false;
    this.allowed = [...DEFAULT_ALLOWED_COMMANDS, ...(opts.allowedCommands ?? [])];
  }

  async execute(plan: ExecutionPlan): Promise<ExecutionResult> {
    const logger = createLogger(plan.taskId, 'ejecutor');
    const mode = this.approved ? 'APLICAR' : 'DRY-RUN (simulación)';
    logger('info', `Ejecutando plan (${plan.steps.length} pasos) en modo ${mode}`);

    const results: ExecStepResult[] = [];
    for (const step of plan.steps) {
      try {
        results.push(this.runStep(step, logger));
      } catch (err) {
        logger('error', `Paso fallido: ${step.description}`, { error: String(err) });
        results.push({ step, status: 'failed', detail: String(err) });
        break; // se detiene ante el primer fallo (fail-fast)
      }
    }

    const ok = results.every((r) => r.status === 'applied' || r.status === 'dry-run');
    logger('decision', `Plan finalizado: ${ok ? 'OK' : 'CON ERRORES'}`, {
      applied: results.filter((r) => r.status === 'applied').length,
    });
    return { taskId: plan.taskId, dryRun: !this.approved, results, ok };
  }

  private runStep(step: ExecStep, logger: ReturnType<typeof createLogger>): ExecStepResult {
    if (!this.approved) {
      logger('info', `[dry-run] ${step.description}`);
      return { step, status: 'dry-run', detail: 'No aplicado (falta aprobación)' };
    }

    switch (step.kind) {
      case 'noop':
        return { step, status: 'applied', detail: 'noop' };

      case 'writeFile': {
        const target = this.safePath(step.path);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, step.content, 'utf8');
        logger('info', `Archivo escrito: ${relative(this.root, target)}`);
        return { step, status: 'applied', detail: target };
      }

      case 'shell': {
        this.assertCommandAllowed(step.command);
        const out = this.runShell(step.command);
        logger('info', `Comando ejecutado: ${step.command}`);
        return { step, status: 'applied', detail: out.slice(0, 2000) };
      }

      case 'gitBranch': {
        if (!/^[\w./-]+$/.test(step.branch)) throw new Error(`Rama inválida: ${step.branch}`);
        const out = this.runShell(`git checkout -b ${step.branch}`);
        logger('info', `Rama creada: ${step.branch}`);
        return { step, status: 'applied', detail: out };
      }

      default:
        return { step, status: 'skipped', detail: 'Tipo de paso desconocido' };
    }
  }

  /** Garantiza que la ruta queda DENTRO del sandbox (anti path-traversal). */
  private safePath(p: string): string {
    const abs = isAbsolute(p) ? resolve(p) : resolve(this.root, p);
    const rel = relative(this.root, abs);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new Error(`Ruta fuera del sandbox bloqueada: ${p}`);
    }
    return abs;
  }

  private assertCommandAllowed(command: string): void {
    if (FORBIDDEN.some((re) => re.test(command))) {
      throw new Error(`Comando prohibido por seguridad: "${command}"`);
    }
    const allowed = this.allowed.some((a) => command === a || command.startsWith(a + ' '));
    if (!allowed) {
      throw new Error(`Comando no permitido (privilegio mínimo): "${command}"`);
    }
  }

  /** Ejecuta un comando de forma controlada (sin shell de usuario). */
  private runShell(command: string): string {
    const [bin, ...args] = command.split(' ');
    return execFileSync(bin, args, { cwd: this.root, encoding: 'utf8', stdio: 'pipe' });
  }
}
