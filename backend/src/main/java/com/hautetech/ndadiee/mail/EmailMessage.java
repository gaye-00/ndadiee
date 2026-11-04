package com.hautetech.ndadiee.mail;

/**
 * Un e-mail prêt à partir : son destinataire, son objet, et son contenu en texte et en HTML (le client choisit).
 *
 * @param recipientId le membre destinataire : le journal le nomme par son identifiant, jamais par son adresse
 * @param tag         sa nature (« review.comment »), pour le journal
 */
public record EmailMessage(Long recipientId, String to, String subject, String text, String html, String tag) {
}
