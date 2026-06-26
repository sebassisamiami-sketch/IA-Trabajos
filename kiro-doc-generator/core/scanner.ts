/**
 * SCANNER — recorre el árbol de archivos de la raíz indicada y devuelve la lista
 * de rutas de código a documentar, aplicando filtros de inclusión/exclusión y
 * de extensión.
 *
 * Privilegio mínimo: solo lectura del sistema de archivos. No escribe nada.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** Carpetas que nunca tiene sentido documentar. */
export const DEFAULT_EXCLUDES = [
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  '.git',
  '.next',
  '.cache',
  'logs',
];

/** Extensiones de código soportadas por defecto. */
export const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

export interface ScanOptions {
  include?: string[];
  exclude?: string[];
  extensions?: string[];
}

/** Normaliza una ruta relativa para usar siempre `/` (estable entre SO). */
export function toPosix(p: string): string {
  return p.split(sep).join('/');
}

function hasExtension(file: string, extensions: string[]): boolean {
  return extensions.some((ext) => file.endsWith(ext));
}

/** ¿La ruta relativa cae bajo alguno de los prefijos `include`? */
function matchesInclude(relPath: string, include: string[]): boolean {
  if (include.length === 0) return true;
  return include.some((inc) => {
    const norm = toPosix(inc).replace(/\/+$/, '');
    return relPath === norm || relPath.startsWith(norm + '/');
  });
}

/** ¿Algún segmento o prefijo de la ruta coincide con un patrón de exclusión? */
function isExcluded(relPath: string, name: string, exclude: string[]): boolean {
  if (name.startsWith('.') && name !== '.') {
    // Ignora ocultos por defecto (p. ej. .git ya está, pero también .vscode…),
    // salvo que se incluyan explícitamente vía include.
  }
  return exclude.some((ex) => {
    const norm = toPosix(ex).replace(/\/+$/, '');
    return name === norm || relPath === norm || relPath.startsWith(norm + '/');
  });
}

/**
 * Devuelve las rutas absolutas de los archivos de código a documentar, ordenadas
 * alfabéticamente para una salida determinista.
 */
export function scan(root: string, opts: ScanOptions = {}): string[] {
  const include = (opts.include ?? []).map(toPosix);
  const exclude = [...DEFAULT_EXCLUDES, ...(opts.exclude ?? [])];
  const extensions = opts.extensions ?? DEFAULT_EXTENSIONS;

  const found: string[] = [];

  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return; // carpeta ilegible: la saltamos sin romper.
    }
    for (const name of entries) {
      const abs = join(dir, name);
      const rel = toPosix(relative(root, abs));
      if (isExcluded(rel, name, exclude)) continue;

      let st;
      try {
        st = statSync(abs);
      } catch {
        continue;
      }

      if (st.isDirectory()) {
        walk(abs);
      } else if (st.isFile() && hasExtension(name, extensions) && matchesInclude(rel, include)) {
        // Evita archivos de declaración (.d.ts) que no aportan implementación.
        if (!name.endsWith('.d.ts')) found.push(abs);
      }
    }
  };

  walk(root);
  return found.sort((a, b) => a.localeCompare(b));
}
