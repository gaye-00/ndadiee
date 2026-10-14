package com.hautetech.ndadiee.repository.specification;

import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.hasText;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.hautetech.ndadiee.model.Language;

import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

/**
 * Filtres du fil d'actualité, communs aux questions, articles et projets : chacun a un
 * auteur (attribut {@code author} ou {@code owner}) et une collection {@code tags}.
 */
public final class FeedSpecifications {

    private FeedSpecifications() {
    }

    /**
     * @param authorAttribute nom de l'attribut qui porte l'auteur ("author" ou "owner")
     * @param languageOnContent true si le contenu porte sa propre langue (articles) ; sinon on se
     *                          rabat sur la langue préférée de l'auteur
     * @param followingIds    auteurs suivis ; avec followedTagIds, restreint le fil aux contenus
     *                        d'un auteur suivi OU portant un tag suivi. Deux listes vides = pas de restriction
     */
    public static <T> Specification<T> filter(Class<T> type, String authorAttribute, boolean languageOnContent,
            String tagSlug, String country, Language language,
            Collection<Long> followingIds, Collection<Long> followedTagIds) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            Path<Object> author = root.get(authorAttribute);

            if (hasText(tagSlug)) {
                predicates.add(cb.equal(root.join("tags").get("slug"), tagSlug));
            }
            if (hasText(country)) {
                predicates.add(cb.equal(author.get("country"), country.toUpperCase()));
            }
            if (language != null) {
                predicates.add(languageOnContent
                        ? cb.equal(root.get("language"), language)
                        : cb.equal(author.get("preferredLanguage"), language));
            }

            List<Predicate> personalized = new ArrayList<>();
            if (!followingIds.isEmpty()) {
                personalized.add(author.get("id").in(followingIds));
            }
            if (!followedTagIds.isEmpty()) {
                Subquery<Long> withFollowedTag = query.subquery(Long.class);
                Root<T> candidate = withFollowedTag.from(type);
                withFollowedTag.select(candidate.get("id")).where(
                        cb.equal(candidate.get("id"), root.get("id")),
                        candidate.join("tags").get("id").in(followedTagIds));
                personalized.add(cb.exists(withFollowedTag));
            }
            if (!personalized.isEmpty()) {
                predicates.add(cb.or(personalized.toArray(Predicate[]::new)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
