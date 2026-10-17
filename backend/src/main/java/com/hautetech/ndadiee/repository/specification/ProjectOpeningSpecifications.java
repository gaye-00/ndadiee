package com.hautetech.ndadiee.repository.specification;

import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.contains;
import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.hasText;
import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.terms;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

import org.springframework.data.jpa.domain.Specification;

import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectOpening;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

public final class ProjectOpeningSpecifications {

    private ProjectOpeningSpecifications() {
    }

    /**
     * Les annonces ouvertes qui répondent aux filtres ; technologies et pays sont ceux de leur projet. Les
     * technologies passent par une sous-requête (EXISTS) : une ligne par annonce, quelle que soit la requête
     * qui s'en sert (page, comptage, facettes). Chaque mot du mot-clé doit se trouver dans l'annonce ou dans
     * son projet : « flutter réservation » trouve les devs Flutter de Kawral.
     */
    public static Specification<ProjectOpening> filter(OpeningFilter filter) {
        return (root, query, cb) -> {
            Path<Project> project = root.get("project");
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("open")));
            if (filter.role() != null) {
                predicates.add(cb.equal(root.get("role"), filter.role()));
            }
            if (hasText(filter.q())) {
                terms(filter.q()).forEach(term -> predicates.add(cb.or(
                        contains(cb, root.get("title"), term),
                        contains(cb, root.get("description"), term),
                        contains(cb, root.get("starterIssueTitle"), term),
                        contains(cb, project.get("name"), term),
                        contains(cb, project.get("tagline"), term),
                        projectHasTag(root, query, cb, tag -> contains(cb, tag.get("name"), term)))));
            }
            if (hasText(filter.tag())) {
                predicates.add(projectHasTag(root, query, cb, tag -> cb.equal(tag.get("slug"), filter.tag())));
            }
            if (hasText(filter.country())) {
                predicates.add(cb.equal(project.get("owner").get("country"), filter.country()));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    // Une technologie du projet de l'annonce remplit la condition
    private static Predicate projectHasTag(Root<ProjectOpening> root, CriteriaQuery<?> query, CriteriaBuilder cb,
            Function<Join<Project, Tag>, Predicate> condition) {
        Subquery<Long> tagged = query.subquery(Long.class);
        Root<Project> project = tagged.from(Project.class);
        Join<Project, Tag> tag = project.join("tags");
        tagged.select(tag.get("id")).where(cb.equal(project, root.get("project")), condition.apply(tag));
        return cb.exists(tagged);
    }
}
