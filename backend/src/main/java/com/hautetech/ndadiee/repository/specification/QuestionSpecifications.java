package com.hautetech.ndadiee.repository.specification;

import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.contains;
import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.hasText;
import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.terms;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

import org.springframework.data.jpa.domain.Specification;

import com.hautetech.ndadiee.model.content.Question;
import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.repository.specification.QuestionFilter.Following;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

public final class QuestionSpecifications {

    private QuestionSpecifications() {
    }

    /**
     * Les sujets qui répondent aux filtres. Les tags passent par une sous-requête (EXISTS) : une ligne par sujet,
     * quelle que soit la requête qui s'en sert (page, comptage). Chaque mot du mot-clé doit se trouver dans le
     * titre, le contenu ou un tag : « flutter hors-ligne » trouve la question de Fatou.
     */
    public static Specification<Question> filter(QuestionFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (hasText(filter.q())) {
                terms(filter.q()).forEach(term -> predicates.add(cb.or(
                        contains(cb, root.get("title"), term),
                        contains(cb, root.get("body"), term),
                        hasTag(root, query, cb, tag -> contains(cb, tag.get("name"), term)))));
            }
            if (hasText(filter.tag())) {
                predicates.add(hasTag(root, query, cb, tag -> cb.equal(tag.get("slug"), filter.tag())));
            }
            if (filter.status() != null) {
                predicates.add(cb.equal(root.get("status"), filter.status()));
            }
            if (hasText(filter.author())) {
                predicates.add(cb.equal(root.get("author").get("username"), filter.author()));
            }
            if (Boolean.TRUE.equals(filter.unanswered())) {
                predicates.add(cb.equal(root.get("answerCount"), 0));
            }
            if (filter.solved() != null) {
                predicates.add(filter.solved()
                        ? cb.isNotNull(root.get("acceptedAnswer"))
                        : cb.isNull(root.get("acceptedAnswer")));
            }
            if (filter.since() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), filter.since()));
            }
            if (filter.following() != null) {
                predicates.add(followed(root, query, cb, filter.following()));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    // Le fil d'un membre : un auteur qu'il suit, ou un tag qu'il suit. Rien de suivi : rien à montrer
    private static Predicate followed(Root<Question> root, CriteriaQuery<?> query, CriteriaBuilder cb, Following following) {
        List<Predicate> any = new ArrayList<>();
        if (!following.authorIds().isEmpty()) {
            any.add(root.get("author").get("id").in(following.authorIds()));
        }
        if (!following.tagIds().isEmpty()) {
            any.add(hasTag(root, query, cb, tag -> tag.get("id").in(following.tagIds())));
        }
        return any.isEmpty() ? cb.disjunction() : cb.or(any.toArray(Predicate[]::new));
    }

    // Un tag du sujet remplit la condition
    private static Predicate hasTag(Root<Question> root, CriteriaQuery<?> query, CriteriaBuilder cb,
            Function<Join<Question, Tag>, Predicate> condition) {
        Subquery<Long> tagged = query.subquery(Long.class);
        Root<Question> question = tagged.from(Question.class);
        Join<Question, Tag> tag = question.join("tags");
        tagged.select(tag.get("id")).where(cb.equal(question, root), condition.apply(tag));
        return cb.exists(tagged);
    }
}
