import { create } from 'zustand';
import { storage } from '@/utils/storage';

interface DataSaverState {
  /** Mode économie de données : effets coupés, pas de préchargement, images à la demande */
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

/** Réglage du navigateur ou du système (« Économiseur de données » d'Android et de Chrome). */
function browserSavesData(): boolean {
  return navigator.connection?.saveData === true || window.matchMedia('(prefers-reduced-data: reduce)').matches;
}

// L'attribut data-saver sur <html> coupe les effets en CSS (voir styles/effects.css)
function applyDataSaver(enabled: boolean): void {
  document.documentElement.toggleAttribute('data-saver', enabled);
}

export const useDataSaverStore = create<DataSaverState>()((set) => ({
  // Même règle que le script de index.html : choix enregistré, sinon réglage du navigateur
  enabled: storage.getDataSaver() ?? browserSavesData(),

  setEnabled: (enabled) => {
    storage.setDataSaver(enabled);
    applyDataSaver(enabled);
    set({ enabled });
  },
}));
