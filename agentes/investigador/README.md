# 🧠 Investigador y Síntesis ("The Brain")

**Misión:** eliminar alucinaciones. Busca y resume información de fuentes
citables (URLs, PDFs, bases de datos) y **siempre adjunta las fuentes**. Si no
hay fuentes, la síntesis se marca como **no verificada**.

## Modos de operación

- **Sin red (por defecto):** usa `StubSearchProvider`. No consulta internet y
  devuelve síntesis *no verificada* (protocolo anti-alucinación). Útil para
  probar el flujo sin claves.
- **Con búsqueda real:** inyecta un `SearchProvider` (p. ej.
  `PerplexitySearchProvider`) y obtendrás hallazgos con sus fuentes.

## Protocolo

1. Antes de cualquier cambio técnico, el agente principal debe consultar aquí las
   mejores prácticas actuales.
2. Toda conclusión llega con sus **fuentes**. Sin fuentes → `verified: false`.

## Privilegio mínimo

Solo **lectura de red** a través del proveedor. No escribe archivos ni ejecuta
comandos.

## Uso (CLI)

```bash
# Sin clave: avisa que no está verificado
npm run investigar -- "comparar Wompi vs Mercado Pago en Colombia 2026"

# Con clave (búsqueda real)
PERPLEXITY_API_KEY=pplx-xxxx npm run investigar -- "tendencias de checkout 2026"
```

## Uso (librería)

```ts
import { Investigador, PerplexitySearchProvider } from '../investigador/index.js';

const investigador = new Investigador({
  provider: new PerplexitySearchProvider(process.env.PERPLEXITY_API_KEY!),
});
const res = await investigador.research('task-123', '¿mejor pasarela para Colombia?');
console.log(res.verified, res.synthesis, res.sources);
```

## Extender con otro buscador

Implementa la interfaz `SearchProvider` (`name` + `search(query)`), por ejemplo
para Bing, Google CSE o una base de datos interna, y pásalo al constructor.
