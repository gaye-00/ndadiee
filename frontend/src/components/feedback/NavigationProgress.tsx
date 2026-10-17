import { useNavigation } from 'react-router-dom';

/** Fine barre de progression en haut de l'écran pendant le chargement de la page suivante. */
export default function NavigationProgress() {
  const navigation = useNavigation();

  if (navigation.state === 'idle') return null;

  return <div className="fixed inset-x-0 top-0 z-50 h-1 animate-pulse bg-primary" />;
}
