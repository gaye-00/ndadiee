package com.hautetech.ndadiee.repository.specification;

import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.contains;
import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.hasText;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.user.ExperienceLevel;

import jakarta.persistence.criteria.Predicate;

public final class DeveloperSpecifications {

    private DeveloperSpecifications() {
    }

    public static Specification<Developer> filter(String q, String country, String skillSlug,
            ExperienceLevel level, Boolean openToWork) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            // Un compte supprimé ne figure plus dans l'annuaire ni dans la recherche
            predicates.add(cb.isNull(root.get("deletedAt")));
            if (hasText(q)) {
                predicates.add(cb.or(
                        contains(cb, root.get("username"), q),
                        contains(cb, root.get("fullName"), q),
                        contains(cb, root.get("bio"), q)));
            }
            if (hasText(country)) {
                predicates.add(cb.equal(root.get("country"), country.toUpperCase()));
            }
            if (hasText(skillSlug)) {
                predicates.add(cb.equal(root.join("skills").get("slug"), skillSlug));
            }
            if (level != null) {
                predicates.add(cb.equal(root.get("level"), level));
            }
            if (openToWork != null) {
                predicates.add(cb.equal(root.get("openToWork"), openToWork));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
