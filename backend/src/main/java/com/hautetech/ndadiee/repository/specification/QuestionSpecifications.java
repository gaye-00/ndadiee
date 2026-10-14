package com.hautetech.ndadiee.repository.specification;

import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.contains;
import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.hasText;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.hautetech.ndadiee.model.content.Question;
import com.hautetech.ndadiee.model.content.QuestionStatus;

import jakarta.persistence.criteria.Predicate;

public final class QuestionSpecifications {

    private QuestionSpecifications() {
    }

    public static Specification<Question> filter(String q, String tagSlug, QuestionStatus status,
            String authorUsername, Boolean unanswered) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (hasText(q)) {
                predicates.add(cb.or(contains(cb, root.get("title"), q), contains(cb, root.get("body"), q)));
            }
            if (hasText(tagSlug)) {
                predicates.add(cb.equal(root.join("tags").get("slug"), tagSlug));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (hasText(authorUsername)) {
                predicates.add(cb.equal(root.get("author").get("username"), authorUsername));
            }
            if (Boolean.TRUE.equals(unanswered)) {
                predicates.add(cb.equal(root.get("answerCount"), 0));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
