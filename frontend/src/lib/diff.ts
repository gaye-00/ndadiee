import { lowlight } from './lowlight';
import type { PullRequestFile } from '@/types/review.types';

// ==================== LE DIFF D'UN FICHIER ====================

export type DiffLineKind = 'context' | 'add' | 'del';

/** Un morceau de code coloré : ses classes de highlight.js (« hljs-keyword »), et son texte */
export interface CodeToken {
  className: string;
  text: string;
}

/** Une ligne du diff, avec ses numéros dans l'ancienne et la nouvelle version du fichier */
export interface DiffLine {
  kind: DiffLineKind;
  /** null pour une ligne ajoutée */
  oldNumber: number | null;
  /** null pour une ligne supprimée ; les commentaires de revue visent ce numéro */
  newNumber: number | null;
  content: string;
  /** Le contenu coloré, quand le langage du fichier est connu (highlightHunks) */
  tokens?: CodeToken[];
  /** « \ No newline at end of file » suit cette ligne */
  noNewline?: boolean;
}

/** Un bloc « @@ -1,3 +1,4 @@ » et ses lignes */
export interface DiffHunk {
  oldStart: number;
  newStart: number;
  /** Ce que Git écrit après le « @@ » : souvent la fonction qui contient le bloc */
  section: string;
  lines: DiffLine[];
}

const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@ ?(.*)$/;

/**
 * Découpe un diff unifié (tel que GitHub le donne pour un fichier, à partir du premier « @@ ») en blocs et en lignes
 * numérotées. Une ligne qui ne commence ni par « + », « - », ni « \ » est une ligne de contexte.
 */
export function parsePatch(patch: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let current: DiffHunk | null = null;
  let oldNumber = 0;
  let newNumber = 0;

  for (const raw of patch.split('\n')) {
    const header = HUNK_HEADER.exec(raw);
    if (header) {
      oldNumber = Number(header[1]);
      newNumber = Number(header[2]);
      current = { oldStart: oldNumber, newStart: newNumber, section: header[3].trim(), lines: [] };
      hunks.push(current);
      continue;
    }
    if (!current) {
      continue;
    }
    if (raw.startsWith('\\')) {
      const last = current.lines.at(-1);
      if (last) {
        last.noNewline = true;
      }
      continue;
    }
    const marker = raw[0];
    const content = raw.slice(1);
    if (marker === '+') {
      current.lines.push({ kind: 'add', oldNumber: null, newNumber: newNumber++, content });
    } else if (marker === '-') {
      current.lines.push({ kind: 'del', oldNumber: oldNumber++, newNumber: null, content });
    } else {
      current.lines.push({ kind: 'context', oldNumber: oldNumber++, newNumber: newNumber++, content });
    }
  }
  return hunks;
}

// ==================== LA COULEUR DU CODE ====================

// L'extension (ou le nom) d'un fichier → un langage de lib/codeLanguages.ts
const LANGUAGES_BY_EXTENSION: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  php: 'php',
  swift: 'swift',
  dart: 'dart',
  c: 'c',
  h: 'c',
  cc: 'cpp',
  cpp: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  css: 'css',
  scss: 'scss',
  json: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  html: 'xml',
  xml: 'xml',
  svg: 'xml',
  vue: 'xml',
  graphql: 'graphql',
  gql: 'graphql',
  ini: 'ini',
  toml: 'ini',
  properties: 'ini',
  conf: 'nginx',
};

/** Le langage d'un fichier d'après son nom (« Dockerfile », « cache.go ») ; null s'il n'est pas coloré. */
export function languageOf(path: string): string | null {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  if (name === 'dockerfile' || name.startsWith('dockerfile.')) {
    return 'dockerfile';
  }
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
  const language = LANGUAGES_BY_EXTENSION[extension];
  return language && lowlight.registered(language) ? language : null;
}

// Ce qu'il faut de l'arbre que rend lowlight (hast) pour en tirer des morceaux colorés
interface HastNode {
  type: string;
  value?: string;
  properties?: { className?: unknown };
  children?: HastNode[];
}

/**
 * Colore un bout de code d'un seul tenant, puis le découpe en lignes : un commentaire ou une chaîne sur plusieurs
 * lignes garde sa couleur d'une ligne à l'autre. Chaque ligne est une suite de morceaux à classes plates.
 */
function highlightLines(code: string, language: string): CodeToken[][] {
  const lines: CodeToken[][] = [[]];
  const walk = (node: HastNode, classes: string[]) => {
    if (node.type === 'text') {
      const parts = (node.value ?? '').split('\n');
      parts.forEach((part, index) => {
        if (index > 0) {
          lines.push([]);
        }
        if (part) {
          lines[lines.length - 1].push({ className: classes.join(' '), text: part });
        }
      });
      return;
    }
    const own = Array.isArray(node.properties?.className) ? node.properties.className.map(String) : [];
    node.children?.forEach((child) => walk(child, [...classes, ...own]));
  };
  walk(lowlight.highlight(language, code, { prefix: 'hljs-' }) as HastNode, []);
  return lines;
}

/**
 * Colore les lignes des blocs, en place. Chaque bloc est coloré deux fois d'un seul tenant : sa nouvelle version
 * (contexte et ajouts) et son ancienne (contexte et suppressions) ; chaque ligne prend la couleur de sa version.
 */
export function highlightHunks(hunks: DiffHunk[], language: string | null): DiffHunk[] {
  if (!language) {
    return hunks;
  }
  for (const hunk of hunks) {
    const after = hunk.lines.filter((line) => line.kind !== 'del');
    const before = hunk.lines.filter((line) => line.kind !== 'add');
    const afterTokens = highlightLines(after.map((line) => line.content).join('\n'), language);
    const beforeTokens = highlightLines(before.map((line) => line.content).join('\n'), language);
    after.forEach((line, index) => {
      line.tokens = afterTokens[index] ?? [];
    });
    before.forEach((line, index) => {
      if (line.kind === 'del') {
        line.tokens = beforeTokens[index] ?? [];
      }
    });
  }
  return hunks;
}

// ==================== L'ARBRE DES FICHIERS ====================

export interface FileTreeFolder {
  kind: 'folder';
  /** Un dossier seul dans son parent est fusionné avec lui : « src/components/VirtualList » */
  name: string;
  path: string;
  children: FileTreeNode[];
}

export interface FileTreeLeaf {
  kind: 'file';
  name: string;
  path: string;
  file: PullRequestFile;
}

export type FileTreeNode = FileTreeFolder | FileTreeLeaf;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/**
 * L'arbre des fichiers modifiés : les dossiers d'abord, puis les fichiers, par ordre alphabétique. Une suite de
 * dossiers qui ne contiennent chacun qu'un dossier n'en fait qu'un (« src/components/VirtualList »).
 */
export function buildFileTree(files: PullRequestFile[]): FileTreeNode[] {
  const root: FileTreeFolder = { kind: 'folder', name: '', path: '', children: [] };
  for (const file of files) {
    const parts = file.path.split('/');
    let folder = root;
    parts.slice(0, -1).forEach((part, index) => {
      const path = parts.slice(0, index + 1).join('/');
      let next = folder.children.find((child): child is FileTreeFolder => child.kind === 'folder' && child.path === path);
      if (!next) {
        next = { kind: 'folder', name: part, path, children: [] };
        folder.children.push(next);
      }
      folder = next;
    });
    folder.children.push({ kind: 'file', name: parts.at(-1) ?? file.path, path: file.path, file });
  }

  const tidy = (nodes: FileTreeNode[]): FileTreeNode[] =>
    nodes
      .map((node) => {
        if (node.kind === 'file') {
          return node;
        }
        let folder = node;
        // Un dossier qui ne contient qu'un dossier se fond avec lui
        while (folder.children.length === 1 && folder.children[0].kind === 'folder') {
          const only = folder.children[0];
          folder = { ...only, name: `${folder.name}/${only.name}` };
        }
        return { ...folder, children: tidy(folder.children) };
      })
      .sort((a, b) => (a.kind === b.kind ? collator.compare(a.name, b.name) : a.kind === 'folder' ? -1 : 1));

  return tidy(root.children);
}

/** Les fichiers dans l'ordre de l'arbre : le diff se lit dans le même ordre que la liste des fichiers. */
export function filesInTreeOrder(tree: FileTreeNode[]): PullRequestFile[] {
  return tree.flatMap((node) => (node.kind === 'file' ? [node.file] : filesInTreeOrder(node.children)));
}

/** L'ancre d'un fichier dans la page : toujours la même pour un même chemin (« file-3fa2c1 ») */
export function fileAnchor(path: string): string {
  let hash = 5381;
  for (let index = 0; index < path.length; index++) {
    hash = ((hash << 5) + hash + path.charCodeAt(index)) | 0;
  }
  return `file-${(hash >>> 0).toString(36)}`;
}

/** L'ancre d'une ligne de la nouvelle version d'un fichier (« file-3fa2c1-R24 ») */
export function lineAnchor(path: string, line: number): string {
  return `${fileAnchor(path)}-R${line}`;
}

/** Une empreinte du diff d'un fichier : un fichier vu redevient « à voir » quand son diff change. */
export function patchSignature(file: PullRequestFile): string {
  return fileAnchor(`${file.status}:${file.additions}:${file.deletions}:${file.patch ?? ''}`).slice('file-'.length);
}
