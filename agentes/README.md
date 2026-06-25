# 🤖 Ecosistema de Agentes

Tres sub-agentes especializados que el **agente principal** puede orquestar para
delegar tareas complejas con seguridad y trazabilidad total.

> Ejemplo: *"Necesito una nueva pasarela de pago"* → el **Investigador** trae los
> datos con fuentes, el **Ejecutor** escribe el código en una rama segura y el
> **Validador** comprueba que no haya huecos de seguridad antes de entregar.

## 🧩 Arquitectura

```
agentes/
├── README.md              ← este archivo (visión general + reutilización)
├── package.json           ← scripts (build/demo/investigar/validar)
├── tsconfig.json          ← compilación NodeNext, independiente del repo
├── index.ts               ← orquestador-demo + reexports (usar como librería)
├── core/
│   ├── types.ts           ← contratos compartidos (desacoplados del proyecto)
│   ├── logger.ts          ← trazabilidad (JSONL) → logs/agents.log
│   └── orchestrator.ts    ← ciclo Investigar → Validar → [humano] → Ejecutar → Validar
├── investigador/          ← 🧠 The Brain  (búsqueda + síntesis, anti-alucinación)
│   ├── index.ts · cli.ts · README.md
├── ejecutor/              ← 🦾 The Arm    (acción segura: archivos, comandos, git)
│   ├── index.ts · README.md
├── validador/             ← 🛡️ The Guard (seguridad, calidad, human-in-the-loop)
│   ├── index.ts · cli.ts · README.md
└── logs/                  ← trazabilidad del 100% de las acciones (JSONL)
    └── README.md
```

Cada agente tiene su propio README con sus **comandos y modos de operación**.

## 🔄 Flujo del orquestador

1. **Investigador** reúne información con fuentes (sin fuentes ⇒ *no verificado*).
2. El agente principal construye un **plan** de ejecución (`planFactory`).
3. **Validador** revisa el plan (seguridad + riesgo). Si falla → vuelve al Ejecutor.
4. Si el cambio es sensible → **aprobación humana** obligatoria.
5. **Ejecutor** aplica el plan (en rama segura; *dry-run* si no hay aprobación).
6. **Validador** corre los *quality gates* finales (lint/typecheck/test).
7. Todo queda **registrado** en `logs/agents.log`.

## 🚀 Instalación y uso

Requisitos: **Node ≥ 20**. Sin dependencias de ejecución; TypeScript y
`@types/node` solo para compilar.

```bash
cd agentes
npm install          # instala typescript + @types/node (devDependencies)
npm run demo -- "comparar pasarelas de pago para Colombia"
```

Como **librería** dentro de otro código:

```ts
import { runTask, PerplexitySearchProvider } from './agentes/index.js';

const outcome = await runTask({
  goal: 'Integrar una nueva pasarela de pago',
  provider: process.env.PERPLEXITY_API_KEY
    ? new PerplexitySearchProvider(process.env.PERPLEXITY_API_KEY)
    : undefined,
  planFactory: (task, research) => ({
    taskId: task.id,
    steps: [
      { kind: 'gitBranch', description: 'rama segura', branch: `feature/${task.id}` },
      { kind: 'writeFile', description: 'doc de la investigación',
        path: `docs/research-${task.id}.md`, content: research.synthesis },
    ],
  }),
  // Human-in-the-loop: devuelve true para aprobar cambios sensibles.
  approve: async (report) => {
    console.log('Revisión humana requerida:', report.issues);
    return false; // cámbialo por tu lógica de aprobación
  },
  qualityGates: ['npm run lint', 'npm run test'],
});
```

## 🔍 Guía de trazabilidad (cómo leer su "razonamiento")

Cada tarea recibe un `taskId` y todos sus pasos se registran en
`logs/agents.log` (JSONL). Para reconstruir la historia de una tarea:

```ts
import { printTrace } from './agentes/core/logger.js';
printTrace('68aed881');
```

```bash
grep '"taskId":"68aed881"' agentes/logs/agents.log | jq .
```

Los eventos de nivel `decision` y `human` marcan las decisiones clave y los
puntos de aprobación. Ver `logs/README.md` para el detalle de los campos.

## 🔐 Seguridad (privilegio mínimo)

- **Investigador:** solo lectura de red (vía proveedor enchufable).
- **Ejecutor:** *dry-run* por defecto; sandbox de archivos; allowlist de
  comandos; bloqueo de comandos destructivos; nunca hace `git push`.
- **Validador:** análisis estático + *quality gates* en allowlist; exige
  aprobación humana ante riesgo alto/crítico.

## ♻️ Manual de reutilización (llevarlo a otro proyecto)

1. **Copia** la carpeta `agentes/` a la raíz del otro repositorio.
2. `cd agentes && npm install`.
3. (Opcional) Excluye `agentes` del linter del proyecto anfitrión si corre
   `eslint .` en la raíz (en este repo ya está en `ignorePatterns`).
4. Ejecuta `npm run demo -- "tu objetivo"` o impórtalo como librería.
5. Para búsqueda real, define `PERPLEXITY_API_KEY` (u otro `SearchProvider`).
6. Ajusta las allowlists del Ejecutor/Validador a las necesidades del proyecto.

El código es **desacoplado**: no depende de "Ana Variedades" ni de su stack, así
que funciona en cualquier repo Node/TypeScript sin cambios.
