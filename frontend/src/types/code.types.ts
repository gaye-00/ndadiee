/** Le code d'un projet (ProjectCodeResponse.java) : d'où il vient, sa branche et l'arbre de ses fichiers */
export interface ProjectCode {
  /** GITHUB : un dépôt public lu sur GitHub ; DEMO : un dépôt de démonstration, fourni avec l'application */
  source: 'GITHUB' | 'DEMO';
  /** « owner/name » ; « ndadiee-demo/lagos-transit » pour un dépôt de démonstration */
  repository: string;
  branch: string;
  /** La branche sur GitHub ; null pour un dépôt de démonstration */
  webUrl: string | null;
  /** Dossiers et fichiers, par ordre de chemin */
  entries: ProjectCodeEntry[];
  /** Le dépôt a plus d'entrées que celles listées : le reste se lit sur GitHub */
  truncated: boolean;
}

export interface ProjectCodeEntry {
  path: string;
  type: 'FILE' | 'DIR';
  /** En octets ; null pour un dossier */
  size: number | null;
}

/** Un fichier du code (ProjectCodeFileResponse.java) : son texte, ou pourquoi il ne s'affiche pas */
export interface ProjectCodeFile {
  path: string;
  size: number;
  /** null : binaire, ou trop gros pour être affiché */
  content: string | null;
  binary: boolean;
  tooLarge: boolean;
  /** Le fichier sur GitHub ; null pour un dépôt de démonstration */
  webUrl: string | null;
  /** Une image de GitHub, affichée telle quelle */
  rawUrl: string | null;
}
