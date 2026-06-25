/**
 * AGENTE 1 — INVESTIGADOR Y SÍNTESIS ("The Brain").
 *
 * Misión: eliminar alucinaciones. Busca y resume información de fuentes
 * citables (URLs, PDFs, bases de datos) y SIEMPRE adjunta las fuentes. Si no
 * hay fuentes, marca la síntesis como NO verificada.
 *
 * Privilegio mínimo: solo lectura de red a través de un `SearchProvider`
 * enchufable. No escribe archivos ni ejecuta comandos.
 */
import { createLogger } from '../core/logger.js';
import type { ResearchFinding, ResearchResult, SearchProvider } from '../core/types.js';

/**
 * Proveedor por defecto SEGURO: no hace red. Sirve para que el ecosistema
 * funcione "out of the box" sin claves. Devuelve cero hallazgos y obliga a que
 * la síntesis quede marcada como no verificada.
 */
export class StubSearchProvider implements SearchProvider {
  readonly name = 'stub';
  async search(): Promise<ResearchFinding[]> {
    return [];
  }
}

/**
 * Proveedor conceptual para Perplexity (u otra API de búsqueda). Solo se activa
 * si se le pasa una apiKey. Usa `fetch` (Node 18+). Mantiene el principio de
 * privilegio mínimo: únicamente lectura.
 */
export class PerplexitySearchProvider implements SearchProvider {
  readonly name = 'perplexity';
  constructor(
    private apiKey: string,
    private model = 'sonar',
  ) {}

  async search(query: string): Promise<ResearchFinding[]> {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'Eres un investigador riguroso. Responde en español, conciso, y cita las fuentes (URLs).',
          },
          { role: 'user', content: query },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Perplexity respondió ${res.status}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      citations?: string[];
    };
    const text = data.choices?.[0]?.message?.content ?? '';
    const citations = data.citations ?? [];
    if (citations.length === 0) {
      return text ? [{ source: 'perplexity (sin cita)', summary: text, confidence: 0.4 }] : [];
    }
    return citations.map((url) => ({ source: url, summary: text, confidence: 0.8 }));
  }
}

export interface InvestigadorOptions {
  /** Proveedor de búsqueda. Por defecto, el stub seguro (sin red). */
  provider?: SearchProvider;
}

export class Investigador {
  private provider: SearchProvider;

  constructor(opts: InvestigadorOptions = {}) {
    this.provider = opts.provider ?? new StubSearchProvider();
  }

  /**
   * Investiga una consulta y devuelve hallazgos + síntesis con sus fuentes.
   * Protocolo anti-alucinación: la síntesis se marca `verified: false` cuando no
   * hay ninguna fuente citable.
   */
  async research(taskId: string, query: string): Promise<ResearchResult> {
    const logger = createLogger(taskId, 'investigador');
    logger('info', `Investigando: "${query}" (proveedor: ${this.provider.name})`);

    let findings: ResearchFinding[] = [];
    try {
      findings = await this.provider.search(query);
    } catch (err) {
      logger('error', 'Fallo del proveedor de búsqueda', { error: String(err) });
    }

    const sources = [...new Set(findings.map((f) => f.source).filter(Boolean))];
    const verified = sources.length > 0;

    const synthesis = verified
      ? this.synthesize(query, findings)
      : `⚠️ Sin fuentes citables para "${query}". No se entrega una conclusión para evitar ` +
        `alucinaciones. Configura un SearchProvider (p. ej. PerplexitySearchProvider) o aporta ` +
        `URLs/documentos verificables.`;

    logger('decision', verified ? 'Síntesis verificada con fuentes' : 'Síntesis NO verificada', {
      sources,
      findings: findings.length,
    });

    return { query, findings, synthesis, verified, sources };
  }

  /** Combina los hallazgos en un resumen ordenado por confianza. */
  private synthesize(query: string, findings: ResearchFinding[]): string {
    const ordered = [...findings].sort((a, b) => b.confidence - a.confidence);
    const top = ordered.slice(0, 5);
    const bullets = top
      .map((f) => `• (${Math.round(f.confidence * 100)}%) ${f.summary}  [${f.source}]`)
      .join('\n');
    return `Síntesis para "${query}":\n${bullets}`;
  }
}
