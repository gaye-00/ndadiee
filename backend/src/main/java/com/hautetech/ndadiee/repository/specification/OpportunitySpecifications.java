package com.hautetech.ndadiee.repository.specification;

import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.contains;
import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.hasText;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.hautetech.ndadiee.model.opportunity.Opportunity;
import com.hautetech.ndadiee.model.opportunity.OpportunityType;
import com.hautetech.ndadiee.model.opportunity.WorkMode;

import jakarta.persistence.criteria.Predicate;

public final class OpportunitySpecifications {

    private OpportunitySpecifications() {
    }

    /**
     * @param openOnly ne garde que les opportunités actives dont la date limite n'est pas dépassée
     */
    public static Specification<Opportunity> filter(String q, OpportunityType type, WorkMode workMode,
            String country, String tagSlug, boolean openOnly) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (hasText(q)) {
                predicates.add(cb.or(
                        contains(cb, root.get("title"), q),
                        contains(cb, root.get("description"), q),
                        contains(cb, root.get("companyName"), q)));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (workMode != null) {
                predicates.add(cb.equal(root.get("workMode"), workMode));
            }
            if (hasText(country)) {
                predicates.add(cb.equal(root.get("country"), country.toUpperCase()));
            }
            if (hasText(tagSlug)) {
                predicates.add(cb.equal(root.join("tags").get("slug"), tagSlug));
            }
            if (openOnly) {
                predicates.add(cb.isTrue(root.get("active")));
                predicates.add(cb.or(
                        cb.isNull(root.get("deadline")),
                        cb.greaterThanOrEqualTo(root.get("deadline"), LocalDate.now())));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
