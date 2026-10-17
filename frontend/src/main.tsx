import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/i18n';
import './index.css';
import App from './App.tsx';

// Après un déploiement, les fichiers de l'ancienne version n'existent plus : une page encore jamais
// ouverte ne peut plus se charger. On recharge une fois pour récupérer la nouvelle version ; si
// l'erreur revient aussitôt, elle remonte normalement (RouteErrorBoundary).
const RELOAD_KEY = 'ndadiee_reloaded_at';
window.addEventListener('vite:preloadError', (event) => {
  const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  if (Date.now() - lastReload > 10_000) {
    event.preventDefault();
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
