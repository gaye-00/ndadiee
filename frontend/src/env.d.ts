interface ImportMetaEnv {
  /** URL de base du backend, context-path compris. Défaut : http://localhost:8080/api */
  readonly VITE_BACKEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Network Information API (Chrome, Android) : absente des types du DOM, et de Safari et Firefox. */
interface NetworkInformation {
  /** L'utilisateur a activé l'économiseur de données du navigateur ou du système */
  readonly saveData?: boolean;
  readonly effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
}

interface Navigator {
  readonly connection?: NetworkInformation;
}
