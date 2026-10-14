package com.hautetech.ndadiee.service.user;

/**
 * Barème de la réputation : points gagnés (ou perdus) par l'auteur d'un contenu.
 * Modifier une valeur ici suffit à changer la règle dans toute l'application.
 */
public final class ReputationRules {

    private ReputationRules() {
    }

    // Vote positif reçu, selon le type de contenu
    public static final int QUESTION_UPVOTED = 5;
    public static final int ANSWER_UPVOTED = 10;
    public static final int ARTICLE_UPVOTED = 10;
    public static final int PROJECT_STARRED = 5;

    // Vote négatif reçu, quel que soit le contenu
    public static final int CONTENT_DOWNVOTED = -2;

    // Réponse acceptée par l'auteur de la question
    public static final int ANSWER_ACCEPTED = 15;
}
