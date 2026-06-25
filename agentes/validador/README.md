# 🛡️ Control y Validación ("The Guard")

**Misión:** supervisión extrema. Revisa **seguridad, coherencia y calidad** antes
de la entrega. Es el **filtro final**: si detecta una vulnerabilidad o un fallo,
marca la tarea como no aprobada para devolverla al Ejecutor.

## Modos de operación

1. **`scanContent(texto)`** — análisis estático de seguridad (regex) sobre un
   fragmento de código/contenido.
2. **`validatePlan(plan)`** — escanea el contenido de los archivos a escribir y
   evalúa el riesgo de cada paso **antes** de aplicar. Decide si hace falta
   **aprobación humana**.
3. **`runQualityGates([...])`** — ejecuta *quality gates* reales (lint, typecheck,
   tests) sobre el repo, usando una allowlist.

## Reglas de seguridad (ampliables)

- Secretos/credenciales embebidos · claves privadas.
- `eval(...)` · comandos shell con interpolación (inyección).
- `dangerouslySetInnerHTML` (XSS) · URLs sin HTTPS.

Severidades: `info` · `warning` · `critical`. Un `critical` **bloquea** la entrega.

## Human-in-the-loop

`validatePlan` devuelve `requiresHumanApproval: true` cuando hay incidencias
críticas o pasos de riesgo alto. El orquestador **detiene** la ejecución hasta
recibir aprobación humana explícita.

## Uso (CLI)

```bash
npm run validar -- scan ruta/al/archivo.ts   # escaneo de seguridad
npm run validar -- gates                      # corre lint/typecheck/test
```

## Uso (librería)

```ts
import { Validador } from '../validador/index.js';

const validador = new Validador({ cwd: process.cwd() });
const report = validador.validatePlan(plan);
if (!report.passed) throw new Error('Devolver al ejecutor');
if (report.requiresHumanApproval) {/* pedir OK humano */}
```
