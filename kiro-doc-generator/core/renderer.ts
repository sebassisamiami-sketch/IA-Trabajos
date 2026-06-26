/**
 * RENDERER — convierte un `DocProject` en un documento Markdown legible:
 * portada con métricas, índice, árbol del proyecto y referencia de API por
 * archivo (agrupada por tipo de símbolo).
 */
import type { DocFile, DocProject, DocSymbol, SymbolKind } from './types.js';

/** Etiqueta legible (con emoji) para cada tipo de símbolo. */
const KIND_LABEL: Record<SymbolKind, string> = {
  function: '🔧 Funciones',
  class: '🏛️ Clases',
  interface: '📐 Interfaces',
  type: '🏷️ Tipos',
  enum: '🔢 Enums',
  const: '📌 Constantes',
  variable: '📦 Variables',
};

/** Orden de presentación de los grupos de símbolos. */
const KIND_ORDER: SymbolKind[] = ['class', 'function', 'interface', 'type', 'enum', 'const', 'variable'];

/** Crea un ancla de Markdown estable a partir de un texto. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s/-]/g, '')
    .trim()
    .replace(/[\s/]+/g, '-');
}

/** Dibuja un árbol ASCII de las rutas de los archivos analizados. */
export function renderTree(files: DocFile[]): string {
  const lines: string[] = [];
  const paths = files.map((f) => f.path).sort((a, b) => a.localeCompare(b));
  for (const p of paths) {
    const depth = p.split('/').length - 1;
    const name = p.split('/').pop() ?? p;
    lines.push(`${'  '.repeat(depth)}- ${name}`);
  }
  return lines.join('\n');
}

/** Renderiza un único símbolo como una subsección. */
function renderSymbol(sym: DocSymbol): string {
  const parts: string[] = [];
  const badge = sym.isDefault ? ' _(default)_' : '';
  parts.push(`#### \`${sym.name}\`${badge}`);
  parts.push('');
  parts.push('```ts');
  parts.push(sym.signature);
  parts.push('```');
  if (sym.doc) {
    parts.push('');
    parts.push(sym.doc);
  }
  parts.push('');
  parts.push(`<sub>Definido en la línea ${sym.line}.</sub>`);
  return parts.join('\n');
}

/** Renderiza la sección de un archivo, con sus símbolos agrupados por tipo. */
function renderFile(file: DocFile): string {
  const parts: string[] = [];
  parts.push(`### \`${file.path}\``);
  if (file.fileDoc) {
    parts.push('');
    parts.push(`> ${file.fileDoc.split('\n').join('\n> ')}`);
  }

  const byKind = new Map<SymbolKind, DocSymbol[]>();
  for (const s of file.symbols) {
    const arr = byKind.get(s.kind) ?? [];
    arr.push(s);
    byKind.set(s.kind, arr);
  }

  for (const kind of KIND_ORDER) {
    const group = byKind.get(kind);
    if (!group || group.length === 0) continue;
    parts.push('');
    parts.push(`**${KIND_LABEL[kind]}**`);
    parts.push('');
    for (const sym of group) parts.push(renderSymbol(sym) + '\n');
  }

  return parts.join('\n');
}

/** Genera el documento Markdown completo a partir de un `DocProject`. */
export function renderMarkdown(project: DocProject): string {
  const out: string[] = [];

  // Portada.
  out.push(`# 📚 ${project.title}`);
  out.push('');
  out.push('> Documentación generada automáticamente por **kiro-doc-generator**.');
  out.push('');
  out.push(
    `**${project.stats.files}** archivo(s) · **${project.stats.symbols}** símbolo(s) exportado(s) · ` +
      `generado el ${project.generatedAt}.`,
  );
  out.push('');

  // Índice.
  out.push('## Índice');
  out.push('');
  if (project.stats.symbols === 0) {
    out.push('_No se encontraron símbolos exportados con la configuración actual._');
    return out.join('\n') + '\n';
  }
  for (const file of project.files) {
    if (file.symbols.length === 0) continue;
    out.push(`- [\`${file.path}\`](#${slugify(file.path)})`);
  }
  out.push('');

  // Árbol del proyecto.
  out.push('## 🌳 Estructura');
  out.push('');
  out.push('```');
  out.push(renderTree(project.files));
  out.push('```');
  out.push('');

  // Referencia de API.
  out.push('## 🔎 Referencia de API');
  out.push('');
  for (const file of project.files) {
    if (file.symbols.length === 0) continue;
    out.push(renderFile(file));
    out.push('');
    out.push('---');
    out.push('');
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}
