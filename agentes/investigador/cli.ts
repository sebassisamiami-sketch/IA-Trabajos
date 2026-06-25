/**
 * CLI del Investigador.
 *   npm run investigar -- "comparar Wompi vs Mercado Pago en Colombia 2026"
 * Si existe PERPLEXITY_API_KEY en el entorno, usa búsqueda real; si no, avisa.
 */
import { randomUUID } from 'node:crypto';
import { Investigador, PerplexitySearchProvider } from './index.js';

async function main(): Promise<void> {
  const query = process.argv.slice(2).join(' ');
  if (!query) {
    // eslint-disable-next-line no-console
    console.error('Uso: npm run investigar -- "tu consulta"');
    process.exitCode = 1;
    return;
  }
  const key = process.env.PERPLEXITY_API_KEY;
  const provider = key ? new PerplexitySearchProvider(key) : undefined;
  const investigador = new Investigador({ provider });
  const result = await investigador.research(randomUUID().slice(0, 8), query);

  // eslint-disable-next-line no-console
  console.log('\nVerificado:', result.verified);
  // eslint-disable-next-line no-console
  console.log(result.synthesis);
  if (result.sources.length > 0) {
    // eslint-disable-next-line no-console
    console.log('\nFuentes:\n' + result.sources.map((s) => ` - ${s}`).join('\n'));
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
