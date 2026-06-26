/**
 * PARSER — extrae los símbolos exportados de un archivo TS/JS junto con su
 * comentario JSDoc (o bloque previo) usando análisis por expresiones regulares.
 *
 * No pretende sustituir a un compilador: busca un equilibrio práctico entre
 * cero dependencias y una cobertura amplia de las formas de `export` más
 * comunes (function, class, interface, type, enum, const/let/var y default).
 */
import { readFileSync } from 'node:fs';
import type { DocFile, DocSymbol, SymbolKind } from './types.js';

/** Limpia un bloque de comentario `/** ... *\/` dejando solo el texto útil. */
export function cleanJsDoc(block: string): string {
  return block
    .replace(/^\s*\/\*\*?/, '') // abre /** o /*
    .replace(/\*\/\s*$/, '') // cierra */
    .split('\n')
    .map((line) => line.replace(/^\s*\*?\s?/, '').trimEnd())
    // Quitamos las etiquetas de bloque más ruidosas para la cabecera, pero
    // conservamos @param/@returns porque aportan a la referencia.
    .join('\n')
    .trim();
}

/** Recorta una firma a una sola línea legible. */
function oneLineSignature(raw: string): string {
  const line = raw.replace(/\s+/g, ' ').trim();
  return line.length > 160 ? line.slice(0, 157) + '...' : line;
}

/**
 * Patrones de declaración exportada. El orden importa: probamos del más
 * específico al más genérico. Cada patrón captura el nombre en el grupo 1.
 */
const DECL_PATTERNS: { kind: SymbolKind; re: RegExp }[] = [
  { kind: 'function', re: /^export\s+(?:default\s+)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'class', re: /^export\s+(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'interface', re: /^export\s+interface\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'type', re: /^export\s+type\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'enum', re: /^export\s+(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'const', re: /^export\s+const\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'variable', re: /^export\s+(?:let|var)\s+([A-Za-z_$][\w$]*)/ },
];

/** Detecta si una declaración es `export default`. */
function isDefault(line: string): boolean {
  return /^export\s+default\b/.test(line);
}

/**
 * Encuentra el bloque de comentario `/** ... *\/` que precede inmediatamente a
 * la línea `index` (ignorando líneas en blanco). Devuelve el texto limpio o "".
 */
function precedingDoc(lines: string[], index: number): string {
  let i = index - 1;
  while (i >= 0 && lines[i].trim() === '') i--;
  if (i < 0 || !lines[i].trim().endsWith('*/')) return '';

  // Retrocede hasta el inicio del bloque.
  let start = i;
  while (start >= 0 && !/\/\*\*?/.test(lines[start])) start--;
  if (start < 0) return '';

  const block = lines.slice(start, i + 1).join('\n');
  return cleanJsDoc(block);
}

/** Extrae el comentario de cabecera del archivo (primer bloque, si está arriba). */
export function extractFileDoc(source: string): string {
  const match = source.match(/^\s*\/\*\*([\s\S]*?)\*\//);
  if (!match) return '';
  return cleanJsDoc(match[0]);
}

/** Analiza el texto fuente y devuelve los símbolos exportados que encuentra. */
export function parseSource(relPath: string, source: string): DocFile {
  const lines = source.split('\n');
  const symbols: DocSymbol[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('export')) continue;

    for (const { kind, re } of DECL_PATTERNS) {
      const m = line.match(re);
      if (!m) continue;
      const name = m[1];
      const key = `${kind}:${name}`;
      if (seen.has(key)) break;
      seen.add(key);

      symbols.push({
        name,
        kind,
        signature: oneLineSignature(line.replace(/\s*\{?\s*$/, '')),
        doc: precedingDoc(lines, i),
        isDefault: isDefault(line),
        line: i + 1,
      });
      break; // un patrón por línea
    }
  }

  return { path: relPath, fileDoc: extractFileDoc(source), symbols };
}

/** Lee y analiza un archivo del disco. Devuelve null si no se puede leer. */
export function parseFile(absPath: string, relPath: string): DocFile | null {
  try {
    const source = readFileSync(absPath, 'utf8');
    return parseSource(relPath, source);
  } catch {
    return null;
  }
}
