# 🦾 Ejecutor de Tareas ("The Arm")

**Misión:** acción directa y **segura** — escribir código/archivos, ejecutar
automatizaciones y preparar cambios en ramas. **Solo actúa bajo órdenes
validadas y aprobadas.**

## Modos de operación

- **Dry-run (por defecto):** `approved: false`. Simula todos los pasos y los
  registra, pero **no aplica nada**.
- **Aplicar:** `approved: true`. Ejecuta los pasos del plan (idealmente tras la
  validación y la aprobación humana del orquestador).

## Tipos de paso (`ExecStep`)

| Paso        | Acción                                            |
|-------------|---------------------------------------------------|
| `noop`      | No hace nada (placeholder seguro).                |
| `writeFile` | Escribe un archivo **dentro del sandbox** (`root`).|
| `shell`     | Ejecuta un comando de la **allowlist**.           |
| `gitBranch` | Crea una rama local (`git checkout -b`).          |

## Privilegio mínimo y seguridad

- **Sandbox:** las escrituras se confinan a `root`; se bloquea cualquier ruta con
  `..` o absoluta fuera de la raíz (anti *path-traversal*).
- **Allowlist de comandos:** por defecto solo `npm run lint|typecheck|test|build`,
  `git status|add|checkout -b|commit`. Todo lo demás se rechaza.
- **Prohibidos siempre:** `rm -rf`, `git push`, `--force`, `reset --hard`,
  `sudo`, redirecciones a `/dev/…`, fork bombs… (aunque estén en la allowlist).
- **Fail-fast:** se detiene ante el primer paso fallido.

## Uso (librería)

```ts
import { Ejecutor } from '../ejecutor/index.js';

const ejecutor = new Ejecutor({ root: process.cwd(), approved: true });
const result = await ejecutor.execute({
  taskId: 'task-123',
  steps: [
    { kind: 'gitBranch', description: 'rama de trabajo', branch: 'feature/x' },
    { kind: 'writeFile', description: 'nota', path: 'docs/nota.md', content: '# Hola' },
    { kind: 'shell', description: 'pruebas', command: 'npm run test' },
  ],
});
```
