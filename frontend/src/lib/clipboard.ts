/**
 * Copie un texte dans le presse-papiers. L'API du navigateur demande une page sécurisée (https, localhost) : sur
 * une adresse du réseau local en http, on passe par une zone de texte cachée, l'ancienne méthode.
 *
 * @returns true si le texte a été copié
 */
export async function copyText(text: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Refusé (permission, page en arrière-plan) : l'ancienne méthode peut encore marcher
    }
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}
