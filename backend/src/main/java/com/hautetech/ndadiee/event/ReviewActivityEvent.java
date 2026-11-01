package com.hautetech.ndadiee.event;

/**
 * Un geste d'un membre sur une revue de code, dont on prévient les autres (ReviewMailNotifier) : un commentaire, une
 * revue rendue, une proposition de relecture, une revue communautaire jugée utile. Publié par les gestes des membres
 * seulement : les données de démonstration n'en publient pas.
 *
 * @param commentId     le commentaire publié, ou celui qui porte le verdict ; null pour les autres gestes
 * @param subjectUserId le relecteur dont la revue est jugée utile ; null pour les autres gestes
 */
public record ReviewActivityEvent(Type type, Long pullRequestId, Long actorId, Long commentId, Long subjectUserId) {

    public enum Type {
        COMMENTED,
        REVIEWED,
        CLAIMED,
        JUDGED_HELPFUL
    }

    public static ReviewActivityEvent commented(Long pullRequestId, Long actorId, Long commentId) {
        return new ReviewActivityEvent(Type.COMMENTED, pullRequestId, actorId, commentId, null);
    }

    public static ReviewActivityEvent reviewed(Long pullRequestId, Long actorId, Long verdictCommentId) {
        return new ReviewActivityEvent(Type.REVIEWED, pullRequestId, actorId, verdictCommentId, null);
    }

    public static ReviewActivityEvent claimed(Long pullRequestId, Long actorId) {
        return new ReviewActivityEvent(Type.CLAIMED, pullRequestId, actorId, null, null);
    }

    public static ReviewActivityEvent judgedHelpful(Long pullRequestId, Long actorId, Long reviewerId) {
        return new ReviewActivityEvent(Type.JUDGED_HELPFUL, pullRequestId, actorId, null, reviewerId);
    }
}
