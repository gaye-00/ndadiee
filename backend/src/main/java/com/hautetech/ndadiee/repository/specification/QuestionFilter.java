package com.hautetech.ndadiee.repository.specification;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Locale;

import com.hautetech.ndadiee.model.content.QuestionStatus;

/**
 * Filtres des sujets du forum (GET /v1/questions). Un filtre absent ne filtre pas.
 *
 * @param q          mot-clé : chaque mot doit se trouver dans le titre, le contenu ou un tag du sujet
 * @param tag        slug d'un tag
 * @param status     ouvert ou fermé (un sujet fermé n'accepte plus de réponses)
 * @param author     nom d'utilisateur de l'auteur
 * @param unanswered seulement les sujets sans réponse
 * @param solved     avec (true) ou sans (false) réponse acceptée
 * @param since      publiés depuis cette date : le « Top » de la semaine, du mois, de l'année
 * @param following  le fil d'un membre (auteurs et tags qu'il suit) ; null hors de ce fil
 */
public record QuestionFilter(String q, String tag, QuestionStatus status, String author, Boolean unanswered,
        Boolean solved, Instant since, Following following) {

    /**
     * Ce que suit un membre : un sujet y entre s'il est écrit par l'un de ces auteurs ou porte l'un de ces tags.
     * Sans rien de suivi, le fil est vide.
     */
    public record Following(Collection<Long> authorIds, Collection<Long> tagIds) {

        public Following {
            authorIds = authorIds == null ? List.of() : authorIds;
            tagIds = tagIds == null ? List.of() : tagIds;
        }

        public boolean isEmpty() {
            return authorIds.isEmpty() && tagIds.isEmpty();
        }
    }

    // Noms d'utilisateur en minuscules : comme en base
    public QuestionFilter {
        author = author == null || author.isBlank() ? null : author.trim().toLowerCase(Locale.ROOT);
    }

    /** Seulement un mot-clé : la recherche globale (Ctrl K). */
    public static QuestionFilter search(String q) {
        return new QuestionFilter(q, null, null, null, null, null, null, null);
    }

    /** Les mêmes filtres, dans le fil de ce membre. */
    public QuestionFilter within(Following following) {
        return new QuestionFilter(q, tag, status, author, unanswered, solved, since, following);
    }
}
