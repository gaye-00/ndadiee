package com.hautetech.ndadiee.repository.specification;

import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.contains;
import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.hasText;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.hautetech.ndadiee.model.project.Project;

import jakarta.persistence.criteria.Predicate;

public final class ProjectSpecifications {

    private ProjectSpecifications() {
    }

    public static Specification<Project> filter(String q, String tagSlug, Boolean lookingForContributors,
            String ownerUsername) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (hasText(q)) {
                predicates.add(cb.or(contains(cb, root.get("name"), q), contains(cb, root.get("description"), q)));
            }
            if (hasText(tagSlug)) {
                predicates.add(cb.equal(root.join("tags").get("slug"), tagSlug));
            }
            if (lookingForContributors != null) {
                predicates.add(cb.equal(root.get("lookingForContributors"), lookingForContributors));
            }
            if (hasText(ownerUsername)) {
                predicates.add(cb.equal(root.get("owner").get("username"), ownerUsername));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
