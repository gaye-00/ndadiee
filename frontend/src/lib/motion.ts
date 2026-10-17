/**
 * Animations de Motion (variants, survol, glisser, layoutId…), téléchargées à part, après le premier
 * affichage. Les composants `m.div` de Motion s'affichent tout de suite et s'animent dès qu'elles
 * sont là : la page n'attend pas la bibliothèque. Branché dans providers/AppProviders.tsx.
 */
export const loadMotionFeatures = () => import('./motionFeatures').then((module) => module.default);

