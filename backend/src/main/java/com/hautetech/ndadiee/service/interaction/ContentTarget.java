package com.hautetech.ndadiee.service.interaction;

import com.hautetech.ndadiee.model.ContentType;

/**
 * Ce qu'il faut savoir d'un contenu pour voter dessus, le commenter ou le citer dans une
 * notification, quel que soit son type.
 *
 * @param ownerId auteur du contenu (propriétaire pour un projet)
 * @param title   titre affichable ; pour une réponse, celui de sa question
 * @param slug    slug de la page où le contenu est visible ; pour une réponse, celui de sa question
 * @param score   score des votes ; nombre d'étoiles pour un projet
 */
public record ContentTarget(ContentType type, Long id, Long ownerId, String title, String slug, int score) {
}
