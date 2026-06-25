/**
 * ORQUESTADOR — coordina el ciclo Investigador → (plan) → Validador →
 * [aprobación humana] → Ejecutor → Validador (gates), registrando cada paso.
 *
 * Este es el "agente principal" programático: delega en los especialistas y
 * aplica el protocolo Human-in-the-loop. Todo queda trazado en los logs.
 */
import { randomUUID } from 'node:crypto';
import { createLogger } from './logger.js';
import type {
  ExecutionPlan,
  ExecutionResult,
  ResearchResult,
  Task,
  ValidationReport,
} from './types.js';
import { Investigador } from '../investigador/index.js';
import { Ejecutor } from '../ejecutor/index.js';
import { Validador } from '../validador/index.js';
import type { SearchProvider } from './types.js';

export interface OrchestratorInput {
  goal: string;
  context?: string;
  /** Proveedor de búsqueda para el Investigador (opcional). */
  provider?: SearchProvider;
  /**
   * Construye el plan de ejecución a partir de la investigación. Si se omite, se
   * usa un plan "noop" (no hace cambios), útil para demostraciones seguras.
   */
  planFactory?: (task: Task, research: ResearchResult) => ExecutionPlan;
  /** Carpeta sandbox/cwd para Ejecutor y Validador. */
  root?: string;
  /**
   * Callback de APROBACIÓN HUMANA. Recibe la validación del plan y debe devolver
   * true para continuar. Por defecto: rechaza (seguro por diseño).
   */
  approve?: (report: ValidationReport, plan: ExecutionPlan) => Promise<boolean> | boolean;
  /** Quality gates a ejecutar tras aplicar (lint/test…). Vacío = no ejecutar. */
  qualityGates?: string[];
}

export interface OrchestratorOutcome {
  task: Task;
  research: ResearchResult;
  planReport: ValidationReport;
  approved: boolean;
  execution?: ExecutionResult;
  finalReport?: ValidationReport;
  status: 'completed' | 'blocked-by-validation' | 'rejected-by-human' | 'execution-failed';
}

export async function runTask(input: OrchestratorInput): Promise<OrchestratorOutcome> {
  const task: Task = {
    id: randomUUID().slice(0, 8),
    goal: input.goal,
    context: input.context,
    createdAt: new Date().toISOString(),
  };
  const logger = createLogger(task.id, 'orquestador');
  logger('info', `Nueva tarea: ${task.goal}`);

  // 1) Investigación (anti-alucinación).
  const investigador = new Investigador({ provider: input.provider });
  const research = await investigador.research(task.id, task.goal);

  // 2) Plan (lo aporta el agente principal; por defecto, noop seguro).
  const plan: ExecutionPlan =
    input.planFactory?.(task, research) ??
    { taskId: task.id, steps: [{ kind: 'noop', description: 'Sin cambios (demo segura)' }] };

  // 3) Validación previa del plan.
  const validador = new Validador({ cwd: input.root });
  const planReport = validador.validatePlan(plan);
  if (!planReport.passed) {
    logger('decision', 'Bloqueado por el Validador: se devuelve al Ejecutor para corrección.');
    return { task, research, planReport, approved: false, status: 'blocked-by-validation' };
  }

  // 4) Aprobación humana si es necesaria.
  let approved = true;
  if (planReport.requiresHumanApproval) {
    const decide = input.approve ?? (() => false);
    approved = await decide(planReport, plan);
    logger('human', `Decisión humana: ${approved ? 'APROBADO' : 'RECHAZADO'}`);
    if (!approved) {
      return { task, research, planReport, approved: false, status: 'rejected-by-human' };
    }
  }

  // 5) Ejecución (aplica solo si está aprobada).
  const ejecutor = new Ejecutor({ root: input.root, approved });
  const execution = await ejecutor.execute(plan);
  if (!execution.ok) {
    return { task, research, planReport, approved, execution, status: 'execution-failed' };
  }

  // 6) Quality gates finales (opcional).
  let finalReport: ValidationReport | undefined;
  if (input.qualityGates && input.qualityGates.length > 0) {
    finalReport = validador.runQualityGates(task.id, input.qualityGates);
  }

  logger('decision', 'Tarea completada.');
  return { task, research, planReport, approved, execution, finalReport, status: 'completed' };
}
