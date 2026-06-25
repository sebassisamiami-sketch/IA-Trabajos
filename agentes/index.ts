/**
 * Punto de entrada / demo del ecosistema de agentes.
 *
 * Uso:
 *   npm run demo -- "investigar la mejor pasarela de pago para Colombia"
 *
 * Ejecuta el ciclo completo en modo SEGURO (plan noop, sin aplicar cambios) y
 * muestra la traza. Reexporta las piezas para usarlas como librería.
 */
import { runTask } from './core/orchestrator.js';
import { printTrace } from './core/logger.js';
import { PerplexitySearchProvider } from './investigador/index.js';

export { runTask } from './core/orchestrator.js';
export { Investigador, StubSearchProvider, PerplexitySearchProvider } from './investigador/index.js';
export { Ejecutor } from './ejecutor/index.js';
export { Validador } from './validador/index.js';
export * from './core/types.js';
export { log, readLog, printTrace, createLogger, LOG_PATHS } from './core/logger.js';

async function main(): Promise<void> {
  const goal = process.argv.slice(2).join(' ') || 'Demostración del ecosistema de agentes';

  // Si hay clave de Perplexity en el entorno, el Investigador usa red real.
  const key = process.env.PERPLEXITY_API_KEY;
  const provider = key ? new PerplexitySearchProvider(key) : undefined;

  const outcome = await runTask({
    goal,
    provider,
    // Aprobación humana automática DENEGADA en la demo (seguro por diseño).
    approve: () => false,
  });

  // eslint-disable-next-line no-console
  console.log('\n=== Resultado ===');
  // eslint-disable-next-line no-console
  console.log('Estado:', outcome.status);
  // eslint-disable-next-line no-console
  console.log('Investigación verificada:', outcome.research.verified);
  // eslint-disable-next-line no-console
  console.log(outcome.research.synthesis);
  printTrace(outcome.task.id);
}

// Ejecuta main() solo si se invoca directamente (no al importarlo como librería).
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Error en la demo:', err);
    process.exitCode = 1;
  });
}
