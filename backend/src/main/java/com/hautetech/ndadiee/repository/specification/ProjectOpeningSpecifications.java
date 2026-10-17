package com.hautetech.ndadiee.repository.specification;

import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.contains;
import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.hasText;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectOpening;
import com.hautetech.ndadiee.model.project.TeamRole;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;

public final class ProjectOpeningSpecifications {

    private ProjectOpeningSpecifications() {
    }

    /** Rôles ouverts, filtrés par catégorie, mot-clé (intitulé, description, projet) ou technologie du projet. */
    public static Specification<ProjectOpening> open(TeamRole role, String q, String tagSlug) {
        return (root, query, cb) -> {
            Join<ProjectOpening, Project> project = root.join("project");
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("open")));
            if (role != null) {
                predicates.add(cb.equal(root.get("role"), role));
            }
            if (hasText(q)) {
                predicates.add(cb.or(
                        contains(cb, root.get("title"), q),
                        contains(cb, root.get("description"), q),
                        contains(cb, project.get("name"), q)));
            }
            if (hasText(tagSlug)) {
                predicates.add(cb.equal(project.join("tags").get("slug"), tagSlug));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
