package com.hautetech.ndadiee.repository.specification;

import java.util.Arrays;
import java.util.List;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;

public final class SpecificationUtils {

    // Mots d'une recherche pris en compte au plus
    private static final int MAX_TERMS = 8;

    private SpecificationUtils() {
    }

    public static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    /** Les mots d'une recherche, sans doublon, les huit premiers : chacun doit se trouver quelque part. */
    public static List<String> terms(String q) {
        return Arrays.stream(q.trim().split("\\s+")).distinct().limit(MAX_TERMS).toList();
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
