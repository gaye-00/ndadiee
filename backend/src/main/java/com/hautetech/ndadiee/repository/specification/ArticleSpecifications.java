package com.hautetech.ndadiee.repository.specification;

import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.contains;
import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.hasText;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.content.Article;
import com.hautetech.ndadiee.model.content.ArticleStatus;

import jakarta.persistence.criteria.Predicate;

public final class ArticleSpecifications {

    private ArticleSpecifications() {
    }

    public static Specification<Article> filter(String q, String tagSlug, Language language,
            String authorUsername, ArticleStatus status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (hasText(q)) {
                predicates.add(cb.or(contains(cb, root.get("title"), q), contains(cb, root.get("content"), q)));
            }
            if (hasText(tagSlug)) {
                predicates.add(cb.equal(root.join("tags").get("slug"), tagSlug));
            }
            if (language != null) {
                predicates.add(cb.equal(root.get("language"), language));
            }
            if (hasText(authorUsername)) {
                predicates.add(cb.equal(root.get("author").get("username"), authorUsername));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
