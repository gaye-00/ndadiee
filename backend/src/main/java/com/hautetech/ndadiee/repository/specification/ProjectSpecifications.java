package com.hautetech.ndadiee.repository.specification;

import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.contains;
import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.hasText;
import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.terms;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectOpening;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

public final class ProjectSpecifications {

    private ProjectSpecifications() {
    }

    /**
     * Les projets qui répondent aux filtres. Technologies et annonces passent par des sous-requêtes
     * (EXISTS) : une ligne par projet, quelle que soit la requête qui s'en sert (page, comptage, facettes).
     * Chaque mot du mot-clé doit se trouver quelque part : « nlp wolof » trouve wolof-nlp. Les projets masqués
     * par l'administration n'y sont jamais (le back-office a ses propres listes).
     */
    public static Specification<Project> filter(ProjectFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("hiddenAt")));
            if (hasText(filter.q())) {
                terms(filter.q()).forEach(term -> predicates.add(cb.or(
                        contains(cb, root.get("name"), term),
                        contains(cb, root.get("tagline"), term),
                        contains(cb, root.get("description"), term),
                        hasTagNamed(root, query, cb, term))));
            }
            if (hasText(filter.tag())) {
                predicates.add(hasTag(root, query, cb, filter.tag()));
            }
            if (filter.lookingForContributors() != null) {
                predicates.add(cb.equal(root.get("lookingForContributors"), filter.lookingForContributors()));
            }
            if (hasText(filter.owner())) {
                predicates.add(cb.equal(root.get("owner").get("username"), filter.owner()));
            }
            if (filter.role() != null) {
                Subquery<Long> opening = query.subquery(Long.class);
                Root<ProjectOpening> candidate = opening.from(ProjectOpening.class);
                opening.select(candidate.get("id")).where(
                        cb.equal(candidate.get("project"), root),
                        cb.isTrue(candidate.get("open")),
                        cb.equal(candidate.get("role"), filter.role()));
                predicates.add(cb.exists(opening));
            }
            if (hasText(filter.country())) {
                predicates.add(cb.equal(root.get("owner").get("country"), filter.country()));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    // Le projet porte cette technologie
    private static Predicate hasTag(Root<Project> root, CriteriaQuery<?> query, CriteriaBuilder cb, String slug) {
        Subquery<Long> tagged = query.subquery(Long.class);
        Root<Project> project = tagged.correlate(root);
        Join<Project, Tag> tag = project.join("tags");
        tagged.select(tag.get("id")).where(cb.equal(tag.get("slug"), slug));
        return cb.exists(tagged);
    }

    // Une technologie du projet contient le mot-clé (« flutter » trouve les projets Flutter)
    private static Predicate hasTagNamed(Root<Project> root, CriteriaQuery<?> query, CriteriaBuilder cb, String term) {
        Subquery<Long> tagged = query.subquery(Long.class);
        Root<Project> project = tagged.correlate(root);
        Join<Project, Tag> tag = project.join("tags");
        tagged.select(tag.get("id")).where(contains(cb, tag.get("name"), term));
        return cb.exists(tagged);
    }
}
