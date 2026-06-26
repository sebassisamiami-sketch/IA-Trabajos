/**
 * kiro-doc-generator — punto de entrada de la librería.
 *
 * Orquesta el pipeline completo: escanear → parsear → renderizar, y opcionalmente
 * escribir el Markdown resultante en disco. Reexporta las piezas para usarlas de
 * forma individual.
 *
 * Uso como librería:
 *   import { generateDocs } from './kiro-doc-generator/index.js';
 *   const { markdown } = await generateDocs({ root: 'src', out: 'docs/API.md' });
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';
import { scan } from './core/scanner.js';
import { parseFile } from './core/parser.js';
import { renderMarkdown } from './core/renderer.js';
import { toPosix } from './core/scanner.js';
import type { DocFile, DocProject, GenerateResult, GeneratorOptions } from './core/types.js';

export * from './core/types.js';
export { scan, DEFAULT_EXCLUDES, DEFAULT_EXTENSIONS, toPosix } from './core/scanner.js';
export { parseFile, parseSource, cleanJsDoc, extractFileDoc } from './core/parser.js';
export { renderMarkdown, renderTree, slugify } from './core/renderer.js';

/** Opciones de `generateDocs`: las del generador más una ruta de salida opcional. */
export interface GenerateDocsOptions extends GeneratorOptions {
  /** Si se indica, escribe el Markdown en esta ruta (se crean carpetas). */
  out?: string;
}

/**
 * Construye el modelo `DocProject` (sin renderizar) analizando la raíz indicada.
 * Útil si quieres post-procesar los datos antes de generar la salida.
 */
export function buildProject(opts: GeneratorOptions = {}): DocProject {
  const root = resolve(opts.root ?? process.cwd());
  const absFiles = scan(root, {
    include: opts.include,
    exclude: opts.exclude,
    extensions: opts.extensions,
  });

  const files: DocFile[] = [];
  for (const abs of absFiles) {
    const rel = toPosix(relative(root, abs));
    const parsed = parseFile(abs, rel);
    if (parsed) files.push(parsed);
  }

  const symbolCount = files.reduce((acc, f) => acc + f.symbols.length, 0);

  return {
    title: opts.title ?? basename(root),
    root,
    files,
    generatedAt: new Date().toISOString(),
    stats: { files: files.length, symbols: symbolCount },
  };
}

/**
 * Pipeline completo: analiza la raíz, genera el Markdown y (si se pide) lo
 * escribe en disco. Devuelve el proyecto, el Markdown y la ruta de salida.
 */
export function generateDocs(opts: GenerateDocsOptions = {}): GenerateResult {
  const project = buildProject(opts);
  const markdown = renderMarkdown(project);

  let outputPath: string | undefined;
  if (opts.out) {
    outputPath = isAbsolute(opts.out) ? opts.out : resolve(process.cwd(), opts.out);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, markdown, 'utf8');
  }

  return { project, markdown, outputPath };
}
