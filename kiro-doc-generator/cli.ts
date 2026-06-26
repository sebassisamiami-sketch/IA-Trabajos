#!/usr/bin/env node
/**
 * CLI de kiro-doc-generator.
 *
 *   kiro-doc generate [opciones]
 *
 * Opciones:
 *   --root <dir>        Carpeta raíz a analizar (por defecto: cwd).
 *   --include <ruta>    Subruta a incluir (repetible o separada por comas).
 *   --exclude <ruta>    Ruta/nombre a excluir (repetible o separada por comas).
 *   --ext <.ts,.js>     Extensiones a analizar (separadas por comas).
 *   --title <texto>     Título del documento.
 *   --out <archivo>     Escribir el Markdown en este archivo (si se omite, stdout).
 *   --no-tree           No incluir el árbol del proyecto.
 *   -h, --help          Mostrar esta ayuda.
 *
 * Ejemplos:
 *   npm run generate -- --root . --out docs/API.md
 *   node dist/cli.js generate --root src --include core --ext .ts
 */
import { generateDocs } from './index.js';

interface ParsedArgs {
  command: string;
  root?: string;
  include: string[];
  exclude: string[];
  extensions?: string[];
  title?: string;
  out?: string;
  includeTree: boolean;
  help: boolean;
}

const HELP = `kiro-doc-generator — genera documentación Markdown desde tu código.

Uso:
  kiro-doc generate [opciones]

Opciones:
  --root <dir>        Carpeta raíz a analizar (por defecto: directorio actual).
  --include <ruta>    Subruta a incluir (repetible o separada por comas).
  --exclude <ruta>    Ruta/nombre a excluir (repetible o separada por comas).
  --ext <.ts,.js>     Extensiones a analizar (separadas por comas).
  --title <texto>     Título del documento.
  --out <archivo>     Escribir el Markdown en este archivo (si se omite, stdout).
  --no-tree           No incluir el árbol del proyecto.
  -h, --help          Mostrar esta ayuda.

Ejemplos:
  kiro-doc generate --root . --out docs/API.md
  kiro-doc generate --root src --include core --ext .ts`;

/** Divide un valor "a,b,c" en una lista, ignorando vacíos. */
function splitList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Analiza `process.argv` en una estructura tipada. */
export function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    command: '',
    include: [],
    exclude: [],
    includeTree: true,
    help: false,
  };

  const rest = [...argv];
  // El primer token que no empiece por "-" es el comando.
  if (rest.length > 0 && !rest[0].startsWith('-')) {
    args.command = rest.shift() as string;
  }

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    const next = (): string => rest[++i] ?? '';
    switch (arg) {
      case '--root':
        args.root = next();
        break;
      case '--include':
        args.include.push(...splitList(next()));
        break;
      case '--exclude':
        args.exclude.push(...splitList(next()));
        break;
      case '--ext':
        args.extensions = splitList(next()).map((e) => (e.startsWith('.') ? e : `.${e}`));
        break;
      case '--title':
        args.title = next();
        break;
      case '--out':
        args.out = next();
        break;
      case '--no-tree':
        args.includeTree = false;
        break;
      case '-h':
      case '--help':
        args.help = true;
        break;
      default:
        // Ignoramos flags desconocidos para no romper la ejecución.
        break;
    }
  }

  return args;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.command === 'help' || args.command === '') {
    // eslint-disable-next-line no-console
    console.log(HELP);
    return;
  }

  if (args.command !== 'generate') {
    // eslint-disable-next-line no-console
    console.error(`Comando desconocido: "${args.command}".\n\n${HELP}`);
    process.exitCode = 1;
    return;
  }

  const result = generateDocs({
    root: args.root,
    include: args.include.length > 0 ? args.include : undefined,
    exclude: args.exclude.length > 0 ? args.exclude : undefined,
    extensions: args.extensions,
    title: args.title,
    includeTree: args.includeTree,
    out: args.out,
  });

  if (result.outputPath) {
    // eslint-disable-next-line no-console
    console.log(
      `✅ Documentación generada: ${result.outputPath}\n` +
        `   ${result.project.stats.files} archivo(s), ${result.project.stats.symbols} símbolo(s).`,
    );
  } else {
    // Sin --out: volcamos el Markdown por stdout (componible con tuberías).
    // eslint-disable-next-line no-console
    console.log(result.markdown);
  }
}

main();
