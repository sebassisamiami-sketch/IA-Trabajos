# 📚 kiro-doc-generator

Generador de **documentación Markdown** a partir de tu código TypeScript/JavaScript.
Escanea un proyecto, extrae los **símbolos exportados** (funciones, clases,
interfaces, tipos, enums, constantes) junto con sus comentarios **JSDoc**, y
produce una **referencia de API** lista para leer en GitHub, más el **árbol del
proyecto** y unas métricas rápidas.

> Cero dependencias de ejecución. Portátil: copia la carpeta a cualquier repo
> Node/TypeScript y funciona sin cambios.

## 🧩 Arquitectura

```
kiro-doc-generator/
├── README.md            ← este archivo
├── package.json         ← scripts (build/typecheck/demo/generate) + bin "kiro-doc"
├── tsconfig.json        ← compilación NodeNext, independiente del repo anfitrión
├── index.ts             ← librería: buildProject() y generateDocs() + reexports
├── cli.ts               ← CLI: `kiro-doc generate [opciones]`
└── core/
    ├── types.ts         ← contratos (DocSymbol, DocFile, DocProject, opciones…)
    ├── scanner.ts       ← recorre el árbol de archivos (include/exclude/ext)
    ├── parser.ts        ← extrae exports + JSDoc (análisis por regex, sin deps)
    └── renderer.ts      ← convierte el modelo en Markdown
```

## 🔄 Pipeline

1. **scanner** recorre la raíz y selecciona los archivos de código (filtrando
   `node_modules`, `dist`, ocultos, `.d.ts`, etc.).
2. **parser** lee cada archivo y extrae los símbolos `export` con su comentario
   JSDoc previo y la cabecera del archivo.
3. **renderer** arma el Markdown: portada con métricas, índice, árbol y la
   referencia de API agrupada por tipo de símbolo.
4. `generateDocs()` escribe el resultado en disco si indicas `--out`.

## 🚀 Instalación y uso

Requisitos: **Node ≥ 20**. Sin dependencias de runtime; TypeScript y
`@types/node` solo para compilar.

```bash
cd kiro-doc-generator
npm install            # typescript + @types/node (devDependencies)
npm run build          # compila a dist/

# Generar documentación de un proyecto y escribirla en un archivo:
node dist/cli.js generate --root .. --out docs/API.md

# O imprimir por stdout (componible con tuberías):
node dist/cli.js generate --root .. > API.md
```

### Opciones de la CLI

| Opción            | Descripción                                                    |
| ----------------- | -------------------------------------------------------------- |
| `--root <dir>`    | Carpeta raíz a analizar (por defecto: directorio actual).      |
| `--include <ruta>`| Subruta a incluir (repetible o separada por comas).            |
| `--exclude <ruta>`| Ruta/nombre a excluir (se suma a las exclusiones por defecto). |
| `--ext <.ts,.js>` | Extensiones a analizar (separadas por comas).                  |
| `--title <texto>` | Título del documento generado.                                 |
| `--out <archivo>` | Escribe el Markdown en ese archivo (si se omite, va a stdout). |
| `--no-tree`       | No incluir el árbol del proyecto.                              |
| `-h`, `--help`    | Mostrar la ayuda.                                              |

## 🧪 Uso como librería

```ts
import { generateDocs, buildProject } from './kiro-doc-generator/index.js';

// Pipeline completo (analiza, renderiza y escribe):
const { project, markdown, outputPath } = generateDocs({
  root: 'src',
  include: ['core'],
  title: 'Mi API',
  out: 'docs/API.md',
});
console.log(`Generados ${project.stats.symbols} símbolos en ${outputPath}`);

// O solo el modelo de datos, para post-procesarlo a tu gusto:
const model = buildProject({ root: 'src' });
```

## ♻️ Reutilización en otro proyecto

1. **Copia** la carpeta `kiro-doc-generator/` a la raíz del otro repositorio.
2. `cd kiro-doc-generator && npm install && npm run build`.
3. Ejecuta `node dist/cli.js generate --root <tu-código> --out docs/API.md`.

El código es **desacoplado**: no depende de ningún proyecto concreto, así que
funciona en cualquier repo Node/TypeScript.

## ⚠️ Alcance del parser

El análisis es por **expresiones regulares** (no usa el compilador de
TypeScript) para mantener **cero dependencias**. Cubre las formas de `export`
más habituales: `function`, `class`, `interface`, `type`, `enum`, `const`,
`let`/`var` y `export default`. No resuelve reexports (`export { x } from '...'`)
ni firmas multilínea completas; para esos casos, la documentación se basa en la
primera línea de la declaración y su JSDoc.

## 📄 Licencia

MIT.
