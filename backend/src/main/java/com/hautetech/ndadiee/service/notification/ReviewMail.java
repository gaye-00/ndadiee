package com.hautetech.ndadiee.service.notification;

import com.hautetech.ndadiee.event.ReviewActivityEvent;
import com.hautetech.ndadiee.model.review.PullRequest;
import com.hautetech.ndadiee.model.review.ReviewComment;
import com.hautetech.ndadiee.model.user.User;

/**
 * Ce qu'il faut pour écrire un e-mail de revue à un membre : ce qui s'est passé, pourquoi il en est prévenu, qui l'a
 * fait, sur quelle PR, et le commentaire en question s'il y en a un.
 *
 * @param reward la réputation d'une revue jugée utile
 */
public record ReviewMail(ReviewActivityEvent.Type type, Reason reason, User recipient, User actor, PullRequest pullRequest,
        ReviewComment comment, int reward) {

    /** Pourquoi le membre est prévenu */
    public enum Reason {
        // Il a ouvert la PR
        AUTHOR,
        // Il a écrit dans la discussion où l'on vient de répondre
        PARTICIPANT,
        // Il a relu la PR (sa revue est jugée utile)
        REVIEWER
    }
}
