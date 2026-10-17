export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8080/api';

export const PAGE_SIZE = 20;

// Libellés des valeurs d'énumération du backend (niveau, rôle, type d'opportunité…) :
// section `enums` des traductions, par exemple t(`enums.experienceLevel.${user.experienceLevel}`).
