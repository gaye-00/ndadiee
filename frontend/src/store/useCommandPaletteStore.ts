import { create } from 'zustand';

interface CommandPaletteState {
  /** Palette de recherche (Ctrl K) ouverte */
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

/** Ouverture de la palette de recherche, depuis le raccourci clavier ou un bouton « Rechercher ». */
export const useCommandPaletteStore = create<CommandPaletteState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((state) => ({ open: !state.open })),
}));
