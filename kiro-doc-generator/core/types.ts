/**
 * Tipos compartidos de kiro-doc-generator.
 *
 * Diseño desacoplado: ningún tipo depende de un proyecto concreto, por lo que
 * esta herramienta puede copiarse tal cual a cualquier repositorio Node/TS.
 */

/** Clase de símbolo exportado que sabemos documentar. */
export type SymbolKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'const'
  | 'variable';

/** Un símbolo exportado extraído de un archivo de código. */
export interface DocSymbol {
  /** Nombre del símbolo (p. ej. `runTask`). */
  name: string;
  kind: SymbolKind;
  /** Firma o cabecera tal y como aparece en el código (una línea, recortada). */
  signature: string;
  /** Documentación obtenida del bloque JSDoc/comentario previo (sin asteriscos). */
  doc: string;
  /** ¿Estaba marcado como `export default`? */
  isDefault: boolean;
  /** Línea (1-indexada) donde empieza la declaración. */
  line: number;
}

/** Resultado del análisis de un único archivo. */
export interface DocFile {
  /** Ruta relativa a la raíz analizada (siempre con `/`). */
  path: string;
  /** Comentario de cabecera del archivo (primer bloque `/** ... *\/`), si existe. */
  fileDoc: string;
  /** Símbolos exportados encontrados, en orden de aparición. */
  symbols: DocSymbol[];
}

/** Documento completo listo para renderizar. */
export interface DocProject {
  /** Título del documento (por defecto, el nombre de la carpeta raíz). */
  title: string;
  /** Raíz absoluta que se analizó. */
  root: string;
  /** Archivos analizados con contenido documentable. */
  files: DocFile[];
  /** Marca temporal ISO de la generación. */
  generatedAt: string;
  /** Métricas rápidas para el resumen. */
  stats: {
    files: number;
    symbols: number;
  };
}

/** Opciones de configuración del generador. */
export interface GeneratorOptions {
  /** Carpeta raíz a analizar. Por defecto, el directorio actual. */
  root?: string;
  /**
   * Subrutas o patrones a incluir (relativos a `root`). Si se omite, se analiza
   * todo `root`. La coincidencia es por prefijo de ruta.
   */
  include?: string[];
  /** Carpetas/archivos a excluir (por nombre o prefijo). Se suman a los por defecto. */
  exclude?: string[];
  /** Extensiones de archivo a analizar. Por defecto: .ts, .tsx, .js, .jsx, .mjs. */
  extensions?: string[];
  /** Título del documento. Por defecto, el nombre de la carpeta raíz. */
  title?: string;
  /** Incluir el árbol de archivos del proyecto en la salida. Por defecto, true. */
  includeTree?: boolean;
}

/** Resultado de una ejecución de generación. */
export interface GenerateResult {
  project: DocProject;
  /** Markdown final generado. */
  markdown: string;
  /** Ruta donde se escribió el archivo (si se pidió `out`). */
  outputPath?: string;
}
