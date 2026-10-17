package com.hautetech.ndadiee.repository.specification;

import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.contains;
import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.hasText;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.hautetech.ndadiee.model.hackathon.Hackathon;
import com.hautetech.ndadiee.model.hackathon.HackathonStatus;

import jakarta.persistence.criteria.Predicate;

public final class HackathonSpecifications {

    private HackathonSpecifications() {
    }

    /**
     * @param status à venir, en cours ou terminés, à l'instant {@code now} ; null : tous
     */
    public static Specification<Hackathon> filter(HackathonStatus status, String q, String tagSlug, Instant now) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status == HackathonStatus.UPCOMING) {
                predicates.add(cb.greaterThan(root.get("startsAt"), now));
            } else if (status == HackathonStatus.ONGOING) {
                predicates.add(cb.lessThanOrEqualTo(root.get("startsAt"), now));
                predicates.add(cb.greaterThan(root.get("endsAt"), now));
            } else if (status == HackathonStatus.ENDED) {
                predicates.add(cb.lessThanOrEqualTo(root.get("endsAt"), now));
            }
            if (hasText(q)) {
                predicates.add(cb.or(
                        contains(cb, root.get("title"), q),
                        contains(cb, root.get("tagline"), q),
                        contains(cb, root.get("description"), q),
                        contains(cb, root.get("city"), q),
                        contains(cb, root.get("organizerName"), q)));
            }
            if (hasText(tagSlug)) {
                predicates.add(cb.equal(root.join("tags").get("slug"), tagSlug));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
