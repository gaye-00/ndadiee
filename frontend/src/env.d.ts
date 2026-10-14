interface ImportMetaEnv {
  /** URL de base du backend, context-path compris. Défaut : http://localhost:8080/api */
  readonly VITE_BACKEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
