/**
 * Tipos compartidos del ecosistema de agentes.
 *
 * Diseño desacoplado: ningún tipo depende del proyecto "Ana Variedades", por lo
 * que esta carpeta puede copiarse tal cual a cualquier repositorio.
 */

export type AgentName = 'investigador' | 'ejecutor' | 'validador' | 'orquestador';

export type LogLevel = 'info' | 'warn' | 'error' | 'decision' | 'human';

/** Una tarea de alto nivel que el agente principal delega al ecosistema. */
export interface Task {
  id: string;
  goal: string;
  context?: string;
  createdAt: string;
}

/* --------------------------- Investigador --------------------------- */

export interface ResearchFinding {
  /** De dónde sale el dato (URL, archivo, base de datos…). Obligatorio: sin
   *  fuente, el hallazgo se marca como NO verificado (anti-alucinación). */
  source: string;
  summary: string;
  /** 0..1 — confianza estimada según calidad/recencia de la fuente. */
  confidence: number;
}

export interface ResearchResult {
  query: string;
  findings: ResearchFinding[];
  /** Síntesis final. `verified` es false si no hubo fuentes citables. */
  synthesis: string;
  verified: boolean;
  sources: string[];
}

/** Proveedor de búsqueda enchufable (Perplexity, Bing, etc.). */
export interface SearchProvider {
  readonly name: string;
  search(query: string): Promise<ResearchFinding[]>;
}

/* ----------------------------- Ejecutor ----------------------------- */

export type RiskLevel = 'low' | 'medium' | 'high';

export type ExecStep =
  | { kind: 'noop'; description: string; risk?: RiskLevel }
  | { kind: 'writeFile'; description: string; path: string; content: string; risk?: RiskLevel }
  | { kind: 'shell'; description: string; command: string; risk?: RiskLevel }
  | { kind: 'gitBranch'; description: string; branch: string; risk?: RiskLevel };

export interface ExecutionPlan {
  taskId: string;
  steps: ExecStep[];
}

export interface ExecStepResult {
  step: ExecStep;
  status: 'applied' | 'skipped' | 'failed' | 'dry-run';
  detail?: string;
}

export interface ExecutionResult {
  taskId: string;
  dryRun: boolean;
  results: ExecStepResult[];
  ok: boolean;
}

/* ---------------------------- Validador ----------------------------- */

export interface ValidationIssue {
  severity: 'info' | 'warning' | 'critical';
  rule: string;
  message: string;
  location?: string;
}

export interface ValidationReport {
  taskId: string;
  passed: boolean;
  /** Si es true, el orquestador DEBE pedir aprobación humana antes de continuar. */
  requiresHumanApproval: boolean;
  issues: ValidationIssue[];
  checks: { name: string; passed: boolean; detail?: string }[];
}

/* ------------------------------ Logs -------------------------------- */

export interface LogEntry {
  ts: string;
  taskId: string;
  agent: AgentName;
  level: LogLevel;
  action: string;
  data?: unknown;
}
