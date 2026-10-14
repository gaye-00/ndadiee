package com.hautetech.ndadiee.repository.specification;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;

public final class SpecificationUtils {

    private SpecificationUtils() {
    }

    public static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    /** Recherche « contient », insensible à la casse. Les jokers saisis par l'utilisateur sont neutralisés. */
    public static Predicate contains(CriteriaBuilder cb, Expression<String> field, String term) {
        String escaped = term.trim().toLowerCase()
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return cb.like(cb.lower(field), "%" + escaped + "%", '\\');
    }
}
