/**
 * Sistema de logs para trazabilidad del 100% de las acciones.
 *
 * Escribe en `agentes/logs/agents.log` en formato JSONL (una línea JSON por
 * evento), fácil de leer por humanos y por máquinas. Cada entrada registra QUÉ
 * agente hizo QUÉ, con qué datos y cuándo, permitiendo reconstruir el
 * razonamiento completo de una tarea.
 */
import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AgentName, LogEntry, LogLevel } from './types.js';

const HERE = dirname(fileURLToPath(import.meta.url));
/** Carpeta de logs: `agentes/logs` (sube desde core/ o dist/core/). */
const LOGS_DIR = join(HERE, '..', '..', 'logs');
const LOG_FILE = join(LOGS_DIR, 'agents.log');

function ensureDir(): void {
  if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true });
}

/** Registra un evento en el log JSONL y lo refleja en consola. */
export function log(entry: Omit<LogEntry, 'ts'>): LogEntry {
  const full: LogEntry = { ts: new Date().toISOString(), ...entry };
  ensureDir();
  try {
    appendFileSync(LOG_FILE, JSON.stringify(full) + '\n', 'utf8');
  } catch {
    /* nunca interrumpimos al agente por un fallo de log */
  }
  const tag = `[${full.agent}:${full.level}]`;
  // eslint-disable-next-line no-console
  console.log(`${full.ts} ${tag} ${full.action}`);
  return full;
}

/** Devuelve un logger ya ligado a una tarea y un agente concretos. */
export function createLogger(taskId: string, agent: AgentName) {
  return (level: LogLevel, action: string, data?: unknown) =>
    log({ taskId, agent, level, action, data });
}

/** Lee y parsea todas las entradas del log (para auditoría/depuración). */
export function readLog(): LogEntry[] {
  if (!existsSync(LOG_FILE)) return [];
  return readFileSync(LOG_FILE, 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      try {
        return JSON.parse(l) as LogEntry;
      } catch {
        return null;
      }
    })
    .filter((e): e is LogEntry => e !== null);
}

/** Imprime una traza legible de una tarea (su "razonamiento" paso a paso). */
export function printTrace(taskId: string): void {
  const rows = readLog().filter((e) => e.taskId === taskId);
  if (rows.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`No hay registros para la tarea ${taskId}.`);
    return;
  }
  // eslint-disable-next-line no-console
  console.log(`\n=== Traza de la tarea ${taskId} ===`);
  for (const r of rows) {
    // eslint-disable-next-line no-console
    console.log(` ${r.ts}  ${r.agent.padEnd(12)} ${r.level.padEnd(8)} ${r.action}`);
  }
}

export const LOG_PATHS = { dir: LOGS_DIR, file: LOG_FILE };
